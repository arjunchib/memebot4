import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../db/database";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { Meme, MemeTag, Play, Tag } from "../../db/schema";
import { MemeList } from "../views/meme_list";
import { ErrorMessage } from "../views/error_message";

export default class ListController {
  async onChatInput(interaction: ChatInputCommandInteraction) {
    try {
      const sort = interaction.options.getString("sort");
      const tag = interaction.options.getString("tag");
      const author = interaction.options.getUser("author");

      const title = this.getTitle(sort, tag, author?.username);
      const limit = tag ? undefined : 20;
      const showPlayCount = sort === "most-played" || sort === "least-played";

      const conditions: any[] = [];
      if (author) conditions.push(eq(Meme.authorId, author.id));

      let entries: string[];

      if (sort === "recently-played") {
        entries = await this.getRecentlyPlayed(conditions, tag, limit);
      } else if (showPlayCount) {
        entries = await this.getWithPlayCount(sort!, conditions, tag, limit);
      } else {
        entries = await this.getNames(conditions, tag, limit);
      }

      if (entries.length === 0) {
        return interaction.reply(<MemeList title={title} names={[]} />);
      }

      const chunks = this.chunkEntries(entries, title);
      await interaction.reply(
        <MemeList title={title} names={chunks[0]!} />
      );
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp(
          <MemeList title={`${title} (cont.)`} names={chunks[i]!} />
        );
      }
    } catch (e) {
      if (interaction.replied) {
        await interaction.followUp(<ErrorMessage error={e} ephemeral />);
      } else {
        await interaction.reply(<ErrorMessage error={e} ephemeral />);
      }
    }
  }

  private async getNames(
    conditions: any[],
    tag: string | null,
    limit: number | undefined
  ): Promise<string[]> {
    if (tag) {
      conditions.push(eq(MemeTag.tagName, tag));
      const query = db
        .select({ name: Meme.name })
        .from(Meme)
        .innerJoin(MemeTag, eq(MemeTag.memeId, Meme.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(Meme.createdAt));
      const memes = limit ? await query.limit(limit) : await query;
      return memes.map((m) => m.name);
    }

    const query = db
      .select({ name: Meme.name })
      .from(Meme)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(Meme.createdAt));
    const memes = limit ? await query.limit(limit) : await query;
    return memes.map((m) => m.name);
  }

  private async getWithPlayCount(
    sort: string,
    conditions: any[],
    tag: string | null,
    limit: number | undefined
  ): Promise<string[]> {
    const orderBy =
      sort === "most-played" ? desc(Meme.playCount) : asc(Meme.playCount);

    if (tag) {
      conditions.push(eq(MemeTag.tagName, tag));
      const query = db
        .select({ name: Meme.name, playCount: Meme.playCount })
        .from(Meme)
        .innerJoin(MemeTag, eq(MemeTag.memeId, Meme.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(orderBy);
      const memes = limit ? await query.limit(limit) : await query;
      return memes.map((m) => `${m.name} (count: ${m.playCount})`);
    }

    const query = db
      .select({ name: Meme.name, playCount: Meme.playCount })
      .from(Meme)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderBy);
    const memes = limit ? await query.limit(limit) : await query;
    return memes.map((m) => `${m.name} (count: ${m.playCount})`);
  }

  private async getRecentlyPlayed(
    conditions: any[],
    tag: string | null,
    limit: number | undefined
  ): Promise<string[]> {
    if (tag) {
      conditions.push(eq(MemeTag.tagName, tag));
      const query = db
        .select({ name: Meme.name })
        .from(Meme)
        .innerJoin(Play, eq(Play.memeId, Meme.id))
        .innerJoin(MemeTag, eq(MemeTag.memeId, Meme.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .groupBy(Meme.id, Meme.name)
        .orderBy(desc(sql`MAX(${Play.playedAt})`));
      const memes = limit ? await query.limit(limit) : await query;
      return memes.map((m) => m.name);
    }

    const query = db
      .select({ name: Meme.name })
      .from(Meme)
      .innerJoin(Play, eq(Play.memeId, Meme.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(Meme.id, Meme.name)
      .orderBy(desc(sql`MAX(${Play.playedAt})`));
    const memes = limit ? await query.limit(limit) : await query;
    return memes.map((m) => m.name);
  }

  private getTitle(
    sort: string | null,
    tag: string | null,
    author: string | undefined
  ) {
    const parts = [];
    switch (sort) {
      case "most-played":
        parts.push("Most Played");
        break;
      case "least-played":
        parts.push("Least Played");
        break;
      case "recently-played":
        parts.push("Recently Played");
        break;
      default:
        parts.push("Recently Added");
        break;
    }
    if (tag) parts.push(`in #${tag}`);
    if (author) parts.push(`by ${author}`);
    return parts.join(" ");
  }

  private chunkEntries(entries: string[], title: string): string[][] {
    const MAX_CHARS = 3900;
    const chunks: string[][] = [];
    let current: string[] = [];
    let currentLen = title.length + 10;

    for (const entry of entries) {
      const addition = current.length > 0 ? entry.length + 2 : entry.length;
      if (currentLen + addition > MAX_CHARS && current.length > 0) {
        chunks.push(current);
        current = [entry];
        currentLen = title.length + 10 + entry.length;
      } else {
        current.push(entry);
        currentLen += addition;
      }
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  async onAutocomplete(interaction: AutocompleteInteraction) {
    const name = interaction.options.getFocused();
    const tags = await db
      .select({ name: Tag.name })
      .from(Tag)
      .where(like(Tag.name, `%${name}%`))
      .limit(25);
    await interaction.respond(tags.map(({ name }) => ({ name, value: name })));
  }
}
