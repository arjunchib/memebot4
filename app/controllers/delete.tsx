import { MessageFlags, type ButtonInteraction } from "discord.js";
import { createValidator } from "../helpers";
import { Container, Message, TextDisplay } from "mango";
import { ErrorMessage } from "../views/error_message";
import { db } from "../../db/database";
import { Meme } from "../../db/schema";
import { eq } from "drizzle-orm";

export default class DeleteController {
  private isValidAction = createValidator("confirm", "cancel");

  async onButton(interaction: ButtonInteraction) {
    await interaction.deferUpdate();
    const [_, action, id] = interaction.customId.split(":");

    try {
      if (!this.isValidAction(action)) throw new Error("Invalid action");
      switch (action) {
        case "confirm":
          return await this.confirm(interaction, id);
        case "cancel":
          return await interaction.deleteReply();
      }
    } catch (e) {
      await interaction.followUp(<ErrorMessage error={e} ephemeral />);
    }
  }

  private async confirm(
    interaction: ButtonInteraction,
    id: string | undefined
  ) {
    if (!id) throw new Error("Cannot find meme");
    const [meme] = await db.delete(Meme).where(eq(Meme.id, id)).returning();
    if (!meme) throw new Error("Cannot find meme");
    await interaction.deleteReply();
    await interaction.followUp(
      <Message>
        <Container accent_color={0x00ff00}>
          <TextDisplay>{`Successfully deleted *${meme.name}*`}</TextDisplay>
        </Container>
      </Message>
    );
  }
}
