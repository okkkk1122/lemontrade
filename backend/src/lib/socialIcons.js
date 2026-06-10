const ICON_ALIASES = {
  TG: '/icons/social/telegram.svg',
  IG: '/icons/social/instagram.svg',
  YT: '/icons/social/youtube.svg',
};

const PLATFORM_RULES = [
  [/telegram|تلگرام|t\.me/i, '/icons/social/telegram.svg'],
  [/instagram|اینستاگرام/i, '/icons/social/instagram.svg'],
  [/youtube|یوتیوب|youtu\.be/i, '/icons/social/youtube.svg'],
];

function resolveSocialIconSrc(link) {
  if (!link) return null;
  const icon = String(link.icon || '').trim();
  if (icon.startsWith('/') || icon.startsWith('http')) return icon;
  if (ICON_ALIASES[icon]) return ICON_ALIASES[icon];
  const platform = String(link.platform || '');
  const url = String(link.url || '');
  for (const [pattern, src] of PLATFORM_RULES) {
    if (pattern.test(platform) || pattern.test(url)) return src;
  }
  return null;
}

/** Pick SVG path for DB storage when admin leaves icon empty. */
function defaultSocialIcon(platform, url, icon) {
  const resolved = resolveSocialIconSrc({ platform, url, icon });
  if (resolved) return resolved;
  const trimmed = String(icon || '').trim();
  return trimmed || null;
}

module.exports = { resolveSocialIconSrc, defaultSocialIcon, ICON_ALIASES };
