import { AttachmentBuilder, codeBlock } from "discord.js";
import { client } from "../client";
import { llm } from "../services/llm_service";
import { sqlToCsv, sqlToFilename } from "../helpers";
import { sqliteReadonly } from "../../db/database";
import { SqlResults } from "../views/sql_results";

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
    await message.channel.sendTyping();

    const response = await llm.ask(message);
    if (!response) throw new Error("No LLM response.");

    const query = cleanQuery(response.nonReasoningContent);
    const results = sqliteReadonly.query(query).all();
    const code = codeBlock("sql", query);

    if (results.length <= 20) {
      const newMessage = await message.reply(
        <SqlResults code={code} results={results} />,
      );
      llm.moveChat(message.id, newMessage.id);
    } else {
      const csv = sqlToCsv(results);
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
