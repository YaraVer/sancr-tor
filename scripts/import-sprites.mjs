#!/usr/bin/env node
/**
 * Import a generated 8-direction 32x32 sprite pack into the project.
 *
 * Usage:
 *   node scripts/import-sprites.mjs --zip "C:\path\pack.zip" --id zereks --name "Зерекс"
 *   node scripts/import-sprites.mjs --dir "C:\path\extracted" --id zereks --name "Зерекс"
 *
 * Expected source layout (either works):
 *   <root>/Idle/rotations/south.png ... (8 files)
 *   <root>/idle/south.png ... (8 files)
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
      out[key] = value;
      i += 1;
    }
  }
  return out;
}

function pngSize(file) {
  const buf = fs.readFileSync(file);
  const signature = buf.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`Not a PNG: ${file}`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function findSourceDir(root) {
  const candidates = [];
  const walk = (dir, depth) => {
    if (depth > 4) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name.toLowerCase() === 'rotations') candidates.push(full);
        walk(full, depth + 1);
      }
    }
  };
  walk(root, 0);
  if (candidates.length === 0) {
    // Maybe the root itself contains the png files directly.
    if (directions.every((d) => fs.existsSync(path.join(root, `${d}.png`)))) return root;
    throw new Error(`Could not find a rotations/ folder with 8 direction PNGs in ${root}`);
  }
  return candidates[0];
}

function extractZip(zipPath) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sancr-sprites-'));
  try {
    execFileSync('tar', ['-xf', zipPath, '-C', tmp], { stdio: 'pipe' });
    return tmp;
  } catch (err) {
    throw new Error(`Failed to extract zip with tar. Extract it manually and pass --dir. ${err.message}`);
  }
}

function loadManifest() {
  const manifestPath = path.join(projectRoot, 'src', 'data', 'characters.json');
  return { manifestPath, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) };
}

function upsertCharacter(manifest, { id, name, role, paths, notes }) {
  const entry = {
    id,
    name,
    role: role || 'Персонаж',
    sprite: {
      basePath: `assets/characters/${id}`,
      size: [32, 32],
      states: { idle: paths },
    },
    ...(notes ? { notes } : {}),
  };
  const idx = manifest.characters.findIndex((c) => c.id === id);
  if (idx >= 0) manifest.characters[idx] = entry;
  else manifest.characters.push(entry);
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.id || (!args.zip && !args.dir)) {
    console.error('Usage: node scripts/import-sprites.mjs --zip <pack.zip> --id <character-id> [--name "..."] [--role "..."] [--notes "..."]');
    console.error('   or: node scripts/import-sprites.mjs --dir <extracted-folder> --id <character-id> ...');
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(args.id)) {
    throw new Error('--id must be lowercase latin letters, digits and dashes');
  }

  const tmp = args.zip ? extractZip(args.zip) : null;
  const sourceRoot = args.dir || tmp;
  const rotations = findSourceDir(sourceRoot);

  const destDir = path.join(projectRoot, 'public', 'assets', 'characters', args.id, 'idle');
  fs.mkdirSync(destDir, { recursive: true });

  const paths = {};
  for (const dir of directions) {
    const from = path.join(rotations, `${dir}.png`);
    if (!fs.existsSync(from)) throw new Error(`Missing ${dir}.png in ${rotations}`);
    const size = pngSize(from);
    if (size.width !== 32 || size.height !== 32) {
      throw new Error(`${dir}.png is ${size.width}x${size.height}, expected 32x32`);
    }
    const to = path.join(destDir, `${dir}.png`);
    fs.copyFileSync(from, to);
    paths[dir] = `assets/characters/${args.id}/idle/${dir}.png`;
  }

  const { manifestPath, manifest } = loadManifest();
  upsertCharacter(manifest, {
    id: args.id,
    name: args.name || args.id,
    role: args.role,
    paths,
    notes: args.notes,
  });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`OK: ${args.id} -> public/assets/characters/${args.id}/idle/ (8 files)`);
  console.log(`Updated ${path.relative(projectRoot, manifestPath)}`);
}

main();
