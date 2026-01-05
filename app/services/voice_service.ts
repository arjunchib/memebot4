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
import { client } from "../main";
import { env } from "./env_service";
import { type Interaction } from "discord.js";
import type { S3File } from "bun";

export class VoiceService {
  static #shared: VoiceService;

  static get shared() {
    return (this.#shared ||= new VoiceService());
  }

  private player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  }).on("error", (error) => {
    console.error(error);
  });

  async play(interaction: Interaction, file: string | Bun.S3File) {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      throw new Error("Meme already playing");
    }
    const { guildId, channelId } = this.getChannelInfo(interaction);
    const guild = await client.guilds.fetch(guildId);
    const resource = this.getResource(file);
    const voiceConn = joinVoiceChannel({
      channelId,
      guildId,
      selfDeaf: true,
      selfMute: false,
      adapterCreator: guild.voiceAdapterCreator,
    });
    voiceConn.once(VoiceConnectionStatus.Ready, async () => {
      try {
        this.player.play(await resource);
        voiceConn.subscribe(this.player);
        this.player.once(AudioPlayerStatus.Idle, () => {
          voiceConn.destroy();
        });
      } catch (e) {
        console.error(e);
        voiceConn.destroy();
      }
    });
  }

  private getChannelInfo(interaction: Interaction) {
    const { member } = interaction;
    if (member && "voice" in member) {
      const channelId = member.voice.channelId;
      const guildId = interaction.guildId;
      if (guildId && channelId) {
        return { channelId, guildId };
      }
    }
    const { channelId, guildId } = env;
    return { channelId, guildId };
  }

  private async getResource(file: string | S3File) {
    const readable = await this.getReadable(file);
    return createAudioResource(readable, { inputType: StreamType.WebmOpus });
  }

  private async getReadable(file: string | S3File) {
    if (typeof file !== "string") {
      return Readable.fromWeb(file.stream());
    } else if (URL.canParse(file)) {
      const res = await fetch(file);
      return Readable.fromWeb((await res.blob()).stream());
    } else {
      return file;
    }
  }
}
