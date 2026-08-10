import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApiEnvelopeResponse, CurrentUser, type RequestUser } from "../common/decorators";
import { ChildrenService } from "./children.service";
import { ChildResponse, CreateChildDto, UpdateChildDto } from "./dto/child.dto";

@ApiTags("Children")
@Controller("children")
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  @ApiOperation({
    summary: "List the signed-in parent's children",
    description: "Admins receive every child. Parents only ever receive their own.",
  })
  @ApiEnvelopeResponse(ChildResponse, "Children with their current progress")
  async list(@CurrentUser() user: RequestUser) {
    return this.children.listForParent(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Fetch one child" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiEnvelopeResponse(ChildResponse)
  async findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.children.findOne(user, id);
  }

  @Post()
  @ApiOperation({
    summary: "Add a child",
    description: "Age is derived from the date of birth on every read, so it can never drift.",
  })
  @ApiEnvelopeResponse(ChildResponse, "The created child")
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateChildDto) {
    return this.children.create(user, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a child" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiEnvelopeResponse(ChildResponse)
  async update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateChildDto) {
    return this.children.update(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a child", description: "Soft delete; learning history is retained." })
  @ApiParam({ name: "id", format: "uuid" })
  async remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.children.remove(user, id);
  }
}
