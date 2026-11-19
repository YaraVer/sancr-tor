#!/usr/bin/env node
/** Validate that every character in public/data/characters.json has 8 readable 32x32 PNGs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'public', 'data', 'characters.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function pngSize(file) {
  const buf = fs.readFileSync(file);
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

let errors = 0;
let files = 0;
for (const character of manifest.characters) {
  for (const [state, frames] of Object.entries(character.sprite.states)) {
    for (const dir of manifest.directions) {
      const rel = frames[dir];
      if (!rel) {
        console.error(`MISSING entry: ${character.id}/${state}/${dir}`);
        errors += 1;
        continue;
      }
      const abs = path.join(projectRoot, 'public', rel);
      if (!fs.existsSync(abs)) {
        console.error(`MISSING file: ${rel}`);
        errors += 1;
        continue;
      }
      const { width, height } = pngSize(abs);
      files += 1;
      if (width !== 32 || height !== 32) {
        console.error(`BAD size: ${rel} is ${width}x${height}, expected 32x32`);
        errors += 1;
      }
    }
  }
}

console.log(`Checked ${files} PNG files for ${manifest.characters.length} characters.`);
if (errors > 0) {
  console.error(`FAILED: ${errors} problem(s).`);
  process.exit(1);
}
console.log('OK: all sprite files exist and are 32x32.');
