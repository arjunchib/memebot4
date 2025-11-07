import { Option, SlashCommand } from "mango";

export default (
  <SlashCommand name="random" description="Play a random meme">
    <Option
      name="tag"
      description="Pick a meme with this tag"
      type="String"
      required={false}
      autocomplete
    ></Option>
  </SlashCommand>
);
