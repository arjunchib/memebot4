import { MessageFlags, ModalSubmitInteraction } from "discord.js";
import { AudioService } from "../services/audio_service";
import { VoiceService } from "../services/voice_service";
import { Commands, Memes, MemeTags, Tags } from "../../db/schema";
import { db } from "../../db/database";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { MemeInfo } from "../views/meme_info";
import { InfoFields } from "../views/info_fields";
import { DownloadFields } from "../views/download_fields";
import { Message } from "mango";
import { createValidator } from "../helpers";

type ActionType = "edit" | "redownload";

export default class EditController {
  private voiceService = VoiceService.getShared();
  private isValidAction = createValidator("edit", "redownload");

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferUpdate();

    const [_, action, id] = interaction.customId.split(":");

    if (id == null) {
      return interaction.editReply(<Message>Cannot determine id</Message>);
    }

    try {
      if (!this.isValidAction(action)) throw new Error("Action is invalid");
      switch (action) {
        case "edit":
          return this.edit(interaction, id);
        case "redownload":
          return this.redownload(interaction, id);
      }
    } catch (e: any) {
      interaction.editReply(
        <MemeInfo info={await MemeInfo.getInfo(id)} error={e} />
      );
    }
  }

  private async edit(interaction: ModalSubmitInteraction, id: string) {
    const { commands, tags, name } = InfoFields.parse(interaction);

    const duplicateCommands = await db.query.commands.findMany({
      where: and(inArray(Commands.name, commands), ne(Commands.memeId, id)),
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
      await tx.delete(MemeTags).where(eq(MemeTags.memeId, id));
      if (tags.length) {
        await tx
          .insert(Tags)
          .values(tags.map((tag) => ({ name: tag })))
          .onConflictDoNothing();
        await tx
          .insert(MemeTags)
          .values(tags.map((tag) => ({ tagName: tag, memeId: id })));
      }
      await tx.delete(Commands).where(eq(Commands.memeId, id));
      await tx
        .insert(Commands)
        .values(commands.map((command) => ({ name: command, memeId: id })));
      await tx
        .update(Memes)
        .set({ name, updatedAt: sql`(unixepoch())` })
        .where(eq(Memes.id, id));
    });

    await interaction.editReply(<MemeInfo info={await MemeInfo.getInfo(id)} />);
  }

  private async redownload(interaction: ModalSubmitInteraction, id: string) {
    const { sourceUrl, start, end } = DownloadFields.parse(interaction);

    const audioService = new AudioService({ id, sourceUrl, start, end });
    const { file, waveformFile, loudness, parsedSourceUrl, stats } =
      await audioService.download();
    await this.voiceService.play(file);

    await db.update(Memes).set({
      start,
      end,
      sourceUrl: parsedSourceUrl,
      loudnessI: loudness.output_i,
      loudnessLra: loudness.output_lra,
      loudnessThresh: loudness.output_thresh,
      loudnessTp: loudness.output_tp,
      ...stats,
      updatedAt: sql`(unixepoch())`,
    });

    await Bun.s3.write(`audio/${id}.webm`, Bun.file(file), {
      acl: "public-read",
      type: "audio/webm",
    });

    await Bun.s3.write(`waveform/${id}.png`, Bun.file(waveformFile), {
      acl: "public-read",
      type: "image/png",
    });

    await interaction.editReply(<MemeInfo info={await MemeInfo.getInfo(id)} />);
  }
}
