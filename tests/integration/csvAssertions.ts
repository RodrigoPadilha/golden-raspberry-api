/**
 * Utilitários para derivar valores esperados do arquivo CSV.
 * Usa o CSV como fonte de verdade nos testes de integração E2E.
 * Qualquer alteração no CSV deve ser refletida nos resultados da API.
 */

import { createReadStream } from "fs";
import path from "path";
import csvParser from "csv-parser";

export interface AwardIntervalEntry {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
}

export interface AwardIntervalResult {
  min: AwardIntervalEntry[];
  max: AwardIntervalEntry[];
}

export interface CsvRow {
  year: string;
  title: string;
  studios: string;
  producers: string;
  winner: string;
}

/**
 * Normaliza produtores da mesma forma que CsvMovieLoaderAdapter.
 * "Producer A and Producer B" -> ["Producer A", "Producer B"]
 */
function normalizeProducers(raw: string): string[] {
  const names = raw
    .replace(/ and /g, ",")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return [...new Set(names)];
}

/**
 * Lê o CSV e retorna as linhas parseadas.
 */
export async function parseCsvFile(filePath: string): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

  return new Promise((resolve, reject) => {
    createReadStream(absolutePath)
      .pipe(csvParser({ separator: ";" }))
      .on("data", (row: CsvRow) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

/**
 * Calcula os intervalos de prêmios esperados a partir do CSV.
 * Espelha a lógica do ProducerService para garantir consistência.
 */
export async function getExpectedAwardIntervalsFromCsv(
  csvPath: string,
): Promise<AwardIntervalResult> {
  const rows = await parseCsvFile(csvPath);
  const producerWins = new Map<string, number[]>();

  for (const row of rows) {
    if (row.winner?.toLowerCase() !== "yes") continue;

    const year = parseInt(row.year, 10);
    if (isNaN(year)) continue;

    const producerNames = normalizeProducers(row.producers ?? "");
    for (const name of producerNames) {
      const wins = producerWins.get(name) ?? [];
      wins.push(year);
      producerWins.set(name, wins);
    }
  }

  const intervals: AwardIntervalEntry[] = [];

  for (const [producer, years] of producerWins) {
    if (years.length < 2) continue;

    years.sort((a, b) => a - b);

    for (let i = 1; i < years.length; i++) {
      intervals.push({
        producer,
        interval: years[i] - years[i - 1],
        previousWin: years[i - 1],
        followingWin: years[i],
      });
    }
  }

  if (intervals.length === 0) {
    return { min: [], max: [] };
  }

  const minInterval = Math.min(...intervals.map((i) => i.interval));
  const maxInterval = Math.max(...intervals.map((i) => i.interval));

  const min = intervals.filter((i) => i.interval === minInterval);
  const max = intervals.filter((i) => i.interval === maxInterval);

  // Ordena para comparação determinística (por producer, depois previousWin)
  const sortEntries = (a: AwardIntervalEntry, b: AwardIntervalEntry) =>
    a.producer.localeCompare(b.producer) || a.previousWin - b.previousWin;

  return {
    min: [...min].sort(sortEntries),
    max: [...max].sort(sortEntries),
  };
}

/**
 * Retorna o número esperado de filmes no CSV (excluindo header).
 */
export async function getExpectedMovieCountFromCsv(csvPath: string): Promise<number> {
  const rows = await parseCsvFile(csvPath);
  return rows.length;
}

/**
 * Retorna os anos de vitória esperados para um produtor específico.
 */
export async function getExpectedWinnerYearsForProducer(
  csvPath: string,
  producerName: string,
): Promise<number[]> {
  const rows = await parseCsvFile(csvPath);
  const years: number[] = [];

  for (const row of rows) {
    if (row.winner?.toLowerCase() !== "yes") continue;

    const producerNames = normalizeProducers(row.producers ?? "");
    if (producerNames.includes(producerName)) {
      const year = parseInt(row.year, 10);
      if (!isNaN(year)) years.push(year);
    }
  }

  return years.sort((a, b) => a - b);
}

/**
 * Retorna a primeira linha de dados do CSV (para validação pontual).
 */
export async function getFirstCsvRow(csvPath: string): Promise<CsvRow | null> {
  const rows = await parseCsvFile(csvPath);
  return rows[0] ?? null;
}

/**
 * Verifica se um produtor existe no CSV (tem pelo menos um filme).
 */
export async function isProducerInCsv(
  csvPath: string,
  producerName: string,
): Promise<boolean> {
  const rows = await parseCsvFile(csvPath);

  for (const row of rows) {
    const producerNames = normalizeProducers(row.producers ?? "");
    if (producerNames.includes(producerName)) return true;
  }

  return false;
}
