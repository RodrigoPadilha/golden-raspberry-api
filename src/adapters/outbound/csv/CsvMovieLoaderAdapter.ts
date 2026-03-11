import fs from "fs";
import csvParser from "csv-parser";
import { Transform, Writable } from "stream";
import { finished } from "stream/promises";
import { CreateMovieInput } from "../../../domain/entities/Movie";
import { CsvLoaderPort } from "../../../domain/ports/outbound/CsvLoaderPort";
import { MovieRepositoryPort } from "../../../domain/ports/outbound/MovieRepositoryPort";

export class CsvMovieLoaderAdapter implements CsvLoaderPort {
  constructor(private readonly movieRepository: MovieRepositoryPort) {}

  async load(filePath: string): Promise<void> {
    const count = await this.movieRepository.count();
    if (count > 0) {
      console.log(
        "> [CsvMovieLoaderAdapter] Data already loaded, skipping CSV import",
      );
      return;
    }

    console.log(`> [CsvMovieLoaderAdapter] Loading CSV from ${filePath}...`);

    const rows = await this.parseCsv(filePath);
    await this.movieRepository.createManyWithProducers(rows);

    console.log(`> [CsvMovieLoaderAdapter] Loaded ${rows.length} movies`);
  }

  private async parseCsv(filePath: string): Promise<CreateMovieInput[]> {
    const results: CreateMovieInput[] = [];

    const readableStream = fs.createReadStream(filePath);
    const csvTransformer = csvParser({ separator: ";" });

    const mapperStream = new Transform({
      objectMode: true,
      transform: (row, encoding, callback) => {
        const movie: CreateMovieInput = {
          year: parseInt(row.year, 10),
          title: row.title,
          studios: row.studios,
          winner: row.winner?.toLowerCase() === "yes",
          producerNames: this.normalizeProducers(row.producers ?? ""),
        };
        callback(null, movie);
      },
    });

    const writableStream = new Writable({
      objectMode: true,
      write(movie, encoding, callback) {
        results.push(movie);
        callback();
      },
    });

    // O pipeline conecta as streams
    const stream = readableStream
      .pipe(csvTransformer)
      .pipe(mapperStream)
      .pipe(writableStream);

    // Aguarda a stream terminar sem precisar de 'new Promise'
    await finished(stream);

    return results;
  }

  private normalizeProducers(raw: string): string[] {
    const names = raw
      .replace(/ and /g, ",")
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return [...new Set(names)];
  }
}
