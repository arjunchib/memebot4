import { SlashCommand, Option } from "mango";

export default (
  <SlashCommand name="sql" description="Run a query against the meme database">
    <Option
      name="query"
      description="Query to run. Leave blank to enter in a modal."
      type="String"
      required={false}
    ></Option>
  </SlashCommand>
);
