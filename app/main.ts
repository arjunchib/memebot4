import { setupCron } from "./cron";
import { router } from "../api/router";
// import { OAuth2Scopes } from "discord.js";

// Start discord client
const { client } = await import("./client");

import("./events/llm_message_create");
import("./events/github_message_create");

// console.log(
//   client.generateInvite({
//     scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
//     permissions: [
//       "Connect",
//       "Speak",
//       "SendMessages",
//       "AttachFiles",
//       "ManageChannels",
//       "SendMessages",
//     ],
//   }),
// );

// Larger stack traces
Error.stackTraceLimit = 20;

// Setup cron
setupCron();

// Start web server
const port = Bun.env.PORT ?? 3000;
Bun.serve({ port, fetch: router });
console.log(`Server listening on http://localhost:${port}`);
