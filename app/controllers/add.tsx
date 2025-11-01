import {
  ButtonStyle,
  ChatInputCommandInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";
import { AudioService } from "../services/audio_service";
import { VoiceService } from "../services/voice_service";
import { Commands, Memes, MemeTags, Tags } from "../../db/schema";
import { db } from "../../db/database";
import { MemeInfo } from "../views/meme_info";
import { inArray } from "drizzle-orm";
import { ActionRow, Button, Modal } from "mango";
import { DownloadFields } from "../views/download_fields";
import { InfoFields } from "../views/info_fields";
import { ErrorMessage } from "../views/error_message";

export default class AddController {
  private voiceService = VoiceService.getShared();

  async onChatInput(interaction: ChatInputCommandInteraction) {
    await interaction.showModal(
      <Modal title="Add meme" custom_id="add">
        <DownloadFields />
        <InfoFields />
      </Modal>
    );
  }

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply();

    try {
      // Get fields
      const id = Bun.randomUUIDv7();
      const author = interaction.user;
      const { sourceUrl, start, end } = DownloadFields.parse(interaction);
      const { tags, commands, name } = InfoFields.parse(interaction);

      if (!name) {
        throw new Error("No commands provided");
      }

      // Check commands
      const duplicateCommands = await db.query.commands.findMany({
        where: inArray(Commands.name, commands),
        columns: {
          name: true,
        },
      });

      if (duplicateCommands.length) {
        throw new Error(
          `Cannot add duplicate commands: ${duplicateCommands
            .map((c) => c.name)
            .join(", ")}`
        );
      }

      // Pull audio
      const audioService = new AudioService({ id, sourceUrl, start, end });
      const { file, loudness, parsedSourceUrl, stats } =
        await audioService.download();
      await this.voiceService.play(file);

      await db.transaction(async (tx) => {
        await tx.insert(Memes).values({
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
        });
        await tx
          .insert(Commands)
          .values(commands.map((command) => ({ name: command, memeId: id })));
        if (tags.length) {
          await tx
            .insert(Tags)
            .values(tags.map((tag) => ({ name: tag })))
            .onConflictDoNothing();
          await tx
            .insert(MemeTags)
            .values(tags.map((tag) => ({ tagName: tag, memeId: id })));
        }
      });

      await Bun.s3.write(`audio/${id}.webm`, Bun.file(file), {
        acl: "public-read",
        type: "audio/webm",
      });

      await interaction.editReply(
        <MemeInfo info={await MemeInfo.getInfo(id)} />
      );
    } catch (e) {
      interaction.editReply(
        <ErrorMessage error={e}>
          <ActionRow>
            <Button style={ButtonStyle.Secondary} custom_id="add:retry">
              Try Again
            </Button>
          </ActionRow>
        </ErrorMessage>
      );
    }
  }
}
