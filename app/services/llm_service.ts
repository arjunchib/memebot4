import { Chat, LLM, LMStudioClient } from "@lmstudio/sdk";
import {
  ComponentType,
  type Message,
  type OmitPartialGroupDMChannel,
} from "discord.js";
import { client } from "../client";

export class LlmService {
  private client = new LMStudioClient();
  // private chat = Chat.empty();
  private model?: LLM;
  private chats = new Map<string, Chat>();

  async setup() {
    // this.model = await this.client.llm.model("google/gemma-4-e2b");
    this.model = await this.client.llm.model("google/gemma-4-12b-qat");
  }

  private async newChat() {
    const chat = Chat.empty();

    const file = Bun.file("schema.sql");
    let schema = await file.text();

    // delete playCount columns
    schema = schema.replaceAll(/.*play_count.*/gm, "");

    const now = new Date();

    chat.append(
      "system",
      `You must output a sql query and nothing else. The current time is ${now.toISOString()}. The db is sqlite, use \`strftime\` as needed. Duration is stored in seconds. Loudness values are generated from ffmpeg's \`loudnorm\` command. Here is the schema for the db: ${schema}`,
    );

    return chat;
  }

  private async getChat(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    // First message
    if (!message.reference?.messageId) {
      return await this.newChat();
    }

    // Second message w/ loaded chat
    const savedChat = this.chats.get(message.reference.messageId);
    if (savedChat) {
      return savedChat;
    }

    // Second message w/o loaded chat
    const prevMessage = await message.fetchReference();
    const container = prevMessage.components.find(
      (c) => c.type === ComponentType.Container,
    );
    const textDisplay = container?.components.find(
      (c) => c.type === ComponentType.TextDisplay,
    );
    const query = textDisplay?.content.match(/```sql([\s\S]*)```/)?.[1];
    const newChat = await this.newChat();
    newChat.append("system", `The previous query was: ${query}`);
    return newChat;
  }

  async ask(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    if (!this.model?.getModelInfo()) await this.setup();
    if (!this.model) throw new Error("Couldn't initialize model");
    if (!client.user) throw new Error("No discord client");

    const chat = await this.getChat(message);

    // Clean up the message content by removing the bot mention
    const question = message.content.replace(`<@${client.user.id}>`, "").trim();
    const userPrompt = `User ${message.author.id}: ${question}`;

    chat.append("user", userPrompt);

    const prediction = this.model.respond(chat);

    for await (const { content } of prediction) {
      process.stdout.write(content);
    }
    process.stdout.write("\n");

    const response = await prediction;

    const newChat = chat.asMutableCopy();
    this.chats.set(message.id, newChat);
    newChat.append(response.content);

    return response;
  }

  async askFilename(message: OmitPartialGroupDMChannel<Message<boolean>>) {
    if (!this.model?.getModelInfo()) await this.setup();
    if (!this.model) throw new Error("Couldn't initialize model");

    const chat = await this.getChat(message);

    chat.append(
      "system",
      "Now generate a short filename describing the output. Only output the name and don't included an extension.",
    );

    const prediction = this.model.respond(chat);

    for await (const { content } of prediction) {
      process.stdout.write(content);
    }
    process.stdout.write("\n");

    return await prediction;
  }

  moveChat(fromId: string, toId: string) {
    const chat = this.chats.get(fromId);
    if (!chat) return;
    this.chats.set(toId, chat);
    this.chats.delete(fromId);
  }
}

export const llm = new LlmService();
