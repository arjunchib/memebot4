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

export class VoiceService {
  static getShared() {
    return new VoiceService();
  }

  private player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  async play(file: string) {
    const client = await this.getClient();
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
      this.player.play(await resource);
      voiceConn.subscribe(this.player);
      this.player.once(AudioPlayerStatus.Idle, () => {
        voiceConn.destroy();
      });
    });
  }

  private async getClient() {
    return (await import("../main")).client;
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
