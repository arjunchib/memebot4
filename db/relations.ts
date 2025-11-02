import { relations } from "drizzle-orm";
import { Command, Meme, MemeTag, Tag } from "./schema";

export const MemeRelations = relations(Meme, ({ many }) => ({
  commands: many(Command),
  memeTags: many(MemeTag),
}));

export const CommandRelations = relations(Command, ({ one }) => ({
  meme: one(Meme, {
    fields: [Command.memeId],
    references: [Meme.id],
  }),
}));

export const TagRelations = relations(Tag, ({ many }) => ({
  memeTags: many(MemeTag),
}));

export const MemeTagRelations = relations(MemeTag, ({ one }) => ({
  meme: one(Meme, {
    fields: [MemeTag.memeId],
    references: [Meme.id],
  }),
  tag: one(Tag, {
    fields: [MemeTag.tagName],
    references: [Tag.name],
  }),
}));
