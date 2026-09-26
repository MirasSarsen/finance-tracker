import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add it to your local .env file.");
}

const client = postgres(connectionString);

export const db = drizzle({ client, schema });
