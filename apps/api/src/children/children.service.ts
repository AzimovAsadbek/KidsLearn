import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ageCategoryForDateOfBirth,
  calculateAge,
  dayKeyInTimezone,
  effectiveStreak,
  levelBreakdown,
  accuracyPercent,
  type ChildDto,
  type ChildProgressDto,
} from "@kidslearn/types";
import type { Child, DailyStat, Progress } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { toApiLocale, toPrismaLocale } from "../common/utils/locale";
import type { AppConfig } from "../common/config/configuration";
import type { RequestUser } from "../common/decorators";
import { ChildAccessService } from "./child-access.service";
import type { CreateChildDto, UpdateChildDto } from "./dto/child.dto";

/** How many children one family account may hold. */
const MAX_CHILDREN_PER_PARENT = 8;

@Injectable()
export class ChildrenService {
  private readonly defaultTimezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccessService,
    config: ConfigService,
  ) {
    this.defaultTimezone = config.getOrThrow<AppConfig>("app").timezone;
  }

  /**
   * Serialises a child for the API.
   *
   * Age and age category are computed here rather than stored, so a birthday
   * changes what a child can see without any migration or nightly job.
   */
  toDto(child: Child, progress: Progress | null, today: DailyStat | null, timezone: string): ChildDto {
    return {
      id: child.id,
      parentId: child.parentId,
      name: child.name,
      dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
      age: calculateAge(child.dateOfBirth),
      ageCategory: ageCategoryForDateOfBirth(child.dateOfBirth),
      avatarGlyph: child.avatarGlyph,
      avatarTone: child.avatarTone,
      locale: toApiLocale(child.locale),
      dailyGoalLessons: child.dailyGoalLessons,
      createdAt: child.createdAt.toISOString(),
      progress: progress ? this.toProgressDto(progress, today, timezone) : null,
    };
  }

  toProgressDto(progress: Progress, today: DailyStat | null, timezone: string): ChildProgressDto {
    const level = levelBreakdown(progress.xp);
    const todayKey = dayKeyInTimezone(new Date(), timezone);

    return {
      childId: progress.childId,
      level: level.level,
      xp: progress.xp,
      xpIntoLevel: level.xpIntoLevel,
      xpForNextLevel: level.xpForNextLevel,
      stars: progress.stars,
      points: progress.points,
      lessonsCompleted: progress.lessonsCompleted,
      gamesPlayed: progress.gamesPlayed,
      questionsAnswered: progress.questionsAnswered,
      correctAnswers: progress.correctAnswers,
      wrongAnswers: progress.wrongAnswers,
      accuracy: accuracyPercent(progress.correctAnswers, progress.questionsAnswered),
      learningSeconds: progress.learningSeconds,
      // A streak that lapsed yesterday reads as 0 without needing a nightly job
      // to write the reset.
      currentStreak: effectiveStreak(
        {
          currentStreak: progress.currentStreak,
          longestStreak: progress.longestStreak,
          lastActiveDayKey: progress.lastActiveDayKey,
        },
        todayKey,
      ),
      longestStreak: progress.longestStreak,
      lastActivityAt: progress.lastActivityAt?.toISOString() ?? null,
      todayLessons: today?.lessonsCompleted ?? 0,
      todaySeconds: today?.learningSeconds ?? 0,
      todayStars: today?.starsEarned ?? 0,
    };
  }

  async listForParent(user: RequestUser): Promise<ChildDto[]> {
    const children = await this.prisma.child.findMany({
      where: user.role === "ADMIN" ? { deletedAt: null } : { parentId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { progress: true },
    });
    if (children.length === 0) return [];

    const timezone = await this.timezoneFor(user.id);
    const todayKey = dayKeyInTimezone(new Date(), timezone);
    const todayStats = await this.prisma.dailyStat.findMany({
      where: { childId: { in: children.map((c) => c.id) }, dayKey: todayKey },
    });
    const byChild = new Map(todayStats.map((stat) => [stat.childId, stat]));

    return children.map((child) => this.toDto(child, child.progress, byChild.get(child.id) ?? null, timezone));
  }

  async findOne(user: RequestUser, childId: string): Promise<ChildDto> {
    const child = await this.access.assertAccess(user, childId);
    const timezone = await this.access.timezoneForChild(childId, this.defaultTimezone);
    const [progress, today] = await Promise.all([
      this.prisma.progress.findUnique({ where: { childId } }),
      this.prisma.dailyStat.findUnique({
        where: { childId_dayKey: { childId, dayKey: dayKeyInTimezone(new Date(), timezone) } },
      }),
    ]);
    return this.toDto(child, progress, today, timezone);
  }

  async create(user: RequestUser, dto: CreateChildDto): Promise<ChildDto> {
    const count = await this.prisma.child.count({ where: { parentId: user.id, deletedAt: null } });
    if (count >= MAX_CHILDREN_PER_PARENT) {
      throw AppException.conflict(`A family account supports up to ${MAX_CHILDREN_PER_PARENT} children.`);
    }

    const dateOfBirth = new Date(dto.dateOfBirth);
    this.assertPlausibleBirthDate(dateOfBirth);

    const child = await this.prisma.child.create({
      data: {
        parentId: user.id,
        name: dto.name,
        dateOfBirth,
        avatarGlyph: dto.avatarGlyph,
        avatarTone: dto.avatarTone,
        locale: toPrismaLocale(dto.locale ?? user.locale),
        dailyGoalLessons: dto.dailyGoalLessons ?? 4,
        favouriteSubjectId: dto.favouriteSubjectId ?? null,
        // A child always has a progress row, so every later update is a plain
        // increment rather than an upsert with a race.
        progress: { create: {} },
      },
      include: { progress: true },
    });

    const timezone = await this.timezoneFor(user.id);
    return this.toDto(child, child.progress, null, timezone);
  }

  async update(user: RequestUser, childId: string, dto: UpdateChildDto): Promise<ChildDto> {
    await this.access.assertAccess(user, childId);

    if (dto.dateOfBirth) this.assertPlausibleBirthDate(new Date(dto.dateOfBirth));

    const child = await this.prisma.child.update({
      where: { id: childId },
      data: {
        name: dto.name,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        avatarGlyph: dto.avatarGlyph,
        avatarTone: dto.avatarTone,
        locale: dto.locale ? toPrismaLocale(dto.locale) : undefined,
        dailyGoalLessons: dto.dailyGoalLessons,
        favouriteSubjectId: dto.favouriteSubjectId,
      },
      include: { progress: true },
    });

    const timezone = await this.access.timezoneForChild(childId, this.defaultTimezone);
    return this.toDto(child, child.progress, null, timezone);
  }

  /**
   * Soft delete. A child's attempts feed platform analytics and a parent may
   * ask for a restore, so the row is retained and simply becomes invisible.
   */
  async remove(user: RequestUser, childId: string): Promise<void> {
    await this.access.assertAccess(user, childId);
    await this.prisma.child.update({ where: { id: childId }, data: { deletedAt: new Date() } });
  }

  private assertPlausibleBirthDate(date: Date): void {
    if (Number.isNaN(date.getTime())) {
      throw AppException.badRequest("That date of birth isn't valid.");
    }
    if (date.getTime() > Date.now()) {
      throw AppException.badRequest("A date of birth can't be in the future.");
    }
    if (calculateAge(date) > 14) {
      throw AppException.badRequest("KidsLearn is designed for children up to 7 years old.");
    }
  }

  private async timezoneFor(userId: string): Promise<string> {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    return profile?.timezone ?? this.defaultTimezone;
  }
}
