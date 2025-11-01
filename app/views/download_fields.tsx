import type { ModalSubmitInteraction } from "discord.js";
import { Label, TextInput } from "mango";

export class DownloadFields {
  constructor(
    private props: {
      sourceUrl?: string | null;
      start?: string | null;
      end?: string | null;
      $if?: boolean;
    }
  ) {}

  static parse(interaction: ModalSubmitInteraction) {
    const sourceUrl = interaction.fields.getTextInputValue("source_url");
    const trim = interaction.fields.getTextInputValue("trim").trim();
    const [start, end] =
      trim === "FULL" ? [undefined, undefined] : trim.split("..");
    return { sourceUrl, start, end };
  }

  private trim() {
    const { start, end } = this.props;
    if (!start && !end) return null;
    return `${start || ""}..${end || ""}`;
  }

  render() {
    if (this.props.$if === false) return undefined;
    return (
      <>
        <Label label="Source URL">
          <TextInput
            style={1}
            custom_id="source_url"
            placeholder="https://www.youtube.com"
            value={this.props.sourceUrl || ""}
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
            value={this.trim() || ""}
          />
        </Label>
      </>
    );
  }
}
