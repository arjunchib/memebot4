import { relations } from "drizzle-orm";
import { Commands, Memes, MemeTags, Tags } from "./schema";

export const MemesRelations = relations(Memes, ({ many }) => ({
  commands: many(Commands),
  memeTags: many(MemeTags),
}));

export const CommandsRelations = relations(Commands, ({ one }) => ({
  meme: one(Memes, {
    fields: [Commands.memeId],
    references: [Memes.id],
  }),
}));

export const TagsRelations = relations(Tags, ({ many }) => ({
  memeTags: many(MemeTags),
}));

export const MemeTagsRelations = relations(MemeTags, ({ one }) => ({
  meme: one(Memes, {
    fields: [MemeTags.memeId],
    references: [Memes.id],
  }),
  tag: one(Tags, {
    fields: [MemeTags.tagName],
    references: [Tags.name],
  }),
}));
