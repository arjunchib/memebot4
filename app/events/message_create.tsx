import { AttachmentBuilder, codeBlock } from "discord.js";
import { client } from "../client";
import { llm } from "../services/llm_service";
import { sqlToFilename } from "../helpers";
import { sqliteReadonly } from "../../db/database";
import { Container, Message, Separator, TextDisplay } from "mango";

function renderColumn(key: string, value: unknown) {
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

function renderAnswerOne(results: any[]) {
  return Object.entries(results[0] as any)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function renderAnswerMany(results: any[]) {
  return results
    .map((result: any, idx) => {
      const cols = Object.entries(result).map(([k, v]) => renderColumn(k, v));
      return `${idx}. ${cols.join(" • ")}`;
    })
    .join("\n");
}

function renderAnswer(results: any[]) {
  return results.length === 1
    ? renderAnswerOne(results)
    : renderAnswerMany(results);
}

function cleanQuery(rawString: string) {
  const innerQuery = rawString.match(/```sql\s([\s\S]*)\s```/)?.[1];
  if (innerQuery) return innerQuery;
  return rawString;
}

client.on("messageCreate", async (message) => {
  // Ignore messages from bots to prevent infinite loops
  if (message.author.bot) return;

  // Optional: Only respond if the bot is mentioned or if it's a specific channel
  if (!client.user || !message.mentions.has(client.user)) return;

  try {
    // Make the bot look like it's typing while waiting for the AI response
    await message.channel.sendTyping();

    // Request a response from the llm
    const response = await llm.ask(message);

    if (!response) throw new Error("No LLM response.");

    const query = cleanQuery(response.nonReasoningContent);
    const results = sqliteReadonly.query(query).all();
    const code = codeBlock("sql", query);

    if (results.length <= 20) {
      const newMessage = await message.reply(
        <Message allowedMentions={{ parse: [] }}>
          <Container>
            <TextDisplay>{code}</TextDisplay>
            <Separator />
            <TextDisplay>{renderAnswer(results)}</TextDisplay>
          </Container>
        </Message>,
      );
      llm.moveChat(message.id, newMessage.id);
    } else {
      let csv = Object.keys(results[0] as any).join(",");
      csv += "\n";
      csv += results
        .map((result: any) => Object.values(result).join(","))
        .join("\n");
      const response = await llm.askFilename(message);
      const filename = response.nonReasoningContent;
      const attachment = new AttachmentBuilder(Buffer.from(csv), {
        name: `${sqlToFilename(filename)}.csv`,
      });
      const newMessage = await message.reply({
        content: code,
        files: [attachment],
      });
      llm.moveChat(message.id, newMessage.id);
    }
  } catch (error) {
    console.error("Error handling AI response:", error);
    await message.reply(
      "Oops! Something went wrong trying to think of a response.",
    );
  }
});
