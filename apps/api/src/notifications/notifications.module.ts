import {
  Body,
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  HttpStatus,
  Module,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { Transform } from "class-transformer";
import { NotificationType } from "@kidslearn/types";
import { ApiPaginatedResponse, CurrentUser, UserAgent, type RequestUser } from "../common/decorators";
import { PaginationQueryDto, paginationMeta } from "../common/dto/pagination.dto";
import { withMeta } from "../common/http/response.interceptor";
import { NotificationsService } from "./notifications.service";

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Filter by read state" })
  @IsOptional()
  @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : undefined))
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}

export class PushSubscribeDto {
  @ApiProperty({ description: "Push service endpoint from the browser" })
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  endpoint!: string;

  @ApiProperty({ description: "{ p256dh, auth } from PushSubscription.toJSON()" })
  @IsObject()
  keys!: { p256dh: string; auth: string };
}

export class PushUnsubscribeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  endpoint!: string;
}

export class NotificationResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: NotificationType }) type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() glyph!: string;
  @ApiProperty() tone!: string;
  @ApiProperty({ nullable: true, type: String }) href!: string | null;
  @ApiProperty() read!: boolean;
  @ApiProperty() createdAt!: string;
}

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Notification centre for the signed-in user" })
  @ApiPaginatedResponse(NotificationResponse)
  async list(@CurrentUser() user: RequestUser, @Query() query: NotificationQueryDto) {
    const { items, total, unread } = await this.notifications.list(user.id, {
      skip: query.skip,
      take: query.limit,
      read: query.read,
      type: query.type,
    });
    return withMeta(items, { ...paginationMeta(total, query.page, query.limit), unread });
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark one notification read" })
  async markRead(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.notifications.markRead(user.id, id);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark every notification read" })
  async markAllRead(@CurrentUser() user: RequestUser) {
    const count = await this.notifications.markAllRead(user.id);
    return { marked: count };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a notification" })
  async remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.notifications.remove(user.id, id);
  }

  @Get("push/status")
  @ApiOperation({
    summary: "Whether push is available and subscribed",
    description:
      "`configured: false` means the server has no VAPID keys; the client should present push as requiring configuration rather than offering a button that cannot work.",
  })
  async pushStatus(@CurrentUser() user: RequestUser) {
    return this.notifications.pushStatus(user.id);
  }

  @Post("push/subscribe")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Register a browser push subscription" })
  async subscribe(
    @CurrentUser() user: RequestUser,
    @Body() dto: PushSubscribeDto,
    @UserAgent() userAgent: string | null,
  ) {
    await this.notifications.subscribe(user.id, dto, userAgent);
  }

  @Post("push/unsubscribe")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a browser push subscription" })
  async unsubscribe(@CurrentUser() user: RequestUser, @Body() dto: PushUnsubscribeDto) {
    await this.notifications.unsubscribe(user.id, dto.endpoint);
  }
}

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
