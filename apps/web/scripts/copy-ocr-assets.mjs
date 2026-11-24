/**
 * Copies the OCR engine into public/ocr, so the browser loads it from this site and not from
 * a third-party CDN. tesseract.js fetches three things at run time: its worker script, the
 * WebAssembly core and the language data. Serving them ourselves removes a runtime dependency
 * on jsDelivr and lets the content security policy name 'self' alone.
 *
 * Run before `next dev` and `next build`. A missing source stops the build: an app that
 * deploys without its OCR engine would only find out when somebody pointed a camera at a label.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ocr');

/** The folder of an installed package, found by walking up from a file inside it. */
function packageRoot(entry, name) {
  let dir = dirname(entry);
  for (;;) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest) && require(manifest).name === name) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Could not find the root of ${name}.`);
    dir = parent;
  }
}

function resolveFrom(base, name) {
  return createRequire(join(base, 'package.json')).resolve(name);
}

const tesseract = packageRoot(require.resolve('tesseract.js'), 'tesseract.js');
const core = packageRoot(resolveFrom(tesseract, 'tesseract.js-core'), 'tesseract.js-core');
const data = dirname(require.resolve('@tesseract.js-data/eng/package.json'));

// The core comes in three builds, chosen at run time by what the device supports. The
// "lstm" ones are what createWorker loads by default, and the .wasm.js form carries the
// WebAssembly inside it, so each is a single file.
const files = [
  [join(tesseract, 'dist', 'worker.min.js'), 'worker.min.js'],
  [join(core, 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(core, 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [
    join(core, 'tesseract-core-relaxedsimd-lstm.wasm.js'),
    'tesseract-core-relaxedsimd-lstm.wasm.js',
  ],
  [join(data, '4.0.0_best_int', 'eng.traineddata.gz'), join('lang', 'eng.traineddata.gz')],
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'lang'), { recursive: true });

for (const [from, to] of files) {
  if (!existsSync(from)) throw new Error(`OCR asset missing: ${from}`);
  copyFileSync(from, join(OUT, to));
}

const kb = files.reduce((sum, [from]) => sum + statSync(from).size, 0) / 1024;
process.stdout.write(`copied ${files.length} OCR files to public/ocr (${Math.round(kb)} KB)\n`);
