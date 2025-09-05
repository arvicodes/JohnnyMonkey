import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  IconButton,
  Alert,
  Snackbar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControlLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface FileSystemPathManagerProps {
  teacherId: string;
}

interface FileSystemPath {
  id: string;
  path: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

interface DirectoryContent {
  path: string;
  items: DirectoryItem[];
  totalItems: number;
}

interface RecursiveDirectoryContent {
  path: string;
  root: DirectoryItem;
  totalItems: number;
  maxDepth: number;
}

const FileSystemPathManager: React.FC<FileSystemPathManagerProps> = ({ teacherId }) => {
  // State für die Verzeichnisvorschau
  const [newPath, setNewPath] = useState<string>('');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [newPathName, setNewPathName] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<FileSystemPath | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Storage-Auswahl
  const [storageType, setStorageType] = useState<'local' | 'git-intern'>('local');

  // Alle Ordner standardmäßig aufgeklappt
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Setze Standardwert basierend auf Storage-Typ
  useEffect(() => {
    if (storageType === 'git-intern' && newPath !== 'git-intern') {
      setNewPath('git-intern');
    } else if (storageType === 'local' && newPath === 'git-intern') {
      setNewPath('');
    }
  }, [storageType, newPath]);

  // Gespeicherte Pfade abrufen
  const { data: savedPaths, isLoading: pathsLoading } = useQuery({
    queryKey: ['fileSystemPaths', teacherId],
    queryFn: async () => {
      const response = await fetch(`/api/file-system-paths/teacher/${teacherId}`);
      if (!response.ok) throw new Error('Fehler beim Laden der Pfade');
      return response.json() as Promise<FileSystemPath[]>;
    }
  });

  // Automatisch J-M-Reihen Pfad erstellen, wenn noch keine Pfade vorhanden sind
  useEffect(() => {
    const createDefaultJmReihenPath = async () => {
      console.log('Checking for auto-creation of J-M-Reihen path:', { 
        savedPaths: savedPaths?.length, 
        teacherId, 
        isLoading: pathsLoading 
      });
      
      if (!pathsLoading && savedPaths && savedPaths.length === 0 && teacherId) {
        console.log('Creating default J-M-Reihen path...');
        try {
          const response = await fetch('/api/file-system-paths', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              path: 'git-intern',
              name: 'J-M-Reihen (Git-Intern)',
              teacherId: teacherId
            })
          });
          
          if (response.ok) {
            console.log('J-M-Reihen path created successfully');
            // Refetch paths to update the list
            await queryClient.invalidateQueries({ queryKey: ['fileSystemPaths', teacherId] });
            // Automatisch den J-M-Reihen Pfad auswählen
            setSelectedPath('git-intern');
          } else {
            console.error('Failed to create J-M-Reihen path:', response.status);
          }
        } catch (error) {
          console.error('Fehler beim Erstellen des Standard J-M-Reihen Pfads:', error);
        }
      }
    };

    createDefaultJmReihenPath();
  }, [savedPaths, teacherId, queryClient, pathsLoading]);

  // Automatisch J-M-Reihen Pfad auswählen, wenn er existiert
  useEffect(() => {
    if (savedPaths && savedPaths.length > 0 && !selectedPath) {
      const jmReihenPath = savedPaths.find(path => path.path === 'git-intern');
      if (jmReihenPath) {
        console.log('Auto-selecting existing J-M-Reihen path');
        setSelectedPath('git-intern');
      } else {
        // Fallback: ersten verfügbaren Pfad auswählen
        setSelectedPath(savedPaths[0].path);
      }
    }
  }, [savedPaths, selectedPath]);

  // Verzeichnisinhalt abrufen
  const { data: directoryContent, isLoading: directoryLoading, refetch: refetchDirectory } = useQuery({
    queryKey: ['directoryContent', selectedPath, true], // recursiveView is now always true
    queryFn: async () => {
      if (!selectedPath) return null;
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(selectedPath)}&recursive=true`);
      if (!response.ok) throw new Error('Fehler beim Lesen des Verzeichnisses');
      return response.json() as Promise<DirectoryContent | RecursiveDirectoryContent>;
    },
    enabled: !!selectedPath
  });

  // Pfad speichern
  const savePathMutation = useMutation({
    mutationFn: async (data: { path: string; name: string; teacherId: string; credentials?: { username: string; password: string } }) => {
      const response = await fetch('/api/file-system-paths/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fehler beim Speichern des Pfades');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileSystemPaths', teacherId] });
      setNewPath('');
      setNewPathName('');
      setSnackbar({
        open: true,
        message: 'Pfad erfolgreich gespeichert',
        severity: 'success'
      });
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  });

  // Pfad löschen
  const deletePathMutation = useMutation({
    mutationFn: async (pathId: string) => {
      const response = await fetch(`/api/file-system-paths/${pathId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Fehler beim Löschen des Pfades');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileSystemPaths', teacherId] });
      if (selectedPath === pathToDelete?.path) {
        setSelectedPath('');
      }
      setSnackbar({
        open: true,
        message: 'Pfad erfolgreich gelöscht',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setPathToDelete(null);
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen des Pfades',
        severity: 'error'
      });
    }
  });

  const handleSavePath = () => {
    if (!newPath.trim() || !newPathName.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte füllen Sie alle Felder aus',
        severity: 'error'
      });
      return;
    }

    // If it's git-intern, use the special path
    if (storageType === 'git-intern') {
      setNewPath('git-intern');
    }

    savePathMutation.mutate({ path: newPath.trim(), name: newPathName.trim(), teacherId });
  };


  const confirmDelete = () => {
    if (pathToDelete) {
      deletePathMutation.mutate(pathToDelete.id);
    }
  };

  const toggleItemExpanded = (itemPath: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemPath)) {
      newExpanded.delete(itemPath);
    } else {
      newExpanded.add(itemPath);
    }
    setExpandedItems(newExpanded);
  };

  // Hilfsfunktion: Zeige Datei-Vorschau Modal
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
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
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
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
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
      margin: 0;
      order: -1;
    `;
    downloadButton.onmouseover = () => {
      downloadButton.style.transform = 'translateY(-1px)';
      downloadButton.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
    };
    downloadButton.onmouseout = () => {
      downloadButton.style.transform = 'translateY(0)';
      downloadButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
    };
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        // Timeout für große Dateien erhöhen
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 Minuten
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
      } catch (error: any) {
        console.error('Fehler beim Download:', error);
        
        if (error.name === 'AbortError') {
          alert('Download wurde wegen Timeout abgebrochen. Die Datei ist möglicherweise zu groß. Bitte versuchen Sie es erneut.');
        } else {
          alert('Fehler beim Download der Datei. Bitte versuchen Sie es erneut.');
        }
        
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    // Button vor der Überschrift hinzufügen
    title.insertBefore(downloadButton, title.firstChild);
    
    const content = document.createElement('div');
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
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  };

  // Hilfsfunktion: Zeige Bild-Vorschau Modal
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
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
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
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
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
      margin: 0;
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

  // Hilfsfunktion: Zeige Text-Vorschau Modal
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
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
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
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
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
      margin: 0;
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

  // Rekursive Komponente für hierarchische Anzeige
  const renderDirectoryItem = (item: DirectoryItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const canExpand = item.type === 'directory' && hasChildren;
    const isFile = item.type === 'file';

    // Farben basierend auf dem Level und Typ
    const getItemColor = (itemType: string, level: number) => {
      if (itemType === 'file') return '#1976d2'; // Blau für Dateien
      
      // Verschiedene Farben für Ordner basierend auf Level
      const colors = ['#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2', '#1565c0'];
      return colors[level % colors.length];
    };

    // Icons basierend auf dem Typ
    const getItemIcon = (itemType: string, level: number) => {
      if (itemType === 'file') return '📄'; // Dokument-Icon
      
      // Verschiedene Ordner-Icons basierend auf Level
      const folderIcons = ['📚', '📦', '📁', '🗂️', '📂'];
      return folderIcons[level % folderIcons.length];
    };

    const itemColor = getItemColor(item.type, level);
    const itemIcon = getItemIcon(item.type, level);

    // Funktion zum Öffnen von Dateien
    const handleItemClick = async () => {
      if (isFile) {
        
        // Datei öffnen - verschiedene Ansätze je nach Dateityp
        const fileExtension = item.name.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'html' || fileExtension === 'htm') {
          // HTML-Dateien über den Server laden und im neuen Tab öffnen
          try {
            // Lade HTML-Datei über den Server
            const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(item.path)}`);
            
            if (response.ok) {
              const htmlContent = await response.text();
              // Erstelle Blob und öffne im neuen Tab
              const blob = new Blob([htmlContent], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              // Cleanup nach dem Öffnen
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
              // Fallback: Zeige Fehlermeldung
              console.error('HTML-Datei konnte nicht geladen werden:', response.statusText);
              alert(`HTML-Datei konnte nicht geladen werden: ${response.statusText}`);
            }
          } catch (error) {
            console.error('Fehler beim Laden der HTML-Datei:', error);
            alert('Fehler beim Laden der HTML-Datei. Bitte versuchen Sie es erneut.');
          }
        } else if (fileExtension === 'pdf') {
          // PDF-Dateien über den Server laden und im neuen Tab öffnen
          try {
            // Lade PDF-Datei über den Server
            const response = await fetch(`/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(item.path)}`);
            
            if (response.ok) {
              const pdfBlob = await response.blob();
              // Erstelle URL für den Blob und öffne im neuen Tab
              const url = URL.createObjectURL(pdfBlob);
              window.open(url, '_blank');
              // Cleanup nach dem Öffnen
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
              // Fallback: Zeige Fehlermeldung
              console.error('PDF-Datei konnte nicht geladen werden:', response.statusText);
              alert(`PDF-Datei konnte nicht geladen werden: ${response.statusText}`);
            }
          } catch (error) {
            console.error('Fehler beim Laden der PDF-Datei:', error);
            alert('Fehler beim Laden der PDF-Datei. Bitte versuchen Sie es erneut.');
          }
        } else if (fileExtension === 'docx') {
          // DOCX-Dateien über den Server laden und als Vorschau anzeigen
          try {
            // Lade DOCX-Vorschau über den Server
            const response = await fetch(`/api/file-system-paths/read-docx?filePath=${encodeURIComponent(item.path)}&preview=true`);
            
            if (response.ok) {
              const htmlContent = await response.text();
              showFilePreviewModal(item.name, htmlContent, item.path, 'docx');
            } else {
              // Fallback: Zeige Fehlermeldung
              console.error('DOCX-Vorschau konnte nicht geladen werden:', response.statusText);
              alert('DOCX-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
            }
          } catch (error) {
            console.error('Fehler beim Laden der DOCX-Datei:', error);
            alert('Fehler beim Laden der DOCX-Datei. Bitte versuchen Sie es erneut.');
          }
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          // Excel-Dateien über den Server laden und als Vorschau anzeigen
          try {
            const response = await fetch(`/api/file-system-paths/read-excel?filePath=${encodeURIComponent(item.path)}&preview=true`);
            
            if (response.ok) {
              const htmlContent = await response.text();
              showFilePreviewModal(item.name, htmlContent, item.path, 'excel');
            } else {
              console.error('Excel-Vorschau konnte nicht geladen werden:', response.statusText);
              alert('Excel-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
            }
          } catch (error) {
            console.error('Fehler beim Laden der Excel-Datei:', error);
            alert('Fehler beim Laden der Excel-Datei. Bitte versuchen Sie es erneut.');
          }
        } else if (fileExtension === 'pptx' || fileExtension === 'ppt') {
          // PowerPoint-Dateien über den Server laden und als Vorschau anzeigen
          try {
            const response = await fetch(`/api/file-system-paths/read-powerpoint?filePath=${encodeURIComponent(item.path)}&preview=true`);
            
            if (response.ok) {
              const htmlContent = await response.text();
              showFilePreviewModal(item.name, htmlContent, item.path, 'powerpoint');
            } else {
              console.error('PowerPoint-Vorschau konnte nicht geladen werden:', response.statusText);
              alert('PowerPoint-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
            }
          } catch (error) {
            console.error('Fehler beim Laden der PowerPoint-Datei:', error);
            alert('Fehler beim Laden der PowerPoint-Datei. Bitte versuchen Sie es erneut.');
          }
        } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExtension || '')) {
          // Bildformate über den Server laden und als Vorschau anzeigen
          try {
            const response = await fetch(`/api/file-system-paths/read-image?filePath=${encodeURIComponent(item.path)}&preview=true`);
            
            if (response.ok) {
              const imageData = await response.json();
              showImagePreviewModal(item.name, imageData, item.path);
            } else {
              console.error('Bild-Vorschau konnte nicht geladen werden:', response.statusText);
              alert('Bild-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
            }
          } catch (error) {
            console.error('Fehler beim Laden des Bildes:', error);
            alert('Fehler beim Laden des Bildes. Bitte versuchen Sie es erneut.');
          }
        } else if (fileExtension === 'goodnotes' || fileExtension === 'gn') {
          // GoodNotes-Dateien über den Server laden und als Vorschau anzeigen
          try {
            const response = await fetch(`/api/file-system-paths/read-goodnotes?filePath=${encodeURIComponent(item.path)}&preview=true`);
            
            if (response.ok) {
              const htmlContent = await response.text();
              showFilePreviewModal(item.name, htmlContent, item.path, 'goodnotes');
            } else {
              console.error('GoodNotes-Vorschau konnte nicht geladen werden:', response.statusText);
              alert('GoodNotes-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
            }
          } catch (error) {
            console.error('Fehler beim Laden der GoodNotes-Datei:', error);
            alert('Fehler beim Laden der GoodNotes-Datei. Bitte versuchen Sie es erneut.');
          }
        } else if (['txt', 'md', 'rtf'].includes(fileExtension || '')) {
          // Textdateien über den Server laden und als Vorschau anzeigen
          try {
            const response = await fetch(`/api/file-system-paths/read-text?filePath=${encodeURIComponent(item.path)}&preview=true`);
            
            if (response.ok) {
              const textContent = await response.text();
              showTextPreviewModal(item.name, textContent, item.path);
            } else {
              console.error('Text-Vorschau konnte nicht geladen werden:', response.statusText);
              alert('Text-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
            }
          } catch (error) {
            console.error('Fehler beim Laden der Textdatei:', error);
            alert('Fehler beim Laden der Textdatei. Bitte versuchen Sie es erneut.');
          }
        } else if (fileExtension === 'pdf') {
          // PDF-Dateien über den Server laden und als Vorschau anzeigen
          try {
            const response = await fetch(`/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(item.path)}&preview=true`);
            
            if (response.ok) {
              const htmlContent = await response.text();
              showFilePreviewModal(item.name, htmlContent, item.path, 'pdf');
            } else {
              console.error('PDF-Vorschau konnte nicht geladen werden:', response.statusText);
              alert('PDF-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
            }
          } catch (error) {
            console.error('Fehler beim Laden der PDF-Datei:', error);
            alert('Fehler beim Laden der PDF-Datei. Bitte versuchen Sie es erneut.');
          }
        } else {
          // Andere Dateitypen: Download über den Server
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
            } else {
              alert(`Datei konnte nicht heruntergeladen werden: ${response.statusText}`);
            }
          } catch (error) {
            console.error('Fehler beim Download:', error);
            alert('Fehler beim Download der Datei. Bitte versuchen Sie es erneut.');
          }
        }
      } else if (canExpand) {
        // Ordner auf-/zuklappen
        toggleItemExpanded(item.path);
      }
    };

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
          onClick={handleItemClick}
        >
          {canExpand && (
            <Box sx={{ 
              width: 16, 
              height: 16, 
              mr: 0.5, 
              display: 'flex', 
              alignItems: 'center',
              color: itemColor,
              fontWeight: 'bold'
            }}>
              {isExpanded ? '▼' : '▶'}
            </Box>
          )}
          {!canExpand && <Box sx={{ width: 16, mr: 0.5 }} />}
          
          <Box sx={{ 
            mr: 0.5, 
            fontSize: '0.9rem',
            color: itemColor
          }}>
            {itemIcon}
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.75rem',
              color: itemColor,
              fontWeight: item.type === 'directory' ? 'medium' : 'normal'
            }}
          >
            {item.name}
          </Typography>
        </Box>

        {/* Rekursive Anzeige der Kinder */}
        {canExpand && isExpanded && (
          <Box>
            {item.children.map(child => renderDirectoryItem(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  // Automatisch den ersten Pfad laden und alle Ordner aufklappen
  useEffect(() => {
    if (savedPaths && savedPaths.length > 0 && !selectedPath) {
      setSelectedPath(savedPaths[0].path);
      setNewPathName(savedPaths[0].name);
    }
  }, [savedPaths, selectedPath]);

  // Alle Ordner aufklappen
  const expandAllFolders = () => {
    if (directoryContent && 'root' in directoryContent) {
      const newExpandedItems = new Set<string>();
      
      const expandRecursive = (item: DirectoryItem) => {
        if (item.type === 'directory' && item.children && item.children.length > 0) {
          newExpandedItems.add(item.path);
          item.children.forEach(expandRecursive);
        }
      };
      
      expandRecursive(directoryContent.root);
      setExpandedItems(newExpandedItems);
    }
  };

  // Alle Ordner einklappen
  const collapseAllFolders = () => {
    setExpandedItems(new Set());
  };

  // Alle Ordner standardmäßig aufklappen, wenn Verzeichnisinhalt geladen wird
  useEffect(() => {
    if (directoryContent && 'root' in directoryContent) {
      const newExpandedItems = new Set<string>();
      
      const expandRecursive = (item: DirectoryItem) => {
        if (item.type === 'directory' && item.children && item.children.length > 0) {
          newExpandedItems.add(item.path);
          item.children.forEach(expandRecursive);
        }
      };
      
      expandRecursive(directoryContent.root);
      setExpandedItems(newExpandedItems);
    }
  }, [directoryContent]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
        Dateisystem-Pfade verwalten
      </Typography>

      <Grid container spacing={3}>
        {/* Gemeinschaftliche Box "Pfade" - kompakt links */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, height: 'fit-content' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                Pfade
              </Typography>
              
              {/* Neue Pfad-Eingabe - kompakt */}
              <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium', fontSize: '0.75rem' }}>
                  Neuen Pfad hinzufügen
                </Typography>
                
                {/* Storage-Auswahl */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: '0.7rem', color: '#666' }}>
                    Speicher-Typ wählen:
                  </Typography>
                  <RadioGroup
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value as 'local' | 'git-intern')}
                    row
                    sx={{ '& .MuiFormControlLabel-root': { mr: 2 } }}
                  >
                    <FormControlLabel
                      value="local"
                      control={<Radio size="small" />}
                      label={
                        <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                          📁 Lokaler Pfad
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      value="git-intern"
                      control={<Radio size="small" />}
                      label={
                        <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                          📁 Git-Intern (J-M-Reihen)
                        </Typography>
                      }
                    />
                  </RadioGroup>
                </Box>
                
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={
                        storageType === 'local' ? "Absoluter Dateipfad" : 
                        "Git-Intern Pfad"
                      }
                      placeholder={
                        storageType === 'local' ? "/Users/username/Documents" : 
                        "git-intern"
                      }
                      disabled={false}
                      value={newPath}
                      onChange={(e) => setNewPath(e.target.value)}
                      size="small"
                      sx={{ '& .MuiInputLabel-root': { fontSize: '0.7rem' }, '& .MuiInputBase-input': { fontSize: '0.7rem' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Anzeigename"
                      placeholder="Meine Dokumente"
                      value={newPathName}
                      onChange={(e) => setNewPathName(e.target.value)}
                      size="small"
                      sx={{ '& .MuiInputLabel-root': { fontSize: '0.7rem' }, '& .MuiInputBase-input': { fontSize: '0.7rem' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSavePath}
                      disabled={savePathMutation.isPending}
                      sx={{ 
                        height: 32, 
                        fontSize: '0.7rem',
                        '& .MuiButton-startIcon': { mr: 0.5 }
                      }}
                    >
                      {savePathMutation.isPending ? <CircularProgress size={16} /> : 'Speichern'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />
              
              {/* Gespeicherte Pfade */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>
                    Gespeicherte Pfade
                  </Typography>
                  {savedPaths && savedPaths.length === 0 && (
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                      J-M-Reihen wird automatisch geladen...
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['fileSystemPaths', teacherId] })}
                  disabled={pathsLoading}
                  sx={{ p: 0.5, width: 20, height: 20 }}
                >
                  <RefreshIcon sx={{ fontSize: '0.7rem' }} />
                </IconButton>
              </Box>
              
              {pathsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : savedPaths && savedPaths.length > 0 ? (
                <List dense sx={{ py: 0 }}>
                  {savedPaths.map((path, index) => (
                    <React.Fragment key={path.id}>
                      <ListItem 
                        sx={{ 
                          py: 0.25, 
                          px: 0.5,
                          borderRadius: 1,
                          cursor: 'pointer',
                          position: 'relative',
                          pr: 2,
                        }}
                        onClick={() => {
                          setSelectedPath(path.path);
                          setNewPathName(path.name);
                        }}
                      >
                        <Box sx={{ 
                          mr: 0.5, 
                          fontSize: '0.7rem',
                          color: ['#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2', '#1565c0'][index % 5]
                        }}>
                          📁
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.65rem',
                              color: ['#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2', '#1565c0'][index % 5],
                              fontWeight: 'medium',
                              lineHeight: 1.2
                            }}
                          >
                            {path.name}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.55rem',
                              color: 'text.secondary',
                              fontFamily: 'monospace',
                              wordBreak: 'break-all',
                              lineHeight: 1.1
                            }}
                          >
                            {path.path}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPathToDelete(path);
                            setDeleteDialogOpen(true);
                          }}
                          sx={{ 
                            color: 'error.main',
                            p: 0,
                            width: 16,
                            height: 16,
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            borderRadius: 0,
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: '0.6rem' }} />
                        </IconButton>
                      </ListItem>
                      <Divider sx={{ my: 0.25 }} />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1, fontSize: '0.7rem' }}>
                  Keine Pfade gespeichert
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Verzeichnisvorschau - rechts, größer */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Verzeichnisvorschau
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Steuerung für hierarchische Ansicht */}
                  <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => expandedItems.size > 0 ? collapseAllFolders() : expandAllFolders()}
                      sx={{ 
                        fontSize: '0.65rem', 
                        py: 0.25, 
                        px: 1,
                        minWidth: 'auto',
                        height: 24
                      }}
                    >
                      {expandedItems.size > 0 ? 'Einklappen' : 'Aufklappen'}
                    </Button>
                    
                    {selectedPath && (
                      <IconButton
                        size="small"
                        onClick={() => refetchDirectory()}
                        disabled={directoryLoading}
                        sx={{ 
                          color: 'primary.main',
                          p: 0,
                          width: 24,
                          height: 24,
                          borderRadius: 0,
                          '& .MuiIconButton-root': {
                            width: '100%',
                            height: '100%'
                          }
                        }}
                      >
                        <RefreshIcon sx={{ 
                          fontSize: '0.7rem',
                          width: '100%',
                          height: '100%'
                        }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </Box>

              {!selectedPath ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Wählen Sie einen gespeicherten Pfad aus, um den Inhalt anzuzeigen
                  </Typography>
                </Box>
              ) : directoryLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <Typography>Lade Verzeichnis...</Typography>
                </Box>
              ) : directoryContent ? (
                <Box>
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {directoryContent.path}
                    </Typography>
                  </Box>
                  
                  {/* Hierarchische Anzeige */}
                  {directoryContent && 'root' in directoryContent ? (
                    <Box>
                      {renderDirectoryItem(directoryContent.root)}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {directoryContent.totalItems} Elemente
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Keine Verzeichnisdaten verfügbar
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="info">
                  Keine Daten verfügbar
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lösch-Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Pfad löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie den Pfad "{pathToDelete?.name}" wirklich löschen?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: 'monospace' }}>
            {pathToDelete?.path}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>


      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileSystemPathManager;
