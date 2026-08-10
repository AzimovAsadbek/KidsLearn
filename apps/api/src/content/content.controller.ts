import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Locale } from "@kidslearn/types";
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
  ClientIp,
  CurrentUser,
  Public,
  Roles,
  type RequestUser,
} from "../common/decorators";
import { paginationMeta } from "../common/dto/pagination.dto";
import { withMeta } from "../common/http/response.interceptor";
import { AuditActions, AuditService } from "../audit/audit.module";
import { CategoriesService, SubjectsService } from "./subjects.service";
import { LessonsService } from "./lessons.service";
import {
  CategoryQueryDto,
  CategoryResponse,
  ChangeStatusDto,
  CompleteLessonDto,
  LessonQueryDto,
  LessonResponse,
  SubjectResponse,
  UpsertCategoryDto,
  UpsertLessonDto,
  UpsertSubjectDto,
} from "./dto/content.dto";

export class SaveLessonProgressDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  childId!: string;

  @ApiProperty({ minimum: 0, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  percent!: number;
}

export class GradeLessonAnswerDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  childId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  selectedOptionId!: string;
}

export class LessonDetailQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ enum: ["uz", "ru", "en"] })
  @IsOptional()
  locale?: Locale;
}

/* ========================================================================== */

@ApiTags("Content")
@Controller("subjects")
export class SubjectsController {
  constructor(
    private readonly subjects: SubjectsService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List subjects", description: "Public: the marketing site and the kid app both read this." })
  @ApiQuery({ name: "locale", required: false, enum: ["uz", "ru", "en"] })
  @ApiEnvelopeResponse(SubjectResponse)
  async list(@Query("locale") locale?: Locale) {
    return this.subjects.list(locale ?? "en");
  }

  @Roles("ADMIN")
  @Post()
  @ApiOperation({ summary: "Create or update a subject (by slug)" })
  @ApiEnvelopeResponse(SubjectResponse)
  async upsert(@Body() dto: UpsertSubjectDto, @CurrentUser() user: RequestUser, @ClientIp() ip: string | null) {
    const subject = await this.subjects.upsert(dto);
    this.audit.record({
      userId: user.id,
      action: AuditActions.SUBJECT_UPSERTED,
      resource: "subject",
      resourceId: subject.id,
      metadata: { slug: subject.slug },
      ip,
    });
    return subject;
  }

  @Roles("ADMIN")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an empty subject" })
  async remove(@Param("id") id: string) {
    await this.subjects.remove(id);
  }
}

@ApiTags("Content")
@Controller("categories")
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List categories" })
  @ApiPaginatedResponse(CategoryResponse)
  async list(@Query() query: CategoryQueryDto, @CurrentUser() user: RequestUser) {
    const { items, total } = await this.categories.list({
      locale: user.locale as Locale,
      subjectId: query.subjectId,
      status: query.status,
      search: query.search,
      skip: query.skip,
      take: query.limit,
    });
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Roles("ADMIN")
  @Post()
  @ApiOperation({ summary: "Create or update a category (by slug)" })
  @ApiEnvelopeResponse(CategoryResponse)
  async upsert(@Body() dto: UpsertCategoryDto, @CurrentUser() user: RequestUser, @ClientIp() ip: string | null) {
    const category = await this.categories.upsert(dto);
    this.audit.record({
      userId: user.id,
      action: AuditActions.CATEGORY_UPSERTED,
      resource: "category",
      resourceId: category.id,
      ip,
    });
    return category;
  }

  @Roles("ADMIN")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a category" })
  async remove(@Param("id") id: string) {
    await this.categories.remove(id);
  }
}

@ApiTags("Content")
@Controller("lessons")
export class LessonsController {
  constructor(
    private readonly lessons: LessonsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List lessons",
    description:
      "Non-admins only ever receive PUBLISHED lessons. Passing `childId` additionally restricts results to that child's age band and attaches their progress.",
  })
  @ApiPaginatedResponse(LessonResponse)
  async list(@CurrentUser() user: RequestUser, @Query() query: LessonQueryDto) {
    const { items, total } = await this.lessons.list(user, query);
    return withMeta(items, paginationMeta(total, query.page, query.limit));
  }

  @Get(":idOrSlug")
  @ApiOperation({
    summary: "Fetch one lesson with its content blocks",
    description: "Answer keys are stripped for non-admins; answers are graded server-side on completion.",
  })
  @ApiParam({ name: "idOrSlug" })
  @ApiEnvelopeResponse(LessonResponse)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param("idOrSlug") idOrSlug: string,
    @Query() query: LessonDetailQueryDto,
  ) {
    return this.lessons.findOne(user, idOrSlug, query.childId, query.locale);
  }

  @Post(":id/progress")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Save partial reading progress" })
  async saveProgress(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: SaveLessonProgressDto,
  ) {
    await this.lessons.saveProgress(user, id, dto.childId, dto.percent);
  }

  @Post(":id/answers")
  @ApiOperation({
    summary: "Grade one lesson answer",
    description: "Immediate right/wrong feedback. The answer key never ships with the lesson payload.",
  })
  async gradeAnswer(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: GradeLessonAnswerDto,
  ) {
    return this.lessons.gradeAnswer(user, id, dto.childId, dto.questionId, dto.selectedOptionId);
  }

  @Post(":id/complete")
  @ApiOperation({
    summary: "Complete a lesson",
    description:
      "Grades any answers server-side, awards XP and stars, updates progress and evaluates achievements. Idempotent on `clientAttemptId`.",
  })
  async complete(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.lessons.complete(user, id, dto);
  }

  @Roles("ADMIN")
  @Post()
  @ApiOperation({ summary: "Create a lesson (starts as DRAFT)" })
  @ApiEnvelopeResponse(LessonResponse)
  async create(@Body() dto: UpsertLessonDto, @CurrentUser() user: RequestUser, @ClientIp() ip: string | null) {
    const lesson = await this.lessons.upsert(dto);
    this.audit.record({
      userId: user.id,
      action: AuditActions.LESSON_CREATED,
      resource: "lesson",
      resourceId: lesson.id,
      metadata: { slug: lesson.slug },
      ip,
    });
    return lesson;
  }

  @Roles("ADMIN")
  @Patch(":id")
  @ApiOperation({ summary: "Update a lesson" })
  @ApiEnvelopeResponse(LessonResponse)
  async update(
    @Param("id") id: string,
    @Body() dto: UpsertLessonDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
  ) {
    const lesson = await this.lessons.upsert(dto, id);
    this.audit.record({
      userId: user.id,
      action: AuditActions.LESSON_UPDATED,
      resource: "lesson",
      resourceId: id,
      ip,
    });
    return lesson;
  }

  @Roles("ADMIN")
  @Patch(":id/status")
  @ApiOperation({
    summary: "Move a lesson through the workflow",
    description: "DRAFT → REVIEW → PUBLISHED → ARCHIVED. Only PUBLISHED lessons are visible to families.",
  })
  @ApiEnvelopeResponse(LessonResponse)
  async changeStatus(
    @Param("id") id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: RequestUser,
    @ClientIp() ip: string | null,
  ) {
    const lesson = await this.lessons.changeStatus(id, dto);
    this.audit.record({
      userId: user.id,
      action: AuditActions.LESSON_STATUS_CHANGED,
      resource: "lesson",
      resourceId: id,
      metadata: { status: dto.status, note: dto.note },
      ip,
    });
    return lesson;
  }

  @Roles("ADMIN")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Archive and soft-delete a lesson" })
  async remove(@Param("id") id: string, @CurrentUser() user: RequestUser, @ClientIp() ip: string | null) {
    await this.lessons.remove(id);
    this.audit.record({
      userId: user.id,
      action: AuditActions.LESSON_DELETED,
      resource: "lesson",
      resourceId: id,
      ip,
    });
  }
}
