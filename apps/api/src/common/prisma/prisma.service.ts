import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@kidslearn/database";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development"
          ? [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }]
          : [{ emit: "event", level: "error" }],
      errorFormat: "minimal",
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Database connection established");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Truncates every table. Integration tests call this between suites; it
   * refuses to run outside the test environment so it can never be triggered
   * against a real database.
   */
  async resetForTests(): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("resetForTests() is only available when NODE_ENV=test");
    }

    const tables = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
    `;
    if (tables.length === 0) return;

    const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
    await this.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
  }
}
