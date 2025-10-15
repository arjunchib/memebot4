import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./database";

migrate(db, { migrationsFolder: "drizzle" });
