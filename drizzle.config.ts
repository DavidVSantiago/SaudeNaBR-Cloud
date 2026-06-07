import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./db/telemetria.schema.ts",
    out: "./db/migrations",
    dialect: "turso",
    dbCredentials: {
        url: "file:cache_telemetrias.db",
    },
});
