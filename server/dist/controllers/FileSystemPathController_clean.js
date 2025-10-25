"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemPathController = void 0;
const client_1 = require("@prisma/client");
const storageManager_1 = require("../utils/storageManager");
const path_1 = __importDefault(require("path"));
const libreoffice_convert_1 = require("libreoffice-convert");
const prisma = new client_1.PrismaClient();
class FileSystemPathController {
    // PowerPoint-Datei zu PDF konvertieren
    static async convertPowerPointToPDF(fileContent) {
        return new Promise((resolve, reject) => {
            (0, libreoffice_convert_1.convert)(fileContent, '.pdf', undefined, (err, done) => {
                if (err) {
                    console.error('Error converting PowerPoint to PDF:', err);
                    // Fallback: Return a simple PDF with error message
                    const fallbackPdf = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(PowerPoint-Datei konnte nicht konvertiert werden) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`);
                    resolve(fallbackPdf);
                    return;
                }
                resolve(done);
            });
        });
    }
    // PowerPoint-Datei lesen
    static async readPowerPointFile(req, res) {
        try {
            const { filePath, preview } = req.query;
            if (!filePath) {
                return res.status(400).json({ error: 'filePath is required' });
            }
            console.log('Reading PowerPoint file:', filePath);
            const fileContent = await storageManager_1.StorageManager.readFile(filePath);
            if (!fileContent) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (preview === 'true') {
                try {
                    // Convert PowerPoint to PDF and display as embedded PDF
                    const pdfBuffer = await this.convertPowerPointToPDF(fileContent);
                    const pdfBase64 = pdfBuffer.toString('base64');
                    const slidesContent = `
            <div class="pdf-container">
              <iframe 
                src="data:application/pdf;base64,${pdfBase64}" 
                width="100%" 
                height="600px" 
                style="border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                title="PowerPoint Präsentation">
              </iframe>
            </div>
          `;
                    // Create styled HTML preview with PDF
                    const styledHtml = `
            <html>
              <head>
                <title>PowerPoint Preview - ${path_1.default.basename(filePath)}</title>
                <style>
                  body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5;
                    line-height: 1.6;
                  }
                  .preview-container { 
                    max-width: 100%; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                  }
                  .preview-content { 
                    padding: 10px; 
                    min-height: 400px;
                  }
                  .pdf-container {
                    width: 100%;
                    height: 600px;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  }
                  .pdf-container iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                  }
                </style>
              </head>
              <body>
                <div class="preview-container">
                  <div class="preview-content">
                    <h2>📊 PowerPoint Präsentation: ${path_1.default.basename(filePath)}</h2>
                    ${slidesContent}
                  </div>
                </div>
              </body>
            </html>
          `;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.send(styledHtml);
                }
                catch (parseError) {
                    console.error('Error parsing PowerPoint file:', parseError);
                    // Fallback to simple preview if parsing fails
                    const fallbackHtml = `
            <html>
              <head>
                <title>PowerPoint Preview - ${path_1.default.basename(filePath)}</title>
                <style>
                  body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5;
                    line-height: 1.6;
                  }
                  .preview-container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 8px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                  }
                  .preview-content { 
                    padding: 10px; 
                    min-height: 400px;
                  }
                  .powerpoint-info {
                    background: #e3f2fd;
                    border: 1px solid #1976d2;
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 4px;
                    font-size: 14px;
                  }
                  .powerpoint-info h3 {
                    color: #1976d2;
                    margin: 0 0 10px 0;
                  }
                </style>
              </head>
              <body>
                <div class="preview-container">
                  <div class="preview-content">
                    <div class="powerpoint-info">
                      <h3>📊 PowerPoint Präsentation</h3>
                      <p><strong>Datei:</strong> ${path_1.default.basename(filePath)}</p>
                      <p><strong>Größe:</strong> ${fileContent.length} bytes</p>
                      <p><strong>Hinweis:</strong> Die PowerPoint-Datei konnte nicht geparst werden. Für eine vollständige Vorschau laden Sie bitte die Datei herunter.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.send(fallbackHtml);
                }
            }
            else {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
                res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(filePath)}"`);
                res.send(fileContent);
            }
        }
        catch (error) {
            console.error('Error reading PowerPoint file:', error);
            res.status(500).json({ error: 'Failed to read PowerPoint file' });
        }
    }
}
exports.FileSystemPathController = FileSystemPathController;
//# sourceMappingURL=FileSystemPathController_clean.js.map