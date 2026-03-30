import { Option, SlashCommand } from "mango";

export default (
  <SlashCommand name="list" description="List memes">
    <Option
      name="sort"
      description="Sort order"
      type="String"
      required={false}
      choices={[
        { name: "Most Played", value: "most-played" },
        { name: "Recently Added", value: "recently-added" },
        { name: "Recently Played", value: "recently-played" },
        { name: "Least Played", value: "least-played" },
      ]}
    />
    <Option
      name="tag"
      description="Filter by tag"
      type="String"
      required={false}
      autocomplete
    />
    <Option
      name="author"
      description="Filter by author"
      type="User"
      required={false}
    />
  </SlashCommand>
);
