import { MovieController } from "../../../src/adapters/inbound/http/controllers/MovieController";
import { MovieServicePort } from "../../../src/domain/ports/inbound/MovieServicePort";
import { MovieWithProducers } from "../../../src/domain/entities/Movie";
import { MovieNotFoundError } from "../../../src/domain/errors/MovieNotFoundError";
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

describe("MovieController", () => {
  let movieService: jest.Mocked<MovieServicePort>;
  let httpServer: jest.Mocked<IHttpServerAdapter>;
  let controller: MovieController;
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
    movieService = {
      getAll: jest.fn(),
      getById: jest.fn(),
    };
    httpServer = {
      register: jest.fn((_method, path, handler) => {
        registeredHandlers.set(path, handler as (input: HttpInput) => Promise<unknown>);
      }),
      start: jest.fn(),
      stop: jest.fn(),
      getApp: jest.fn(),
    };
    controller = new MovieController(httpServer, movieService);
  });

  const getHandler = (path: string) => {
    const h = registeredHandlers.get(path);
    if (!h) throw new Error(`No handler registered for ${path}`);
    return h;
  };

  describe("registerEndpointListMovies", () => {
    it("should return 200 with all movies as DTOs", async () => {
      controller.registerEndpointListMovies();
      movieService.getAll.mockResolvedValue([sampleMovie]);

      const handler = getHandler("/api/movies");
      const output = await handler(mockHttpInput());

      expect(output).toEqual({ statusCode: 200, body: [sampleMovieDTO] });
    });

    it("should return 500 when service throws", async () => {
      controller.registerEndpointListMovies();
      movieService.getAll.mockRejectedValue(new Error("DB failure"));

      const handler = getHandler("/api/movies");
      const output = await handler(mockHttpInput());

      expect(output).toEqual({ statusCode: 500, body: { error: "DB failure" } });
    });
  });

  describe("registerEndpointGetMovieById", () => {
    it("should return 200 with movie DTO when found", async () => {
      controller.registerEndpointGetMovieById();
      movieService.getById.mockResolvedValue(sampleMovie);

      const handler = getHandler("/api/movies/:id");
      const output = await handler(mockHttpInput({ params: { id: "1" } }));

      expect(movieService.getById).toHaveBeenCalledWith(1);
      expect(output).toEqual({ statusCode: 200, body: sampleMovieDTO });
    });

    it("should return 404 when movie not found", async () => {
      controller.registerEndpointGetMovieById();
      movieService.getById.mockResolvedValue(null);

      const handler = getHandler("/api/movies/:id");
      const output = await handler(mockHttpInput({ params: { id: "999" } }));

      expect(output).toEqual({ statusCode: 404, body: { error: "Movie not found" } });
    });

    it("should return 400 for invalid id", async () => {
      controller.registerEndpointGetMovieById();

      const handler = getHandler("/api/movies/:id");
      const output = await handler(mockHttpInput({ params: { id: "abc" } }));

      expect(output).toEqual({ statusCode: 400, body: { error: "Invalid movie ID" } });
      expect(movieService.getById).not.toHaveBeenCalled();
    });

    it("should return 500 when service throws", async () => {
      controller.registerEndpointGetMovieById();
      movieService.getById.mockRejectedValue(new Error("DB failure"));

      const handler = getHandler("/api/movies/:id");
      const output = await handler(mockHttpInput({ params: { id: "1" } }));

      expect(output).toEqual({ statusCode: 500, body: { error: "DB failure" } });
    });

    it("should return 404 when MovieNotFoundError is thrown", async () => {
      controller.registerEndpointGetMovieById();
      movieService.getById.mockRejectedValue(new MovieNotFoundError(42));

      const handler = getHandler("/api/movies/:id");
      const output = await handler(mockHttpInput({ params: { id: "42" } }));

      expect(output).toEqual({
        statusCode: 404,
        body: { error: "Movie with id 42 not found" },
      });
    });

    it("should return 400 when a DomainError is thrown", async () => {
      controller.registerEndpointGetMovieById();
      movieService.getById.mockRejectedValue(
        new RepositoryError("findById", new Error("connection lost"))
      );

      const handler = getHandler("/api/movies/:id");
      const output = await handler(mockHttpInput({ params: { id: "1" } }));

      expect(output).toEqual({
        statusCode: 400,
        body: { error: 'Repository error during "findById"' },
      });
    });
  });
});
