import {
  BitField,
  MessageFlags,
  type MessageFlagsResolvable,
} from "discord.js";
import { Container, Message, TextDisplay } from "mango";

const RED = 0xff0000;

export class ErrorMessage {
  constructor(
    private props: {
      error: unknown;
      children?: any;
      ephemeral?: boolean;
    }
  ) {}

  render() {
    const { error, ephemeral } = this.props;
    const messageProps: { flags?: any } = {};
    if (ephemeral) messageProps.flags = MessageFlags.Ephemeral;
    let name: string;
    let message: string;
    if (error instanceof Error) {
      name = error.name;
      message = error.message;
    } else if (typeof error === "string") {
      name = "Error";
      message = error;
    } else {
      name = "Error";
      message = "An unknown error occurred";
    }
    const output = `# ${name}
${message}`;
    return (
      <Message {...messageProps} allowedMentions={{ parse: [] }}>
        <Container accent_color={RED}>
          <TextDisplay>{output}</TextDisplay>
          {this.props.children}
        </Container>
      </Message>
    );
  }
}
