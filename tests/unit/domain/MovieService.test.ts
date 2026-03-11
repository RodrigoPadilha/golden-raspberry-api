import { MovieWithProducers } from "../../../src/domain/entities/Movie";
import { MovieRepositoryPort } from "../../../src/domain/ports/outbound/MovieRepositoryPort";
import { MovieService } from "../../../src/domain/services/MovieService";

function buildMovie(overrides: Partial<MovieWithProducers> = {}): MovieWithProducers {
  return {
    id: 1,
    year: 2000,
    title: "Test Movie",
    studios: "Test Studio",
    winner: false,
    producers: [{ id: 1, name: "Test Producer" }],
    ...overrides,
  };
}

describe("MovieService", () => {
  let movieRepository: jest.Mocked<MovieRepositoryPort>;
  let service: MovieService;

  beforeEach(() => {
    movieRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findWinners: jest.fn().mockResolvedValue([]),
      findByProducerName: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createManyWithProducers: jest.fn(),
    };
    service = new MovieService(movieRepository);
  });

  describe("getAll", () => {
    it("should return all movies from repository", async () => {
      const movies = [
        buildMovie({ id: 1, title: "Movie A" }),
        buildMovie({ id: 2, title: "Movie B" }),
      ];
      movieRepository.findAll.mockResolvedValue(movies);

      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Movie A");
      expect(result[1].title).toBe("Movie B");
    });

    it("should return empty array when no movies exist", async () => {
      const result = await service.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should return movie by id", async () => {
      const movie = buildMovie({ id: 1, title: "Found Me" });
      movieRepository.findById.mockResolvedValue(movie);

      const result = await service.getById(1);

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Found Me");
    });

    it("should return null when movie does not exist", async () => {
      const result = await service.getById(999);
      expect(result).toBeNull();
    });
  });
});
