import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { MemeTag, KV, Command, Meme, Tag } from "./schema";
import {
  CommandRelations,
  MemeTagRelations,
  MemeRelations,
  TagRelations,
} from "./relations";

const sqlite = new Database("memebot.sqlite", { create: true });
sqlite.exec("PRAGMA journal_mode=WAL;");
sqlite.exec("PRAGMA foreign_keys=ON;");
export const db = drizzle(sqlite, {
  schema: {
    memes: Meme,
    commands: Command,
    tags: Tag,
    memeTags: MemeTag,
    kv: KV,
    MemeRelations,
    CommandRelations,
    TagRelations,
    MemeTagRelations,
  },
});

export const sqliteReadonly = new Database("memebot.sqlite", {
  readonly: true,
});
