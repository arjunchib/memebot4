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

type ActionType = "edit" | "redownload";
export default class EditController {
  private voiceService = VoiceService.getShared();

  private isAction(action: string | undefined): action is ActionType {
    if (action == null) throw new Error("Action is undefined");
    return ["edit", "redownload"].includes(action);
  }

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferUpdate();

    const [_, action, id] = interaction.customId.split(":");

    if (id == null) {
      return interaction.editReply(<Message>Cannot determine id</Message>);
    }

    try {
      if (!this.isAction(action)) throw new Error("Action is invalid");
      switch (action) {
        case "edit":
          return this.edit(interaction, id);
        case "redownload":
          return this.redownload(interaction, id);
      }
    } catch (error: any) {
      console.error(error);
      const meme = await db.query.memes.findFirst({
        where: eq(Memes.id, id),
        with: {
          memeTags: { columns: { tagName: true } },
          commands: { columns: { name: true } },
        },
      });
      if (!meme) {
        return interaction.editReply(
          <Message>{error?.message || error || "Error"}</Message>
        );
      }
      const tags = meme?.memeTags.map((mt) => mt.tagName);
      const commands = meme?.commands.map((c) => c.name);
      interaction.editReply(<MemeInfo {...{ meme, tags, commands, error }} />);
    }
  }

  private async edit(interaction: ModalSubmitInteraction, id: string) {
    // if (!interaction.isFromMessage()) throw new Error("Not from button click");

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

    const info = await db.transaction(async (tx) => {
      await tx
        .insert(Tags)
        .values(tags.map((tag) => ({ name: tag })))
        .onConflictDoNothing();
      await tx.delete(MemeTags).where(eq(MemeTags.memeId, id));
      await tx
        .insert(MemeTags)
        .values(tags.map((tag) => ({ tagName: tag, memeId: id })))
        .onConflictDoNothing();
      await tx.delete(Commands).where(eq(Commands.memeId, id));
      await tx
        .insert(Commands)
        .values(commands.map((command) => ({ name: command, memeId: id })))
        .onConflictDoNothing();
      const [meme] = await tx
        .update(Memes)
        .set({ name, updatedAt: sql`(unixepoch())` })
        .where(eq(Memes.id, id))
        .returning();
      const memeTags = await tx.query.memeTags.findMany({
        where: eq(MemeTags.memeId, id),
        columns: { tagName: true },
      });
      const myCommands = await tx.query.commands.findMany({
        where: eq(Commands.memeId, id),
        columns: { name: true },
      });
      console.log(memeTags);
      return {
        meme,
        tags: memeTags.map((mt) => mt.tagName),
        commands: myCommands.map((c) => c.name),
      };
    });
    if (!info.meme) throw new Error("No meme");

    await interaction.editReply(
      <MemeInfo meme={info.meme} tags={info.tags} commands={info.commands} />
    );
  }

  private async redownload(interaction: ModalSubmitInteraction, id: string) {
    // if (!interaction.isFromMessage()) throw new Error("Not from button click");

    const { sourceUrl, start, end } = DownloadFields.parse(interaction);

    const audioService = new AudioService({ id, sourceUrl, start, end });
    const { file, loudness, parsedSourceUrl, stats } =
      await audioService.download();
    await this.voiceService.play(file);

    const info = await db.transaction(async (tx) => {
      const [meme] = await tx
        .update(Memes)
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
        .returning();
      const returnedTags = await tx.query.memeTags.findMany({
        where: eq(MemeTags.memeId, id),
        columns: { tagName: true },
      });
      const returnedCommands = await tx.query.commands.findMany({
        where: eq(Commands.memeId, id),
        columns: { name: true },
      });
      return {
        meme,
        tags: returnedTags.map((t) => t.tagName),
        commands: returnedCommands.map((c) => c.name),
      };
    });
    if (!info.meme) throw new Error("Cannot find meme");

    await Bun.s3.write(`audio/${id}.webm`, Bun.file(file), {
      acl: "public-read",
      type: "audio/webm",
    });

    await interaction.editReply(
      <MemeInfo meme={info.meme} tags={info.tags} commands={info.commands} />
    );
  }
}
