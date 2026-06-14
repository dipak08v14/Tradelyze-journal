import fs from 'fs';
import path from 'path';

const iconDir = path.join(process.cwd(), 'extension', 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

const base64Png = 'iVBOR0w0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Png, 'base64');

fs.writeFileSync(path.join(iconDir, 'icon16.png'), buffer);
fs.writeFileSync(path.join(iconDir, 'icon48.png'), buffer);
fs.writeFileSync(path.join(iconDir, 'icon128.png'), buffer);

console.log("Successfully created placeholder extension icons.");
