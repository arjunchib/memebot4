import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { MemeTag, KV, Command, Meme, Tag, Play } from "./schema";
import {
  CommandRelations,
  MemeTagRelations,
  MemeRelations,
  TagRelations,
  PlayRelations,
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
    MemeRelations,
    CommandRelations,
    TagRelations,
    MemeTagRelations,
    PlayRelations,
  },
});

export const sqliteReadonly = new Database("memebot.sqlite", {
  readonly: true,
});
