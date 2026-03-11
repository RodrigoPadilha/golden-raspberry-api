export interface CsvLoaderPort {
  load(filePath: string): Promise<void>;
}
