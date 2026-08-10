import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** Global so no feature module has to import it explicitly. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
