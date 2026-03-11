import express, { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./docs/swagger.json";
import {
  IHttpServerAdapter,
  HttpInput,
  HttpOutput,
} from "../../ports/inbound/IHttpServerAdapter";

export class ExpressHttpServerAdapter implements IHttpServerAdapter {
  private readonly app: Application;
  private server: ReturnType<Application["listen"]> | null = null;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupHealthCheck();
    this.setupDocs();
  }

  private setupMiddlewares(): void {
    this.app.use(express.json());
    console.log("> [ExpressHttpServerAdapter] middlewares configured");
  }

  private setupHealthCheck(): void {
    this.app.get("/health", (_req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    console.log("> [ExpressHttpServerAdapter] health check registered at /health");
  }

  private setupDocs(): void {
    this.app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log("> [ExpressHttpServerAdapter] Swagger UI at /api/docs");
  }

  register(
    method: "get" | "post" | "put" | "delete" | "patch",
    path: string,
    handler: (input: HttpInput) => Promise<HttpOutput>
  ): void {
    this.app[method](path, async (req: Request, res: Response) => {
      const input: HttpInput = {
        params: (req.params as Record<string, string>) ?? {},
        body: req.body,
        query: (req.query as Record<string, string>) ?? {},
      };

      const output: HttpOutput = await handler(input);
      res.status(output.statusCode).json(output.body);
    });
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`> [ExpressHttpServerAdapter] Server running on port ${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log("> [ExpressHttpServerAdapter] Server stopped");
          this.server = null;
          resolve();
        });
      });
    }
  }

  getApp(): Application {
    return this.app;
  }
}
