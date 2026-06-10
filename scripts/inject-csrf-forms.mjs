import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'views');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.ejs')) files.push(p);
  }
  return files;
}

const pagesInclude = "<%- include('../partials/csrf-field') %>";
const adminInclude = "<%- include('partials/csrf-field') %>";
const adminNestedInclude = "<%- include('../partials/csrf-field') %>";

for (const file of walk(root)) {
  let text = fs.readFileSync(file, 'utf8');
  if (!/method\s*=\s*["']post["']/i.test(text)) continue;
  if (text.includes('csrf-field')) continue;

  const rel = path.relative(root, file);
  const isAdmin = rel.startsWith('admin' + path.sep);
  const inc = isAdmin && !rel.includes('admin' + path.sep + 'partials')
    ? adminInclude
    : pagesInclude;

  // Only match single-line <form> tags — EJS %> inside attributes breaks [^>]*.
  const updated = text.replace(/(<form(?:(?!>).)*method\s*=\s*["']post["'](?:(?!>).)*>)/gi, `$1\n  ${inc}`);
  if (updated !== text) {
    fs.writeFileSync(file, updated);
    console.log('updated', rel);
  }
}
