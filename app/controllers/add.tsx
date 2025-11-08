import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { AudioService } from "../services/audio_service";
import { VoiceService } from "../services/voice_service";
import { Command, Meme, MemeTag, Tag } from "../../db/schema";
import { db } from "../../db/database";
import { MemeInfo } from "../views/meme_info";
import { inArray } from "drizzle-orm";
import { ActionRow, Button, Modal } from "mango";
import { DownloadFields } from "../views/download_fields";
import { InfoFields } from "../views/info_fields";
import { ErrorMessage } from "../views/error_message";
import { unlink } from "fs/promises";
import { kv } from "../services/kv_service";

interface AddFields {
  sourceUrl?: string;
  start?: string;
  end?: string;
  tags?: string[];
  commands?: string[];
  name?: string;
}

const DAY = 1000 * 60 * 60 * 24;

export default class AddController {
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
    const id = Bun.randomUUIDv7();

    try {
      // Get fields
      const author = interaction.user;
      const { sourceUrl, start, end } = DownloadFields.parse(interaction);
      const { tags, commands, name } = InfoFields.parse(interaction);

      // Save fields
      await kv.set<AddFields>(
        `add:${id}`,
        {
          sourceUrl,
          start,
          end,
          tags,
          commands,
          name,
        },
        new Date(Date.now() + DAY)
      );

      // Parse name
      if (!name) {
        throw new Error("No commands provided");
      }

      // Check commands
      const duplicateCommands = await db.query.commands.findMany({
        where: inArray(Command.name, commands),
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
      const { file, waveformFile, loudness, parsedSourceUrl, stats } =
        await audioService.download();
      await VoiceService.shared.play(interaction, file);

      await db.transaction(async (tx) => {
        await tx.insert(Meme).values({
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
          .insert(Command)
          .values(commands.map((command) => ({ name: command, memeId: id })));
        if (tags.length) {
          await tx
            .insert(Tag)
            .values(tags.map((tag) => ({ name: tag })))
            .onConflictDoNothing();
          await tx
            .insert(MemeTag)
            .values(tags.map((tag) => ({ tagName: tag, memeId: id })));
        }
      });

      await Bun.s3.write(`audio/${id}.webm`, Bun.file(file), {
        acl: "public-read",
        type: "audio/webm",
      });

      await Bun.s3.write(`waveform/${id}.png`, Bun.file(waveformFile), {
        acl: "public-read",
        type: "image/png",
      });

      await unlink(waveformFile);

      await interaction.editReply(
        <MemeInfo info={await MemeInfo.getInfo(id)} />
      );
    } catch (e) {
      interaction.editReply(
        <ErrorMessage error={e} ephemeral>
          <ActionRow>
            <Button style={ButtonStyle.Secondary} custom_id={`add:retry:${id}`}>
              Try Again
            </Button>
          </ActionRow>
        </ErrorMessage>
      );
    }
  }

  async onButton(interaction: ButtonInteraction) {
    try {
      const [, , id] = interaction.customId.split(":");
      const fields = await kv.get<AddFields>(`add:${id}`);
      if (!fields) throw new Error("Cannot find fields");
      const { sourceUrl, start, end, tags, commands, name } = fields;
      await interaction.showModal(
        <Modal title="Add meme" custom_id="add">
          <DownloadFields {...{ sourceUrl, start, end }} />
          <InfoFields {...{ commands, tags, name }} />
        </Modal>
      );
    } catch (e) {
      await interaction.followUp(<ErrorMessage error={e} ephemeral />);
    }
  }
}
