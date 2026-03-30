import { bootstrap } from "mango";
import { setupCron } from "./cron";
import { router } from "../api/router";

// Larger stack traces
Error.stackTraceLimit = 20;

// Run discord bot
export const client = bootstrap();

// Setup cron
setupCron();

// Start web server
const port = Bun.env.PORT ?? 3000;
Bun.serve({ port, fetch: router });
console.log(`Server listening on http://localhost:${port}`);
