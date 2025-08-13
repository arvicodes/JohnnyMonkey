import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  IconButton
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  Quiz as QuizIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MaterialPathManagerProps {
  teacherId: string;
}

interface DiscoveredMaterial {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  extension?: string;
  lastModified: Date;
  isQuiz?: boolean;
  isMaterial?: boolean;
}

interface MaterialDiscoveryResponse {
  materials: DiscoveredMaterial[];
  totalSize: number;
  path: string;
  count: number;
}

const MaterialPathManager: React.FC<MaterialPathManagerProps> = ({ teacherId }) => {
  const [materialPath, setMaterialPath] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Aktuellen Materialpfad abrufen
  const { data: currentPath, isLoading: isLoadingPath } = useQuery({
    queryKey: ['teacherMaterialPath', teacherId],
    queryFn: async () => {
      const response = await fetch(`/api/teacher-settings/${teacherId}/material-path`);
      if (!response.ok) throw new Error('Fehler beim Laden des Materialpfads');
      const data = await response.json();
      return data.materialPath;
    },
    enabled: !!teacherId
  });

  // Materialien im konfigurierten Verzeichnis erkennen
  const { data: discoveredMaterials, isLoading: isLoadingMaterials, refetch: refetchMaterials } = useQuery({
    queryKey: ['discoveredMaterials', teacherId, materialPath],
    queryFn: async (): Promise<MaterialDiscoveryResponse> => {
      if (!materialPath) throw new Error('Kein Materialpfad konfiguriert');
      const response = await fetch(`/api/teacher-settings/${teacherId}/discover-materials?recursive=true&maxDepth=2`);
      if (!response.ok) throw new Error('Fehler bei der Materialerkennung');
      return response.json();
    },
    enabled: !!materialPath && !!teacherId
  });

  // Materialpfad aktualisieren
  const updateMaterialPathMutation = useMutation({
    mutationFn: async (newPath: string) => {
      const response = await fetch(`/api/teacher-settings/${teacherId}/material-path`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialPath: newPath })
      });
      if (!response.ok) throw new Error('Fehler beim Aktualisieren des Materialpfads');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherMaterialPath', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['discoveredMaterials', teacherId] });
      setShowWarning(false);
    }
  });

  // Materialpfad aus localStorage laden (Fallback)
  useEffect(() => {
    if (currentPath) {
      setMaterialPath(currentPath);
    } else {
      const savedPath = localStorage.getItem(`materialPath_${teacherId}`);
      if (savedPath) {
        setMaterialPath(savedPath);
      }
    }
  }, [currentPath, teacherId]);

  // Ordnerauswahl öffnen
  const handleSelectFolder = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Ordner ausgewählt
  const handleFolderSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Der erste Ordner wird als Pfad verwendet
      const firstFile = files[0] as any;
      const folderPath = firstFile.webkitRelativePath.split('/')[0];
      const fullPath = `/Users/${folderPath}`;
      
      if (materialPath && materialPath !== fullPath) {
        setShowWarning(true);
      }
      setMaterialPath(fullPath);
      
      // Pfad automatisch speichern
      updateMaterialPathMutation.mutate(fullPath);
      localStorage.setItem(`materialPath_${teacherId}`, fullPath);
    }
  };

  // Einfache Pfadauswahl - direkt eingeben
  const handlePathChange = (newPath: string) => {
    if (materialPath && materialPath !== newPath) {
      setShowWarning(true);
    }
    setMaterialPath(newPath);
  };

  // Pfad bestätigen
  const handleConfirmPath = () => {
    if (materialPath) {
      updateMaterialPathMutation.mutate(materialPath);
      localStorage.setItem(`materialPath_${teacherId}`, materialPath);
    }
  };

  // Pfad ändern trotz Warnung
  const handleChangeAnyway = () => {
    handleConfirmPath();
  };

  // Größe formatieren
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Datum formatieren
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Materialtyp-Icon
  const getMaterialIcon = (material: DiscoveredMaterial) => {
    if (material.type === 'directory') return <FolderIcon />;
    if (material.isQuiz) return <QuizIcon />;
    if (material.isMaterial) return <FileIcon />;
    return <FileIcon />;
  };

  // Materialtyp-Chip
  const getMaterialChip = (material: DiscoveredMaterial) => {
    if (material.type === 'directory') return <Chip label="Verzeichnis" size="small" color="primary" />;
    if (material.isQuiz) return <Chip label="Quiz" size="small" color="secondary" />;
    if (material.isMaterial) return <Chip label="Material" size="small" color="success" />;
    return <Chip label="Datei" size="small" color="default" />;
  };

  return (
    <Box sx={{ p: 1 }}>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}>
            <StorageIcon color="primary" fontSize="small" />
            Materialpfad konfigurieren
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {/* Kleiner Pfadinput links */}
            <TextField
              size="small"
              sx={{ 
                width: '200px',
                '& .MuiInputBase-root': { height: 28, fontSize: '0.7rem' },
                '& .MuiInputLabel-root': { fontSize: '0.7rem' },
                '& .MuiFormHelperText-root': { fontSize: '0.6rem' }
              }}
              label="Pfad"
              value={materialPath}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="/Users/..."
              helperText="Materialordner auswählen"
              disabled={updateMaterialPathMutation.isPending}
            />
            
            {/* Icon-Button für Ordnerauswahl */}
            <IconButton
              size="small"
              onClick={handleSelectFolder}
              sx={{ 
                width: 28, 
                height: 28,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { 
                  bgcolor: 'primary.dark',
                  transform: 'scale(1.05)',
                  transition: 'all 0.2s'
                }
              }}
              title="Ordner auswählen"
            >
              <FolderOpenIcon fontSize="small" />
            </IconButton>

            {/* Icon-Button für Aktualisieren */}
            <IconButton
              size="small"
              onClick={() => refetchMaterials()}
              disabled={isLoadingMaterials}
              sx={{ 
                width: 28, 
                height: 28,
                bgcolor: 'secondary.main',
                color: 'white',
                '&:hover': { 
                  bgcolor: 'secondary.dark',
                  transform: 'scale(1.05)',
                  transition: 'all 0.2s'
                },
                '&:disabled': {
                  bgcolor: 'grey.400',
                  color: 'grey.600'
                }
              }}
              title="Materialien aktualisieren"
            >
              {isLoadingMaterials ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </Box>

          {/* Versteckter Datei-Input für Ordnerauswahl */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            {...{ webkitdirectory: '', directory: '' } as any}
            onChange={handleFolderSelected}
          />

          {showWarning && (
            <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                <strong>Achtung:</strong> Pfad ändern könnte bestehende Zuordnungen beeinträchtigen.
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button size="small" color="warning" onClick={handleChangeAnyway} sx={{ fontSize: '0.7rem' }}>
                  Trotzdem ändern
                </Button>
                <Button size="small" onClick={() => setShowWarning(false)} sx={{ ml: 1, fontSize: '0.7rem' }}>
                  Abbrechen
                </Button>
              </Box>
            </Alert>
          )}

          {updateMaterialPathMutation.isError && (
            <Alert severity="error" sx={{ mt: 1, fontSize: '0.8rem' }}>
              Fehler: {updateMaterialPathMutation.error?.message}
            </Alert>
          )}

          {updateMaterialPathMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 1, fontSize: '0.8rem' }}>
              Materialpfad erfolgreich gespeichert!
            </Alert>
          )}

          {/* Materialerkennung - Kompakt integriert */}
          {materialPath && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'text.secondary' }}>
                  <InfoIcon color="info" fontSize="small" sx={{ mr: 0.5, fontSize: '0.8rem' }} />
                  Vorschau
                </Typography>
              </Box>

              {isLoadingMaterials ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                  <CircularProgress size={16} />
                </Box>
              ) : discoveredMaterials ? (
                <Box>
                  {/* Kompakte Ordner-Vorschau */}
                  <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1, fontSize: '0.7rem' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', mb: 0.5 }}>
                      <strong>Verzeichnis:</strong> {discoveredMaterials.path}
                    </Typography>
                    
                    {/* Ordner-Übersicht */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                      {discoveredMaterials.materials.filter(m => m.type === 'directory').slice(0, 6).map((dir, index) => (
                        <Chip 
                          key={dir.path}
                          icon={<FolderIcon fontSize="small" />}
                          label={dir.name}
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.6rem', 
                            height: 20,
                            '& .MuiChip-icon': { fontSize: '0.7rem' }
                          }}
                        />
                      ))}
                      {discoveredMaterials.materials.filter(m => m.type === 'directory').length > 6 && (
                        <Chip 
                          label={`+${discoveredMaterials.materials.filter(m => m.type === 'directory').length - 6}`}
                          size="small" 
                          color="default" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 20 }}
                        />
                      )}
                    </Box>

                    {/* Datei-Statistiken */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {discoveredMaterials.materials.filter(m => m.isQuiz).length > 0 && (
                        <Chip 
                          label={`${discoveredMaterials.materials.filter(m => m.isQuiz).length} Quizze`}
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 18 }}
                        />
                      )}
                      {discoveredMaterials.materials.filter(m => m.isMaterial && m.type === 'file').length > 0 && (
                        <Chip 
                          label={`${discoveredMaterials.materials.filter(m => m.isMaterial && m.type === 'file').length} Materialien`}
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 18 }}
                        />
                      )}
                      <Chip 
                        label={`${discoveredMaterials.count} Dateien`}
                        size="small" 
                        color="info" 
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 18 }}
                      />
                      <Chip 
                        label={formatFileSize(discoveredMaterials.totalSize)}
                        size="small" 
                        color="warning" 
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 18 }}
                      />
                    </Box>
                  </Box>

                  {/* Kompakte Materialliste - nur erste 4 Dateien */}
                  <List dense sx={{ maxHeight: 120, overflow: 'auto' }}>
                    {discoveredMaterials.materials.filter(m => m.type === 'file').slice(0, 4).map((material, index) => (
                      <ListItem key={material.path} sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          {getMaterialIcon(material)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                              {material.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                              {formatFileSize(material.size)} | {formatDate(material.lastModified)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                    {discoveredMaterials.materials.filter(m => m.type === 'file').length > 4 && (
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                              ... und {discoveredMaterials.materials.filter(m => m.type === 'file').length - 4} weitere Dateien
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              ) : (
                <Alert severity="info" sx={{ fontSize: '0.7rem' }}>
                  Klicken Sie auf den Ordner-Button, um eine Vorschau zu erhalten.
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MaterialPathManager;
