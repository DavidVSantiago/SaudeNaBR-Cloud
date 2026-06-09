import { and, or, eq } from "drizzle-orm";
import { Database } from "./database";
import { telemetria } from "./telemetria.schema";

const db = Database.getInstance().connection;

// Definindo uma interface clara para o que o banco precisa receber
export interface PayloadTelemetria {
    unixTs: number;
    idMotorista: string;
    data: string;
}

export interface ChaveTelemetria {
    idMotorista: string;
    unixTs: number | string;
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
            data: dados.data
        })
        .onConflictDoNothing(); // para ignorar a inserção de dados duplicados de forma transparente
}

/** carrega os dados do banco. máximo de 'limit' informações*/
export async function carregarTelemetria(limit: number): Promise<string[]> {
    const registros = await db.select({ payload: telemetria.data }).from(telemetria).limit(limit);
    return registros.map(r => r.payload);
}

/** remove um lote de telemetrias do banco a partir das chaves compostas */
export async function deletarLoteDeTelemetria(chaves: ChaveTelemetria[]): Promise<void> {
    if (chaves.length === 0) return; // se não houver chaves, dá como removido e termina

    const condicoes = chaves.map(chave =>
        and(
            eq(telemetria.unixTs, Number(chave.unixTs)),
            eq(telemetria.idMotorista, chave.idMotorista)
        )
    );

    await db.delete(telemetria).where(or(...condicoes));
}
