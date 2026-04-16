import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import fs from "node:fs";

const databaseUrl =
  process.env.DATABASE_URL ||
  dotenv.parse(fs.readFileSync(new URL("../../.env", import.meta.url))).DATABASE_URL ||
  "";

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
