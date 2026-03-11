export interface ProducerSummary {
  name: string;
  winCount: number;
}

export interface ProducerRepositoryPort {
  findAllWithWinCount(): Promise<ProducerSummary[]>;
}
