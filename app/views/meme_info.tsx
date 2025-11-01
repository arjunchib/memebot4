import { ButtonStyle } from "discord.js";
import {
  ActionRow,
  Button,
  Container,
  Message,
  Section,
  Separator,
  TextDisplay,
  Thumbnail,
} from "mango";
import type { Memes } from "../../db/schema";
import { withinLastHour } from "../helpers";

export class MemeInfo {
  constructor(
    private props: {
      meme: typeof Memes.$inferSelect;
      tags: string[];
      commands: string[];
      error?: string | Error | unknown;
    }
  ) {}

  private getErrorMessage() {
    const { error } = this.props;
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === "string") {
      return error;
    }
  }

  render() {
    const { commands, tags } = this.props;
    const { name, id, authorId, duration, sourceUrl, start, end, createdAt } =
      this.props.meme;
    const trim = ` (${start || ""}..${end || ""})`;
    const info = `# ${name}
- created: ${new Date().toDateString()}
- author: ${authorId ? `<@${authorId}>` : "Unknown"}
- duration: ${duration.toFixed(1)}s${start && end ? trim : ""}
- commands: ${commands.join(", ")}
- tags: ${tags.length ? tags.join(", ") : "*None*"}
-# ${id}`;
    const thumbnail = (
      <Thumbnail
        media={{
          url: `${Bun.env.S3_ENDPOINT}/${Bun.env
            .S3_BUCKET!}/waveform/${id}.png`,
        }}
      />
    );
    const error = this.getErrorMessage();
    return (
      <Message allowedMentions={{ parse: [] }}>
        <Container accent_color={Bun.hash.crc32(id) % 0x1000000}>
          <Section accessory={thumbnail}>
            <TextDisplay>{info}</TextDisplay>
          </Section>
          <Separator />
          <ActionRow>
            <Button style={ButtonStyle.Primary} custom_id={`info:play:${id}`}>
              Play
            </Button>
            <Button style={ButtonStyle.Secondary} custom_id={`info:edit:${id}`}>
              Edit
            </Button>
            {withinLastHour(createdAt) && (
              <Button
                style={ButtonStyle.Secondary}
                custom_id={`info:redownload:${id}`}
              >
                Redownload
              </Button>
            )}
            {sourceUrl && (
              <Button style={ButtonStyle.Link} url={sourceUrl}>
                Source
              </Button>
            )}
            <Button style={ButtonStyle.Danger} custom_id={`info:delete:${id}`}>
              Delete
            </Button>
          </ActionRow>
          {error && <TextDisplay>{error}</TextDisplay>}
        </Container>
      </Message>
    );
  }
}
