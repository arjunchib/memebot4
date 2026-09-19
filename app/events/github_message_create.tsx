import { client } from "../client";
import { env } from "../services/env_service";
import { $ } from "bun";

client.on("messageCreate", async (message) => {
  if (env.githubUserId && message.author.id === env.githubUserId) {
    await message.reply("Restarting");
    $`sudo ./restart`;
  }
});
