import type { ModalSubmitInteraction } from "discord.js";
import { Label, TextInput } from "mango";

export class DownloadFields {
  constructor(
    private props: {
      sourceUrl?: string | null;
      start?: string | null;
      end?: string | null;
      $if?: boolean;
    },
  ) {}

  static parse(interaction: ModalSubmitInteraction) {
    const sourceUrl = interaction.fields.getTextInputValue("source_url");
    const timestamps = interaction.fields
      .getTextInputValue("timestamps")
      .trim();
    if (!timestamps.includes("..")) throw new Error("Missing timestamps value");
    const [start, end] = timestamps.split("..");
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
          label="Timestamps"
          description={`Can omit start/end values or omit both for full audio.`}
        >
          <TextInput
            style={1}
            custom_id="timestamps"
            placeholder="5..13"
            value={this.trim() || ""}
          />
        </Label>
      </>
    );
  }
}
