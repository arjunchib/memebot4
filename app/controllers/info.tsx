import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { MemeModal } from "../views/meme_modal";
import { db } from "../../db/database";
import { eq, like, sql } from "drizzle-orm";
import { Commands, Memes } from "../../db/schema";
import { MemeInfo } from "../views/meme_info";

export default class InfoController {
  async onButton(interaction: ButtonInteraction) {
    const [_, action, id] = interaction.customId.split(":") as [
      null,
      "play" | "edit" | "delete",
      string
    ];
    switch (action) {
      case "edit":
        const meme = await db.query.memes.findFirst({
          where: eq(Memes.id, id),
          with: {
            commands: { columns: { name: true } },
            memeTags: { columns: { tagName: true } },
          },
        });
        if (!meme) throw new Error("No meme");
        const commands = meme.commands.map((c) => c.name);
        const tags = meme.memeTags.map((t) => t.tagName);
        console.log(commands);
        await interaction.showModal(
          <MemeModal meme={meme} commands={commands} tags={tags} />
        );
        return;
      default:
        return await interaction.deferUpdate();
    }
  }

  async onChatInput(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("meme");
    if (!name) return await interaction.reply(`404 Meme not found`);
    const command = await db.query.commands.findFirst({
      where: eq(Commands.name, name),
      with: {
        meme: {
          with: {
            commands: { columns: { name: true } },
            memeTags: { columns: { tagName: true } },
          },
        },
      },
    });
    const meme = command?.meme;
    if (!meme) return await interaction.reply(`404 Meme not found`);
    const commands = meme.commands.map((c) => c.name);
    const tags = meme.memeTags.map((t) => t.tagName);
    await interaction.reply(
      <MemeInfo meme={meme} commands={commands} tags={tags} />
    );
  }

  async onAutocomplete(interaction: AutocompleteInteraction) {
    const name = interaction.options.getFocused();
    // group by meme so we can collapse commands into one entry
    const commandResults = await db
      .select({
        names: sql<string>`GROUP_CONCAT(${Commands.name},';')`,
      })
      .from(Commands)
      .where(like(Commands.name, `%${name}%`))
      .groupBy(Commands.memeId)
      .limit(25);
    const choices = commandResults
      .map((c) => {
        const name = c.names.split(";")?.[0];
        if (!name) return null;
        return {
          name,
          value: name,
        };
      })
      .filter((choice) => !!choice);
    await interaction.respond(choices);
  }
}
