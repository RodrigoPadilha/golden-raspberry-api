import request from "supertest";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { Application } from "express";
import { PrismaClient } from "@prisma/client";
import { bootstrap } from "../../src/app";
import {
  getExpectedAwardIntervalsFromCsv,
  getExpectedMovieCountFromCsv,
  getFirstCsvRow,
  isProducerInCsv,
} from "./csvAssertions";

const TEST_DB_PATH = path.resolve(__dirname, "../../prisma/test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;
const CSV_PATH = path.resolve(__dirname, "../../Movielist.csv");

let app: Application;
let database: { getClient(): unknown };

beforeAll(async () => {
  process.env.DATABASE_URL = TEST_DB_URL;

  // Garante banco limpo a cada execução para carregar o CSV atual
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  const ctx = await bootstrap({
    databaseUrl: TEST_DB_URL,
    csvFilePath: CSV_PATH,
  });

  app = ctx.httpServer.getApp() as Application;
  database = ctx.database;
});

afterAll(async () => {
  const client = database.getClient() as PrismaClient;
  await client.$disconnect();
});

describe("GET /health", () => {
  it("should return health status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
  });
});

describe("GET /api/docs", () => {
  it("should serve Swagger UI", async () => {
    const res = await request(app).get("/api/docs/").redirects(1);

    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger");
  });
});

describe("GET /api/movies", () => {
  it("should return all movies loaded from CSV (fidelity to CSV source)", async () => {
    const expectedCount = await getExpectedMovieCountFromCsv(CSV_PATH);
    const res = await request(app).get("/api/movies");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(expectedCount);
  });

  it("should contain movies with expected fields", async () => {
    const res = await request(app).get("/api/movies");
    const movie = res.body[0];

    expect(movie).toHaveProperty("id");
    expect(movie).toHaveProperty("year");
    expect(movie).toHaveProperty("title");
    expect(movie).toHaveProperty("studios");
    expect(movie).toHaveProperty("producers");
    expect(movie).toHaveProperty("winner");
    expect(Array.isArray(movie.producers)).toBe(true);
  });

  it("should return movies with data matching CSV (first row fidelity)", async () => {
    const firstCsvRow = await getFirstCsvRow(CSV_PATH);
    expect(firstCsvRow).not.toBeNull();

    const res = await request(app).get("/api/movies");
    const matchingMovie = res.body.find(
      (m: any) =>
        m.year === parseInt(firstCsvRow!.year, 10) &&
        m.title === firstCsvRow!.title,
    );

    expect(matchingMovie).toBeDefined();
    expect(matchingMovie.year).toBe(parseInt(firstCsvRow!.year, 10));
    expect(matchingMovie.title).toBe(firstCsvRow!.title);
    expect(matchingMovie.winner).toBe(firstCsvRow!.winner?.toLowerCase() === "yes");
  });
});

describe("GET /api/movies/:id", () => {
  it("should return a movie by id", async () => {
    const allRes = await request(app).get("/api/movies");
    const firstMovie = allRes.body[0];

    const res = await request(app).get(`/api/movies/${firstMovie.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", firstMovie.id);
    expect(res.body).toHaveProperty("title", firstMovie.title);
    expect(Array.isArray(res.body.producers)).toBe(true);
  });

  it("should return 404 for non-existent movie", async () => {
    const res = await request(app).get("/api/movies/999999");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Movie not found");
  });

  it("should return 400 for invalid id", async () => {
    const res = await request(app).get("/api/movies/abc");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Invalid movie ID");
  });
});

describe("GET /api/producers/awards-interval", () => {
  it("should return min and max award intervals matching CSV (E2E source of truth)", async () => {
    const expected = await getExpectedAwardIntervalsFromCsv(CSV_PATH);
    const res = await request(app).get("/api/producers/awards-interval");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("min");
    expect(res.body).toHaveProperty("max");

    const sortEntries = (a: any, b: any) =>
      a.producer.localeCompare(b.producer) || a.previousWin - b.previousWin;
    const actualMin = [...res.body.min].sort(sortEntries);
    const actualMax = [...res.body.max].sort(sortEntries);

    expect(actualMin).toEqual(expected.min);
    expect(actualMax).toEqual(expected.max);
  });

  it("should have correct structure for interval entries (producer, interval, previousWin, followingWin)", async () => {
    const res = await request(app).get("/api/producers/awards-interval");

    for (const entry of [...res.body.min, ...res.body.max]) {
      expect(entry).toHaveProperty("producer");
      expect(entry).toHaveProperty("interval");
      expect(entry).toHaveProperty("previousWin");
      expect(entry).toHaveProperty("followingWin");
      expect(typeof entry.producer).toBe("string");
      expect(typeof entry.interval).toBe("number");
      expect(entry.interval).toBeGreaterThan(0);
      expect(entry.followingWin).toBeGreaterThan(entry.previousWin);
    }
  });
});

describe("GET /api/producers", () => {
  it("should return list of producers with win counts", async () => {
    const res = await request(app).get("/api/producers");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("name");
    expect(res.body[0]).toHaveProperty("winCount");
  });
});

describe("GET /api/producers/:name/movies", () => {
  it("should return movies for an existing producer (present in CSV)", async () => {
    const producerName = "Joel Silver";
    const existsInCsv = await isProducerInCsv(CSV_PATH, producerName);
    expect(existsInCsv).toBe(true);

    const res = await request(app).get(
      `/api/producers/${encodeURIComponent(producerName)}/movies`,
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body[0].producers)).toBe(true);
  });

  it("should return 404 for producer not in CSV", async () => {
    const producerName = "Unknown Producer XYZ";
    const existsInCsv = await isProducerInCsv(CSV_PATH, producerName);
    expect(existsInCsv).toBe(false);

    const res = await request(app).get(
      `/api/producers/${encodeURIComponent(producerName)}/movies`,
    );

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty(
      "error",
      `No movies found for producer "${producerName}"`,
    );
  });
});
