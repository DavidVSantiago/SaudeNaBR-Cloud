import { Elysia, t } from 'elysia'
import { salvarTelemetria } from './db/telemetria.DAO'
import { saveTelemetryRoutes } from './src/saveTelemetry';
import { loadTelemetryRoutes } from './src/loadTelemetry';

// No futuro, você pode mover isso para um arquivo .env
const API_KEY = "#htxrlLaWaU3F8aNnjviFhreqyWzI1YowyZ8bFoCBNjhp8umKToLxTF4kau0tnp@";

new Elysia()
    // Acopla as rotas criadas de forma plugável
    .use(saveTelemetryRoutes)
    .use(loadTelemetryRoutes)
    .get('/', () => ({
        status: "online",
        message: "Hello World: saudenabr.algol.dev",
        timestamp: new Date()
    }))
    .listen(3003)

console.log('🚀 App Principal rodando na porta 3003')