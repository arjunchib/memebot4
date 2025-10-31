import {
  ChatInputCommandInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";
import { AudioService } from "../services/audio_service";
import { VoiceService } from "../services/voice_service";
import { Commands, Memes, MemeTags, Tags } from "../../db/schema";
import { db } from "../../db/database";
import { MemeModal } from "../views/meme_modal";
import { MemeInfo } from "../views/meme_info";
import { inArray } from "drizzle-orm";

export default class AddController {
  private voiceService = VoiceService.getShared();

  async onChatInput(interaction: ChatInputCommandInteraction) {
    await interaction.showModal(<MemeModal />);
  }

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    // Defer
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get fields
    const id = Bun.randomUUIDv7();
    const author = interaction.user;
    const { sourceUrl, start, end, tags, commands, name } =
      MemeModal.parseFields(interaction);

    // Check commands
    const duplicateCommands = await db.query.commands.findMany({
      where: inArray(Commands.name, commands),
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

    // Pull audio
    const audioService = new AudioService({ id, sourceUrl, start, end });
    const { file, loudness, parsedSourceUrl, stats } =
      await audioService.download();
    await this.voiceService.play(file);

    const info = await db.transaction(async (tx) => {
      const [meme] = await tx
        .insert(Memes)
        .values({
          id,
          name,
          start,
          end,
          sourceUrl: parsedSourceUrl,
          authorId: author.id,
          loudnessI: loudness.output_i,
          loudnessLra: loudness.output_lra,
          loudnessThresh: loudness.output_thresh,
          loudnessTp: loudness.output_tp,
          ...stats,
        })
        .returning();
      await tx
        .insert(Tags)
        .values(tags.map((tag) => ({ name: tag })))
        .onConflictDoNothing();
      const returnedTags = await tx
        .insert(MemeTags)
        .values(tags.map((tag) => ({ tagName: tag, memeId: id })))
        .returning({ tagName: MemeTags.tagName });
      const returnedCommands = await tx
        .insert(Commands)
        .values(commands.map((command) => ({ name: command, memeId: id })))
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
