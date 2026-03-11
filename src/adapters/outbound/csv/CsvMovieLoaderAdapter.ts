import fs from "fs";
import csvParser from "csv-parser";
import { CreateMovieInput } from "../../../domain/entities/Movie";
import { CsvLoaderPort } from "../../../domain/ports/outbound/CsvLoaderPort";
import { MovieRepositoryPort } from "../../../domain/ports/outbound/MovieRepositoryPort";

export class CsvMovieLoaderAdapter implements CsvLoaderPort {
  constructor(private readonly movieRepository: MovieRepositoryPort) {}

  async load(filePath: string): Promise<void> {
    const count = await this.movieRepository.count();
    if (count > 0) {
      console.log("> [CsvMovieLoaderAdapter] Data already loaded, skipping CSV import");
      return;
    }

    console.log(`> [CsvMovieLoaderAdapter] Loading CSV from ${filePath}...`);

    const rows = await this.parseCsv(filePath);
    await this.movieRepository.createManyWithProducers(rows);

    console.log(`> [CsvMovieLoaderAdapter] Loaded ${rows.length} movies`);
  }

  private parseCsv(filePath: string): Promise<CreateMovieInput[]> {
    return new Promise((resolve, reject) => {
      const inputs: CreateMovieInput[] = [];

      fs.createReadStream(filePath)
        .pipe(csvParser({ separator: ";" }))
        .on("data", (row) => {
          inputs.push({
            year: parseInt(row.year, 10),
            title: row.title,
            studios: row.studios,
            winner: row.winner?.toLowerCase() === "yes",
            producerNames: this.normalizeProducers(row.producers ?? ""),
          });
        })
        .on("end", () => resolve(inputs))
        .on("error", reject);
    });
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
