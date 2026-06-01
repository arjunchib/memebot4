import { TextInputStyle, type ModalSubmitInteraction } from "discord.js";
import { Label, TextInput } from "mango";

export class InfoFields {
  constructor(
    private props: {
      name?: string;
      commands?: string[];
      tags?: string[];
      transcription?: string;
    },
  ) {}

  static parse(interaction: ModalSubmitInteraction) {
    const commands = interaction.fields
      .getTextInputValue("commands")
      .replaceAll(",", " ")
      .split(" ")
      .filter((x) => x.length);
    const tags = interaction.fields
      .getTextInputValue("tags")
      .replaceAll(",", " ")
      .split(" ")
      .filter((x) => x.length);
    const transcription = interaction.fields.getTextInputValue("transcription");
    const [name] = commands;
    return { commands, tags, name, transcription };
  }

  private commands() {
    const { commands, name } = this.props;
    if (!commands || !name) return null;
    return [name, ...commands.filter((c) => c !== name)].join(" ");
  }

  private tags() {
    const { tags } = this.props;
    if (!tags) return null;
    return tags.join(" ");
  }

  render() {
    return (
      <>
        <Label
          label="Commands"
          description="First command becomes the name of the meme"
        >
          <TextInput
            style={TextInputStyle.Short}
            custom_id="commands"
            placeholder="command1 command2 command3"
            value={this.commands() || ""}
          />
        </Label>
        <Label label="Tags">
          <TextInput
            style={TextInputStyle.Short}
            custom_id="tags"
            required={false}
            placeholder="tag1 tag2 tag3"
            value={this.tags() || ""}
          />
        </Label>
        <Label label="Transcription">
          <TextInput
            style={TextInputStyle.Paragraph}
            custom_id="transcription"
            required={false}
            placeholder={`But what I want to know is where's the caveman!`}
            value={this.props.transcription || ""}
          />
        </Label>
      </>
    );
  }
}
