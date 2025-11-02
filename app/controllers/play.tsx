import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../db/database";
import { eq, like, sql } from "drizzle-orm";
import { Commands, Memes } from "../../db/schema";

import { VoiceService } from "../services/voice_service";
import { env } from "../services/env_service";

export default class PlayController {
  private voiceService = VoiceService.getShared();

  async onChatInput(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("meme");
    if (!name) return await interaction.reply(`404 Meme not found`);
    const command = await db.query.commands.findFirst({
      where: eq(Commands.name, name),
      with: { meme: { columns: { id: true, name: true, playCount: true } } },
    });
    const meme = command?.meme;
    if (!meme) return await interaction.reply(`404 Meme not found`);
    await this.voiceService.play(
      `${env.s3Endpoint}/${env.s3Bucket}/audio/${meme.id}.webm`
    );
    interaction.reply(`Playing ${name}`);
    await db
      .update(Memes)
      .set({
        playCount: meme.playCount + 1,
        // TODO: remove once this is fixed https://github.com/drizzle-team/drizzle-orm/issues/2388
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(Memes.id, meme.id));
  }

  async onAutocomplete(interaction: AutocompleteInteraction) {
    const name = interaction.options.getFocused();
    // group by meme so we can collapse commands into one entry
    const commandResults = await db
      .select({
        names: sql<string>`GROUP_CONCAT(${Commands.name},';')`,
      })
      .from(Commands)
      .where(like(Commands.name, `%${name}%`))
      .groupBy(Commands.memeId)
      .limit(25);
    const choices = commandResults
      .map((c) => {
        const name = c.names.split(";")?.[0];
        if (!name) return null;
        return {
          name,
          value: name,
        };
      })
      .filter((choice) => !!choice);
    await interaction.respond(choices);
  }
}
