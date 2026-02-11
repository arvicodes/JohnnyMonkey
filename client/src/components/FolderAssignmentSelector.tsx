import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
  Snackbar,
  Divider,
  TextField,
  InputAdornment,
  Chip,
  Collapse
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

interface FolderAssignmentSelectorProps {
  groupId: string;
  onClose: () => void;
  onFoldersAssigned: () => void;
}

interface DirectoryItem {
  name: string;
  type: 'directory' | 'file';
  path: string;
  children: DirectoryItem[];
  size?: number;
  itemCount?: number;
  isTruncated?: boolean;
  error?: string;
}

interface FileSystemPath {
  id: string;
  path: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const FolderAssignmentSelector: React.FC<FolderAssignmentSelectorProps> = ({
  groupId,
  onClose,
  onFoldersAssigned
}) => {
  const [savedPaths, setSavedPaths] = useState<FileSystemPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [directoryContent, setDirectoryContent] = useState<DirectoryItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [assignedFolders, setAssignedFolders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Neue States für zugeordnete Ordner Vorschau
  const [assignedFolderContents, setAssignedFolderContents] = useState<{[key: string]: DirectoryItem[]}>({});
  const [expandedAssignedFolders, setExpandedAssignedFolders] = useState<Set<string>>(new Set());

  // File Share States
  const [fileShares, setFileShares] = useState<{[key: string]: boolean}>({});

  // Lade gespeicherte Pfade
  useEffect(() => {
    fetchSavedPaths();
    fetchAssignedFolders();
  }, []);

  // Lade Verzeichnisinhalt wenn ein Pfad ausgewählt wird
  useEffect(() => {
    if (selectedPath) {
      fetchDirectoryContent(selectedPath);
    }
  }, [selectedPath]);

  // Automatisch den ersten verfügbaren Pfad laden
  useEffect(() => {
    if (savedPaths.length > 0 && !selectedPath) {
      setSelectedPath(savedPaths[0].path);
    }
  }, [savedPaths, selectedPath]);

  const fetchSavedPaths = async () => {
    try {
      const response = await fetch('/api/file-system-paths');
      if (response.ok) {
        const paths = await response.json();
        setSavedPaths(paths);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Pfade:', error);
    }
  };

  const fetchAssignedFolders = async () => {
    try {
      // Cache-Busting Parameter hinzufügen
      const timestamp = Date.now();
      const response = await fetch(`/api/learning-groups/${groupId}/folders?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const folders = await response.json();
        const folderPaths: string[] = folders.map((f: any) => f.path);
        
        // Lösche alle alten Daten
        setAssignedFolders([]);
        setAssignedFolderContents({});
        
        // Setze die neuen Daten
        setAssignedFolders(folderPaths);
        
        // Lade den Inhalt aller zugeordneten Ordner
        folderPaths.forEach((folderPath: string) => {
          fetchAssignedFolderContent(folderPath);
        });

        // Lade die File Shares für diese Gruppe
        fetchFileSharesForGroup();
      }
    } catch (error) {
      console.error('Fehler beim Laden der zugeordneten Ordner:', error);
    }
  };

  // Neue Funktion zum Laden des Inhalts zugeordneter Ordner
  const fetchAssignedFolderContent = async (folderPath: string) => {
    try {
      // Cache-Busting Parameter hinzufügen
      const timestamp = Date.now();
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=true&t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const content = await response.json();
        let items: DirectoryItem[] = [];
        if (content.root) {
          items = content.root.children || [];
        } else if (content.items) {
          items = content.items;
        }
        
        setAssignedFolderContents(prev => ({
          ...prev,
          [folderPath]: items
        }));
      }
    } catch (error) {
      console.error('Fehler beim Laden des Ordnerinhalts:', error);
    }
  };

  const fetchDirectoryContent = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(path)}&recursive=true`);
      if (response.ok) {
        const content = await response.json();
        if (content.root) {
          setDirectoryContent([content.root]);
        } else if (content.items) {
          setDirectoryContent(content.items);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Verzeichnisinhalts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemExpanded = (path: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedItems(newExpanded);
  };

  const assignFolder = async (folderPath: string) => {
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      });
      
      if (response.ok) {
        setAssignedFolders(prev => [...prev, folderPath]);
        // Lade den Inhalt des neu zugeordneten Ordners
        fetchAssignedFolderContent(folderPath);
        showSnackbar('Ordner erfolgreich zugeordnet', 'success');
        onFoldersAssigned();
      } else {
        throw new Error('Fehler beim Zuordnen des Ordners');
      }
    } catch (error) {
      console.error('Fehler beim Zuordnen des Ordners:', error);
      showSnackbar('Fehler beim Zuordnen des Ordners', 'error');
    }
  };

  const removeFolder = async (folderPath: string) => {
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/folders/${encodeURIComponent(folderPath)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setAssignedFolders(prev => prev.filter(p => p !== folderPath));
        // Entferne den Inhalt des entfernten Ordners
        setAssignedFolderContents(prev => {
          const newContents = { ...prev };
          delete newContents[folderPath];
          return newContents;
        });
        showSnackbar('Ordner erfolgreich entfernt', 'success');
        onFoldersAssigned();
      } else {
        throw new Error('Fehler beim Entfernen des Ordners');
      }
    } catch (error) {
      console.error('Fehler beim Entfernen des Ordners:', error);
      showSnackbar('Fehler beim Entfernen des Ordners', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // File Share Functions
  const fetchFileSharesForGroup = async () => {
    try {
      const response = await fetch(`/api/file-shares/group/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        const shareMap: {[key: string]: boolean} = {};
        data.filePaths.forEach((filePath: string) => {
          shareMap[`${filePath}:${groupId}`] = true;
        });
        setFileShares(shareMap);
      }
    } catch (error) {
      console.error('Error fetching file shares:', error);
    }
  };

  const toggleFileShare = async (filePath: string) => {
    try {
      const response = await fetch('/api/file-shares/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, groupId })
      });
      
      if (response.ok) {
        const data = await response.json();
        const key = `${filePath}:${groupId}`;
        setFileShares(prev => ({ ...prev, [key]: data.shared }));
        showSnackbar(data.message, 'success');
      } else {
        showSnackbar('Fehler beim Ändern der Datei-Freigabe', 'error');
      }
    } catch (error) {
      console.error('Error toggling file share:', error);
      showSnackbar('Fehler beim Ändern der Datei-Freigabe', 'error');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Neue Hilfsfunktionen für Datei-Vorschau (aus FileSystemPathManager kopiert)
  const showFilePreviewModal = (fileName: string, htmlContent: string, filePath: string, fileType: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 15px;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 15px;
      border-radius: 8px;
      width: 94%;
      max-height: 90%;
      margin: 0;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 0px;
      right: 10px;
      background: #f5f5f5;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0;
      color: #1976d2;
      font-size: 12px;
      font-weight: 600;
      border-bottom: none;
      display: flex;
      align-items: flex-start;
      padding-top: 15px;
      justify-content: flex-start;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
      align-items: center;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0 0 10px 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Datei konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download der Datei. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const content = document.createElement('div');
    
    if (fileType === 'html') {
      // Für HTML-Dateien: In iframe rendern für vollständige Darstellung
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        width: 100%;
        min-height: 500px;
        max-height: 70vh;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: white;
      `;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      
      content.appendChild(iframe);
      content.style.cssText = `
        padding: 0;
        margin: 0;
        border: none;
        background: transparent;
        max-height: none;
        overflow: visible;
      `;
      
      // HTML-Inhalt in iframe schreiben (nachdem iframe zum DOM hinzugefügt wurde)
      setTimeout(() => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(htmlContent);
            iframeDoc.close();
          }
        } catch (e) {
          console.error('Fehler beim Laden des HTML-Inhalts in iframe:', e);
          // Fallback: Zeige HTML direkt
          content.removeChild(iframe);
          content.innerHTML = htmlContent;
          content.style.cssText = `
            border: 1px solid #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            max-height: 70vh;
            overflow: auto;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
          `;
        }
      }, 100);
    } else {
      content.innerHTML = htmlContent;
      content.style.cssText = `
        border: 1px solid #e0e0e0;
        padding: 20px;
        border-radius: 8px;
        background: #fafafa;
        max-height: 400px;
        overflow: auto;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      `;
    }
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  };

  const showImagePreviewModal = (fileName: string, imageData: any, filePath: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 15px;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 15px;
      border-radius: 8px;
      width: 94%;
      max-height: 90%;
      margin: 0;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 0px;
      right: 10px;
      background: #f5f5f5;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0;
      color: #1976d2;
      font-size: 12px;
      font-weight: 600;
      border-bottom: none;
      display: flex;
      align-items: flex-start;
      padding-top: 15px;
      justify-content: flex-start;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
      align-items: center;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0 0 10px 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Bild konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download des Bildes. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
      background: #fafafa;
      text-align: center;
    `;
    
    const img = document.createElement('img');
    img.src = imageData.dataUrl || imageData.url;
    img.alt = fileName;
    img.style.cssText = `
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    imageContainer.appendChild(img);
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(imageContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  };

  const showTextPreviewModal = (fileName: string, textContent: string, filePath: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 15px;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 15px;
      border-radius: 8px;
      width: 94%;
      max-height: 90%;
      margin: 0;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 0px;
      right: 10px;
      background: #f5f5f5;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0;
      color: #1976d2;
      font-size: 12px;
      font-weight: 600;
      border-bottom: none;
      display: flex;
      align-items: flex-start;
      padding-top: 15px;
      justify-content: flex-start;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
      align-items: center;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0 0 10px 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Textdatei konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download der Textdatei. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const content = document.createElement('div');
    content.textContent = textContent;
    content.style.cssText = `
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
      background: #fafafa;
      max-height: 400px;
      overflow: auto;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
    `;
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  };

  // Neue Funktion zum Öffnen von Dateien
  const handleFileClick = async (item: DirectoryItem) => {
    if (item.type !== 'file') return;
    
    const fileExtension = item.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'html' || fileExtension === 'htm') {
      // HTML-Dateien im neuen Tab öffnen (mit Fallback für Tablets)
      try {
        const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const htmlContent = await response.text();
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          // Versuche im neuen Tab zu öffnen
          const newWindow = window.open(url, '_blank');
          
          // Prüfe ob window.open() erfolgreich war (nicht blockiert)
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Fallback: Zeige HTML in Modal (für Tablets, die Pop-ups blockieren)
            showFilePreviewModal(item.name, htmlContent, item.path, 'html');
            // URL sofort revoken, da wir sie nicht mehr brauchen
            URL.revokeObjectURL(url);
          } else {
            // Erfolgreich geöffnet: URL nach längerer Zeit revoken (für Tablets)
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der HTML-Datei:', error);
        alert('HTML-Datei konnte nicht geöffnet werden.');
      }
    } else if (fileExtension === 'pdf') {
      // PDF-Dateien mit der bestehenden Implementierung öffnen
      try {
        const response = await fetch(`/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          // Erstelle Blob mit benutzerdefiniertem Namen
          const file = new File([blob], item.name || 'document.pdf', { type: 'application/pdf' });
          const url = URL.createObjectURL(file);
          const newWindow = window.open(url, '_blank');
          if (newWindow) {
            // Cleanup nach 5 Sekunden
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        } else {
          throw new Error('PDF konnte nicht geladen werden');
        }
      } catch (error) {
        console.error('Fehler beim Öffnen der PDF-Datei:', error);
        alert('Fehler beim Öffnen der PDF-Datei. Bitte versuchen Sie es erneut.');
      }
    } else if (fileExtension === 'docx') {
      // DOCX-Vorschau
      try {
        const response = await fetch(`/api/file-system-paths/read-docx?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'docx');
        }
      } catch (error) {
        console.error('Fehler beim Laden der DOCX-Datei:', error);
        alert('DOCX-Vorschau konnte nicht geladen werden.');
      }
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExtension || '')) {
      // Bild-Vorschau
      try {
        const response = await fetch(`/api/file-system-paths/read-image?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const imageData = await response.json();
          showImagePreviewModal(item.name, imageData, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Bildes:', error);
        alert('Bild-Vorschau konnte nicht geladen werden.');
      }
    } else if (['txt', 'md', 'rtf'].includes(fileExtension || '')) {
      // Text-Vorschau
      try {
        const response = await fetch(`/api/file-system-paths/read-text?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const textContent = await response.text();
          showTextPreviewModal(item.name, textContent, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Textdatei:', error);
        alert('Text-Vorschau konnte nicht geladen werden.');
      }
    } else {
      // Download für unbekannte Dateitypen
      try {
        const response = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Datei konnte nicht heruntergeladen werden.');
      }
    }
  };

  // Hilfsfunktion zum Filtern von PDF-Dateien, die zu .wb Dateien gehören
  const filterPdfFiles = (items: DirectoryItem[]): DirectoryItem[] => {
    return items.filter((item) => {
      if (item.type === 'file' && item.name.endsWith('.pdf')) {
        // Prüfe ob es eine entsprechende .wb Datei gibt (irgendwo in der Liste)
        const wbFileName = item.name.replace('.pdf', '.wb');
        const hasCorrespondingWb = items.some((otherItem) => 
          otherItem.type === 'file' && 
          otherItem.name === wbFileName
        );
        if (hasCorrespondingWb) {
          return false; // PDF-Datei ausblenden
        }
      }
      return true;
    });
  };

  // Rekursive Komponente für hierarchische Anzeige
  const renderDirectoryItem = (item: DirectoryItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const canExpand = item.type === 'directory' && hasChildren;
    const isDirectory = item.type === 'directory';
    const isFile = item.type === 'file';
    const isAssigned = assignedFolders.includes(item.path);

    // Filtere nach Suchbegriff
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return null;
    }

    // Bestimme Farben und Icons basierend auf der Hierarchieebene
    const getLevelStyles = (level: number) => {
      switch (level) {
        case 0: // Top-Level (Klasse 7, MSS Grundthemen, etc.)
          return {
            textColor: '#d32f2f', // Rot
            arrowColor: '#d32f2f', // Rot
            icon: '🏫', // Schulgebäude für Top-Level
            fontWeight: 'bold'
          };
        case 1: // Second-Level (3D Druck, Micro Bit, etc.)
          return {
            textColor: '#9c27b0', // Lila
            arrowColor: '#9c27b0', // Lila
            icon: '📚', // Bücher für Hauptthemen
            fontWeight: '600'
          };
        case 2: // Third-Level (Grundlagen, etc.)
          return {
            textColor: '#1976d2', // Blau
            arrowColor: '#1976d2', // Blau
            icon: '📖', // Buch für Unterkategorien
            fontWeight: '500'
          };
        default: // Fourth-Level und tiefer (konkrete Lektionen)
          return {
            textColor: '#2e7d32', // Grün
            arrowColor: '#2e7d32', // Grün
            icon: '📄', // Dokument für Lektionen
            fontWeight: 'normal'
          };
      }
    };

    const levelStyles = getLevelStyles(level);

    return (
      <Box key={item.path}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            py: 0.5,
            pl: level * 2,
            cursor: (canExpand || isFile) ? 'pointer' : 'default',
            borderRadius: 1,
            '&:hover': (canExpand || isFile) ? { 
              bgcolor: 'rgba(0,0,0,0.04)',
              transform: 'translateX(2px)',
              transition: 'all 0.2s ease'
            } : {}
          }}
          onClick={() => {
            if (isFile) {
              handleFileClick(item);
            } else if (canExpand) {
              toggleItemExpanded(item.path);
            }
          }}
        >
          {canExpand && (
            <Box sx={{ 
              width: 16, 
              height: 16, 
              mr: 0.5, 
              display: 'flex', 
              alignItems: 'center',
              color: levelStyles.arrowColor,
              fontWeight: 'bold'
            }}>
              {isExpanded ? '▼' : '▶'}
            </Box>
          )}
          {!canExpand && <Box sx={{ width: 16, mr: 0.5 }} />}
          
          <Box sx={{ 
            mr: 0.5, 
            fontSize: '0.9rem',
            color: levelStyles.textColor
          }}>
            {isDirectory ? levelStyles.icon : '📄'}
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.75rem',
              color: levelStyles.textColor,
              fontWeight: levelStyles.fontWeight,
              textDecoration: isFile ? 'underline' : 'none',
              flex: 1
            }}
          >
            {item.name}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {isDirectory && (
              isAssigned ? (
                <Chip 
                  label="Zugeordnet" 
                  size="small" 
                  color="success" 
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 20 }}
                />
              ) : (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    assignFolder(item.path);
                  }}
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    color: '#666666',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              )
            )}
          </Box>
        </Box>

        {/* Rekursive Anzeige der Kinder */}
        {isExpanded && hasChildren && (
          <Box>
            {filterPdfFiles(item.children)
              .map(child => renderDirectoryItem(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  // Neue Funktion zum Umschalten der Vorschau zugeordneter Ordner
  const toggleAssignedFolderExpanded = (folderPath: string) => {
    const newExpanded = new Set(expandedAssignedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedAssignedFolders(newExpanded);
  };

  // Neue Funktion zum Rendern der Vorschau zugeordneter Ordner
  const renderAssignedFolderPreview = (folderPath: string, items: DirectoryItem[]) => {
    const isExpanded = expandedAssignedFolders.has(folderPath);
    
    // Filtere PDF-Dateien aus, die zu .wb Dateien gehören
    const filteredItems = filterPdfFiles(items);
    
    return (
      <Box key={folderPath} sx={{ mb: 1 }}>
        <Card variant="outlined">
          <CardContent sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <FolderIcon sx={{ mr: 1, color: '#2e7d32' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {folderPath.split('/').pop() || folderPath}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {folderPath}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
                <IconButton
                  size="small"
                  onClick={() => toggleAssignedFolderExpanded(folderPath)}
                  sx={{ 
                    color: '#666666',
                    width: 24,
                    height: 24,
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                  }}
                  title="Ordner ein-/ausklappen"
                >
                  {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => removeFolder(folderPath)}
                  sx={{ 
                    color: '#d32f2f',
                    width: 24,
                    height: 24,
                    '&:hover': { 
                      bgcolor: 'rgba(211, 47, 47, 0.1)'
                    },
                    transition: 'background-color 0.2s ease'
                  }}
                  title="Ordner entfernen"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            {/* Vorschau des Ordnerinhalts */}
            <Collapse in={isExpanded}>
              <Box sx={{ mt: 1, pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                {filteredItems.length === 0 ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    Ordner ist leer
                  </Typography>
                ) : (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                      Inhalt ({filteredItems.filter(item => item.type === 'directory').length} Ordner, {filteredItems.filter(item => item.type === 'file').length} Dateien):
                    </Typography>
                    {filteredItems.slice(0, 5).map((item, index) => (
                      <Box 
                        key={index} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 0.5,
                          cursor: item.type === 'file' ? 'pointer' : 'default',
                          userSelect: 'none',
                          '&:hover': item.type === 'file' ? { 
                            bgcolor: 'rgba(0,0,0,0.04)', 
                            borderRadius: 1,
                            px: 0.5
                          } : {}
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Item clicked:', item);
                          if (item.type === 'file') {
                            console.log('File clicked, calling handleFileClick');
                            handleFileClick(item);
                          } else {
                            console.log('Not a file, item type:', item.type);
                          }
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {/* Checkbox/Grüner Punkt LINKS - nur für Dateien */}
                        {item.type === 'file' && (
                          item.name.startsWith('K_') ? (
                            // Grüner Punkt für K_ Dateien (automatisch freigegeben)
                            <Box sx={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              bgcolor: '#4caf50',
                              flexShrink: 0,
                              mr: 0.5
                            }} title="Karteikarten-Datei (automatisch freigegeben)" />
                          ) : (
                            // Checkbox für alle anderen Dateien
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                userSelect: 'none',
                                flexShrink: 0,
                                mr: 0.5
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleFileShare(item.path);
                              }}
                              title={fileShares[`${item.path}:${groupId}`] ? 'Für Schüler freigegeben (klicken zum Deaktivieren)' : 'Nicht für Schüler sichtbar (klicken zum Freigeben)'}
                            >
                              <input
                                type="checkbox"
                                checked={!!fileShares[`${item.path}:${groupId}`]}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleFileShare(item.path);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  cursor: 'pointer',
                                  accentColor: '#4caf50'
                                }}
                              />
                            </Box>
                          )
                        )}

                        <Box sx={{ 
                          mr: 0.5, 
                          fontSize: '0.8rem',
                          color: item.type === 'directory' ? '#2e7d32' : '#1976d2'
                        }}>
                          {item.type === 'directory' ? '📁' : '📄'}
                        </Box>
                        <Typography variant="caption" sx={{ 
                          color: item.type === 'file' ? 'primary.main' : 'text.secondary',
                          fontSize: '0.7rem',
                          textDecoration: item.type === 'file' ? 'underline' : 'none',
                          fontWeight: item.type === 'file' ? 'medium' : 'normal',
                          flex: 1,
                          '&:hover': item.type === 'file' ? {
                            color: 'primary.dark',
                            textDecoration: 'underline'
                          } : {}
                        }}>
                          {item.name}
                        </Typography>
                      </Box>
                    ))}
                    {filteredItems.length > 5 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        ... und {filteredItems.length - 5} weitere Elemente
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Box>
      <Grid container spacing={2}>
        {/* Linke Seite: Pfad-Auswahl und Verzeichnisinhalt */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Verfügbare Ordner
          </Typography>
          
          {/* Pfad-Auswahl */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Verfügbare Pfade:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {savedPaths.map((path) => (
                <Chip
                  key={path.id}
                  label={path.name}
                  onClick={() => setSelectedPath(path.path)}
                  variant={selectedPath === path.path ? 'filled' : 'outlined'}
                  color={selectedPath === path.path ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
            
            {selectedPath && (
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Aktueller Pfad: <strong>{selectedPath}</strong>
              </Typography>
            )}
          </Box>

          {/* Suchfeld */}
          <TextField
            fullWidth
            size="small"
            placeholder="Nach Ordnernamen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Verzeichnisinhalt */}
          {selectedPath && (
            <Card variant="outlined">
              <CardContent sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <Typography>Lade Verzeichnisinhalt...</Typography>
                  </Box>
                ) : (
                  <List dense>
                    {filterPdfFiles(directoryContent).map(item => renderDirectoryItem(item))}
                  </List>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Rechte Seite: Zugeordnete Ordner */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Zugeordnete Ordner
          </Typography>
          
          {assignedFolders.length === 0 ? (
            <Alert severity="info">
              Noch keine Ordner zugeordnet
            </Alert>
          ) : (
            <Box>
              {assignedFolders.map((folderPath) => {
                const items = assignedFolderContents[folderPath] || [];
                return renderAssignedFolderPreview(folderPath, items);
              })}
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Aktions-Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Schließen
        </Button>
      </Box>

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FolderAssignmentSelector;
