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

export class VoiceService {
  static getShared() {
    return new VoiceService();
  }

  private player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  }).on("error", (error) => {
    console.error(error);
  });

  async play(file: string) {
    const guild = await client.guilds.fetch(Bun.env.GUILD_ID!);
    const resource = this.getResource(file);
    const voiceConn = joinVoiceChannel({
      channelId: Bun.env.CHANNEL_ID!,
      guildId: Bun.env.GUILD_ID!,
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

  private async getResource(file: string) {
    const readable = await this.getReadable(file);
    return createAudioResource(readable, { inputType: StreamType.WebmOpus });
  }

  private async getReadable(file: string) {
    if (URL.canParse(file)) {
      const res = await fetch(file);
      return Readable.fromWeb((await res.blob()).stream());
    } else {
      return file;
    }
  }
}
