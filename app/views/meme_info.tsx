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
import { Meme } from "../../db/schema";
import { withinLastHour } from "../helpers";
import { db } from "../../db/database";
import { eq } from "drizzle-orm";
import { env } from "../services/env_service";

export class MemeInfo {
  constructor(
    private props: {
      info: Awaited<ReturnType<(typeof MemeInfo)["getInfo"]>>;
      error?: string | Error | unknown;
    }
  ) {}

  static async getInfo(id: string) {
    const meme = await db.query.memes.findFirst({
      where: eq(Meme.id, id),
      with: {
        memeTags: { columns: { tagName: true } },
        commands: { columns: { name: true } },
      },
    });
    if (!meme) throw new Error(`Cannot find meme with id: ${id}`);
    return meme;
  }

  private getErrorMessage() {
    const { error } = this.props;
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === "string") {
      return error;
    }
  }

  render() {
    const {
      name,
      id,
      authorId,
      duration,
      sourceUrl,
      start,
      end,
      createdAt,
      memeTags,
      commands,
    } = this.props.info;
    const tags = memeTags.map((mt) => mt.tagName);
    const trim = ` (${start || ""}..${end || ""})`;
    const info = `# ${name}
- created: ${createdAt.toDateString()}
- author: ${authorId ? `<@${authorId}>` : "Unknown"}
- duration: ${duration.toFixed(1)}s${start && end ? trim : ""}
- commands: ${commands.map((c) => c.name).join(", ")}
- tags: ${tags.length ? tags.join(", ") : "*None*"}
-# ${id}`;
    const thumbnail = (
      <Thumbnail
        media={{
          url: `${env.assetBaseUrl}/waveform/${id}.png`,
        }}
      />
    );
    const error = this.getErrorMessage();
    return (
      <Message allowedMentions={{ parse: [] }}>
        <Container accent_color={Bun.hash.crc32(name) % 0x1000000}>
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
