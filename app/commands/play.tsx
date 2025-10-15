import { Option, SlashCommand } from "mango";

export default (
  <SlashCommand name="play" description="Play a meme">
    <Option
      name="meme"
      description="Meme to play"
      type="String"
      required
      autocomplete
    ></Option>
  </SlashCommand>
);
