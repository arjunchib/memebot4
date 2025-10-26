import { ButtonStyle, MessageFlags, User } from "discord.js";
import {
  ActionRow,
  Button,
  Container,
  Label,
  Message,
  Modal,
  Section,
  Separator,
  TextDisplay,
  TextInput,
  Thumbnail,
} from "mango";
import type { Memes } from "../../db/schema";
import { client } from "../main";

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
    if (!authorId) throw new Error("missing author");
    const author = client.users.resolve(authorId);
    if (!author) throw new Error("missing author");
    const thumbnail = <Thumbnail media={{ url: Bun.env.TEST_IMAGE! }} />;
    return (
      <Message flags={MessageFlags.Ephemeral}>
        <Container accent_color={Bun.hash.crc32(id) % 0x1000000}>
          <Section accessory={thumbnail}>
            <TextDisplay>
              {`# ${name}
- created: ${new Date().toDateString()}
- author: ${author || "Unknown"}
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
