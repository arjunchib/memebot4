import type { ModalSubmitInteraction } from "discord.js";
import { Label, TextInput } from "mango";

export class InfoFields {
  constructor(
    private props: {
      name?: string;
      commands?: string[];
      tags?: string[];
    }
  ) {}

  static parse(interaction: ModalSubmitInteraction) {
    const commands = interaction.fields
      .getTextInputValue("commands")
      .split(" ")
      .filter((x) => x.length);
    const tags = interaction.fields
      .getTextInputValue("tags")
      .split(" ")
      .filter((x) => x.length);
    const [name] = commands;
    return { commands, tags, name };
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
            style={1}
            custom_id="commands"
            placeholder="command1 command2 command3"
            value={this.commands() || ""}
          />
        </Label>
        <Label label="Tags">
          <TextInput
            style={1}
            custom_id="tags"
            required={false}
            placeholder="tag1 tag2 tag3"
            value={this.tags() || ""}
          />
        </Label>
      </>
    );
  }
}
