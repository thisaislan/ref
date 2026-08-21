/**
 * ─── REDIRECTS DATA ────────────────────────────────────────────────
 * Add your key → destination mappings here.
 *
 * ─── HOW TO USE IN THE URL ─────────────────────────────────────────
 * After deploying, your site is at: https://thisaislan.github.io/ref/
 * 
 * To access a redirect key (e.g., 'gh'):    ?k=gh
 * To run a command (list, key, number):     ?c=list   (or ?c=key, ?c=number)
 * To generate a QR code for a key:          ?q=gh
 *
 * Examples:
 *   - Redirect to 'n-repo' (random pick):   https://thisaislan.github.io/ref/?k=n-repo
 *   - Show the list of all keys:            https://thisaislan.github.io/ref/?c=list
 *   - QR code for 'n-repo':                 https://thisaislan.github.io/ref/?q=n-repo
 *
 * ─── SUPPORTED FORMATS ─────────────────────────────────────────────
 * 1. Simple URL string:
 *    'key': 'https://example.com'
 *    → Visiting ?k=key will redirect to that URL.
 *
 * 2. Key reference (points to another key):
 *    'key': 'k:otherKey'
 *    → Visiting ?k=key will redirect to whatever 'otherKey' points to.
 *
 * 3. Random pick from a list (one URL is chosen at random each visit):
 *    'key': 'r:["https://url1.com","https://url2.com","k:otherKey"]'
 *    → Each time you visit ?k=key, one item from the list is picked at random.
 *
 * 4. Open all (opens every URL in a new tab, current tab goes to the first):
 *    'key': 'o:["https://url1.com","https://url2.com","k:otherKey"]'
 *    → Visiting ?k=key will open all URLs in new tabs and navigate the current tab to the first one.
 *
 * 5. With start/expiry dates (ISO date strings, YYYY-MM-DD):
 *    'key': {
 *        dest: 'https://example.com',   // can also be a k:, r:, or o: string
 *        start: '2026-01-01',           // optional – link works from this date
 *        expires: '2026-12-31'          // optional – link expires after this date
 *    }
 *    → The redirect will only work if the current date is between start and expires (inclusive).
 * ────────────────────────────────────────────────────────────────────
 */

const redirects = {
    // ─── Examples (commented out) ─────────────────────────────────
    // 'gh': 'https://github.com',                     // ?k=gh → github.com
    // 'tw': 'k:gh',                                   // ?k=tw → same as gh
    // 'rand': 'r:["https://a.com","https://b.com","k:tw"]',  // random between a.com, b.com, or tw
    // 'multi': 'o:["https://x.com","https://y.com","k:gh"]',   // opens x.com & y.com, current goes to x.com
    // 'event': { dest: 'https://event.com', start: '2026-08-20', expires: '2026-08-25' },

    // ─── Actual redirects ────────────────────────────────────
    'n-repo': 'r:["https://github.com/thisaislan/unspaghettify","https://github.com/thisaislan/auto-field-injector-editor","https://github.com/thisaislan/ped","https://github.com/thisaislan/control-panel","https://github.com/thisaislan/scriptables","https://github.com/thisaislan/spectral-sound-gen","https://github.com/thisaislan/unity-elements","https://github.com/thisaislan/qrgame","https://github.com/thisaislan/kitchen-chaos","https://github.com/thisaislan/popcorn","https://github.com/thisaislan/doom-fire-psx","https://github.com/thisaislan/perfect-code","https://github.com/thisaislan/git-hero","https://github.com/thisaislan/Potato"]',
};
