import { readdir } from "fs/promises";
import { db } from "../db/database";
import { basename } from "path";
import { $ } from "bun";

interface Match {
  match_count: number;
  query_start: number;
  query_stop: number;
  path: string;
  match_identifier: number;
  reference_start: number;
  reference_stop: number;
}

interface Result {
  query_index: number;
  total_queries: number;
  query_path: string;
  query_offset: number;
  fingerprints_matched: number;
  query_duration_seconds: number;
  fingerprints_per_second: number;
  search_time_seconds: number;
  realtime_factor: number;
  matches: Match[];
}

const DIR = "s3/audio";
const command = Bun.argv.slice(2).at(0)?.trim();
const paths = await readdir(DIR);

if (command === "store") {
  for (const path of paths) {
    const id = basename(path, ".webm");
    const fullPath = `${DIR}/${path}`;
    const file = Bun.file(fullPath);
    const meme = await db.query.memes.findFirst({
      where: (memes, { eq }) => eq(memes.id, id),
    });
    if (meme && file.size > 1000) {
      const result =
        await $`olaf store --threads 8  --format json --with-ids ${fullPath} ${id} 2>&1`.json();
      console.log(result);
    }
  }
} else if (command === "query") {
  for (const path of paths) {
    const id = basename(path, ".webm");
    const fullPath = `${DIR}/${path}`;
    const file = Bun.file(fullPath);
    const meme = await db.query.memes.findFirst({
      where: (memes, { eq }) => eq(memes.id, id),
    });
    if (meme && file.size > 1000) {
      const result =
        (await $`olaf query --threads 8 --no-identity-match --format json --with-ids ${fullPath} ${id} 2>&1`.json()) as Result;
      if (result.matches.length) console.log(result);
      // break;
    }
  }
} else {
  console.log("Provide a command: 'store' or 'query'");
}
