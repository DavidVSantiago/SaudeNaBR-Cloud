import { sqliteTable, integer, text, primaryKey } from "drizzle-orm/sqlite-core";

/**
 * Cache temporário de pacotes de telemetria recebidos via WebSocket.
 * A chave primária é composta por (unix_ts, id_motorista) para evitar colisões
 * caso dois motoristas enviem dados no exato mesmo segundo.
 */
export const telemetria = sqliteTable("telemetria", {
    unixTs: integer("unix_ts").notNull(),
    idMotorista: text("id_motorista").notNull(),
    data: text("data").notNull(),
}, (table) => [
    primaryKey({
        columns: [table.unixTs, table.idMotorista],
    }),
]
);
