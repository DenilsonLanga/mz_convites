import { createCanvas } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Original procedural paper grain, with no photography or third-party image asset.
const width = 1240,
  height = 1754;
const canvas = createCanvas(width, height);
const context = canvas.getContext("2d");
const image = context.createImageData(width, height);
let state = 43871;
const random = () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
};
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    const noise = random();
    const light = noise > 0.54;
    image.data[offset] = light ? 235 : 3;
    image.data[offset + 1] = light ? 225 : 18;
    image.data[offset + 2] = light ? 195 : 12;
    image.data[offset + 3] = Math.round(
      Math.abs(noise - 0.5) * 30 + random() * 7,
    );
  }
}
context.putImageData(image, 0, 0);
const directory = fileURLToPath(new URL("../public/print/", import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/paper-grain.png`, canvas.toBuffer("image/png"));
