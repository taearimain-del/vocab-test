#!/usr/bin/env node
// index.html内のプレースホルダーに data/polaris・data/eiken の vocabNN.json を注入する。
// 実行: node scripts/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadLessons(dir) {
  const files = readdirSync(dir).filter(f => /^vocab\d+\.json$/.test(f)).sort();
  return files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

const polaris = loadLessons(join(ROOT, 'data', 'polaris'));
const eiken = loadLessons(join(ROOT, 'data', 'eiken'));

let html = readFileSync(join(ROOT, 'index.html'), 'utf8');

function inject(html, marker, data) {
  // 2回目以降のビルドでも動くよう、マーカー間の中身は空配列/既存データを問わず丸ごと置換する
  const re = new RegExp('/\\*' + marker + '\\*/[\\s\\S]*?/\\*END\\*/');
  if (!re.test(html)) throw new Error('marker not found: ' + marker);
  return html.replace(re, '/*' + marker + '*/' + JSON.stringify(data) + '/*END*/');
}

html = inject(html, 'POLARIS_DATA', polaris);
html = inject(html, 'EIKEN_DATA', eiken);

writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
console.log('OK: polaris ' + polaris.reduce((s, l) => s + l.words.length, 0) + '語 / eiken ' + eiken.reduce((s, l) => s + l.words.length, 0) + '語 を index.html に注入しました。');
