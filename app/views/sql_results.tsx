import { Container, Message, Separator, TextDisplay } from "mango";

export class SqlResults {
  constructor(
    private props: {
      code: string;
      results: unknown[];
    },
  ) {}

  private renderColumn(key: string, value: unknown) {
    if (key.includes("duration") && typeof value === "number") {
      const duration = Temporal.Duration.from(`PT${value.toFixed(9)}S`);
      return new Intl.DurationFormat("en", {
        style: "narrow",
        milliseconds: "numeric",
      }).format(
        duration.round({
          smallestUnit: duration.seconds >= 60 ? "seconds" : "milliseconds",
          largestUnit: "days",
        }),
      );
    } else if (key.includes("url") && typeof value === "string") {
      const url = URL.parse(value);
      return `[${url?.hostname}](${url?.toString()})`;
    } else if (key.includes("author") && typeof value === "string") {
      return `<@${value}>`;
    }

    return value;
  }

  private renderAnswerOne() {
    return Object.entries(this.props.results[0] as any)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  }

  private renderAnswerMany() {
    return this.props.results
      .map((result: any, idx) => {
        const cols = Object.entries(result).map(([k, v]) =>
          this.renderColumn(k, v),
        );
        return `${idx}. ${cols.join(" • ")}`;
      })
      .join("\n");
  }

  private renderAnswer() {
    return this.props.results.length === 1
      ? this.renderAnswerOne()
      : this.renderAnswerMany();
  }

  render() {
    return (
      <Message allowedMentions={{ parse: [] }}>
        <Container>
          <TextDisplay>{this.props.code}</TextDisplay>
          <Separator />
          <TextDisplay>{this.renderAnswer()}</TextDisplay>
        </Container>
      </Message>
    );
  }
}
