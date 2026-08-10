import { Module } from "@nestjs/common";
import { CategoriesController, LessonsController, SubjectsController } from "./content.controller";
import { CategoriesService, SubjectsService } from "./subjects.service";
import { LessonsService } from "./lessons.service";

@Module({
  controllers: [SubjectsController, CategoriesController, LessonsController],
  providers: [SubjectsService, CategoriesService, LessonsService],
  exports: [SubjectsService, CategoriesService, LessonsService],
})
export class ContentModule {}
