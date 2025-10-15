import { bootstrap } from "mango";

export const client = bootstrap();

if (import.meta.main) {
  client.login(Bun.env.TOKEN!);
}
