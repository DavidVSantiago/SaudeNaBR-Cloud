import { LibSQLDatabase, drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./telemetria.schema";

/**
 * Singleton de conexão com o banco SQLite local via LibSQL.
 * Garante uma única instância em toda a aplicação.
 */
export class Database {
    private static instance: Database;

    public readonly connection: LibSQLDatabase<typeof schema>;

    private constructor() {
        const client = createClient({ url: "file:cache_telemetrias.db" });

        // Ativa o modo WAL (Write-Ahead Logging) para permitir leituras e escritas concorrentes
        client.execute("PRAGMA journal_mode = WAL;").catch(console.error);
        // Reduz a agressividade da sincronia de disco, o que aumenta absurdamente a performance junto com o WAL
        client.execute("PRAGMA synchronous = NORMAL;").catch(console.error);

        this.connection = drizzle(client, { schema });
    }

    static getInstance(): Database {
        if (!Database.instance) Database.instance = new Database();
        return Database.instance;
    }
}
