import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const Meme = sqliteTable("memes", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$default(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
  duration: real("duration").notNull(),
  size: integer("size").notNull(),
  bitRate: integer("bit_rate").notNull(),
  loudnessI: real("loudness_i").notNull(),
  loudnessLra: real("loudness_lra").notNull(),
  loudnessTp: real("loudness_tp").notNull(),
  loudnessThresh: real("loudness_thresh").notNull(),
  authorId: text("author_id"),
  playCount: integer("play_count").notNull().default(0),
  randomPlayCount: integer("random_play_count").notNull().default(0),
  sourceUrl: text("source_url"),
  start: text("start"),
  end: text("end"),
});

export const Command = sqliteTable("commands", {
  name: text("name").primaryKey().notNull(),
  memeId: text("meme_id")
    .notNull()
    .references(() => Meme.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export const Tag = sqliteTable("tags", {
  name: text("name").primaryKey().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$onUpdate(() => sql`(unixepoch())`),
});

export const MemeTag = sqliteTable(
  "meme_tags",
  {
    memeId: text("meme_id")
      .notNull()
      .references(() => Meme.id, { onDelete: "cascade", onUpdate: "cascade" }),
    tagName: text("tag_name")
      .notNull()
      .references(() => Tag.name, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$onUpdate(() => sql`(unixepoch())`),
  },
  (table) => {
    return [
      primaryKey({
        columns: [table.memeId, table.tagName],
      }),
    ];
  }
);

export const KV = sqliteTable("kv", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  exp: integer("exp", { mode: "timestamp" }),
});

export const Play = sqliteTable("plays", {
  playedAt: integer("played_at", { mode: "timestamp" }).notNull(),
  playedBy: text("played_by").notNull(),
  isRandom: integer("is_random", { mode: "boolean" }).notNull(),
  memeId: text("meme_id")
    .notNull()
    .references(() => Meme.id, {
      onDelete: "no action",
      onUpdate: "cascade",
    }),
});
