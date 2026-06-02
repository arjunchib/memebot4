import { pascalCase, snakeCase } from "change-case";
import { styleText } from "node:util";

const args = Bun.argv.slice(2);
const taskName = args[0] + "_task";

if (!taskName) throw new Error("Need to provide a task name");

const pascalName = pascalCase(taskName);
const snakeName = snakeCase(taskName);

const task = await import(`../app/tasks/${snakeName}`);

console.log(styleText("cyanBright", `Running ${pascalName}`));
const t0 = performance.now();
await new task[pascalName]().perform();
const t1 = performance.now();
console.log(
  styleText(
    "cyanBright",
    `Finished ${pascalName} in ${((t1 - t0) / 1000).toFixed(3)}s`,
  ),
);
