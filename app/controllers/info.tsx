import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../db/database";
import { eq, like, sql } from "drizzle-orm";
import { Commands, Memes } from "../../db/schema";
import { MemeInfo } from "../views/meme_info";
import { Modal } from "mango";
import { DownloadFields } from "../views/download_fields";
import { InfoFields } from "../views/info_fields";
import { VoiceService } from "../services/voice_service";
import { env } from "../services/env_service";
import { withinLastHour } from "../helpers";
import { ErrorMessage } from "../views/error_message";

export default class InfoController {
  private voiceService = VoiceService.getShared();

  async onButton(interaction: ButtonInteraction) {
    const [_, action, id] = interaction.customId.split(":") as [
      null,
      "play" | "edit" | "delete" | "redownload",
      string
    ];
    switch (action) {
      case "play":
        return await this.play(interaction, id);
      case "edit":
        return await this.edit(interaction, id);
      case "redownload":
        return await this.redownload(interaction, id);
      case "delete":
        return await this.delete(interaction, id);
      default:
        return await interaction.deferUpdate();
    }
  }

  private async play(interaction: ButtonInteraction, id: string) {
    await interaction.deferUpdate();

    const meme = await db.query.memes.findFirst({
      where: eq(Memes.id, id),
      columns: { id: true, name: true, playCount: true },
    });

    if (!meme) throw new Error("No meme");

    await this.voiceService.play(
      `${env.S3_ENDPOINT}/${env.S3_BUCKET}/audio/${meme.id}.webm`
    );

    await db
      .update(Memes)
      .set({
        playCount: meme.playCount + 1,
        // TODO: remove once this is fixed https://github.com/drizzle-team/drizzle-orm/issues/2388
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(Memes.id, meme.id));
  }

  private async edit(interaction: ButtonInteraction, id: string) {
    const meme = await db.query.memes.findFirst({
      where: eq(Memes.id, id),
      with: {
        commands: { columns: { name: true } },
        memeTags: { columns: { tagName: true } },
      },
    });
    if (!meme) throw new Error("No meme");
    const commands = meme.commands.map((c) => c.name);
    const tags = meme.memeTags.map((t) => t.tagName);
    const { name } = meme;
    return await interaction.showModal(
      <Modal title="Edit meme" custom_id={`edit:edit:${id}`}>
        <InfoFields {...{ tags, commands, name }} />
      </Modal>
    );
  }
  private async redownload(interaction: ButtonInteraction, id: string) {
    const meme = await db.query.memes.findFirst({
      where: eq(Memes.id, id),
      columns: { sourceUrl: true, start: true, end: true },
    });
    if (!meme) throw new Error("No meme");
    const { sourceUrl, start, end } = meme;
    return await interaction.showModal(
      <Modal title="Edit meme" custom_id={`edit:redownload:${id}`}>
        <DownloadFields {...{ sourceUrl, start, end }} />
      </Modal>
    );
  }

  private async delete(interaction: ButtonInteraction, id: string) {
    const meme = await db.query.memes.findFirst({
      where: eq(Memes.id, id),
      columns: { authorId: true, name: true },
    });
    if (
      env.ADMIN_ID !== interaction.user.id &&
      meme?.authorId !== interaction.user.id
    ) {
      throw new Error("Not authorized to delete this meme");
    }
    await db.delete(Memes).where(eq(Memes.id, id));
    interaction.editReply(`Deleted *${meme?.name}*`);
  }

  async onChatInput(interaction: ChatInputCommandInteraction) {
    try {
      const name = interaction.options.getString("meme");
      if (!name) throw new Error("No meme");
      const command = await db.query.commands.findFirst({
        where: eq(Commands.name, name),
        columns: { memeId: true },
      });
      const id = command?.memeId;
      if (!id) throw new Error("No meme");
      await interaction.reply(<MemeInfo info={await MemeInfo.getInfo(id)} />);
    } catch (e) {
      await interaction.reply(<ErrorMessage error={e} />);
    }
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
