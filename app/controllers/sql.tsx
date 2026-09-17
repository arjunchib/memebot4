import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  codeBlock,
  ModalSubmitInteraction,
} from "discord.js";
import { Label, Modal, TextInput } from "mango";
import { sqliteReadonly } from "../../db/database";
import { sqlToCsv, sqlToFilename } from "../helpers";
import { SqlResults } from "../views/sql_results";

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
      </Modal>,
    );
  }

  async onModalSubmit(interaction: ModalSubmitInteraction) {
    const query = interaction.fields.getTextInputValue("query");
    const code = codeBlock("sql", query);
    const results = sqliteReadonly.query(query).all();

    if (results.length <= 20) {
      await interaction.reply(<SqlResults code={code} results={results} />);
    } else {
      const csv = sqlToCsv(results);
      const attachment = new AttachmentBuilder(Buffer.from(csv), {
        name: `${sqlToFilename(query)}.csv`,
      });
      await interaction.reply({
        content: code,
        files: [attachment],
      });
    }
  }
}
