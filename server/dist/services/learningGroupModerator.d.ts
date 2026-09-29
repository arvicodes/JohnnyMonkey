/** Pro Lerngruppe genau ein Moderator — sonst kann kein SuS das live Entry Ticket öffnen. */
export declare function ensureDefaultModeratorForGroup(groupId: string): Promise<string | null>;
export declare function ensureDefaultModeratorsForGroups(groupIds: string[]): Promise<void>;
//# sourceMappingURL=learningGroupModerator.d.ts.map