import { Elysia, t } from 'elysia'
import { salvarTelemetria } from './db/telemetria.DAO'

// No futuro, você pode mover isso para um arquivo .env
const API_KEY = "#htxrlLaWaU3F8aNnjviFhreqyWzI1YowyZ8bFoCBNjhp8umKToLxTF4kau0tnp@";

new Elysia()
    // ====================================================================
    // ROTA DE RECEBIMENTO DA TELEMETRIA
    // ====================================================================
    .ws("/savetelemetry", {
        // GUARD 1 - validação de TOKEN - segurança!!
        beforeHandle({ headers, set }) {
            const token = headers['authorization'];

            if (token !== API_KEY) {
                console.warn("🛑 Conexão bloqueada: Chave inválida ou ausente");
                set.status = 401;
                return "Não autorizado";
            }
        },
        // GUARD 2 - validação de estrutura da mensagem recebida, deve ser string
        body: t.String(),

        open(ws) {
            console.log("📱 Dispositivo Android autenticado e conectado");
            ws.send("OK"); // 2 bytes
        },
        async message(ws, payload) {

            // separa o payload em strings
            const splitedPayload = payload.trim().split(',');

            // faz uma verificação de validade do payload
            const [flag, msg] = dataValidation(splitedPayload);
            if (flag) {
                console.log(`⚠️ Pacote malformado ignorado: ${msg}`);
                ws.send(`0,M`);
                return;
            }

            // imprime no console
            const unixTs = Number(splitedPayload[0]);
            const timestamp = new Date(unixTs * 1000).toISOString();
            const idMotorista = splitedPayload[1] as string;
            const bpm = Number(splitedPayload[2]);
            const vfc = Number(splitedPayload[3]);
            const spo2 = Number(splitedPayload[4]);
            console.log(`[Motorista ${idMotorista} | ${timestamp}] BPM: ${bpm} | SpO2: ${spo2}% | VFC: ${vfc}ms`);


            try {
                // tenta salvar no banco de dados local
                await salvarTelemetria({ unixTs, idMotorista, payload: payload });
                ws.send(`1,${unixTs}`); // ACK — cliente remove do banco local
            } catch (err) {
                console.error("❌ Falha ao persistir telemetria:", err);
                ws.send(`0,${unixTs}`); // NACK — cliente mantém e reenvia
            }
        },
        close() {
            console.log("Cliente desconectado");
        }
    })
    // ====================================================================
    // ROTA DE ENVIO DA TELEMETRIA
    // ====================================================================
    .ws("/loadtelemetry", {
        // GUARD 1 - validação de TOKEN - segurança!!
        beforeHandle({ headers, set }) {
            const token = headers['authorization'];
            if (token !== API_KEY) {
                console.warn("🛑 /loadtelemetry: Conexão bloqueada");
                set.status = 401;
                return "Não autorizado";
            }
        },
        // GUARD 2 - validação de estrutura da mensagem recebida, deve ser string
        body: t.String(),
        // Timeout de ociosidade: encerra conexões zumbis (sem envio ou ping) após 60s
        idleTimeout: 60,

        /* listener de abertura da conexão */
        open(ws) {
            console.log("💻 Servidor conectado e pronto para receber dados (/loadtelemetry)");
            // Envia um JSON para manter um padrão rigoroso de comunicação
            ws.send(JSON.stringify({ action: "CONEXAO_ESTABELECIDA" }));
        },
        /* listener do recebimmento de mensagens */
        async message(ws, payload) {

            // Garantir que o payload seja interpretado corretamente
            let jsonPayload;
            try {
                jsonPayload = JSON.parse(payload.trim());
            } catch (error) {
                console.error("❌ Erro de Parse no payload:", error);
                ws.send(JSON.stringify({ action: "ERROR", message: "Payload inválido: não é um JSON válido" }));
                return;
            }

            // AÇÃO 1: Servidor solicita dados (FETCH)
            if (jsonPayload.action === "FETCH") {
                try {
                    const limite = jsonPayload.limit || 500; // obtém o maximo de registro a serem enviados
                    console.log(`⏳ PC solicitou dados. Buscando lote de até ${limite} registros...`);

                    //await buscarLoteDeTelemetria(limite); // busca os dados 
                    const registros = [ // registros fake
                        { payload: "1747238400,001,72,45,98,0" }
                    ];

                    // Envia os dados para o Servidor
                    ws.send(JSON.stringify({
                        action: "BATCH",
                        data: registros
                    }));
                } catch (error) {
                    console.error("❌ Erro ao buscar lote (FETCH):", error);
                    ws.send(JSON.stringify({ action: "ERROR", message: "Falha interna ao buscar registros no banco" }));
                }
            }
            // AÇÃO 2: Servidor confirmou o recebimento e pede exclusão (ACK)
            else if (jsonPayload.action === "ACK") {
                try {
                    const chavesParaDeletar = jsonPayload.keys; // Array de {unixTs, idMotorista}

                    if (chavesParaDeletar && chavesParaDeletar.length > 0) {
                        //await deletarLoteDeTelemetria(chavesParaDeletar);
                        console.log(`✅ Lote de ${chavesParaDeletar.length} registros deletado da VPS.`);
                    }

                    // avisa ao Servidor que já terminou de deletar e libera para o próximo pedido
                    ws.send(JSON.stringify({ action: "ACK_CONFIRMED" }));
                } catch (error) {
                    console.error("❌ Erro ao processar exclusão (ACK):", error);
                    ws.send(JSON.stringify({ action: "ERROR", message: "Falha interna ao deletar lote" }));
                }
            } else {
                console.warn(`⚠️ Ação desconhecida recebida: ${jsonPayload.action}`);
                ws.send(JSON.stringify({ action: "ERROR", message: "Ação não reconhecida" }));
            }
        },
        close() {
            console.log("💻 Servidor desconectado");
        }
    })
    /// ====================================================================
    // ROTA DE TESTE HTTPS
    // ====================================================================
    .get('/', () => ({
        status: "online",
        message: "Hello World: saudenabr.algol.dev",
        timestamp: new Date()
    }))
    .listen(3003)

console.log('🚀 App Principal rodando na porta 3003')

/** Faz validação básica do payload */
function dataValidation(splitedPayload: string[]): [boolean, string] {
    if (splitedPayload.length !== 5) return [true, "Payload deve posssuir 5 parâmetros!"]
    if (isNaN(Number(splitedPayload[0])) ||
        isNaN(Number(splitedPayload[2])) ||
        isNaN(Number(splitedPayload[3])) ||
        isNaN(Number(splitedPayload[4]))) {
        return [true, "Payload com dados inválidos (NaN)"]
    }
    return [false, ""]
}
