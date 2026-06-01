import { relations } from "drizzle-orm";
import { Command, Meme, MemeTag, Play, Tag, Transcription } from "./schema";

export const MemeRelations = relations(Meme, ({ many, one }) => ({
  commands: many(Command),
  memeTags: many(MemeTag),
  plays: many(Play),
  transcription: one(Transcription),
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

export const PlayRelations = relations(Play, ({ one }) => ({
  meme: one(Meme, {
    fields: [Play.memeId],
    references: [Meme.id],
  }),
}));

export const TranscriptionRelations = relations(Transcription, ({ one }) => ({
  meme: one(Meme, {
    fields: [Transcription.memeId],
    references: [Meme.id],
  }),
}));
