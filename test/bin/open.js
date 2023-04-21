import open, { openApp, apps } from 'open';
import path from "path";

const coverPath = path.join("coverage", "index.html");
const absPath = path.resolve(coverPath);
console.log(absPath);

await open(`file://${absPath}`);