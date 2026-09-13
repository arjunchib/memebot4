import { Container, File, Message, TextDisplay } from "mango";
import type { LlmService } from "../services/llm_service";
import { AttachmentBuilder, codeBlock } from "discord.js";
import { sqlToFilename } from "../helpers";
import { sqliteReadonly } from "../../db/database";

export class LmmResponse {
  constructor(private props: Awaited<ReturnType<LlmService["ask"]>>) {}

  private query(query: string) {
    const results = sqliteReadonly.query(query).all();

    let csv = Object.keys(results[0] as any).join(",");
    csv += "\n";
    csv += results
      .map((result: any) => Object.values(result).join(","))
      .join("\n");

    return csv;
  }

  render() {
    const answer = this.props.finalAnswer.replaceAll(
      /\`?(\d{18})\`?/gm,
      "<@$1>",
    );

    const files = [];
    let attachmentUrl: string | undefined;

    const results = sqliteReadonly.query(this.props.finalAnswer).all();

    if (results.length > 20) {
      const answer = results
        .map((result: any, idx) => [idx, ...Object.values(result)].join(" "))
        .join("\n")
        .replaceAll(/\`?(\d{18})\`?/gm, "<@$1>");

      return (
        <Message allowedMentions={{ parse: [] }}>
          <Container>
            <TextDisplay>{answer}</TextDisplay>
          </Container>
        </Message>
      );
    } else {
      let csv = Object.keys(results[0] as any).join(",");
      csv += "\n";
      csv += results
        .map((result: any) => Object.values(result).join(","))
        .join("\n");
      const attachment = new AttachmentBuilder(Buffer.from(csv), {
        name: `test.csv`,
      });
      await interaction.reply({
        files: [attachment],
      });
    }

    return (
      <Message allowedMentions={{ parse: [] }} files={files}>
        <Container spoiler={true}>
          <TextDisplay>{answer}</TextDisplay>
          {query && <TextDisplay>{codeBlock("sql", query)}</TextDisplay>}
          {attachmentUrl && (
            <File file={{ url: attachmentUrl }} spoiler={true}></File>
          )}
        </Container>
      </Message>
    );
  }
}
