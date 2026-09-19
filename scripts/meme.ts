import { db } from "../db/database";

const id = Bun.argv.slice(2).at(0)?.trim();

if (!id) throw new Error("Missing id");

console.log(
  await db.query.memes.findFirst({
    where: (memes, { eq }) => eq(memes.id, id),
  }),
);
