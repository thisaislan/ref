/**
 * ref – main logic
 * Depends on `redirects` being defined (from redirects.js)
 */

// ─── Configuration ──────────────────────────────────────────────────
const CONFIG = {
    minKeyLength: 2,
    chars: 'abcdefghijklmnopqrstuvwxyz0123456789',
    basePath: '/ref/',
    maxResolveDepth: 5,
};

// ─── Theme handling ──────────────────────────────────────────────────
function updateToggleIcon(theme) {
    const toggle = document.getElementById('themeToggle');
    toggle.textContent = theme === 'dark' ? '☾' : '◯';
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.remove('light-mode');
        localStorage.setItem('ref-theme', 'dark');
    } else {
        document.body.classList.add('light-mode');
        localStorage.setItem('ref-theme', 'light');
    }
    updateToggleIcon(theme);
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-mode');
    applyTheme(isLight ? 'dark' : 'light');
}

// Initialise theme (default dark)
(function initTheme() {
    const saved = localStorage.getItem('ref-theme');
    applyTheme(saved === 'light' ? 'light' : 'dark');
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
})();

// ─── Helpers ──────────────────────────────────────────────────────
function getKeyFromPath() {
    const params = new URLSearchParams(window.location.search);

    // 1. Explicit legacy parameters (backward compatible)
    if (params.has('c')) {
        const cmd = params.get('c').trim();
        if (cmd) return 'c:' + cmd;
    }
    if (params.has('q')) {
        const qrKey = params.get('q').trim();
        if (qrKey) return 'qr:' + qrKey;
    }
    if (params.has('k')) {
        const key = params.get('k').trim();
        if (key) return key;
    }

    // 2. New compact scheme: single parameter with no value → treat as key
    const allKeys = Array.from(params.keys());
    if (allKeys.length === 1) {
        const token = allKeys[0];
        const value = params.get(token);
        if (value === '') {
            return token;
        }
    }

    // 3. Fallback: extract key from the URL path (existing behaviour)
    const path = window.location.pathname;
    const base = CONFIG.basePath;
    if (path === base || path === base.slice(0, -1) || path === '/') return null;
    if (path.startsWith(base)) return path.slice(base.length);
    const parts = path.split('/');
    return parts[parts.length - 1] || null;
}

function isCommand(key) {
    return key && key.startsWith('c:');
}

function isQRCommand(key) {
    return key && key.startsWith('qr:');
}

function getAllKeys() {
    return Object.keys(redirects);
}

function keyExists(key) {
    return redirects.hasOwnProperty(key);
}

// ─── Expiry check ──────────────────────────────────────────────────
function isLinkActive(val) {
    if (typeof val === 'string') return true;
    if (typeof val === 'object' && val !== null) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const start = val.start ? new Date(val.start + 'T00:00:00') : null;
        const expires = val.expires ? new Date(val.expires + 'T23:59:59') : null;
        if (start && now < start) return false;
        if (expires && now > expires) return false;
        return true;
    }
    return false;
}

function getDestValue(val) {
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null && val.dest) return val.dest;
    return null;
}

// ─── Parsing and resolution ──────────────────────────────────────────
function parseValue(val) {
    const raw = getDestValue(val);
    if (raw === null) return { type: 'invalid' };
    if (typeof raw !== 'string') return { type: 'invalid' };
    if (raw.startsWith('k:')) {
        return { type: 'ref', key: raw.slice(2) };
    }
    if (raw.startsWith('r:')) {
        try {
            const arr = JSON.parse(raw.slice(2));
            if (Array.isArray(arr)) return { type: 'random', items: arr };
        } catch (_) { /* ignore */ }
    }
    if (raw.startsWith('o:')) {
        try {
            const arr = JSON.parse(raw.slice(2));
            if (Array.isArray(arr)) return { type: 'openall', items: arr };
        } catch (_) { /* ignore */ }
    }
    return { type: 'url', value: raw };
}

function resolveValue(val, depth = 0) {
    if (depth > CONFIG.maxResolveDepth) {
        console.warn('Max resolve depth exceeded for', val);
        return null;
    }
    if (!isLinkActive(val)) return null;
    const parsed = parseValue(val);
    switch (parsed.type) {
        case 'url':
            return parsed.value;
        case 'ref': {
            const target = parsed.key;
            if (!keyExists(target)) return null;
            return resolveValue(redirects[target], depth + 1);
        }
        case 'random': {
            const items = parsed.items;
            if (!items || items.length === 0) return null;
            const resolvedItems = items
                .map(item => resolveValue(item, depth + 1))
                .filter(u => u !== null);
            if (resolvedItems.length === 0) return null;
            const idx = Math.floor(Math.random() * resolvedItems.length);
            return resolvedItems[idx];
        }
        case 'openall': {
            const items = parsed.items;
            if (!items || items.length === 0) return null;
            const resolvedItems = items
                .map(item => resolveValue(item, depth + 1))
                .filter(u => u !== null);
            if (resolvedItems.length === 0) return null;
            return resolvedItems;
        }
        default:
            return null;
    }
}

function getDisplayItems(key) {
    const val = redirects[key];
    if (!val) return null;
    const raw = getDestValue(val);
    if (raw === null) return null;
    const parsed = parseValue(val);
    let items = [];
    const expiryInfo = getExpiryInfo(val);

    switch (parsed.type) {
        case 'url':
            items = [{ type: 'url', url: parsed.value, display: parsed.value }];
            break;
        case 'ref':
            items = [{ type: 'ref', key: parsed.key, display: 'k:' + parsed.key }];
            break;
        case 'random':
        case 'openall': {
            const arr = parsed.items || [];
            items = arr.map(item => {
                const parsedItem = parseValue(item);
                if (parsedItem.type === 'ref') {
                    return { type: 'ref', key: parsedItem.key, display: 'k:' + parsedItem.key };
                } else {
                    return { type: 'url', url: item, display: item };
                }
            });
            break;
        }
        default:
            items = [];
    }
    return { items, expiry: expiryInfo };
}

function getExpiryInfo(val) {
    if (typeof val !== 'object' || val === null) return null;
    const start = val.start || null;
    const expires = val.expires || null;
    if (!start && !expires) return null;
    return { start, expires };
}

// ─── Key generation ──────────────────────────────────────────────
function generateKey() {
    const chars = CONFIG.chars;
    const used = new Set(getAllKeys());
    let length = CONFIG.minKeyLength;
    while (true) {
        const total = Math.pow(chars.length, length);
        if (used.size >= total) {
            length++;
            continue;
        }
        const attempts = Math.min(total * 2, 100000);
        for (let i = 0; i < attempts; i++) {
            let key = '';
            for (let j = 0; j < length; j++) {
                key += chars[Math.floor(Math.random() * chars.length)];
            }
            if (!used.has(key)) return key;
        }
        length++;
    }
}

// ─── Render functions ──────────────────────────────────────────────
function renderBlink() {
    const states = ['Oo', 'oo', '--', 'OO', '--', 'oO', 'oo', '--', 'OO', '--'];
    let index = 0;
    const el = document.createElement('div');
    el.className = 'center-box';
    const text = document.createElement('div');
    text.className = 'blink-text pulse';
    text.textContent = states[0];
    el.appendChild(text);
    let timeout = null;
    function cycle() {
        index = (index + 1) % states.length;
        text.textContent = states[index];
        text.classList.remove('pulse');
        void text.offsetWidth;
        text.classList.add('pulse');
        const delay = index === 0 || index === 5 ? 1200 : 200;
        timeout = setTimeout(cycle, delay);
    }
    timeout = setTimeout(cycle, 1200);
    el._cleanup = () => { if (timeout) clearTimeout(timeout); };
    return el;
}

function render404() {
    const el = document.createElement('div');
    el.className = 'center-box';
    el.innerHTML = `<div class="error-404">404<span class="frown">: (</span></div>`;
    return el;
}

// renderInactive is no longer used – inactive links now show 404
// function renderInactive() { ... }

function fallbackCopy(text, element) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        const orig = element.textContent;
        element.textContent = '✓ copied!';
        setTimeout(() => { element.textContent = orig; }, 2000);
    } catch (e) {
        alert('Unable to copy, please select and copy manually.');
    }
    document.body.removeChild(textarea);
}

function renderCommandKey() {
    const newKey = generateKey();
    const el = document.createElement('div');
    el.className = 'center-box';
    const outputDiv = document.createElement('div');
    outputDiv.className = 'cmd-output';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'new key';
    const keySpan = document.createElement('span');
    keySpan.className = 'key-value';
    keySpan.textContent = newKey;
    keySpan.title = 'Click to copy';
    keySpan.addEventListener('click', function() {
        const originalText = this.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(newKey).then(() => {
                this.textContent = '✓ copied!';
                setTimeout(() => { this.textContent = originalText; }, 2000);
            }).catch(() => fallbackCopy(newKey, this));
        } else {
            fallbackCopy(newKey, this);
        }
    });
    const desc = document.createElement('div');
    desc.className = 'text-muted mt-1';
    desc.textContent = 'copy this key and add it to the redirects array';
    outputDiv.appendChild(label);
    outputDiv.appendChild(keySpan);
    outputDiv.appendChild(desc);
    el.appendChild(outputDiv);
    return el;
}

function renderCommandList() {
    const keys = getAllKeys();
    const el = document.createElement('div');
    el.className = 'center-box';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'list-search';
    searchInput.placeholder = '⌕ search keys or destinations...';
    el.appendChild(searchInput);

    const wrap = document.createElement('div');
    wrap.className = 'list-wrap';
    el.appendChild(wrap);

    function renderFiltered(query) {
        wrap.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'list-header';
        header.innerHTML = `<span>key</span><span>type</span><span>destination(s)</span>`;
        wrap.appendChild(header);

        const filteredKeys = keys.filter(k => {
            const keyMatch = k.toLowerCase().includes(query.toLowerCase());
            const display = getDisplayItems(k);
            if (!display) return keyMatch;
            const destMatch = display.items.some(item =>
                item.display.toLowerCase().includes(query.toLowerCase())
            );
            return keyMatch || destMatch;
        });

        if (filteredKeys.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'list-empty';
            empty.textContent = 'no matching keys';
            wrap.appendChild(empty);
            return;
        }

        filteredKeys.sort();
        for (const k of filteredKeys) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'list-item';

            // --- key ---
            const keySpan = document.createElement('span');
            keySpan.className = 'list-key';
            keySpan.textContent = k;

            // --- type ---
            const typeSpan = document.createElement('span');
            typeSpan.className = 'list-type';
            const rawVal = redirects[k];
            let type = 'simple';
            if (rawVal) {
                const destRaw = getDestValue(rawVal);
                if (typeof destRaw === 'string') {
                    if (destRaw.startsWith('r:')) type = 'random';
                    else if (destRaw.startsWith('o:')) type = 'multi';
                }
            }
            typeSpan.textContent = type;

            // --- destination(s) ---
            const destSpan = document.createElement('span');
            destSpan.className = 'list-dest';

            const display = getDisplayItems(k);
            if (display && display.items.length > 0) {
                display.items.forEach((item, idx) => {
                    if (idx > 0) {
                        const sep = document.createTextNode(' ');
                        destSpan.appendChild(sep);
                    }
                    if (item.type === 'url') {
                        const a = document.createElement('a');
                        a.href = item.url;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.textContent = item.display;
                        a.title = 'Open in new tab';
                        destSpan.appendChild(a);
                    } else if (item.type === 'ref') {
                        const a = document.createElement('a');
                        const refUrl = window.location.pathname.replace(/\/[^\/]*$/, '/') + item.key;
                        a.href = refUrl;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.textContent = 'k:' + item.key;
                        a.title = 'Go to key ' + item.key;
                        destSpan.appendChild(a);
                        const tag = document.createElement('span');
                        tag.className = 'ref-tag';
                        tag.textContent = 'ref';
                        destSpan.appendChild(tag);
                    }
                });
                if (display.expiry) {
                    const badge = document.createElement('span');
                    badge.className = 'expiry-badge';
                    let txt = '';
                    if (display.expiry.start) txt += 'from ' + display.expiry.start;
                    if (display.expiry.expires) txt += (txt ? ' ' : '') + 'until ' + display.expiry.expires;
                    badge.textContent = txt;
                    destSpan.appendChild(badge);
                }
            } else {
                destSpan.textContent = '—';
                destSpan.style.color = 'var(--muted)';
            }

            itemDiv.appendChild(keySpan);
            itemDiv.appendChild(typeSpan);
            itemDiv.appendChild(destSpan);
            wrap.appendChild(itemDiv);
        }
    }

    renderFiltered('');
    searchInput.addEventListener('input', function() {
        renderFiltered(this.value);
    });

    return el;
}

function renderCommandNumber() {
    const count = getAllKeys().length;
    const el = document.createElement('div');
    el.className = 'center-box';
    el.innerHTML = `
        <div class="cmd-output">
            <span class="label">total keys</span>
            <div class="count-num">${count}</div>
        </div>
    `;
    return el;
}

// ─── QR Code command ──────────────────────────────────────────────────
function renderQRCommand(key) {
    const el = document.createElement('div');
    el.className = 'center-box';

    if (!keyExists(key)) {
        return render404();
    }

    const val = redirects[key];
    if (!isLinkActive(val)) {
        return render404();  // was renderInactive()
    }

    const dest = resolveValue(val);
    if (dest === null) {
        return render404();
    }

    const shortUrl = window.location.origin + CONFIG.basePath + '?k=' + key;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'redirect-msg qr-loading';
    loadingDiv.textContent = 'generating QR code ...';
    el.appendChild(loadingDiv);

    const container = document.createElement('div');
    container.className = 'qr-container';
    container.id = 'qr-container';
    el.appendChild(container);

    try {
        container.innerHTML = '';
        new QRCode(container, {
            text: shortUrl,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        loadingDiv.style.display = 'none';
    } catch (e) {
        loadingDiv.textContent = '⚠ failed to generate QR code: ' + e.message;
        container.style.display = 'none';
    }

    return el;
}

// ─── Redirect handling ──────────────────────────────────────────────
function renderRedirect(dest) {
    const el = document.createElement('div');
    el.className = 'center-box';

    function createRedirectMessage() {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'redirect-msg';
        const textNode = document.createTextNode('redirecting');
        const dotsSpan = document.createElement('span');
        dotsSpan.className = 'dots';
        dotsSpan.textContent = '...';
        msgDiv.appendChild(textNode);
        msgDiv.appendChild(dotsSpan);
        return msgDiv;
    }

    function createPlainUrlList(urls) {
        const div = document.createElement('div');
        div.className = 'url-plain-list';
        urls.forEach(url => {
            const span = document.createElement('span');
            span.className = 'url-item';
            span.textContent = url;   // already resolved URL
            div.appendChild(span);
        });
        return div;
    }

    function createClickableList(urls) {
        const div = document.createElement('div');
        div.className = 'clickable-list';
        urls.forEach((url, idx) => {
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = `${idx+1}. ${url}`;  // already resolved URL
            div.appendChild(a);
        });
        return div;
    }

    if (Array.isArray(dest)) {
        if (dest.length === 0) {
            el.innerHTML = '<div class="error-404">404<span class="frown">:(</span></div>';
            return el;
        }

        const msg = createRedirectMessage();
        const plainList = createPlainUrlList(dest);
        el.appendChild(msg);
        el.appendChild(plainList);

        const dotStates = ['...', '..', '.'];
        let dotIndex = 0;
        const dotsSpan = msg.querySelector('.dots');
        const dotInterval = setInterval(() => {
            dotIndex = (dotIndex + 1) % dotStates.length;
            dotsSpan.textContent = dotStates[dotIndex];
        }, 100);

        let blocked = false;
        for (let i = 1; i < dest.length; i++) {
            const win = window.open(dest[i], '_blank' + i);
            if (!win) blocked = true;
        }

        if (blocked) {
            clearInterval(dotInterval);
            el.innerHTML = '';
            const header = document.createElement('div');
            header.className = 'error-header';
            header.innerHTML = `Ops<span class="frown">: /</span>`;
            el.appendChild(header);
            const msgLine = document.createElement('div');
            msgLine.className = 'error-message';
            msgLine.textContent = 'Error on open the links, please click a link to open manually';
            el.appendChild(msgLine);
            const clickable = createClickableList(dest);
            el.appendChild(clickable);
        } else {
            setTimeout(() => {
                window.location.href = dest[0];
            }, 600);
            window.addEventListener('beforeunload', () => clearInterval(dotInterval));
        }
        return el;
    }

    // single URL
    const msg = createRedirectMessage();
    const plainSingle = createPlainUrlList([dest]);
    el.appendChild(msg);
    el.appendChild(plainSingle);

    const dotStates = ['...', '..', '.'];
    let dotIndex = 0;
    const dotsSpan = msg.querySelector('.dots');
    const dotInterval = setInterval(() => {
        dotIndex = (dotIndex + 1) % dotStates.length;
        dotsSpan.textContent = dotStates[dotIndex];
    }, 100);

    setTimeout(() => {
        window.location.href = dest;
    }, 400);

    window.addEventListener('beforeunload', () => clearInterval(dotInterval));
    return el;
}

// ─── Main ────────────────────────────────────────────────────────────
function init() {
    const app = document.getElementById('app');
    const key = getKeyFromPath();

    if (key === null || key === '') {
        const node = renderBlink();
        app.appendChild(node);
        window._blinkCleanup = () => { if (node._cleanup) node._cleanup(); };
        return;
    }

    if (isQRCommand(key)) {
        const qrKey = key.slice(3);
        app.appendChild(renderQRCommand(qrKey));
        return;
    }

    if (isCommand(key)) {
        const cmd = key.slice(2);
        let node;
        switch (cmd) {
            case 'key':    node = renderCommandKey(); break;
            case 'list':   node = renderCommandList(); break;
            case 'number': node = renderCommandNumber(); break;
            default:       node = render404(); break;
        }
        app.appendChild(node);
        return;
    }

    if (keyExists(key)) {
        const rawVal = redirects[key];
        if (!isLinkActive(rawVal)) {
            app.appendChild(render404());  // was renderInactive()
            return;
        }
        const resolved = resolveValue(rawVal);
        if (resolved === null) {
            app.appendChild(render404());
            return;
        }
        app.appendChild(renderRedirect(resolved));
        return;
    }

    app.appendChild(render404());
}

window.addEventListener('beforeunload', () => {
    if (window._blinkCleanup) window._blinkCleanup();
});

init();