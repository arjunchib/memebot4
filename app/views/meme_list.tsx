import { Container, Message, TextDisplay } from "mango";

export class MemeList {
  constructor(
    private props: {
      title: string;
      names: string[];
    }
  ) {}

  render() {
    const { title, names } = this.props;
    const content =
      names.length > 0
        ? `**${title}**\n${names.join(", ")}`
        : `**${title}**\nNo memes found.`;
    return (
      <Message allowedMentions={{ parse: [] }}>
        <Container>
          <TextDisplay>{content}</TextDisplay>
        </Container>
      </Message>
    );
  }
}
