import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { db } from "../../db/database";
import { eq, like, sql } from "drizzle-orm";
import { Command, Meme } from "../../db/schema";

import { VoiceService } from "../services/voice_service";
import { env } from "../services/env_service";
import { ErrorMessage } from "../views/error_message";
import { Message } from "mango";

export default class PlayController {
  async onChatInput(interaction: ChatInputCommandInteraction) {
    try {
      const name = interaction.options.getString("meme");
      if (!name) throw new Error(`Cannot find meme`);
      const command = await db.query.commands.findFirst({
        where: eq(Command.name, name),
        with: { meme: { columns: { id: true, name: true, playCount: true } } },
      });
      const meme = command?.meme;
      if (!meme) throw new Error(`Cannot find meme with name "${name}"`);
      await VoiceService.shared.play(
        interaction,
        `${env.s3Endpoint}/${env.s3Bucket}/audio/${meme.id}.webm`
      );
      await interaction.reply(`Playing *${name}*`);
      await db
        .update(Meme)
        .set({
          playCount: meme.playCount + 1,
          // TODO: remove once this is fixed https://github.com/drizzle-team/drizzle-orm/issues/2388
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(Meme.id, meme.id));
    } catch (e) {
      if (e instanceof Error && e.message === "Meme already playing") {
        return interaction.reply(
          <Message flags={MessageFlags.Ephemeral}>Meme already playing</Message>
        );
      }
      if (interaction.replied) {
        await interaction.followUp(<ErrorMessage error={e} ephemeral />);
      } else {
        await interaction.reply(<ErrorMessage error={e} ephemeral />);
      }
    }
  }

  async onAutocomplete(interaction: AutocompleteInteraction) {
    const name = interaction.options.getFocused();
    // group by meme so we can collapse commands into one entry
    const commandResults = await db
      .select({
        names: sql<string>`GROUP_CONCAT(${Command.name},';')`,
      })
      .from(Command)
      .where(like(Command.name, `%${name}%`))
      .groupBy(Command.memeId)
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
