import { MessageFlags, ModalSubmitInteraction } from "discord.js";
import { AudioService } from "../services/audio_service";
import { VoiceService } from "../services/voice_service";
import { Commands, Memes, MemeTags } from "../../db/schema";
import { db } from "../../db/database";
import { MemeModal } from "../views/meme_modal";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { MemeInfo } from "../views/meme_info";

export default class EditController {
  private voiceService = VoiceService.getShared();

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    // Defer
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get fields
    const { sourceUrl, start, end, tags, commands, name, id } =
      MemeModal.parseFields(interaction);
    if (!id) throw new Error("Missing id");

    // Check commands
    const duplicateCommands = await db.query.commands.findMany({
      where: and(inArray(Commands.name, commands), ne(Commands.memeId, id)),
      columns: {
        name: true,
      },
    });

    if (duplicateCommands.length) {
      return await interaction.editReply(
        `Cannot add duplicate commands: *${duplicateCommands
          .map((c) => c.name)
          .join(", ")}*`
      );
    }

    const { authorId } =
      (await db.query.memes.findFirst({
        where: eq(Memes.id, id),
        columns: { authorId: true },
      })) || {};

    // Pull audio
    const audioService = new AudioService({ id, sourceUrl, start, end });
    const { file, loudness, parsedSourceUrl, stats } =
      await audioService.download();
    await this.voiceService.play(file);

    const info = await db.transaction(async (tx) => {
      const data = {
        id,
        name,
        start,
        end,
        sourceUrl: parsedSourceUrl,
        authorId: authorId,
        loudnessI: loudness.output_i,
        loudnessLra: loudness.output_lra,
        loudnessThresh: loudness.output_thresh,
        loudnessTp: loudness.output_tp,
        ...stats,
      };
      const [meme] = await tx
        .insert(Memes)
        .values(data)
        .onConflictDoUpdate({
          target: Memes.id,
          set: { ...data, updatedAt: sql`(unixepoch())` },
        })
        .returning();
      const returnedTags = await tx
        .insert(MemeTags)
        .values(tags.map((tag) => ({ tagName: tag, memeId: id })))
        .onConflictDoNothing()
        .returning({ tagName: MemeTags.tagName });
      const returnedCommands = await tx
        .insert(Commands)
        .values(commands.map((command) => ({ name: command, memeId: id })))
        .onConflictDoNothing()
        .returning({ name: Commands.name });
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
