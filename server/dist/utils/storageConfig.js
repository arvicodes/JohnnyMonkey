"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_CONFIG = void 0;
exports.STORAGE_CONFIG = {
    type: process.env.NODE_ENV === 'production' ? 'onedrive' : 'local',
    basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/Monkey/J-M-Reihen',
    onedriveUrl: process.env.ONEDRIVE_URL || 'https://johannesgym-my.sharepoint.com/:f:/g/personal/christvera_johannesgym_onmicrosoft_com/EufDzsV4pudIq3VRwxiLM4MB8hqGxt5Cq1HomjLJKy-ftg?e=OblDUf'
};
//# sourceMappingURL=storageConfig.js.map