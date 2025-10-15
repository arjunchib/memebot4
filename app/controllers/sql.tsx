import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  codeBlock,
  ModalSubmitInteraction,
} from "discord.js";
import { Label, Modal, TextInput } from "mango";
import { sqliteReadonly } from "../../db/database";

export default class SqlController {
  async onChatInput(interaction: ChatInputCommandInteraction) {
    await interaction.showModal(
      <Modal title="Run query" custom_id="sql">
        <Label label="Query">
          <TextInput
            style={2}
            custom_id="query"
            placeholder="SELECT name FROM memes WHERE play_count > 30"
          />
        </Label>
      </Modal>
    );
  }

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    const query = interaction.fields.getTextInputValue("query");
    const results = sqliteReadonly.query(query).all();

    let csv = Object.keys(results[0] as any).join(",");
    csv += "\n";
    csv += results
      .map((result: any) => Object.values(result).join(","))
      .join("\n");

    const attachment = new AttachmentBuilder(Buffer.from(csv), {
      name: `${query}.csv`,
    });

    await interaction.reply({
      content: codeBlock("sql", query),
      files: [attachment],
    });
  }
}
