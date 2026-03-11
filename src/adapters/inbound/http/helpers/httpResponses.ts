import type { HttpOutput } from "../../../ports/inbound/IHttpServerAdapter";

/**
 * Helpers que retornam HttpOutput (framework-agnóstico).
 * O adapter traduz para res.status().json() no framework específico.
 */
export function ok(body: unknown): HttpOutput {
  return { statusCode: 200, body };
}

export function notFound(message: string): HttpOutput {
  return { statusCode: 404, body: { error: message } };
}

export function badRequest(message: string): HttpOutput {
  return { statusCode: 400, body: { error: message } };
}

export function serverError(error: unknown): HttpOutput {
  const message = error instanceof Error ? error.message : "Internal server error";
  return { statusCode: 500, body: { error: message } };
}
