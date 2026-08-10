import { Global, Injectable, Logger, Module } from "@nestjs/common";
import type { Prisma } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";

export interface AuditEntry {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only record of consequential actions.
 *
 * Writes are fire-and-forget: an audit failure must never roll back the action
 * the operator just performed, but it is logged loudly so the gap is visible.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  record(entry: AuditEntry): void {
    void this.prisma.auditLog
      .create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          metadata: entry.metadata,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent?.slice(0, 250) ?? null,
        },
      })
      .catch((error: Error) => {
        this.logger.error(`Failed to write audit entry ${entry.action}: ${error.message}`);
      });
  }
}

export const AuditActions = {
  LESSON_CREATED: "lesson.created",
  LESSON_UPDATED: "lesson.updated",
  LESSON_STATUS_CHANGED: "lesson.status_changed",
  LESSON_DELETED: "lesson.deleted",
  GAME_UPDATED: "game.updated",
  GAME_STATUS_CHANGED: "game.status_changed",
  SUBJECT_UPSERTED: "subject.upserted",
  CATEGORY_UPSERTED: "category.upserted",
  MEDIA_UPLOADED: "media.uploaded",
  MEDIA_DELETED: "media.deleted",
  AI_GENERATION_REQUESTED: "ai.generation_requested",
  AI_CONTENT_REVIEWED: "ai.content_reviewed",
  FEATURE_FLAG_CHANGED: "feature_flag.changed",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_STATUS_CHANGED: "user.status_changed",
  CHILD_VIEWED_BY_ADMIN: "child.viewed_by_admin",
  NOTIFICATION_BROADCAST: "notification.broadcast",
} as const;

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
