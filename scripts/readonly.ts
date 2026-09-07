import { sqliteReadonly } from "../db/database";

const args = Bun.argv.slice(2);

const query = args[0];

if (!query) throw new Error("No query string");

const results = sqliteReadonly.query(query).all();

let csv = Object.keys(results[0] as any).join(",");
csv += "\n";
csv += results.map((result: any) => Object.values(result).join(",")).join("\n");

console.log(csv);
