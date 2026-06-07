import { Database } from "./database";
import { telemetria } from "./telemetria.schema";

const db = Database.getInstance().connection;

// Definindo uma interface clara para o que o banco precisa receber
export interface PayloadTelemetria {
    unixTs: number;
    idMotorista: string;
    payload: string;
}

/**
 * Persiste o pacote bruto (CSV) no cache temporário.
 * Extrai o Unix timestamp do payload para usar como chave primária.
 * Lança exceção em caso de falha — o handler WebSocket captura e envia NACK.
 */
export async function salvarTelemetria(dados: PayloadTelemetria): Promise<void> {

    await db.insert(telemetria)
        .values({
            unixTs: dados.unixTs,
            idMotorista: dados.idMotorista,
            payload: dados.payload
        })
        .onConflictDoNothing(); // para ignorar a inserção de dados duplicados de forma transparente
}

