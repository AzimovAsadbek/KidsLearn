import {
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { ContentStatus, MediaKind, type MediaDto } from "@kidslearn/types";
import { Prisma } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { ApiPaginatedResponse, ClientIp, CurrentUser, Roles, type RequestUser } from "../common/decorators";
import { SearchQueryDto, paginationMeta, safeOrderBy } from "../common/dto/pagination.dto";
import { withMeta } from "../common/http/response.interceptor";
import { AuditActions, AuditService } from "../audit/audit.module";
import { StorageService } from "./storage.service";
import { MAX_SIZE_BY_KIND, validateUpload } from "./upload-validation";
import { ApiProperty } from "@nestjs/swagger";

export class MediaQueryDto extends SearchQueryDto {
  @ApiPropertyOptional({ enum: MediaKind })
  @IsOptional()
  @IsEnum(MediaKind)
  kind?: MediaKind;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class MediaResponse {
  @ApiProperty() id!: string;
  @ApiProperty() filename!: string;
  @ApiProperty({ enum: MediaKind }) kind!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ nullable: true, type: Number }) width!: number | null;
  @ApiProperty({ nullable: true, type: Number }) height!: number | null;
  @ApiProperty({ nullable: true, type: Number }) durationSeconds!: number | null;
  @ApiProperty() url!: string;
  @ApiProperty({ enum: ContentStatus }) status!: string;
  @ApiProperty({ nullable: true, type: String }) aiPrompt!: string | null;
  @ApiProperty() usedIn!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true, type: String }) createdByName!: string | null;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  toDto(row: Prisma.MediaGetPayload<{ include: { createdBy: true } }>): MediaDto {
    return {
      id: row.id,
      filename: row.filename,
      kind: row.kind,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      width: row.width,
      height: row.height,
      durationSeconds: row.durationSeconds,
      url: this.storage.publicUrl(row.storageKey),
      status: row.status,
      aiPrompt: row.aiPrompt,
      usedIn: row.usedIn,
      createdAt: row.createdAt.toISOString(),
      createdByName: row.createdBy?.name ?? null,
    };
  }

  async list(query: MediaQueryDto) {
    const where: Prisma.MediaWhereInput = {
      deletedAt: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { filename: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where,
        orderBy: safeOrderBy(query.sortBy, ["createdAt", "filename", "sizeBytes"] as const, "createdAt", query.sortOrder),
        skip: query.skip,
        take: query.limit,
        include: { createdBy: true },
      }),
      this.prisma.media.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDto(row)), total };
  }

  /** Persists a validated buffer to object storage and records its metadata. */
  async store(params: {
    buffer: Buffer;
    originalName: string;
    kind?: MediaKind;
    createdById?: string | null;
    aiPrompt?: string | null;
    status?: ContentStatus;
  }): Promise<MediaDto> {
    const validated = validateUpload(params.buffer, params.originalName, params.kind);
    const key = this.storage.buildKey(validated.kind, params.originalName);

    await this.storage.put(key, params.buffer, validated.mimeType);

    const row = await this.prisma.media.create({
      data: {
        kind: validated.kind,
        filename: params.originalName.slice(-120),
        storageKey: key,
        mimeType: validated.mimeType,
        sizeBytes: params.buffer.length,
        width: validated.width,
        height: validated.height,
        aiPrompt: params.aiPrompt ?? null,
        status: params.status ?? ContentStatus.PUBLISHED,
        createdById: params.createdById ?? null,
      },
      include: { createdBy: true },
    });

    return this.toDto(row);
  }

  async remove(id: string): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw AppException.notFound("That asset no longer exists.");
    if (media.usedIn > 0) {
      throw AppException.conflict("This asset is still used by published content.");
    }

    // Soft-delete the row first: if object deletion fails the record still
    // disappears from the library rather than leaving a dangling entry.
    await this.prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.storage.delete(media.storageKey);
  }
}

@ApiTags("Media")
@Controller("media")
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Browse the media library" })
  @ApiPaginatedResponse(MediaResponse)
  async list(@Query() query: MediaQueryDto) {
    const { items, total } = await this.media.list(query);
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Roles("ADMIN")
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_SIZE_BY_KIND.VIDEO } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Upload an asset",
    description:
      "The file type is determined from its bytes, not the declared Content-Type. SVGs containing script are rejected.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        kind: { type: "string", enum: Object.values(MediaKind) },
      },
    },
  })
  async upload(
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
    @Query("kind") kind?: MediaKind,
  ) {
    const stored = await this.media.store({
      buffer: file.buffer,
      originalName: file.originalname,
      kind,
      createdById: user.id,
    });

    this.audit.record({
      userId: user.id,
      action: AuditActions.MEDIA_UPLOADED,
      resource: "media",
      resourceId: stored.id,
      metadata: { filename: stored.filename, sizeBytes: stored.sizeBytes, kind: stored.kind },
      ip,
    });

    return stored;
  }

  @Roles("ADMIN")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an asset" })
  async remove(@Param("id") id: string, @CurrentUser() user: RequestUser, @ClientIp() ip: string | null) {
    await this.media.remove(id);
    this.audit.record({
      userId: user.id,
      action: AuditActions.MEDIA_DELETED,
      resource: "media",
      resourceId: id,
      ip,
    });
  }
}

@Global()
@Module({
  controllers: [MediaController],
  providers: [MediaService, StorageService],
  exports: [MediaService, StorageService],
})
export class MediaModule {}
