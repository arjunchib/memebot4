import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { MemeTags, KeyValue, Commands, Memes, Tags } from "./schema";
import {
  CommandsRelations,
  MemeTagsRelations,
  MemesRelations,
  TagsRelations,
} from "./relations";

const sqlite = new Database("memebot.sqlite", { create: true });
sqlite.exec("PRAGMA journal_mode=WAL;");
sqlite.exec("PRAGMA foreign_keys=ON;");
export const db = drizzle(sqlite, {
  schema: {
    memes: Memes,
    commands: Commands,
    tags: Tags,
    memeTags: MemeTags,
    keyValue: KeyValue,
    MemesRelations,
    CommandsRelations,
    TagsRelations,
    MemeTagsRelations,
  },
});

export const sqliteReadonly = new Database("memebot.sqlite", {
  readonly: true,
});
