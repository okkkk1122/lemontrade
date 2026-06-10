/**
 * Scan EJS views for broken CSRF injection inside form action attributes.
 * Run: node scripts/qa-forms.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const viewsRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'views');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.ejs')) files.push(p);
  }
  return files;
}

const results = [];
for (const file of walk(viewsRoot)) {
  const rel = path.relative(viewsRoot, file);
  const text = fs.readFileSync(file, 'utf8');
  const brokenInAction = /action="[^"]*csrf-field/.test(text);
  const brokenMultiline = /<form[^>]*action="[^"]*\n[^"]*csrf-field/s.test(text);
  const postForms = (text.match(/method\s*=\s*["']post["']/gi) || []).length;
  const csrfFields = (text.match(/csrf-field/g) || []).length;
  const missingCsrf = postForms > 0 && csrfFields === 0;
  results.push({
    file: rel,
    postForms,
    csrfFields,
    pass: !brokenInAction && !brokenMultiline && !missingCsrf,
    brokenInAction,
    brokenMultiline,
    missingCsrf,
  });
}

const fails = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    {
      summary: { total: results.length, pass: results.length - fails.length, fail: fails.length },
      fails: fails.map((f) => ({
        file: f.file,
        brokenInAction: f.brokenInAction,
        brokenMultiline: f.brokenMultiline,
        missingCsrf: f.missingCsrf,
      })),
    },
    null,
    2,
  ),
);
process.exit(fails.length > 0 ? 1 : 0);
