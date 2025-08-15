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
  CircularProgress
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

  // Alle Ordner standardmäßig aufgeklappt
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Gespeicherte Pfade abrufen
  const { data: savedPaths, isLoading: pathsLoading } = useQuery({
    queryKey: ['fileSystemPaths', teacherId],
    queryFn: async () => {
      const response = await fetch(`/api/file-system-paths/teacher/${teacherId}`);
      if (!response.ok) throw new Error('Fehler beim Laden der Pfade');
      return response.json() as Promise<FileSystemPath[]>;
    }
  });

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
    mutationFn: async (data: { path: string; name: string; teacherId: string }) => {
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
    savePathMutation.mutate({ path: newPath.trim(), name: newPathName.trim(), teacherId });
  };

  const handleDeletePath = (path: FileSystemPath) => {
    setPathToDelete(path);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (pathToDelete) {
      deletePathMutation.mutate(pathToDelete.id);
    }
  };

  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
    setExpandedItems(new Set()); // Reset expanded items when selecting new path
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
              // Erstelle Blob für die HTML-Vorschau und öffne im neuen Tab
              const blob = new Blob([htmlContent], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              // Cleanup nach dem Öffnen
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
              // Fallback: Versuche normale DOCX-Behandlung
              console.error('DOCX-Vorschau konnte nicht geladen werden:', response.statusText);
              
              // Fallback: Download der DOCX-Datei
              const downloadResponse = await fetch(`/api/file-system-paths/read-docx?filePath=${encodeURIComponent(item.path)}`);
              if (downloadResponse.ok) {
                const docxBlob = await downloadResponse.blob();
                const url = URL.createObjectURL(docxBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = item.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } else {
                alert(`DOCX-Datei konnte nicht geladen werden: ${downloadResponse.statusText}`);
              }
            }
          } catch (error) {
            console.error('Fehler beim Laden der DOCX-Datei:', error);
            alert('Fehler beim Laden der DOCX-Datei. Bitte versuchen Sie es erneut.');
          }
        } else if (['txt', 'jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileExtension || '')) {
          // Andere Browser-kompatible Dateien: Download und öffnen
          const link = document.createElement('a');
          link.href = `file://${item.path}`;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Kurze Verzögerung, dann versuchen zu öffnen
          setTimeout(() => {
            try {
              window.open(`file://${item.path}`, '_blank');
            } catch (error) {
              // Fallback: Datei wurde bereits heruntergeladen
            }
          }, 500);
        } else {
          // Andere Dateitypen (Word, Excel, etc.): Download und öffnen
          const link = document.createElement('a');
          link.href = `file://${item.path}`;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Versuche die Datei nach dem Download zu öffnen
          setTimeout(() => {
            try {
              window.open(`file://${item.path}`, '_blank');
            } catch (error) {
              // Fallback: Datei wurde bereits heruntergeladen
            }
          }, 1000);
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

      {/* Neue Pfad-Eingabe */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Neuen Pfad hinzufügen
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="Absoluter Dateipfad"
                placeholder="/Users/username/Documents"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Anzeigename"
                placeholder="Meine Dokumente"
                value={newPathName}
                onChange={(e) => setNewPathName(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSavePath}
                disabled={savePathMutation.isPending}
                sx={{ height: 40 }}
              >
                {savePathMutation.isPending ? <CircularProgress size={20} /> : 'Speichern'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Gespeicherte Pfade */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, height: 'fit-content' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Gespeicherte Pfade
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['fileSystemPaths', teacherId] })}
                  disabled={pathsLoading}
                  sx={{
                    p: 0,
                    width: '5%',
                    height: '100%',
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
              </Box>
              
              {pathsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : savedPaths && savedPaths.length > 0 ? (
                <List dense>
                  {savedPaths.map((path, index) => (
                    <React.Fragment key={path.id}>
                      <ListItem 
                        sx={{ 
                          py: 0.25, 
                          px: 0.5,
                          borderRadius: 1,
                          cursor: 'pointer',
                          position: 'relative',
                          pr: 2, // Platz für das Icon rechts
                        }}
                        onClick={() => {
                          setSelectedPath(path.path);
                          setNewPathName(path.name);
                        }}
                      >
                        <Box sx={{ 
                          mr: 0.5, 
                          fontSize: '0.8rem',
                          color: ['#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2', '#1565c0'][index % 5]
                        }}>
                          📁
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.7rem',
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
                              fontSize: '0.6rem',
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
                            width: '5%',
                            height: '100%',
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            borderRadius: 0,
                            '& .MuiIconButton-root': {
                              width: '100%',
                              height: '100%'
                            }
                          }}
                        >
                          <DeleteIcon sx={{ 
                            fontSize: '0.7rem',
                            width: '100%',
                            height: '100%'
                          }} />
                        </IconButton>
                      </ListItem>
                      <Divider sx={{ my: 0.25 }} />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Keine Pfade gespeichert
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Verzeichnisvorschau */}
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
