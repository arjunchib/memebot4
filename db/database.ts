import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { MemeTag, KV, Command, Meme, Tag, Play, Transcription } from "./schema";
import {
  CommandRelations,
  MemeTagRelations,
  MemeRelations,
  TagRelations,
  PlayRelations,
  TranscriptionRelations,
} from "./relations";

export const sqlite = new Database("memebot.sqlite", { create: true });

sqlite.run("PRAGMA journal_mode=WAL;");
sqlite.run("PRAGMA foreign_keys=ON;");

export const db = drizzle(sqlite, {
  schema: {
    memes: Meme,
    commands: Command,
    tags: Tag,
    memeTags: MemeTag,
    kv: KV,
    plays: Play,
    transcriptions: Transcription,
    MemeRelations,
    CommandRelations,
    TagRelations,
    MemeTagRelations,
    PlayRelations,
    TranscriptionRelations,
  },
});

export const sqliteReadonly = new Database("memebot.sqlite", {
  readonly: true,
});
