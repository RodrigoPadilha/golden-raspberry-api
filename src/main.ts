import dotenv from "dotenv";
dotenv.config();

import { bootstrap } from "./app";

async function main(): Promise<void> {
  try {
    const port = Number(process.env.PORT ?? 3000);
    const csvFilePath = process.env.CSV_FILE_PATH ?? "./Movielist.csv";

    const { httpServer } = await bootstrap({ csvFilePath });

    await httpServer.start(port);
  } catch (err) {
    console.error("Failed to start application:", err);
    process.exit(1);
  }
}

main();
