import { ButtonStyle, MessageFlags } from "discord.js";
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

export class MemeInfo {
  constructor(
    private props: {
      meme: typeof Memes.$inferSelect;
      tags: string[];
      commands: string[];
    }
  ) {}

  render() {
    const { commands, tags } = this.props;
    const { name, id, authorId, duration, sourceUrl, start, end } =
      this.props.meme;
    const thumbnail = (
      <Thumbnail
        media={{
          url: `${Bun.env.S3_ENDPOINT}/${Bun.env
            .S3_BUCKET!}/waveform/${id}.png`,
        }}
      />
    );
    console.log(
      <Message flags={MessageFlags.Ephemeral}>
        <Container accent_color={Bun.hash.crc32(id) % 0x1000000}>
          <Section accessory={thumbnail}>
            <TextDisplay>
              {`# ${name}
- created: ${new Date().toDateString()}
- author: ${`<@${authorId}>` || "Unknown"}
- duration: ${duration.toFixed(1)}s - ${start || ""}..${end || ""}
- commands: ${commands.join(", ")}
- tags: ${tags.length ? tags.join(", ") : "*None*"}
-# ${id}`}
            </TextDisplay>
          </Section>
          <Separator />
          <ActionRow>
            <Button style={ButtonStyle.Primary} custom_id={`info:play:${id}`}>
              Play
            </Button>
            <Button style={ButtonStyle.Secondary} custom_id={`info:edit:${id}`}>
              Edit
            </Button>
            {sourceUrl && (
              <Button style={ButtonStyle.Link} url={sourceUrl}>
                Source
              </Button>
            )}
            <Button style={ButtonStyle.Danger} custom_id={`info:delete:${id}`}>
              Delete
            </Button>
          </ActionRow>
        </Container>
      </Message>
    );
    return (
      <Message flags={MessageFlags.Ephemeral}>
        <Container accent_color={Bun.hash.crc32(id) % 0x1000000}>
          <Section accessory={thumbnail}>
            <TextDisplay>
              {`# ${name}
- created: ${new Date().toDateString()}
- author: ${`<@${authorId}>` || "Unknown"}
- duration: ${duration.toFixed(1)}s - ${start || ""}..${end || ""}
- commands: ${commands.join(", ")}
- tags: ${tags.length ? tags.join(", ") : "*None*"}
-# ${id}`}
            </TextDisplay>
          </Section>
          <Separator />
          <ActionRow>
            <Button style={ButtonStyle.Primary} custom_id={`info:play:${id}`}>
              Play
            </Button>
            <Button style={ButtonStyle.Secondary} custom_id={`info:edit:${id}`}>
              Edit
            </Button>
            {sourceUrl && (
              <Button style={ButtonStyle.Link} url={sourceUrl}>
                Source
              </Button>
            )}
            <Button style={ButtonStyle.Danger} custom_id={`info:delete:${id}`}>
              Delete
            </Button>
          </ActionRow>
        </Container>
      </Message>
    );
  }
}
