import { PrismaClient } from "@prisma/client";
import os from "os";
import path from "path";
import type { IDatabase } from "../../ports/outbound/IDatabase";

const FALLBACK_FILE_URL = "file:./dev.db";

export class PrismaDatabaseAdapter implements IDatabase {
  private client: PrismaClient | null = null;

  async initDatabase(databaseUrl?: string): Promise<void> {
    console.log(
      "> [PrismaDatabaseAdapter] initializing Prisma ORM connection...",
    );

    const fileMode = !databaseUrl && this.isFileMode();
    const url = databaseUrl || this.resolveUrl(fileMode);
    process.env.DATABASE_URL = url;

    this.client = new PrismaClient({
      datasources: { db: { url } },
    });

    await this.client.$connect();

    if (!fileMode) {
      await this.createSchema();
    }

    console.log("> [PrismaDatabaseAdapter] Prisma ORM connected successfully");
  }

  getClient(): unknown {
    if (!this.client) {
      throw new Error("Database not initialized. Call initDatabase() first.");
    }
    return this.client;
  }

  private isFileMode(): boolean {
    return process.env.DB_STORAGE_TYPE?.toLowerCase() === "file";
  }

  private resolveUrl(fileMode: boolean): string {
    if (fileMode) {
      return process.env.DATABASE_URL?.trim() || FALLBACK_FILE_URL;
    }

    return process.env.DATABASE_URL_MEMORY?.trim() || this.buildMemoryUrl();
  }

  private buildMemoryUrl(): string {
    const base = path.join(os.tmpdir(), "golden-raspberry-memory");
    return `file:${base}?mode=memory&cache=shared`;
  }

  private async createSchema(): Promise<void> {
    await this.createMovieTable();
    await this.createProducerTable();
    await this.createMovieProducerTable();
  }

  private async createMovieTable(): Promise<void> {
    await this.client!.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Movie" (
        "id"      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "year"    INTEGER NOT NULL,
        "title"   TEXT    NOT NULL,
        "studios" TEXT    NOT NULL,
        "winner"  BOOLEAN NOT NULL DEFAULT false
      )
    `);
  }

  private async createProducerTable(): Promise<void> {
    await this.client!.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Producer" (
        "id"   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT    NOT NULL UNIQUE
      )
    `);
  }

  private async createMovieProducerTable(): Promise<void> {
    await this.client!.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MovieProducer" (
        "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "movie_id"    INTEGER NOT NULL,
        "producer_id" INTEGER NOT NULL,
        CONSTRAINT "MovieProducer_movie_id_fkey"
          FOREIGN KEY ("movie_id")    REFERENCES "Movie"    ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "MovieProducer_producer_id_fkey"
          FOREIGN KEY ("producer_id") REFERENCES "Producer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await this.client!.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MovieProducer_movie_id_producer_id_key"
      ON "MovieProducer" ("movie_id", "producer_id")
    `);
  }
}
