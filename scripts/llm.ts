import {
  LMStudioClient,
  tool,
  Chat,
  type LLMPredictionFragmentReasoningType,
} from "@lmstudio/sdk";
import { z } from "zod";
import { sqliteReadonly } from "../db/database";
import { createInterface } from "readline/promises";

const client = new LMStudioClient();

const readonlySqliteTool = tool({
  name: "readonlySqlite",
  description: "Run a sql query against the readonly sqlite db.",
  parameters: { query: z.string() },
  implementation: ({ query }) => {
    const results = sqliteReadonly.query(query).all();

    let csv = Object.keys(results[0] as any).join(",");
    csv += "\n";
    csv += results
      .map((result: any) => Object.values(result).join(","))
      .join("\n");

    return csv;
  },
});

const model = await client.llm.model("google/gemma-4-e2b");

const RED = Bun.color("red", "ansi");
const TEAL = Bun.color("teal", "ansi");
const GRAY = Bun.color("gray", "ansi");
const GREEN = Bun.color("green", "ansi");
const YELLOW = Bun.color("yellow", "ansi");
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let prevReasoningType: LLMPredictionFragmentReasoningType;

const chat = Chat.empty();
const rl = createInterface({ input: process.stdin, output: process.stdout });

const file = Bun.file("schema.sql");
const schema = await file.text();

const now = new Date();

chat.append(
  "system",
  `You must output a sql query and nothing else. The current time is ${now.toISOString()}. Duration is stored in seconds. Loudness values are generated from ffmpeg's \`loudnorm\` command. Here is the schema for the db: ${schema}`,
);

while (true) {
  const input = await rl.question(`${BOLD}${TEAL}You:${RESET} `);
  // Append the user input to the chat
  chat.append("user", input);
  process.stdout.write(`${BOLD}${RED}Bot:${RESET} `);
  await model.act(chat, [readonlySqliteTool], {
    // When the model finish the entire message, push it to the chat
    onMessage: (message) => {
      chat.append(message);
    },
    onPredictionFragment: (fragment) => {
      const { content, reasoningType } = fragment;
      if (reasoningType !== prevReasoningType) {
        switch (reasoningType) {
          case "none":
            process.stdout.write(`${RESET}\n${content}`);
            break;
          case "reasoning":
            process.stdout.write(`${RESET}${GRAY}${content}`);
            break;
          case "reasoningStartTag":
          case "reasoningEndTag":
            process.stdout.write(`${RESET}${GREEN}${content}`);
            break;
        }
        prevReasoningType = reasoningType;
      } else {
        process.stdout.write(content);
      }
    },
    onRoundStart() {
      process.stdout.write(`${GRAY}`);
    },
    onToolCallRequestArgumentFragmentGenerated: (fragment, callId, content) => {
      process.stdout.write(`${RESET}${YELLOW}${content}`);
    },
  });
  process.stdout.write("\n");
}
