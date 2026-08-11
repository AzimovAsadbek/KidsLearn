import { Injectable, Logger, Module } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { NotificationType, dayKeyInTimezone } from "@kidslearn/types";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TokenService } from "../auth/token.service";
import { AuthModule } from "../auth/auth.module";
import { JOBS, QUEUES } from "../queue/queue.module";

/* ============================================================================
   Worker — consumes the notifications queue.

   Every handler is idempotent: producers set deterministic job ids (so BullMQ
   drops duplicates) and the handlers themselves dedupe against the database,
   because at-least-once delivery means a retry can re-run a job that already
   had an effect.
   ========================================================================== */

interface SendPushPayload {
  userId: string;
  title: string;
  body: string;
  href?: string;
}

interface BroadcastPushPayload {
  title: string;
  body: string;
  href?: string;
  /** When present, the push is re-rendered in each recipient's locale. */
  messageKey?: string;
  params?: Record<string, unknown>;
}

interface NewLessonPayload {
  lessonId: string;
  title: string;
  slug: string;
  /** Title snapshot in every locale, for per-recipient rendering. */
  titles?: Record<string, string>;
}

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOBS.SEND_PUSH: {
        const payload = job.data as SendPushPayload;
        const delivered = await this.notifications.sendPush(payload.userId, {
          title: payload.title,
          body: payload.body,
          href: payload.href,
        });
        return { delivered };
      }

      case JOBS.BROADCAST_PUSH: {
        const payload = job.data as BroadcastPushPayload;
        // Fan out to every user that has at least one push subscription. Dead
        // subscriptions are pruned inside sendPush, so retries shrink the set.
        const subscribers = await this.prisma.user.findMany({
          where: { pushSubscriptions: { some: {} } },
          select: { id: true, locale: true },
        });
        let delivered = 0;
        for (const subscriber of subscribers) {
          const rendered = payload.messageKey
            ? this.notifications.renderFor(
                subscriber.locale,
                payload.messageKey,
                payload.params as Parameters<typeof this.notifications.renderFor>[2],
              )
            : null;
          delivered += await this.notifications.sendPush(subscriber.id, {
            title: rendered?.title ?? payload.title,
            body: rendered?.body ?? payload.body,
            href: payload.href,
          });
        }
        this.logger.log(`Broadcast push reached ${delivered} devices across ${subscribers.length} users`);
        return { users: subscribers.length, delivered };
      }

      case JOBS.NEW_LESSON_BROADCAST: {
        const payload = job.data as NewLessonPayload;
        // Dedupe: if this lesson already produced a NEW_LESSON notification,
        // a retried job must not send it again.
        const already = await this.prisma.notification.count({
          where: { type: NotificationType.NEW_LESSON, href: `/lessons?highlight=${payload.lessonId}` },
        });
        if (already > 0) return { skipped: true };

        const lessonTitle = payload.titles ?? { en: payload.title };
        const reach = await this.notifications.notifyAllParents({
          type: NotificationType.NEW_LESSON,
          title: "New lesson added",
          body: `"${payload.title}" is now available.`,
          glyph: "📚",
          tone: "mint",
          href: `/lessons?highlight=${payload.lessonId}`,
          messageKey: "lesson.new",
          params: { lessonTitle },
        });

        await this.queue.add(
          JOBS.BROADCAST_PUSH,
          {
            title: "New lesson added",
            body: `"${payload.title}" is now available.`,
            href: "/lessons",
            messageKey: "lesson.new",
            params: { lessonTitle },
          },
          { jobId: `new-lesson-push-${payload.lessonId}` },
        );
        return { reach };
      }

      default:
        this.logger.warn(`Unknown job ${job.name} — acknowledging without work`);
        return {};
    }
  }
}

/* ============================================================================
   Schedulers — turn time into queue jobs.

   Crons only *enqueue*; delivery always happens in the worker with its retry
   and backoff, so a slow push provider can never block the scheduler.
   ========================================================================== */

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly notifications: NotificationsService,
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly queue: Queue,
  ) {}

  /**
   * Daily learning reminder.
   *
   * Runs hourly and matches each parent's configured `reminderHour` in their
   * own timezone, so "18:00" means 18:00 in Tashkent for a Tashkent family.
   * Deduped per parent per local day.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async dailyReminders(): Promise<void> {
    const parents = await this.prisma.user.findMany({
      where: { role: "PARENT", status: "ACTIVE", deletedAt: null, parentProfile: { reminderEnabled: true } },
      include: {
        parentProfile: true,
        children: { where: { deletedAt: null }, select: { id: true, name: true, dailyGoalLessons: true } },
      },
    });

    const now = new Date();
    let sent = 0;

    for (const parent of parents) {
      const profile = parent.parentProfile;
      if (!profile || parent.children.length === 0) continue;

      const localHour = Number(
        new Intl.DateTimeFormat("en-GB", { timeZone: profile.timezone, hour: "2-digit", hour12: false }).format(now),
      );
      if (localHour !== profile.reminderHour) continue;

      const dayKey = dayKeyInTimezone(now, profile.timezone);

      // One reminder per local day, however often the cron fires.
      const alreadySent = await this.prisma.notification.count({
        where: {
          userId: parent.id,
          type: NotificationType.LESSON_REMINDER,
          createdAt: { gte: new Date(`${dayKey}T00:00:00Z`) },
        },
      });
      if (alreadySent > 0) continue;

      const stats = await this.prisma.dailyStat.findMany({
        where: { childId: { in: parent.children.map((child) => child.id) }, dayKey },
      });
      const byChild = new Map(stats.map((stat) => [stat.childId, stat]));
      const behind = parent.children.filter(
        (child) => (byChild.get(child.id)?.lessonsCompleted ?? 0) < child.dailyGoalLessons,
      );
      if (behind.length === 0) continue;

      const names = behind.map((child) => child.name).join(", ");
      // The push leaves the app, so it is rendered in the parent's locale at
      // enqueue time; the in-app row stores the key and renders at read time.
      const rendered = this.notifications.renderFor(parent.locale, "lesson.reminder", { names });
      await this.prisma.notification.create({
        data: {
          userId: parent.id,
          type: NotificationType.LESSON_REMINDER,
          title: "Today's learning isn't finished",
          body: `${names}: today's goal is still open.`,
          glyph: "💡",
          tone: "sky",
          href: "/children",
          messageKey: "lesson.reminder",
          params: { names },
        },
      });
      await this.queue.add(
        JOBS.SEND_PUSH,
        {
          userId: parent.id,
          title: rendered?.title ?? "KidsLearn reminder",
          body: rendered?.body ?? `${names}: today's goal is still open.`,
          href: "/children",
        },
        { jobId: `reminder-${parent.id}-${dayKey}` },
      );
      sent += 1;
    }

    if (sent > 0) this.logger.log(`Queued ${sent} daily reminders`);
  }

  /** Weekly family summary, Sunday evening UTC. Deduped per ISO week. */
  @Cron("0 15 * * 0")
  async weeklyReports(): Promise<void> {
    const weekKey = new Date().toISOString().slice(0, 10);
    const parents = await this.prisma.user.findMany({
      where: { role: "PARENT", status: "ACTIVE", deletedAt: null, parentProfile: { weeklyReportEnabled: true } },
      include: { children: { where: { deletedAt: null }, select: { id: true } } },
    });

    for (const parent of parents) {
      if (parent.children.length === 0) continue;

      const recentReport = await this.prisma.notification.count({
        where: {
          userId: parent.id,
          type: NotificationType.SYSTEM,
          title: { contains: "Weekly report" },
          createdAt: { gte: new Date(Date.now() - 6 * 86_400_000) },
        },
      });
      if (recentReport > 0) continue;

      const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const totals = await this.prisma.dailyStat.aggregate({
        where: { childId: { in: parent.children.map((child) => child.id) }, dayKey: { gte: from } },
        _sum: { learningSeconds: true, lessonsCompleted: true, starsEarned: true },
      });

      const minutes = Math.round((totals._sum.learningSeconds ?? 0) / 60);
      const lessons = totals._sum.lessonsCompleted ?? 0;
      const stars = totals._sum.starsEarned ?? 0;
      await this.prisma.notification.create({
        data: {
          userId: parent.id,
          type: NotificationType.SYSTEM,
          title: "Weekly report is ready",
          body: `This week: ${minutes} min, ${lessons} lessons, ${stars} stars.`,
          glyph: "📊",
          tone: "brand",
          href: "/statistics",
          messageKey: "report.weekly",
          params: { minutes, lessons, stars },
        },
      });
      await this.queue.add(
        JOBS.WEEKLY_REPORT,
        { userId: parent.id },
        { jobId: `weekly-${parent.id}-${weekKey}` },
      );
    }
  }

  /** Housekeeping: expired tokens and stale game sessions, nightly. */
  @Cron("0 3 * * *")
  async housekeeping(): Promise<void> {
    const prunedTokens = await this.tokens.pruneExpired();
    const staleSessions = await this.prisma.gameSession.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) }, consumedAt: null },
    });
    this.logger.log(`Housekeeping: pruned ${prunedTokens} tokens, ${staleSessions.count} stale game sessions`);
  }
}

@Module({
  imports: [AuthModule],
  providers: [NotificationsProcessor, SchedulerService],
})
export class JobsModule {}
