import { $ } from "bun";

const id = Bun.argv.slice(2).at(0)?.trim();

await $`open -a "Google Chrome" s3/audio/${id}.webm`;
