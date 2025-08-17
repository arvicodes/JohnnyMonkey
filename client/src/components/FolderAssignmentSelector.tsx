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
      const response = await fetch(`/api/learning-groups/${groupId}/folders`);
      if (response.ok) {
        const folders = await response.json();
        const folderPaths: string[] = folders.map((f: any) => f.path);
        setAssignedFolders(folderPaths);
        
        // Lade den Inhalt aller zugeordneten Ordner
        folderPaths.forEach((folderPath: string) => {
          fetchAssignedFolderContent(folderPath);
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der zugeordneten Ordner:', error);
    }
  };

  // Neue Funktion zum Laden des Inhalts zugeordneter Ordner
  const fetchAssignedFolderContent = async (folderPath: string) => {
    try {
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=true`);
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

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Rekursive Komponente für hierarchische Anzeige
  const renderDirectoryItem = (item: DirectoryItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const canExpand = item.type === 'directory' && hasChildren;
    const isDirectory = item.type === 'directory';
    const isAssigned = assignedFolders.includes(item.path);

    // Nur Ordner anzeigen, Dateien filtern
    if (!isDirectory) {
      return null;
    }

    // Filtere nach Suchbegriff
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return null;
    }

    return (
      <Box key={item.path}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            py: 0.5,
            pl: level * 2,
            cursor: canExpand ? 'pointer' : 'default',
            borderRadius: 1,
            '&:hover': canExpand ? { 
              bgcolor: 'rgba(0,0,0,0.04)',
              transform: 'translateX(2px)',
              transition: 'all 0.2s ease'
            } : {}
          }}
          onClick={() => canExpand && toggleItemExpanded(item.path)}
        >
          {canExpand && (
            <Box sx={{ 
              width: 16, 
              height: 16, 
              mr: 0.5, 
              display: 'flex', 
              alignItems: 'center',
              color: '#2e7d32',
              fontWeight: 'bold'
            }}>
              {isExpanded ? '▼' : '▶'}
            </Box>
          )}
          {!canExpand && <Box sx={{ width: 16, mr: 0.5 }} />}
          
          <Box sx={{ 
            mr: 0.5, 
            fontSize: '0.9rem',
            color: '#2e7d32'
          }}>
            📁
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.75rem',
              color: '#2e7d32',
              fontWeight: 'medium',
              flex: 1
            }}
          >
            {item.name}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {isAssigned ? (
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
                  color: '#2e7d32',
                  '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.1)' }
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Rekursive Anzeige der Kinder */}
        {isExpanded && hasChildren && (
          <Box>
            {item.children
              .filter(child => child.type === 'directory') // Nur Ordner anzeigen
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
    
    return (
      <Box key={folderPath} sx={{ mb: 1 }}>
        <Card variant="outlined">
          <CardContent sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FolderIcon sx={{ mr: 1, color: '#2e7d32' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {folderPath.split('/').pop() || folderPath}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {folderPath}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => toggleAssignedFolderExpanded(folderPath)}
                  sx={{ 
                    color: '#2e7d32',
                    '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.1)' }
                  }}
                >
                  {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => removeFolder(folderPath)}
                  sx={{ 
                    color: '#d32f2f',
                    '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.1)' }
                  }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            {/* Vorschau des Ordnerinhalts */}
            <Collapse in={isExpanded}>
              <Box sx={{ mt: 1, pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                {items.length === 0 ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    Ordner ist leer
                  </Typography>
                ) : (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                      Inhalt ({items.filter(item => item.type === 'directory').length} Ordner, {items.filter(item => item.type === 'file').length} Dateien):
                    </Typography>
                    {items.slice(0, 5).map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ 
                          mr: 0.5, 
                          fontSize: '0.8rem',
                          color: item.type === 'directory' ? '#2e7d32' : '#666'
                        }}>
                          {item.type === 'directory' ? '📁' : '📄'}
                        </Box>
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.7rem'
                        }}>
                          {item.name}
                        </Typography>
                      </Box>
                    ))}
                    {items.length > 5 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        ... und {items.length - 5} weitere Elemente
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
        <Grid item xs={12} md={8}>
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
                    {directoryContent.map(item => renderDirectoryItem(item))}
                  </List>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Rechte Seite: Zugeordnete Ordner */}
        <Grid item xs={12} md={4}>
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
