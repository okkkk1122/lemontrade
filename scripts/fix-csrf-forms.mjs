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

/** CSRF was injected inside action="" when EJS %> broke the regex. */
const brokenInsideAttr =
  /(<form[^>]*action="[^"]*)\s*\n\s*<%- include\(['"](?:\.\.\/)?partials\/csrf-field['"]\) %>([^"]*")([^>]*>)/g;

for (const file of walk(viewsRoot)) {
  let text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(viewsRoot, file);
  const isAdmin = rel.startsWith(`admin${path.sep}`);
  const inc = isAdmin ? "<%- include('partials/csrf-field') %>" : "<%- include('../partials/csrf-field') %>";

  if (!text.includes('csrf-field')) continue;

  const fixed = text.replace(brokenInsideAttr, (match, before, afterQuote, tail) => {
    const open = `${before}${afterQuote}${tail}`;
    if (open.includes('csrf-field')) return match;
    return `${open}\n  ${inc}`;
  });

  if (fixed !== text) {
    fs.writeFileSync(file, fixed);
    console.log('fixed', rel);
  }
}
