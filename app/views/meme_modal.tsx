import type { ModalSubmitInteraction } from "discord.js";
import { Label, Modal, TextInput } from "mango";
import type { Memes } from "../../db/schema";

export class MemeModal {
  constructor(
    private props: {
      meme?: typeof Memes.$inferSelect;
      tags?: string[];
      commands?: string[];
    }
  ) {}

  static parseFields(interaction: ModalSubmitInteraction) {
    const id = interaction.customId.split(":").at(1);
    const sourceUrl = interaction.fields.getTextInputValue("source_url");
    const trim = interaction.fields.getTextInputValue("trim").trim();
    const commands = interaction.fields
      .getTextInputValue("commands")
      .split(" ")
      .map((x) => x.trim());
    const tags = interaction.fields
      .getTextInputValue("tags")
      .split(" ")
      .map((x) => x.trim());
    const [start, end] =
      trim === "FULL" ? [undefined, undefined] : trim.split("..");
    const [name] = commands;
    if (!name) throw new Error("Missing name");
    return { sourceUrl, commands, tags, start, end, name, id };
  }

  private get trim() {
    if (!this.props.meme) return null;
    const { start, end } = this.props.meme;
    if (!start && !end) return null;
    return `${start || ""}..${end || ""}`;
  }

  private get commands() {
    const { commands, meme } = this.props;
    if (!commands || !meme) return null;
    const { name } = meme;
    return [name, ...commands.filter((c) => c !== name)].join(" ");
  }

  render() {
    const { meme, tags } = this.props;
    const { id, sourceUrl } = meme || {};
    const customId = id ? `edit:${id}` : "add";
    return (
      <Modal title="Add meme" custom_id={customId}>
        <Label label="Source URL">
          <TextInput
            style={1}
            custom_id="source_url"
            placeholder="https://www.youtube.com"
            value={sourceUrl || ""}
          />
        </Label>
        <Label
          label="Trim"
          description='Can use the whole audio clip by typing "FULL"'
        >
          <TextInput
            style={1}
            custom_id="trim"
            placeholder="5..13"
            value={this.trim || ""}
          />
        </Label>
        <Label
          label="Commands"
          description="First command becomes the name of the meme"
        >
          <TextInput
            style={1}
            custom_id="commands"
            placeholder="command1 command2 command3"
            value={this.commands || ""}
          />
        </Label>
        <Label label="Tags">
          <TextInput
            style={1}
            custom_id="tags"
            required={false}
            placeholder="tag1 tag2 tag3"
            value={tags ? tags.join(" ") : ""}
          />
        </Label>
      </Modal>
    );
  }
}
