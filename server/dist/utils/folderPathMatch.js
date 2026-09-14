"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPortableFolderRef = toPortableFolderRef;
exports.portableFolderKey = portableFolderKey;
exports.folderPathsEquivalent = folderPathsEquivalent;
exports.folderPathCovers = folderPathCovers;
/** Portable Ordner-Schlüssel (git-intern / J-M-Reihen / Mac-Absolut). */
function toPortableFolderRef(raw) {
    let portable = String(raw || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
    const markers = ['/J-M-Reihen/', 'J-M-Reihen/', '/git-intern/', 'git-intern/'];
    for (const m of markers) {
        const i = portable.indexOf(m);
        if (i >= 0) {
            const rest = portable.slice(i + m.length).replace(/^\/+/, '');
            portable = rest ? `git-intern/${rest}` : 'git-intern';
            break;
        }
    }
    return portable;
}
function portableFolderKey(raw) {
    return toPortableFolderRef(raw).replace(/^git-intern\//, '');
}
function folderPathsEquivalent(a, b) {
    const ka = portableFolderKey(a);
    const kb = portableFolderKey(b);
    return Boolean(ka && kb && ka === kb);
}
/** true, wenn assigned den target-Ordner ist oder ihn enthält (Reihe → Stunde). */
function folderPathCovers(assigned, target) {
    const a = portableFolderKey(assigned);
    const t = portableFolderKey(target);
    if (!a || !t)
        return false;
    return t === a || t.startsWith(`${a}/`);
}
//# sourceMappingURL=folderPathMatch.js.map