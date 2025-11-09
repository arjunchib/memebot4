import { ModalSubmitInteraction } from "discord.js";
import { AudioService } from "../services/audio_service";
import { VoiceService } from "../services/voice_service";
import { Command, Meme, MemeTag, Tag } from "../../db/schema";
import { db } from "../../db/database";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { MemeInfo } from "../views/meme_info";
import { InfoFields } from "../views/info_fields";
import { DownloadFields } from "../views/download_fields";
import { createValidator } from "../helpers";
import { ErrorMessage } from "../views/error_message";

type ActionType = "edit" | "redownload";

export default class EditController {
  private isValidAction = createValidator("edit", "redownload");

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferUpdate();

    try {
      const [_, action, id] = interaction.customId.split(":");

      if (id == null) throw new Error("Cannot find meme");
      if (!this.isValidAction(action)) throw new Error("Action is invalid");

      switch (action) {
        case "edit":
          return this.edit(interaction, id);
        case "redownload":
          return this.redownload(interaction, id);
      }
    } catch (e) {
      await interaction.followUp(<ErrorMessage error={e} ephemeral />);
    }
  }

  private async edit(interaction: ModalSubmitInteraction, id: string) {
    const { commands, tags, name } = InfoFields.parse(interaction);

    const duplicateCommands = await db.query.commands.findMany({
      where: and(inArray(Command.name, commands), ne(Command.memeId, id)),
      columns: { name: true },
    });

    if (duplicateCommands.length) {
      throw new Error(
        `Cannot add duplicate commands: ${duplicateCommands
          .map((c) => c.name)
          .join(", ")}`
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(MemeTag).where(eq(MemeTag.memeId, id));
      if (tags.length) {
        await tx
          .insert(Tag)
          .values(tags.map((tag) => ({ name: tag })))
          .onConflictDoNothing();
        await tx
          .insert(MemeTag)
          .values(tags.map((tag) => ({ tagName: tag, memeId: id })));
      }
      await tx.delete(Command).where(eq(Command.memeId, id));
      await tx
        .insert(Command)
        .values(commands.map((command) => ({ name: command, memeId: id })));
      await tx
        .update(Meme)
        .set({ name, updatedAt: sql`(unixepoch())` })
        .where(eq(Meme.id, id));
    });

    await interaction.editReply(<MemeInfo info={await MemeInfo.getInfo(id)} />);
  }

  private async redownload(interaction: ModalSubmitInteraction, id: string) {
    const { sourceUrl, start, end } = DownloadFields.parse(interaction);

    const audioService = new AudioService({ id, sourceUrl, start, end });
    const { file, waveformFile, loudness, parsedSourceUrl, stats } =
      await audioService.download();
    await VoiceService.shared.play(interaction, file);

    await db
      .update(Meme)
      .set({
        start,
        end,
        sourceUrl: parsedSourceUrl,
        loudnessI: loudness.output_i,
        loudnessLra: loudness.output_lra,
        loudnessThresh: loudness.output_thresh,
        loudnessTp: loudness.output_tp,
        ...stats,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(Meme.id, id));

    await Promise.all([
      Bun.s3.write(`audio/${id}.webm`, Bun.file(file), {
        acl: "public-read",
        type: "audio/webm",
      }),
      Bun.s3.write(`waveform/${id}.png`, Bun.file(waveformFile), {
        acl: "public-read",
        type: "image/png",
      }),
    ]);

    await interaction.editReply(<MemeInfo info={await MemeInfo.getInfo(id)} />);
  }
}
