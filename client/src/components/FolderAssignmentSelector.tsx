import React, { useState, useEffect } from 'react';
import { computeCanonicalStemForFiles, groupFilesByBaseName, getShareFileForGroup } from '../lib/folienVersions';
import { openLessonFolderFile } from '../lib/openLessonFolderFile';
import MaterialShareVersionControl from './MaterialShareVersionControl';
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

type PreviewRow =
  | { kind: 'dir'; item: DirectoryItem }
  | { kind: 'group'; baseName: string; versions: { ext: string; file: any }[] };

/** Ordner-Vorschau: gleiche Reihenfolge wie `filteredItems`, Dateien mit gleichem Stamm zu einer Zeile zusammengefasst. */
function buildFolderPreviewRows(filteredItems: DirectoryItem[]): PreviewRow[] {
  const files = filteredItems.filter((i) => i.type === 'file');
  if (files.length === 0) {
    return filteredItems.map((item) => ({ kind: 'dir' as const, item }));
  }
  const groups = groupFilesByBaseName(files);
  const byBase = new Map(groups.map((g) => [g.baseName, g]));
  const stemMap = computeCanonicalStemForFiles(files.map((f) => ({ name: f.name || '' })));
  const emitted = new Set<string>();
  const rows: PreviewRow[] = [];
  for (const item of filteredItems) {
    if (item.type === 'directory') {
      rows.push({ kind: 'dir', item });
      continue;
    }
    const name = item.name || '';
    const baseName = (stemMap.get(name) ?? name.replace(/\.[^.]+$/, '')) || name;
    if (emitted.has(baseName)) continue;
    emitted.add(baseName);
    const g = byBase.get(baseName);
    if (g) rows.push({ kind: 'group', baseName: g.baseName, versions: g.versions });
  }
  return rows;
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
  const [materialSharePickPath, setMaterialSharePickPath] = useState<Record<string, string>>({});

  const fileShareKey = (path: string, gid: string) => `${(path || '').replace(/\\/g, '/').trim()}:${gid}`;

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
          shareMap[fileShareKey(filePath, groupId)] = true;
        });
        setFileShares(shareMap);
      }
    } catch (error) {
      console.error('Error fetching file shares:', error);
    }
  };

  const toggleFileShare = async (filePath: string, gid: string) => {
    const normalizedPath = (filePath || '').replace(/\\/g, '/').trim();
    try {
      const response = await fetch('/api/file-shares/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: normalizedPath, groupId: gid })
      });
      
      if (response.ok) {
        const data = await response.json();
        const key = fileShareKey(normalizedPath, gid);
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

  const handleFileClick = async (item: DirectoryItem) => {
    await openLessonFolderFile(item);
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
    const previewRows = buildFolderPreviewRows(filteredItems);
    const sortPdfFirst = (versions: { ext: string; file: any }[]) =>
      [...versions].sort((a, b) => (a.ext.toLowerCase() === 'pdf' ? -1 : b.ext.toLowerCase() === 'pdf' ? 1 : 0));

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
                    {previewRows.slice(0, 5).map((row, index) => {
                      if (row.kind === 'dir') {
                        const item = row.item;
                        return (
                          <Box
                            key={`d-${item.path}-${index}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mb: 0.5,
                              cursor: 'default',
                              userSelect: 'none',
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <Box sx={{ width: 12, mr: 0.5, flexShrink: 0 }} />
                            <Box sx={{ mr: 0.5, fontSize: '0.8rem', color: '#2e7d32' }}>📁</Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', flex: 1 }}>
                              {item.name}
                            </Typography>
                          </Box>
                        );
                      }
                      const sortedVersions = sortPdfFirst(row.versions);
                      const openFile =
                        getShareFileForGroup(sortedVersions, row.baseName) ?? sortedVersions[0]?.file;
                      const kAuto = row.versions.every((v) => v.file.name.startsWith('K_'));
                      return (
                        <Box
                          key={`g-${row.baseName}-${index}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 0.5,
                            cursor: 'pointer',
                            userSelect: 'none',
                            '&:hover': {
                              bgcolor: 'rgba(0,0,0,0.04)',
                              borderRadius: 1,
                              px: 0.5,
                            },
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (openFile) handleFileClick(openFile);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {kAuto ? (
                            <Box
                              sx={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                bgcolor: '#4caf50',
                                flexShrink: 0,
                                mr: 0.5,
                              }}
                              title="Karteikarten-Datei (automatisch freigegeben)"
                            />
                          ) : (
                            <Box sx={{ mr: 0.5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                              <MaterialShareVersionControl
                                groupId={groupId}
                                baseName={row.baseName}
                                sortedVersions={sortedVersions}
                                fileShares={fileShares}
                                fileShareKey={fileShareKey}
                                materialSharePickPath={materialSharePickPath}
                                setMaterialSharePickPath={setMaterialSharePickPath}
                                toggleFileShare={toggleFileShare}
                                variant="dashboard"
                              />
                            </Box>
                          )}

                          <Box sx={{ mr: 0.5, fontSize: '0.8rem', color: '#1976d2' }}>📄</Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'primary.main',
                              fontSize: '0.7rem',
                              textDecoration: 'underline',
                              fontWeight: 'medium',
                              flex: 1,
                              '&:hover': { color: 'primary.dark', textDecoration: 'underline' },
                            }}
                          >
                            {row.baseName}
                          </Typography>
                        </Box>
                      );
                    })}
                    {previewRows.length > 5 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        ... und {previewRows.length - 5} weitere Elemente
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
