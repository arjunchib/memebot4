import { pascalCase, snakeCase } from "change-case";
import { styleText } from "node:util";

const args = Bun.argv.slice(2);
const taskName = args[0];

if (!taskName) throw new Error("Need to provide a task name");

const pascalName = pascalCase(taskName);
const snakeName = snakeCase(taskName);

const task = await import(`../app/tasks/${snakeName}`);

console.log(styleText("cyanBright", `Running ${pascalName}`));
new task[pascalName]().perform();
