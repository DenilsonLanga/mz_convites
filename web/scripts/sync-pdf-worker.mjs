import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const packageDirectory = dirname(fileURLToPath(import.meta.resolve("pdfjs-dist/package.json")));
await mkdir(join(root, "public"), { recursive: true });
await copyFile(join(packageDirectory, "build/pdf.worker.min.mjs"), join(root, "public/pdf.worker.min.mjs"));
