import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";
import { NotificationType, type NotificationDto, type PushStatusDto } from "@kidslearn/types";
import type { Prisma } from "@kidslearn/database";
import { renderNotificationMessage, type MessageParams } from "./notification-messages";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import type { PushConfig } from "../common/config/configuration";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  /** Stored as the English fallback; recipients see their own locale when a messageKey is set. */
  title: string;
  body: string;
  glyph?: string;
  tone?: string;
  href?: string | null;
  childId?: string | null;
  /** Catalog key for locale-aware rendering; omit for verbatim custom copy. */
  messageKey?: string;
  params?: MessageParams;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly push: PushConfig;
  readonly pushConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.push = config.getOrThrow<PushConfig>("push");
    this.pushConfigured = Boolean(this.push.publicKey && this.push.privateKey);

    if (this.pushConfigured) {
      webpush.setVapidDetails(this.push.subject, this.push.publicKey!, this.push.privateKey!);
      this.logger.log("Web push configured");
    } else {
      // Stated plainly at boot rather than failing mysteriously at send time.
      this.logger.warn("VAPID keys are not set — push notifications are unavailable until they are configured");
    }
  }

  toDto(row: Prisma.NotificationGetPayload<object>, locale = "en"): NotificationDto {
    // System notifications render in the recipient's language; anything without
    // a known message key keeps its stored copy verbatim.
    const rendered = row.messageKey
      ? renderNotificationMessage(locale, row.messageKey, row.params as MessageParams | null)
      : null;
    return {
      id: row.id,
      type: row.type,
      title: rendered?.title ?? row.title,
      body: rendered?.body ?? row.body,
      glyph: row.glyph,
      tone: row.tone,
      href: row.href,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Rendered copy for out-of-band delivery (web push) in a specific locale. */
  renderFor(locale: string, messageKey: string, params: MessageParams | null | undefined) {
    return renderNotificationMessage(locale, messageKey, params);
  }

  async list(
    userId: string,
    params: { skip: number; take: number; read?: boolean; type?: NotificationType },
    locale = "en",
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(params.read === undefined ? {} : params.read ? { readAt: { not: null } } : { readAt: null }),
      ...(params.type ? { type: params.type } : {}),
    };

    const [rows, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items: rows.map((row) => this.toDto(row, locale)), total, unread };
  }

  async create(input: CreateNotificationInput): Promise<NotificationDto> {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        glyph: input.glyph ?? "🔔",
        tone: input.tone ?? "brand",
        href: input.href ?? null,
        childId: input.childId ?? null,
        messageKey: input.messageKey ?? null,
        params: (input.params as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
    return this.toDto(row);
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      // Either it does not exist or it belongs to someone else; both are 404.
      const exists = await this.prisma.notification.count({ where: { id, userId } });
      if (exists === 0) throw AppException.notFound("That notification no longer exists.");
    }
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
  }

  /* --- Web push ---------------------------------------------------------- */

  async pushStatus(userId: string): Promise<PushStatusDto> {
    const subscribed = await this.prisma.pushSubscription.count({ where: { userId } });
    return {
      configured: this.pushConfigured,
      publicKey: this.pushConfigured ? (this.push.publicKey ?? null) : null,
      subscribed: subscribed > 0,
    };
  }

  async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string | null) {
    if (!this.pushConfigured) {
      throw AppException.providerNotConfigured(
        "Push notifications are not configured on this server. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable them.",
      );
    }

    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent?.slice(0, 250) ?? null,
      },
      update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, failureCount: 0 },
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /**
   * Delivers a push to every device a user has registered.
   *
   * A 404/410 from the push service means the subscription is dead, so it is
   * pruned instead of retried forever.
   */
  async sendPush(userId: string, payload: { title: string; body: string; href?: string }): Promise<number> {
    if (!this.pushConfigured) return 0;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    let delivered = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(payload),
          );
          delivered += 1;
          await this.prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastUsedAt: new Date(), failureCount: 0 },
          });
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
          } else {
            await this.prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { failureCount: { increment: 1 } },
            });
          }
        }
      }),
    );

    return delivered;
  }

  /** Fan-out used by the "new lesson" broadcast job. */
  async notifyAllParents(input: Omit<CreateNotificationInput, "userId">): Promise<number> {
    const parents = await this.prisma.user.findMany({
      where: { role: "PARENT", deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });

    if (parents.length === 0) return 0;

    await this.prisma.notification.createMany({
      data: parents.map((parent) => ({
        userId: parent.id,
        type: input.type,
        title: input.title,
        body: input.body,
        glyph: input.glyph ?? "🔔",
        tone: input.tone ?? "brand",
        href: input.href ?? null,
        messageKey: input.messageKey ?? null,
        params: (input.params as Prisma.InputJsonValue | undefined) ?? undefined,
      })),
    });

    return parents.length;
  }
}
