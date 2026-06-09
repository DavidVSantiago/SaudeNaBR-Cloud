// src/routes/saveTelemetry.ts
import { Elysia, t } from 'elysia';
import { salvarTelemetria } from '../db/telemetria.DAO';
import { dataValidation } from './utils'

const API_KEY = "#htxrlLaWaU3F8aNnjviFhreqyWzI1YowyZ8bFoCBNjhp8umKToLxTF4kau0tnp@";

export const saveTelemetryRoutes = new Elysia()
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
                await salvarTelemetria({ unixTs, idMotorista, data: payload });
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