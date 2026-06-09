// src/routes/saveTelemetry.ts
import { Elysia, t } from 'elysia';
import { carregarTelemetria, deletarLoteDeTelemetria } from '../db/telemetria.DAO';
import { dataValidation } from './utils'

const API_KEY = "#htxrlLaWaU3F8aNnjviFhreqyWzI1YowyZ8bFoCBNjhp8umKToLxTF4kau0tnp@";

export const loadTelemetryRoutes = new Elysia()
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
        // GUARD 2 - validação de estrutura da mensagem recebida, deve ser um objeto json
        body: t.Object({
            action: t.String(),
            limit: t.Optional(t.Number()),
            keys: t.Optional(t.Array(t.Any())) // Para o envio do ACK
        }),
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

            // AÇÃO 1: Servidor solicita dados (FETCH)
            if (payload.action === "FETCH") {
                try {
                    const limite = payload.limit || 500; // obtém o maximo de registro a serem enviados
                    console.log(`⏳ PC solicitou dados. Buscando lote de até ${limite} registros...`);

                    const registros = await carregarTelemetria(limite); // busca os dados 

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
            else if (payload.action === "ACK") {
                try {
                    const chavesParaDeletar = payload.keys; // Array de {unixTs, idMotorista}

                    if (chavesParaDeletar && chavesParaDeletar.length > 0) {
                        await deletarLoteDeTelemetria(chavesParaDeletar);
                        console.log(`✅ Lote de ${chavesParaDeletar.length} registros deletado da VPS.`);
                    }

                    // avisa ao Servidor que já terminou de deletar e libera para o próximo pedido
                    ws.send(JSON.stringify({ action: "ACK_CONFIRMED" }));
                } catch (error) {
                    console.error("❌ Erro ao processar exclusão (ACK):", error);
                    ws.send(JSON.stringify({ action: "ERROR", message: "Falha interna ao deletar lote" }));
                }
            } else {
                console.warn(`⚠️ Ação desconhecida recebida: ${payload.action}`);
                ws.send(JSON.stringify({ action: "ERROR", message: "Ação não reconhecida" }));
            }
        },
        close() {
            console.log("💻 Servidor desconectado");
        }
    })