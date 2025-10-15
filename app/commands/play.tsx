import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { Option, SlashCommand } from "mango";
import { db } from "../../db/database";
import { eq, like, sql } from "drizzle-orm";
import { Commands, Memes } from "../../db/schema";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
} from "@discordjs/voice";

import { Readable } from "stream";

export const command = (
  <SlashCommand name="play" description="Play a meme">
    <Option
      name="meme"
      description="Meme to play"
      type="String"
      required
      autocomplete
    ></Option>
  </SlashCommand>
);

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
  },
});

player.on("error", (error) => {
  console.error("Error:", error.message);
});

export default class PlayController {
  async onChatInput(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("meme");
    if (!name) return await interaction.reply(`404 Meme not found`);
    const command = await db.query.commands.findFirst({
      where: eq(Commands.name, name),
      with: { meme: { columns: { id: true, name: true, playCount: true } } },
    });
    const meme = command?.meme;
    if (!meme) return await interaction.reply(`404 Meme not found`);
    await this.playAudio(meme.id, interaction, meme.name);
    await db
      .update(Memes)
      .set({
        playCount: meme.playCount + 1,
        // TODO: remove once this is fixed https://github.com/drizzle-team/drizzle-orm/issues/2388
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(Memes.id, meme.id));
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

  private async playAudio(
    id: string,
    interaction: ChatInputCommandInteraction,
    memeName: string
  ) {
    const res = await fetch(
      `${Bun.env.BUCKET_ENDPOINT}/${Bun.env.BUCKET!}/audio/${id}.webm`
    );
    const readable = Readable.fromWeb((await res.blob()).stream());
    const voiceConn = joinVoiceChannel({
      channelId: Bun.env.CHANNEL_ID!,
      guildId: Bun.env.GUILD_ID!,
      selfDeaf: true,
      selfMute: false,
      adapterCreator: interaction.guild?.voiceAdapterCreator!,
    });
    voiceConn.once(VoiceConnectionStatus.Ready, () => {
      console.log(
        "The connection has entered the Ready state - ready to play audio!"
      );
      const resource = createAudioResource(readable, {
        inputType: StreamType.WebmOpus,
      });
      player.play(resource);
      voiceConn.subscribe(player);
      player.once(AudioPlayerStatus.Idle, () => {
        voiceConn.destroy();
      });
      interaction.reply(`Playing ${memeName}`);
    });
  }
}
