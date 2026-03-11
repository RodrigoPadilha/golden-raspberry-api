import { ProducerController } from "../../../src/adapters/inbound/http/controllers/ProducerController";
import { ProducerServicePort } from "../../../src/domain/ports/inbound/ProducerServicePort";
import { MovieWithProducers } from "../../../src/domain/entities/Movie";
import { RepositoryError } from "../../../src/domain/errors/RepositoryError";
import type {
  IHttpServerAdapter,
  HttpInput,
} from "../../../src/adapters/ports/inbound/IHttpServerAdapter";

function mockHttpInput(overrides: Partial<HttpInput> = {}): HttpInput {
  return {
    params: {},
    body: undefined,
    query: {},
    ...overrides,
  };
}

describe("ProducerController", () => {
  let producerService: jest.Mocked<ProducerServicePort>;
  let httpServer: jest.Mocked<IHttpServerAdapter>;
  let controller: ProducerController;
  let registeredHandlers: Map<string, (input: HttpInput) => Promise<unknown>>;

  const sampleMovie: MovieWithProducers = {
    id: 1,
    year: 2000,
    title: "Test Movie",
    studios: "Test Studio",
    winner: true,
    producers: [{ id: 1, name: "Test Producer" }],
  };

  const sampleMovieDTO = {
    id: 1,
    year: 2000,
    title: "Test Movie",
    studios: "Test Studio",
    winner: true,
    producers: ["Test Producer"],
  };

  beforeEach(() => {
    registeredHandlers = new Map();
    producerService = {
      getAll: jest.fn(),
      getAwardIntervals: jest.fn(),
      getMoviesByProducer: jest.fn(),
    };
    httpServer = {
      register: jest.fn((_method, path, handler) => {
        registeredHandlers.set(path, handler as (input: HttpInput) => Promise<unknown>);
      }),
      start: jest.fn(),
      stop: jest.fn(),
      getApp: jest.fn(),
    };
    controller = new ProducerController(httpServer, producerService);
  });

  const getHandler = (path: string) => {
    const h = registeredHandlers.get(path);
    if (!h) throw new Error(`No handler registered for ${path}`);
    return h;
  };

  describe("registerEndpointListProducers", () => {
    it("should return 200 with producers", async () => {
      controller.registerEndpointListProducers();
      const producers = [
        { name: "Producer A", winCount: 2 },
        { name: "Producer B", winCount: 1 },
      ];
      producerService.getAll.mockResolvedValue(producers);

      const handler = getHandler("/api/producers");
      const output = await handler(mockHttpInput());

      expect(output).toEqual({ statusCode: 200, body: producers });
    });

    it("should return 500 when service throws", async () => {
      controller.registerEndpointListProducers();
      producerService.getAll.mockRejectedValue(new Error("DB failure"));

      const handler = getHandler("/api/producers");
      const output = await handler(mockHttpInput());

      expect(output).toEqual({ statusCode: 500, body: { error: "DB failure" } });
    });
  });

  describe("registerEndpointGetAwardIntervals", () => {
    it("should return 200 with award intervals", async () => {
      controller.registerEndpointGetAwardIntervals();
      const intervals = {
        min: [{ producer: "A", interval: 1, previousWin: 2000, followingWin: 2001 }],
        max: [{ producer: "B", interval: 10, previousWin: 2000, followingWin: 2010 }],
      };
      producerService.getAwardIntervals.mockResolvedValue(intervals);

      const handler = getHandler("/api/producers/awards-interval");
      const output = await handler(mockHttpInput());

      expect(output).toEqual({ statusCode: 200, body: intervals });
    });

    it("should return 500 when service throws", async () => {
      controller.registerEndpointGetAwardIntervals();
      producerService.getAwardIntervals.mockRejectedValue(new Error("Unexpected"));

      const handler = getHandler("/api/producers/awards-interval");
      const output = await handler(mockHttpInput());

      expect(output).toEqual({ statusCode: 500, body: { error: "Unexpected" } });
    });
  });

  describe("registerEndpointGetMoviesByProducer", () => {
    it("should return 200 with movie DTOs for producer", async () => {
      controller.registerEndpointGetMoviesByProducer();
      producerService.getMoviesByProducer.mockResolvedValue([sampleMovie]);

      const handler = getHandler("/api/producers/:name/movies");
      const output = await handler(mockHttpInput({ params: { name: "Producer A" } }));

      expect(producerService.getMoviesByProducer).toHaveBeenCalledWith("Producer A");
      expect(output).toEqual({ statusCode: 200, body: [sampleMovieDTO] });
    });

    it("should return 404 when no movies are found for producer", async () => {
      controller.registerEndpointGetMoviesByProducer();
      producerService.getMoviesByProducer.mockResolvedValue([]);

      const handler = getHandler("/api/producers/:name/movies");
      const output = await handler(mockHttpInput({ params: { name: "Unknown" } }));

      expect(output).toEqual({
        statusCode: 404,
        body: { error: 'No movies found for producer "Unknown"' },
      });
    });

    it("should return 400 when producer name is missing", async () => {
      controller.registerEndpointGetMoviesByProducer();

      const handler = getHandler("/api/producers/:name/movies");
      const output = await handler(mockHttpInput({ params: {} }));

      expect(output).toEqual({
        statusCode: 400,
        body: { error: "Producer name is required" },
      });
      expect(producerService.getMoviesByProducer).not.toHaveBeenCalled();
    });

    it("should return 400 when DomainError is thrown", async () => {
      controller.registerEndpointGetMoviesByProducer();
      producerService.getMoviesByProducer.mockRejectedValue(
        new RepositoryError("findByProducerName", new Error("connection lost"))
      );

      const handler = getHandler("/api/producers/:name/movies");
      const output = await handler(mockHttpInput({ params: { name: "Test" } }));

      expect(output).toEqual({
        statusCode: 400,
        body: { error: 'Repository error during "findByProducerName"' },
      });
    });
  });
});
