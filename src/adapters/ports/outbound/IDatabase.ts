/**
 * Port para banco de dados: inicialização e acesso ao client.
 * Implementado por adapters (PrismaDatabaseAdapter, TypeOrmDatabaseAdapter, etc).
 */
export interface IDatabase {
  initDatabase(databaseUrl?: string): Promise<void>;

  getClient(): unknown;
}
