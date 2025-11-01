import { Container, Message, TextDisplay } from "mango";

const RED = 0xff0000;

export class ErrorMessage {
  constructor(
    private props: {
      error: unknown;
      children?: any;
    }
  ) {}

  render() {
    const { error } = this.props;
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
      <Message allowedMentions={{ parse: [] }}>
        <Container accent_color={RED}>
          <TextDisplay>{output}</TextDisplay>
          {this.props.children}
        </Container>
      </Message>
    );
  }
}
