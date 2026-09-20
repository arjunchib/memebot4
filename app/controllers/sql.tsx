import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ComponentType,
  ModalSubmitInteraction,
} from "discord.js";
import { Label, Modal, TextInput } from "mango";
import { createValidator } from "../helpers";
import { SqlResults } from "../views/sql_results";
import { ErrorMessage } from "../views/error_message";
import { summarizeSql } from "../sql_summary";

export default class SqlController {
  private isValidAction = createValidator("refresh", "edit", "csv");

  async onChatInput(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString("query", false);

    if (query) {
      await interaction.reply(<SqlResults query={query} />);
    } else {
      await interaction.showModal(
        <Modal title="Run query" custom_id="sql">
          <Label label="Query">
            <TextInput
              style={2}
              custom_id="query"
              placeholder="SELECT name FROM memes WHERE play_count > 30"
            />
          </Label>
        </Modal>,
      );
    }
  }

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    const query = interaction.fields.getTextInputValue("query");
    await interaction.reply(<SqlResults query={query} />);
  }

  async onButton(interaction: ButtonInteraction) {
    let [_, action] = interaction.customId.split(":");
    action ||= "edit"; // default to 'edit' for backwards compatibility

    try {
      if (!this.isValidAction(action)) throw new Error("Invalid action");

      const textDisplay = interaction.message.components
        .find((c) => c.type === ComponentType.Container)
        ?.components.find((c) => c.type === ComponentType.TextDisplay);
      const query = textDisplay?.content.match(/```sql\s([\s\S]*)\s```/)?.[1];

      if (!query) throw new Error("Missing query");

      switch (action) {
        case "refresh":
          return await this.refresh(interaction, query);
        case "edit":
          return await this.edit(interaction, query);
        case "csv":
          return await this.csv(interaction, query);
      }
    } catch (e) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      await interaction.followUp(<ErrorMessage error={e} ephemeral />);
    }
  }

  private async refresh(interaction: ButtonInteraction, query: string) {
    await interaction.update(<SqlResults query={query} />);
  }

  private async csv(interaction: ButtonInteraction, query: string) {
    const filename = `${summarizeSql(query)}_${interaction.message.id}`;
    await interaction.update(<SqlResults query={query} csv={filename} />);
  }

  private async edit(interaction: ButtonInteraction, query: string) {
    await interaction.showModal(
      <Modal title="Run query" custom_id="sql">
        <Label label="Query">
          <TextInput style={2} custom_id="query" value={query} />
        </Label>
      </Modal>,
    );
  }
}
