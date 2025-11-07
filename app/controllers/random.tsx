import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { db } from "../../db/database";
import { eq, like, sql } from "drizzle-orm";
import { Command, Meme, MemeTag, Tag } from "../../db/schema";

import { VoiceService } from "../services/voice_service";
import { env } from "../services/env_service";
import { ErrorMessage } from "../views/error_message";
import { Message } from "mango";

export default class RandomController {
  async onChatInput(interaction: ChatInputCommandInteraction) {
    try {
      const tag = interaction.options.getString("tag");
      const memes = tag
        ? await this.getMemesByTag(tag)
        : await this.getAllMemes();
      const randIdx = Math.floor(Math.random() * memes.length);
      const meme = memes[randIdx];
      if (!meme) throw new Error(`Cannot find meme`);
      await VoiceService.shared.play(
        `${env.s3Endpoint}/${env.s3Bucket}/audio/${meme.id}.webm`
      );
      await interaction.reply(`Playing *${meme.name}*`);
      await db
        .update(Meme)
        .set({
          playCount: meme.randomPlayCount + 1,
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
        interaction.followUp(<ErrorMessage error={e} ephemeral />);
      } else {
        interaction.reply(<ErrorMessage error={e} ephemeral />);
      }
    }
  }

  private async getAllMemes() {
    return await db.query.memes.findMany({
      columns: { id: true, name: true, randomPlayCount: true },
    });
  }

  private async getMemesByTag(tag: string) {
    const result = await db.query.memeTags.findMany({
      where: eq(MemeTag.tagName, tag),
      with: {
        meme: { columns: { name: true, randomPlayCount: true, id: true } },
      },
    });
    return result.map((mt) => mt.meme);
  }

  async onAutocomplete(interaction: AutocompleteInteraction) {
    const name = interaction.options.getFocused();
    const tags = await db
      .select({ name: Tag.name })
      .from(Tag)
      .where(like(Tag.name, `%${name}%`))
      .limit(25);
    await interaction.respond(tags.map(({ name }) => ({ name, value: name })));
  }
}
