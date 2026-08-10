import { Global, Module } from "@nestjs/common";
import { ChildrenController } from "./children.controller";
import { ChildrenService } from "./children.service";
import { ChildAccessService } from "./child-access.service";

/**
 * Global because ChildAccessService is the ownership check every other module
 * depends on; making it importable everywhere removes any excuse to skip it.
 */
@Global()
@Module({
  controllers: [ChildrenController],
  providers: [ChildrenService, ChildAccessService],
  exports: [ChildrenService, ChildAccessService],
})
export class ChildrenModule {}
