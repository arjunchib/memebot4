import {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { Label, Modal, TextInput } from "mango";
import { AudioService } from "../services/audio_service";
import { VoiceService } from "../services/voice_service";

export default class AddController {
  private voiceService = VoiceService.getShared();

  async onChatInput(interaction: ChatInputCommandInteraction) {
    await interaction.showModal(
      <Modal title="Add meme" custom_id="add">
        <Label label="Source URL">
          <TextInput
            style={1}
            custom_id="source_url"
            placeholder="https://www.youtube.com"
          />
        </Label>
        <Label
          label="Trim"
          description='Can use the whole audio clip by typing "FULL"'
        >
          <TextInput style={1} custom_id="trim" placeholder="5..13" />
        </Label>
        <Label
          label="Commands"
          description="First command becomes the name of the meme"
        >
          <TextInput
            style={1}
            custom_id="commands"
            placeholder="command1 command2 command3"
          />
        </Label>
        <Label label="Tags">
          <TextInput
            style={1}
            custom_id="tags"
            required={false}
            placeholder="tag1 tag2 tag3"
          />
        </Label>
      </Modal>
    );
  }

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    const sourceUrl = interaction.fields.getTextInputValue("source_url");
    const trim = interaction.fields.getTextInputValue("trim").trim();
    const commands = interaction.fields.getTextInputValue("commands");
    const tags = interaction.fields.getTextInputValue("tags");
    const id = Bun.randomUUIDv7();
    const [start, end] =
      trim === "FULL" ? [undefined, undefined] : trim.split("..");
    await interaction.reply("Downloading...");
    const { file, loudness, parsedSourceUrl } = await AudioService.init({
      id,
      sourceUrl,
      start,
      end,
    }).download();
    await this.voiceService.play(file);
    interaction.editReply(`Playing ${parsedSourceUrl}`);
  }
}
