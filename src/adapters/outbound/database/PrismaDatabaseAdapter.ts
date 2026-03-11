import { PrismaClient } from "@prisma/client";
import type { IDatabase } from "../../ports/outbound/IDatabase";

export class PrismaDatabaseAdapter implements IDatabase {
  private client: PrismaClient | null = null;

  async initDatabase(databaseUrl?: string): Promise<void> {
    console.log("> [PrismaDatabaseAdapter] initializing Prisma ORM connection...");

    this.client = new PrismaClient({
      datasources: databaseUrl
        ? { db: { url: databaseUrl } }
        : undefined,
    });

    await this.client.$connect();

    console.log("> [PrismaDatabaseAdapter] Prisma ORM connected successfully");
  }

  getClient(): unknown {
    if (!this.client) {
      throw new Error("Database not initialized. Call initDatabase() first.");
    }
    return this.client;
  }
}
