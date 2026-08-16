import { copyFile } from "node:fs/promises";

const source = new URL("../public/index.html", import.meta.url);
const namedCopy = new URL("../public/北疆国庆自驾攻略.html", import.meta.url);

await copyFile(source, namedCopy);
