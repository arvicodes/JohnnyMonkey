"use strict";
/**
 * Kurzzeit-Cache für rekursive Verzeichnis-Lesevorgänge (entlastet Event-Loop bei vielen Tabs).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.directoryReadCacheKey = directoryReadCacheKey;
exports.getDirectoryReadCache = getDirectoryReadCache;
exports.setDirectoryReadCache = setDirectoryReadCache;
exports.invalidateDirectoryReadCache = invalidateDirectoryReadCache;
const TTL_MS = 60000;
const MAX_ENTRIES = 80;
const store = new Map();
function prune() {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
        if (v.expires <= now)
            store.delete(k);
    }
    while (store.size > MAX_ENTRIES) {
        const first = store.keys().next().value;
        if (first === undefined)
            break;
        store.delete(first);
    }
}
function directoryReadCacheKey(filePath, recursive) {
    const p = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
    return `${p}|${recursive ? '1' : '0'}`;
}
function getDirectoryReadCache(key) {
    const hit = store.get(key);
    if (!hit)
        return undefined;
    if (hit.expires <= Date.now()) {
        store.delete(key);
        return undefined;
    }
    return hit.payload;
}
function setDirectoryReadCache(key, payload) {
    prune();
    store.set(key, { payload, expires: Date.now() + TTL_MS });
}
function invalidateDirectoryReadCache(pathPrefix) {
    if (!pathPrefix) {
        store.clear();
        return;
    }
    const prefix = pathPrefix.replace(/\\/g, '/').replace(/\/+$/, '').trim();
    for (const key of store.keys()) {
        if (key.startsWith(`${prefix}|`))
            store.delete(key);
    }
}
//# sourceMappingURL=directoryReadCache.js.map