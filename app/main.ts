import { bootstrap } from "mango";
import { setupCron } from "./cron";

// Larger stack traces
Error.stackTraceLimit = 20;

// Run discord bot
export const client = bootstrap();

// Setup cron
setupCron();
