import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../db/database";
import { eq, like, sql } from "drizzle-orm";
import { Command, Meme, Play } from "../../db/schema";
import { MemeInfo } from "../views/meme_info";
import { Message, Modal } from "mango";
import { DownloadFields } from "../views/download_fields";
import { InfoFields } from "../views/info_fields";
import { VoiceService } from "../services/voice_service";
import { env } from "../services/env_service";
import { createValidator } from "../helpers";
import { ErrorMessage } from "../views/error_message";
import { DeleteConfirmation } from "../views/delete_confirmation";
import { s3 } from "../services/s3_service";

export default class InfoController {
  private isValidAction = createValidator(
    "play",
    "edit",
    "delete",
    "redownload"
  );

  async onButton(interaction: ButtonInteraction) {
    const [_, action, id] = interaction.customId.split(":");

    if (!id) {
      return interaction.editReply(<Message>Cannot determine id</Message>);
    }

    try {
      if (!this.isValidAction(action)) throw new Error("Invalid action");

      switch (action) {
        case "play":
          return await this.play(interaction, id);
        case "edit":
          return await this.edit(interaction, id);
        case "redownload":
          return await this.redownload(interaction, id);
        case "delete":
          return await this.delete(interaction, id);
      }
    } catch (e) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      interaction.followUp(<ErrorMessage error={e} ephemeral />);
    }
  }

  private async play(interaction: ButtonInteraction, id: string) {
    await interaction.deferUpdate();
    const meme = await db.query.memes.findFirst({
      where: eq(Meme.id, id),
      columns: { id: true, name: true, playCount: true },
    });
    if (!meme) throw new Error("No meme");
    const playedAt = new Date();
    await VoiceService.shared.play(
      interaction,
      s3.public.file(`audio/${meme.id}.webm`)
    );
    await db
      .update(Meme)
      .set({
        playCount: meme.playCount + 1,
        // TODO: remove once this is fixed https://github.com/drizzle-team/drizzle-orm/issues/2388
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(Meme.id, meme.id));
    await db.insert(Play).values({
      playedAt,
      playedBy: interaction.user.id,
      isRandom: false,
      memeId: meme.id,
    });
    await interaction.editReply(<MemeInfo info={await MemeInfo.getInfo(id)} />);
  }

  private async edit(interaction: ButtonInteraction, id: string) {
    const meme = await db.query.memes.findFirst({
      where: eq(Meme.id, id),
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
      where: eq(Meme.id, id),
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
    await interaction.deferUpdate();
    try {
      const meme = await db.query.memes.findFirst({
        where: eq(Meme.id, id),
        columns: { authorId: true, name: true },
      });
      const allowed =
        env.adminId === interaction.user.id ||
        meme?.authorId === interaction.user.id;
      await interaction.followUp(<DeleteConfirmation {...{ id, allowed }} />);
    } catch (e) {
      interaction.followUp(<ErrorMessage ephemeral={true} error={e} />);
    }
  }

  async onChatInput(interaction: ChatInputCommandInteraction) {
    try {
      const name = interaction.options.getString("meme");
      if (!name) throw new Error("No meme");
      const command = await db.query.commands.findFirst({
        where: eq(Command.name, name),
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
