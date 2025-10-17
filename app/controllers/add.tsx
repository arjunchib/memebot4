import {
  ButtonStyle,
  ChatInputCommandInteraction,
  MessageFlags,
  ModalSubmitInteraction,
  SelectMenuDefaultValueType,
} from "discord.js";
import {
  Button,
  Container,
  Label,
  Message,
  Modal,
  TextInput,
  ActionRow,
  TextDisplay,
  MediaGallery,
  MediaGalleryItem,
  UserSelect,
  Separator,
  Section,
  Thumbnail,
} from "mango";
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
    const author = interaction.user.username;
    const [start, end] =
      trim === "FULL" ? [undefined, undefined] : trim.split("..");
    await interaction.reply(<Message>Hi</Message>);
    // const audioService = new AudioService({
    //   id,
    //   sourceUrl,
    //   start,
    //   end,
    //   async onStateChange(state) {
    //     await interaction.editReply(`State: ${state}`);
    //   },
    // });
    // const { file, loudness, parsedSourceUrl } = await audioService.download();
    // await this.voiceService.play(file);
    const thumbnail = (
      <Thumbnail
        media={{
          url: Bun.env.TEST_IMAGE!,
        }}
      />
    );
    await interaction.editReply(
      <Message>
        <Container accent_color={Bun.hash.crc32(id) % 0x1000000}>
          <Section accessory={thumbnail}>
            <TextDisplay>
              {`# ${commands.split(" ")?.[0] || "nil"}
- created: ${new Date().toDateString()}
- author: ${author || "nil"}
- duration: 13.1s - ${start || ""}..${end || ""}
- commands: ${commands || "nil"}
- tags: ${tags || "nil"}
-# ${id}`}
            </TextDisplay>
          </Section>
          <Separator />
          <ActionRow>
            <Button style={ButtonStyle.Primary} custom_id="add:preview">
              Play
            </Button>
            <Button style={ButtonStyle.Secondary} custom_id="add:edit">
              Edit
            </Button>
            <Button style={ButtonStyle.Link} url={sourceUrl}>
              Source
            </Button>
            <Button style={ButtonStyle.Danger} custom_id="add:delete">
              Delete
            </Button>
          </ActionRow>
        </Container>
      </Message>
    );
  }
}
