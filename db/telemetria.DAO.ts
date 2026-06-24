import Redis from 'ioredis';

export interface PayloadTelemetria {
    unixTs: number;
    idMotorista: string;
    data: string;
}

export interface ChaveTelemetria {
    idMotorista: string;
    unixTs: number | string;
}

// Inicializa a conexão com o Redis local na porta padrão 6379
// Certifique-se de que o Redis está rodando na sua máquina/VPS!
const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
});

redis.on('error', (err) => console.error('Erro no Redis:', err));
redis.on('connect', () => console.log('✅ Conectado ao Redis local'));

const QUEUE_KEY = 'telemetria_queue'; // ZSET: Mantém a ordem de chegada (score = unixTs)
const DATA_KEY = 'telemetria_data';   // HASH: Armazena o pacote CSV real (key = idMotorista:unixTs)

/**
 * Persiste o pacote bruto (CSV) no banco de dados.
 */
export async function salvarTelemetria(dados: PayloadTelemetria): Promise<void> {
    const uniqueKey = `${dados.idMotorista}:${dados.unixTs}`;

    try {
        // pipeline() envia múltiplos comandos de uma vez de forma atômica
        await redis.pipeline()
            .hset(DATA_KEY, uniqueKey, dados.data) // Salva o dado bruto no HASH
            .zadd(QUEUE_KEY, Math.floor(dados.unixTs), uniqueKey) // Adiciona a chave na fila pelo timestamp
            .exec();
    } catch (error) {
        console.error("Erro ao salvar no Redis:", error);
        throw error;
    }
}

/** carrega os dados do banco. máximo de 'limit' informações*/
export async function carregarTelemetria(limit: number): Promise<string[]> {
    try {
        // Puxa as chaves mais antigas da fila (0 até limit - 1)
        const keys = await redis.zrange(QUEUE_KEY, 0, limit - 1);

        if (keys.length === 0) return [];

        // Puxa os dados reais (strings CSV) do HASH com base nas chaves recuperadas
        const dataRows = await redis.hmget(DATA_KEY, ...keys);

        // Filtra possíveis nulls (caso uma chave exista na fila mas não no hash)
        return dataRows.filter((row): row is string => row !== null);
    } catch (error) {
        console.error("Falha ao carregar telemetria:", error);
        return [];
    }
}

/** remove um lote de telemetrias do banco a partir das chaves compostas */
export async function deletarLoteDeTelemetria(chaves: ChaveTelemetria[]): Promise<void> {
    if (chaves.length === 0) return;

    try {
        const pipeline = redis.pipeline();

        for (const chave of chaves) {
            const uniqueKey = `${chave.idMotorista}:${chave.unixTs}`;

            // Apaga da fila e apaga o dado bruto do Hash simultaneamente
            pipeline.hdel(DATA_KEY, uniqueKey);
            pipeline.zrem(QUEUE_KEY, uniqueKey);
        }

        await pipeline.exec(); // executa o pipeline de remoção de uma só vez
    } catch (error) {
        console.error("Erro ao deletar lote no Redis:", error);
    }
}
