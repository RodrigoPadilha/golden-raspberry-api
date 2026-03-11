import { MovieWithProducers } from "../../../src/domain/entities/Movie";
import { MovieRepositoryPort } from "../../../src/domain/ports/outbound/MovieRepositoryPort";
import { ProducerRepositoryPort } from "../../../src/domain/ports/outbound/ProducerRepositoryPort";
import { ProducerService } from "../../../src/domain/services/ProducerService";

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

describe("ProducerService", () => {
  let movieRepository: jest.Mocked<MovieRepositoryPort>;
  let producerRepository: jest.Mocked<ProducerRepositoryPort>;
  let service: ProducerService;

  beforeEach(() => {
    movieRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findWinners: jest.fn().mockResolvedValue([]),
      findByProducerName: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createManyWithProducers: jest.fn(),
    };
    producerRepository = {
      findAllWithWinCount: jest.fn().mockResolvedValue([]),
    };
    service = new ProducerService(movieRepository, producerRepository);
  });

  describe("getAll", () => {
    it("should delegate to producerRepository", async () => {
      const producers = [
        { name: "Producer A", winCount: 2 },
        { name: "Producer B", winCount: 1 },
      ];
      producerRepository.findAllWithWinCount.mockResolvedValue(producers);

      const result = await service.getAll();

      expect(result).toEqual(producers);
      expect(producerRepository.findAllWithWinCount).toHaveBeenCalled();
    });
  });

  describe("getMoviesByProducer", () => {
    it("should delegate to movieRepository", async () => {
      const movies = [buildMovie({ id: 1, title: "Movie X" })];
      movieRepository.findByProducerName.mockResolvedValue(movies);

      const result = await service.getMoviesByProducer("Test Producer");

      expect(result).toEqual(movies);
      expect(movieRepository.findByProducerName).toHaveBeenCalledWith("Test Producer");
    });
  });

  describe("getAwardIntervals", () => {
    it("should return empty min/max when no winners exist", async () => {
      movieRepository.findWinners.mockResolvedValue([]);

      const result = await service.getAwardIntervals();

      expect(result).toEqual({ min: [], max: [] });
    });

    it("should return empty min/max when no producer has multiple wins", async () => {
      movieRepository.findWinners.mockResolvedValue([
        buildMovie({ id: 1, year: 2000, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 2, year: 2005, winner: true, producers: [{ id: 2, name: "Producer B" }] }),
      ]);

      const result = await service.getAwardIntervals();

      expect(result).toEqual({ min: [], max: [] });
    });

    it("should calculate interval for producer with two wins", async () => {
      movieRepository.findWinners.mockResolvedValue([
        buildMovie({ id: 1, year: 2000, winner: true, producers: [{ id: 1, name: "Joel Silver" }] }),
        buildMovie({ id: 2, year: 2003, winner: true, producers: [{ id: 1, name: "Joel Silver" }] }),
      ]);

      const result = await service.getAwardIntervals();

      expect(result.min).toHaveLength(1);
      expect(result.max).toHaveLength(1);
      expect(result.min[0]).toEqual({
        producer: "Joel Silver",
        interval: 3,
        previousWin: 2000,
        followingWin: 2003,
      });
    });

    it("should find min and max intervals across multiple producers", async () => {
      movieRepository.findWinners.mockResolvedValue([
        buildMovie({ id: 1, year: 1990, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 2, year: 1991, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 3, year: 2000, winner: true, producers: [{ id: 2, name: "Producer B" }] }),
        buildMovie({ id: 4, year: 2013, winner: true, producers: [{ id: 2, name: "Producer B" }] }),
      ]);

      const result = await service.getAwardIntervals();

      expect(result.min).toEqual([
        { producer: "Producer A", interval: 1, previousWin: 1990, followingWin: 1991 },
      ]);
      expect(result.max).toEqual([
        { producer: "Producer B", interval: 13, previousWin: 2000, followingWin: 2013 },
      ]);
    });

    it("should return multiple entries when tied for min or max", async () => {
      movieRepository.findWinners.mockResolvedValue([
        buildMovie({ id: 1, year: 2000, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 2, year: 2001, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 3, year: 2010, winner: true, producers: [{ id: 2, name: "Producer B" }] }),
        buildMovie({ id: 4, year: 2011, winner: true, producers: [{ id: 2, name: "Producer B" }] }),
      ]);

      const result = await service.getAwardIntervals();

      expect(result.min).toHaveLength(2);
      expect(result.max).toHaveLength(2);
      expect(result.min.map((e) => e.producer).sort()).toEqual(["Producer A", "Producer B"]);
    });

    it("should handle producer with three consecutive wins", async () => {
      movieRepository.findWinners.mockResolvedValue([
        buildMovie({ id: 1, year: 2000, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 2, year: 2002, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 3, year: 2010, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
      ]);

      const result = await service.getAwardIntervals();

      expect(result.min).toEqual([
        { producer: "Producer A", interval: 2, previousWin: 2000, followingWin: 2002 },
      ]);
      expect(result.max).toEqual([
        { producer: "Producer A", interval: 8, previousWin: 2002, followingWin: 2010 },
      ]);
    });

    it("should handle multiple producers per movie", async () => {
      movieRepository.findWinners.mockResolvedValue([
        buildMovie({
          id: 1, year: 2000, winner: true,
          producers: [{ id: 1, name: "Producer A" }, { id: 2, name: "Producer B" }],
        }),
        buildMovie({ id: 2, year: 2005, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 3, year: 2003, winner: true, producers: [{ id: 2, name: "Producer B" }] }),
      ]);

      const result = await service.getAwardIntervals();

      expect(result.min).toEqual([
        { producer: "Producer B", interval: 3, previousWin: 2000, followingWin: 2003 },
      ]);
      expect(result.max).toEqual([
        { producer: "Producer A", interval: 5, previousWin: 2000, followingWin: 2005 },
      ]);
    });

    it("should ignore non-winner movies (only findWinners is called)", async () => {
      movieRepository.findWinners.mockResolvedValue([
        buildMovie({ id: 1, year: 2000, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
        buildMovie({ id: 3, year: 2010, winner: true, producers: [{ id: 1, name: "Producer A" }] }),
      ]);

      const result = await service.getAwardIntervals();

      expect(result.min[0].interval).toBe(10);
    });
  });
});
