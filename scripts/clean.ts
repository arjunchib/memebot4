import { readdir } from "fs/promises";
import { db } from "../db/database";
import { basename } from "path";

const DIR = "s3/audio";

const paths = await readdir(DIR);
let i = 0;

for (const path of paths) {
  const file = Bun.file(`${DIR}/${path}`);
  const id = basename(path, ".webm");
  const meme = await db.query.memes.findFirst({
    where: (memes, { eq }) => eq(memes.id, id),
  });
  if (!meme) {
    // console.log(i++, file.size, id, "<MISSING>");
  } else if (file.size < 1000) {
    console.log(meme);
  }
}
