export const STORAGE_CONFIG = {
  type: process.env.NODE_ENV === 'production' ? 'onedrive' : 'local',
  basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen',
  onedriveUrl: process.env.ONEDRIVE_URL || 'https://johannesgym-my.sharepoint.com/:f:/g/personal/christvera_johannesgym_onmicrosoft_com/EufDzsV4pudIq3VRwxiLM4MB8hqGxt5Cq1HomjLJKy-ftg?e=OblDUf'
};
