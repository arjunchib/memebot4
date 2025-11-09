import { sqlite } from "../db/database";

sqlite.run(
  `DELETE FROM __drizzle_migrations WHERE rowid = (SELECT MAX(rowid) FROM __drizzle_migrations);`
);
