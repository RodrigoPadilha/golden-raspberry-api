/**
 * Entrada HTTP genérica para handlers.
 * Abstrage params, body e query do framework (Express, Fastify, etc).
 */
export interface HttpInput {
  params: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
}

/**
 * Saída HTTP genérica retornada pelos handlers.
 * O adapter traduz isso para a API do framework (res.status().json(), etc).
 */
export interface HttpOutput {
  statusCode: number;
  body: unknown;
}

/**
 * Port para o servidor HTTP.
 * Permite trocar de framework (Express → Fastify) alterando apenas a implementação.
 */
export interface IHttpServerAdapter {
  register(
    method: "get" | "post" | "put" | "delete" | "patch",
    path: string,
    handler: (input: HttpInput) => Promise<HttpOutput>
  ): void;

  start(port: number): Promise<void>;

  stop(): Promise<void>;

  /**
   * Retorna a instância do servidor para testes (supertest).
   * Express retorna app; Fastify retorna a instância fastify.
   */
  getApp(): unknown;
}
