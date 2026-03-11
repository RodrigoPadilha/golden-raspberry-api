import request from "supertest";
import path from "path";
import { execSync } from "child_process";
import { Application } from "express";
import { PrismaClient } from "@prisma/client";
import { bootstrap } from "../../src/app";

const TEST_DB_PATH = path.resolve(__dirname, "../../prisma/test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;
const CSV_PATH = path.resolve(__dirname, "../../Movielist.csv");

let app: Application;
let database: { getClient(): unknown };

beforeAll(async () => {
  process.env.DATABASE_URL = TEST_DB_URL;

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
  it("should return all movies loaded from CSV", async () => {
    const res = await request(app).get("/api/movies");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(206);
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
  it("should return min and max award intervals", async () => {
    const res = await request(app).get("/api/producers/awards-interval");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("min");
    expect(res.body).toHaveProperty("max");
    expect(Array.isArray(res.body.min)).toBe(true);
    expect(Array.isArray(res.body.max)).toBe(true);
  });

  it("should have correct structure for interval entries", async () => {
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

  it("should have min interval <= max interval", async () => {
    const res = await request(app).get("/api/producers/awards-interval");

    const minInterval = res.body.min[0]?.interval ?? 0;
    const maxInterval = res.body.max[0]?.interval ?? 0;

    expect(minInterval).toBeLessThanOrEqual(maxInterval);
  });

  it("min entries should all share the same (smallest) interval", async () => {
    const res = await request(app).get("/api/producers/awards-interval");
    const intervals = res.body.min.map((e: any) => e.interval);
    const unique = [...new Set(intervals)];

    expect(unique).toHaveLength(1);
  });

  it("max entries should all share the same (largest) interval", async () => {
    const res = await request(app).get("/api/producers/awards-interval");
    const intervals = res.body.max.map((e: any) => e.interval);
    const unique = [...new Set(intervals)];

    expect(unique).toHaveLength(1);
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
  it("should return movies for an existing producer", async () => {
    const res = await request(app).get(
      "/api/producers/Joel Silver/movies",
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(Array.isArray(res.body[0].producers)).toBe(true);
  });

  it("should return 404 for unknown producer", async () => {
    const res = await request(app).get(
      "/api/producers/Unknown Producer XYZ/movies",
    );

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty(
      "error",
      'No movies found for producer "Unknown Producer XYZ"',
    );
  });
});
