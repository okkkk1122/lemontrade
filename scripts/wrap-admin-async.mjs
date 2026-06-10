import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend', 'src', 'modules', 'admin', 'routes');

for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.routes.js')) continue;
  const file = path.join(dir, name);
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('asyncHandler')) continue;

  if (!src.includes("require('../../../lib/asyncHandler')")) {
    src = src.replace(
      /^(const express = require\('express'\);)\n/,
      "$1\nconst asyncHandler = require('../../../lib/asyncHandler');\n"
    );
  }

  src = src.replace(
    /router\.(get|post|put|delete|patch)\(([^;]+?),\s*async\s*\(req,\s*res\)\s*=>\s*\{/g,
    'router.$1($2, asyncHandler(async (req, res) => {'
  );
  src = src.replace(
    /router\.(get|post|put|delete|patch)\(([^;]+?),\s*async\s*\(req,\s*res,\s*next\)\s*=>\s*\{/g,
    'router.$1($2, asyncHandler(async (req, res, next) => {'
  );

  const lines = src.split('\n');
  const out = [];
  let depth = 0;
  let inRouteHandler = false;
  let routeHandlerDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/router\.(get|post|put|delete|patch)\([^]+asyncHandler\(async/.test(line)) {
      inRouteHandler = true;
      routeHandlerDepth = 0;
    }

    out.push(line);

    if (!inRouteHandler) continue;

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    routeHandlerDepth += opens - closes;

    if (routeHandlerDepth === 0 && trimmed === '});' && inRouteHandler) {
      out[out.length - 1] = line.replace('});', '}));');
      inRouteHandler = false;
    }
  }

  fs.writeFileSync(file, out.join('\n'));
  console.log('wrapped', name);
}
