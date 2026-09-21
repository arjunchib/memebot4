import { AttachmentBuilder, ButtonStyle, codeBlock } from "discord.js";
import {
  ActionRow,
  Button,
  Container,
  Message,
  Separator,
  TextDisplay,
  File,
} from "mango";
import { formatDuration, sqlToCsv, sqlToFilename } from "../helpers";
import { sqliteReadonly } from "../../db/database";

export class SqlResults {
  private results: unknown[];

  constructor(
    private props: {
      query: string;
      csv?: string;
    },
  ) {
    this.results = sqliteReadonly.query(this.props.query).all();
  }

  private renderColumn(key: string, value: unknown) {
    if (key.includes("duration") && typeof value === "number") {
      return formatDuration(value);
    } else if (key.includes("url") && typeof value === "string") {
      const url = URL.parse(value);
      return `[${url?.hostname}](${url?.toString()})`;
    } else if (key.includes("author") && typeof value === "string") {
      return `<@${value}>`;
    } else if (key.includes("_at") && typeof value === "number") {
      return `<t:${value}>`;
    } else if (value === "" || value == null) {
      return `none`;
    }

    return value;
  }

  private renderAnswerOne() {
    return Object.entries(this.results[0] as any)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  }

  private renderAnswerMany() {
    return this.results
      .slice(0, 20)
      .map((result: any, idx) => {
        const cols = Object.entries(result).map(([k, v]) =>
          this.renderColumn(k, v),
        );
        return `${idx}. ${cols.join(" • ")}`;
      })
      .join("\n");
  }

  private renderAnswer() {
    return this.results.length === 1
      ? this.renderAnswerOne()
      : this.renderAnswerMany();
  }

  private getAttachmentBuilder() {
    if (!this.props.csv) return undefined;

    return new AttachmentBuilder(Buffer.from(sqlToCsv(this.results)), {
      name: `${sqlToFilename(this.props.csv)}.csv`,
    });
  }

  render() {
    const ab = this.getAttachmentBuilder();

    return (
      <Message allowedMentions={{ parse: [] }} files={ab ? [ab] : undefined}>
        <Container>
          <TextDisplay>{codeBlock("sql", this.props.query)}</TextDisplay>
          <Separator />
          <TextDisplay>{this.renderAnswer()}</TextDisplay>
          {ab && <File file={{ url: `attachment://${ab.name}` }} />}
          <ActionRow>
            <Button style={ButtonStyle.Primary} custom_id="sql:csv">
              Build CSV
            </Button>
            <Button style={ButtonStyle.Secondary} custom_id="sql:refresh">
              Refresh
            </Button>
            <Button style={ButtonStyle.Secondary} custom_id="sql:edit">
              Edit
            </Button>
          </ActionRow>
        </Container>
      </Message>
    );
  }
}
