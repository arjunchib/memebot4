import { GatewayIntentBits } from "discord.js";
import { bootstrap } from "mango";

export const client = await bootstrap({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
