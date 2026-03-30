import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../../db/database";
import { and, asc, desc, eq, like } from "drizzle-orm";
import { Meme, MemeTag, Tag } from "../../db/schema";
import { MemeList } from "../views/meme_list";
import { ErrorMessage } from "../views/error_message";

export default class ListController {
  async onChatInput(interaction: ChatInputCommandInteraction) {
    try {
      const sort = interaction.options.getString("sort");
      const tag = interaction.options.getString("tag");
      const author = interaction.options.getUser("author");

      const orderBy = this.getOrderBy(sort);
      const limit = tag ? undefined : 20;

      const conditions = [];
      if (author) conditions.push(eq(Meme.authorId, author.id));

      let memes: { name: string }[];

      if (tag) {
        conditions.push(eq(MemeTag.tagName, tag));
        const query = db
          .select({ name: Meme.name })
          .from(Meme)
          .innerJoin(MemeTag, eq(MemeTag.memeId, Meme.id))
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(orderBy);
        memes = limit ? await query.limit(limit) : await query;
      } else {
        const query = db
          .select({ name: Meme.name })
          .from(Meme)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(orderBy);
        memes = limit ? await query.limit(limit) : await query;
      }

      const names = memes.map((m) => m.name);
      const title = this.getTitle(sort, tag, author?.username);

      if (names.length === 0) {
        return interaction.reply(<MemeList title={title} names={[]} />);
      }

      const chunks = this.chunkNames(names, title);
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

  private getOrderBy(sort: string | null) {
    switch (sort) {
      case "most-played":
        return desc(Meme.playCount);
      case "least-played":
        return asc(Meme.playCount);
      case "recently-added":
      default:
        return desc(Meme.createdAt);
    }
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
      default:
        parts.push("Recently Added");
        break;
    }
    if (tag) parts.push(`in #${tag}`);
    if (author) parts.push(`by ${author}`);
    return parts.join(" ");
  }

  // Split names into chunks that fit within Discord's ~4000 char limit
  private chunkNames(names: string[], title: string): string[][] {
    const MAX_CHARS = 3900;
    const chunks: string[][] = [];
    let current: string[] = [];
    let currentLen = title.length + 10;

    for (const name of names) {
      const addition = current.length > 0 ? name.length + 2 : name.length;
      if (currentLen + addition > MAX_CHARS && current.length > 0) {
        chunks.push(current);
        current = [name];
        currentLen = title.length + 10 + name.length;
      } else {
        current.push(name);
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
