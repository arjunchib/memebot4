import { Option, SlashCommand } from "mango";

export default (
  <SlashCommand name="info" description="Find info on a meme">
    <Option
      name="meme"
      description="Meme name"
      type="String"
      required
      autocomplete
    />
  </SlashCommand>
);
