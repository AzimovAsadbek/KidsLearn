import { Injectable } from "@nestjs/common";
import { ErrorCode } from "@kidslearn/types";
import type { Child } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import type { RequestUser } from "../common/decorators";

/**
 * The single ownership check for everything child-scoped.
 *
 * Every endpoint that accepts a `childId` goes through here, so "a parent must
 * never reach another parent's child" is enforced in exactly one place rather
 * than re-implemented (and eventually forgotten) per controller.
 *
 * A missing child and someone else's child both return 404: replying 403 would
 * confirm that the id exists.
 */
@Injectable()
export class ChildAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAccess(user: RequestUser, childId: string): Promise<Child> {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, deletedAt: null },
    });

    if (!child) {
      throw AppException.notFound("We couldn't find that child.", ErrorCode.CHILD_NOT_FOUND);
    }

    // Admins may read any child for support and moderation; that access is
    // recorded in the audit log by the calling module.
    if (user.role === "ADMIN") return child;

    if (child.parentId !== user.id) {
      throw AppException.notFound("We couldn't find that child.", ErrorCode.CHILD_NOT_FOUND);
    }

    return child;
  }

  /** Ids a user may act on — used to scope list queries without N checks. */
  async accessibleChildIds(user: RequestUser): Promise<string[]> {
    if (user.role === "ADMIN") {
      const all = await this.prisma.child.findMany({ where: { deletedAt: null }, select: { id: true } });
      return all.map((c) => c.id);
    }
    const own = await this.prisma.child.findMany({
      where: { parentId: user.id, deletedAt: null },
      select: { id: true },
    });
    return own.map((c) => c.id);
  }

  /** The timezone every day-bucket and streak calculation for this child uses. */
  async timezoneForChild(childId: string, fallback: string): Promise<string> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { parent: { select: { parentProfile: { select: { timezone: true } } } } },
    });
    return child?.parent.parentProfile?.timezone ?? fallback;
  }
}
