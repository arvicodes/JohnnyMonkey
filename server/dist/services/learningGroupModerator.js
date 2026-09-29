"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultModeratorForGroup = ensureDefaultModeratorForGroup;
exports.ensureDefaultModeratorsForGroups = ensureDefaultModeratorsForGroups;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/** Pro Lerngruppe genau ein Moderator — sonst kann kein SuS das live Entry Ticket öffnen. */
async function ensureDefaultModeratorForGroup(groupId) {
    var _a;
    const group = await prisma.learningGroup.findUnique({
        where: { id: groupId },
        select: {
            id: true,
            moderatorStudentId: true,
            students: { orderBy: { name: 'asc' }, select: { id: true }, take: 1 },
        },
    });
    if (!group || group.moderatorStudentId)
        return (_a = group === null || group === void 0 ? void 0 : group.moderatorStudentId) !== null && _a !== void 0 ? _a : null;
    const first = group.students[0];
    if (!first)
        return null;
    await prisma.learningGroup.update({
        where: { id: groupId },
        data: { moderatorStudentId: first.id },
    });
    return first.id;
}
async function ensureDefaultModeratorsForGroups(groupIds) {
    for (const gid of groupIds) {
        try {
            await ensureDefaultModeratorForGroup(gid);
        }
        catch (err) {
            console.warn('[ensureDefaultModerator] group', gid, err);
        }
    }
}
//# sourceMappingURL=learningGroupModerator.js.map