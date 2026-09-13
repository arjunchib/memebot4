import { AttachmentBuilder, codeBlock } from "discord.js";
import { client } from "../client";
import { llm } from "../services/llm_service";
import { sqlToFilename } from "../helpers";
import { sqliteReadonly } from "../../db/database";
import { Container, Message, Separator, TextDisplay } from "mango";

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

    const query = response.nonReasoningContent;
    const results = sqliteReadonly.query(query).all();
    const code = codeBlock("sql", query);

    if (results.length <= 20) {
      const answer = results
        .map((result: any, idx) => {
          const values = Object.values(result);
          const displayList = results.length > 1;
          const row = displayList ? [`${idx}.`, ...values] : values;
          return row.join(" ");
        })
        .join("\n")
        // render user tags
        .replaceAll(/\`?(\d{18})\`?/gm, "<@$1>");
      const newMessage = await message.reply(
        <Message allowedMentions={{ parse: [] }}>
          <Container>
            <TextDisplay>{code}</TextDisplay>
            <Separator />
            <TextDisplay>{answer}</TextDisplay>
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
