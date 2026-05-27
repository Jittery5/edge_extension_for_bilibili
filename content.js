const THRESHOLD = 50_000;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const blocked  = new Set();
const allowed  = new Set();
const fetching = new Set();

const sheet = document.createElement('style');
// .feed-card[data-bf-hide] has higher specificity to beat Bilibili's display:flex!important on .feed-card.
// The second rule covers other card types loaded by infinite scroll.
sheet.textContent = '.feed-card[data-bf-hide]{display:none!important}[data-bf-hide]{display:none!important}';
(document.head ?? document.documentElement).appendChild(sheet);

const badge = document.createElement('div');
badge.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#00a1d6;color:#fff;font-size:12px;padding:4px 10px;border-radius:12px;z-index:99999;opacity:0;transition:opacity 0.3s;pointer-events:none';
document.body.appendChild(badge);

function updateBadge() {
  const n = blocked.size;
  badge.textContent = `已屏蔽 ${n} 个低粉UP主`;
  badge.style.opacity = n > 0 ? '1' : '0';
}

function parseMid(href) {
  const m = href.match(/space\.bilibili\.com\/(\d+)/);
  return m?.[1] ?? null;
}

async function followerCount(mid) {
  const key = 'f:' + mid;
  const store = await chrome.storage.local.get(key);
  const entry = store[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.n;
  try {
    const r = await fetch(`https://api.bilibili.com/x/relation/stat?vmid=${mid}`);
    const j = await r.json();
    const n = j?.data?.follower ?? -1;
    if (n >= 0) await chrome.storage.local.set({ [key]: { n, ts: Date.now() } });
    return n;
  } catch {
    return -1;
  }
}

// Walk up from an author link to find its card container.
// Checks known class patterns first, then falls back to the first ancestor
// that sits in a grid/list (parent has many siblings of the same tag).
function cardOf(a) {
  let node = a.parentElement;
  while (node && node !== document.body) {
    const cls = typeof node.className === 'string' ? node.className : '';
    if (/\b(feed-card|bili-video-card|video-card)\b/.test(cls)) return node;
    node = node.parentElement;
  }
  // Fallback: first ancestor whose parent has 3+ children of the same tag
  node = a.parentElement;
  while (node && node !== document.body) {
    const p = node.parentElement;
    if (p && p.querySelectorAll(`:scope > ${node.tagName}`).length >= 3) return node;
    node = node.parentElement;
  }
  return null;
}

function applyHide(card, mid) {
  card.setAttribute('data-bf-hide', '');
  card.dataset.bfMid = mid;
}

async function processCard(card) {
  // Skip navigation / header elements
  if (card.closest('header, nav, .bili-header, .header-channel')) return;

  const a = card.querySelector('a[href*="space.bilibili.com"]');
  if (!a) return;
  const mid = parseMid(a.href);
  if (!mid) return;

  // Clear stale hide if card was reused with different content
  if (card.hasAttribute('data-bf-hide') && card.dataset.bfMid !== mid) {
    card.removeAttribute('data-bf-hide');
    delete card.dataset.bfMid;
  }

  if (blocked.has(mid))  { applyHide(card, mid); return; }
  if (allowed.has(mid))  { return; }
  if (fetching.has(mid)) { return; }

  fetching.add(mid);
  const n = await followerCount(mid);
  fetching.delete(mid);

  if (n >= 0 && n < THRESHOLD) {
    blocked.add(mid);
    updateBadge();
    document.querySelectorAll('[data-bf-mid]').forEach(c => {
      if (c.dataset.bfMid === mid) applyHide(c, mid);
    });
    // Also apply to any current card showing this mid not yet tagged
    scan();
  } else if (n >= 0) {
    allowed.add(mid);
  }
}

function scan() {
  const processed = new Set();
  document.querySelectorAll('a[href*="space.bilibili.com"]').forEach(a => {
    const card = cardOf(a);
    if (!card || processed.has(card)) return;
    processed.add(card);
    processCard(card);
  });
}

let timer;
function scheduleScan() {
  clearTimeout(timer);
  timer = setTimeout(scan, 200);
}

scan();
new MutationObserver(scheduleScan).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class'],
});
setInterval(scan, 1000);
