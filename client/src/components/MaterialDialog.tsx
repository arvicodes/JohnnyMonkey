import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
  Modal
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Description as DescriptionIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';

interface MaterialFile {
  fileName: string;
  filePath: string;
  fileSize: number;
}

interface LessonMaterial {
  id: string;
  material: {
    id: string;
    fileName: string;
    filePath: string;
    type: string;
  };
  createdAt: string;
}

interface MaterialDialogProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  lessonName: string;
}

const MaterialDialog: React.FC<MaterialDialogProps> = ({
  open,
  onClose,
  lessonId,
  lessonName
}) => {
  const [availableMaterials, setAvailableMaterials] = useState<MaterialFile[]>([]);
  const [lessonMaterials, setLessonMaterials] = useState<LessonMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [focusedSection, setFocusedSection] = useState<'assigned' | 'available'>('assigned');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Verfügbare Materialien laden
  const fetchAvailableMaterials = async () => {
    try {
      const response = await fetch('/api/materials/available');
      if (response.ok) {
        const materials = await response.json();
        setAvailableMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching available materials:', error);
    }
  };

  // Materialien der Lesson laden
  const fetchLessonMaterials = async () => {
    try {
      const response = await fetch(`/api/materials/lesson/${lessonId}`);
      if (response.ok) {
        const materials = await response.json();
        setLessonMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching lesson materials:', error);
    }
  };

  // Material zu Lesson hinzufügen
  const addMaterialToLesson = async (material: MaterialFile) => {
    setLoading(true);
    try {
      const response = await fetch('/api/materials/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          fileName: material.fileName,
          filePath: material.filePath
        }),
      });

      if (response.ok) {
        await fetchLessonMaterials();
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Hinzufügen des Materials');
      }
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Fehler beim Hinzufügen des Materials');
    } finally {
      setLoading(false);
    }
  };

  // Material von Lesson entfernen
  const removeMaterialFromLesson = async (materialId: string) => {
    if (!window.confirm('Möchten Sie dieses Material wirklich entfernen?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/materials/lesson/${lessonId}/${materialId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchLessonMaterials();
        // Erfolgsmeldung anzeigen
        alert('Material erfolgreich entfernt');
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Entfernen des Materials');
      }
    } catch (error) {
      console.error('Error removing material:', error);
      alert('Fehler beim Entfernen des Materials');
    }
  };

  // Material in neuem Tab öffnen
  const openMaterial = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    // Verwende den Server-Port (3005) für HTML-Dateien
    const fullUrl = ext === 'html' 
      ? 'http://localhost:3005' + filePath 
      : window.location.origin + filePath;
    
    const newWindow = window.open(fullUrl, '_blank');
    
    // Falls das nicht funktioniert, zeige eine Meldung
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      alert('Das Material konnte nicht geöffnet werden. Versuchen Sie es erneut oder verwenden Sie die Vorschau-Funktion.');
    }
  };

  // Material in Modal anzeigen
  const previewMaterialInModal = (filePath: string) => {
    const fullUrl = window.location.origin + filePath;
    setPreviewMaterial(fullUrl);
  };

  // Material direkt im Dialog anzeigen (für HTML-Dateien)
  const showMaterialInDialog = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'html') {
      // Verwende den Server-Port (3005) für HTML-Dateien
      const fullUrl = 'http://localhost:3005' + filePath;
      setPreviewMaterial(fullUrl);
    } else {
      // Für andere Dateitypen: Download oder externe Vorschau
      const fullUrl = window.location.origin + filePath;
      window.open(fullUrl, '_blank');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (previewMaterial) {
        setPreviewMaterial(null);
      } else {
        onClose();
      }
      e.preventDefault();
    } else if (e.key === 'Tab') {
      // Let Tab work normally for accessibility
      return;
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentSection = focusedSection === 'assigned' ? lessonMaterials : availableMaterials;
      const currentIndex = focusedIndex;
      
      if (e.key === 'ArrowDown') {
        if (currentIndex < currentSection.length - 1) {
          setFocusedIndex(currentIndex + 1);
        } else if (focusedSection === 'assigned' && availableMaterials.length > 0) {
          setFocusedSection('available');
          setFocusedIndex(0);
        }
      } else {
        if (currentIndex > 0) {
          setFocusedIndex(currentIndex - 1);
        } else if (focusedSection === 'available' && lessonMaterials.length > 0) {
          setFocusedSection('assigned');
          setFocusedIndex(lessonMaterials.length - 1);
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      
      if (focusedSection === 'assigned') {
        const currentItem = lessonMaterials[focusedIndex];
        if (currentItem) {
          openMaterial(currentItem.material.filePath);
        }
      } else {
        const currentItem = availableMaterials[focusedIndex];
        if (currentItem) {
          addMaterialToLesson(currentItem);
        }
      }
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableMaterials();
      fetchLessonMaterials();
      setFocusedIndex(0);
      setFocusedSection('assigned');
      dialogRef.current?.focus();
    }
  }, [open, lessonId]);

  // Filtere bereits zugeordnete Materialien aus
  const unassignedMaterials = availableMaterials.filter(
    material => !lessonMaterials.some(lessonMaterial => lessonMaterial.material.fileName === material.fileName)
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      onKeyDown={handleKeyDown}
    >
      <div ref={dialogRef} tabIndex={-1}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DescriptionIcon color="primary" />
            <Typography variant="h6">
              Material für "{lessonName}"
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'primary.main' }}>
                Zugeordnete Materialien ({lessonMaterials.length})
              </Typography>
              {lessonMaterials.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => {
                    if (window.confirm(`Möchten Sie alle ${lessonMaterials.length} Materialien entfernen?`)) {
                      lessonMaterials.forEach(material => removeMaterialFromLesson(material.id));
                    }
                  }}
                >
                  Alle entfernen
                </Button>
              )}
            </Box>
            {lessonMaterials.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Noch keine Materialien zugeordnet
              </Typography>
            ) : (
              <List dense>
                {lessonMaterials.map((material, index) => (
                  <ListItem
                    key={material.id}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f5f5f5' },
                      position: 'relative',
                      bgcolor: focusedSection === 'assigned' && focusedIndex === index ? '#e3f2fd' : 'transparent',
                      borderColor: focusedSection === 'assigned' && focusedIndex === index ? 'primary.main' : '#e0e0e0'
                    }}
                    onClick={() => openMaterial(material.material.filePath)}
                    tabIndex={focusedSection === 'assigned' && focusedIndex === index ? 0 : -1}
                  >
                    <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <ListItemText
                      primary={material.material.fileName}
                      secondary={`Hinzugefügt am ${new Date(material.createdAt).toLocaleDateString('de-DE')}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          showMaterialInDialog(material.material.filePath);
                        }}
                        color="primary"
                        sx={{ mr: 1 }}
                        title="Vorschau öffnen"
                      >
                        <OpenInNewIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMaterialFromLesson(material.id);
                        }}
                        color="error"
                        title="Material entfernen"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Verfügbare Materialien ({unassignedMaterials.length})
            </Typography>
            {unassignedMaterials.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Alle verfügbaren Materialien sind bereits zugeordnet
              </Typography>
            ) : (
              <List dense>
                {unassignedMaterials.map((material, index) => (
                  <ListItem
                    key={material.fileName}
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: focusedSection === 'available' && focusedIndex === index ? '#e3f2fd' : 'transparent',
                      borderColor: focusedSection === 'available' && focusedIndex === index ? 'primary.main' : '#e0e0e0'
                    }}
                    tabIndex={focusedSection === 'available' && focusedIndex === index ? 0 : -1}
                  >
                    <DescriptionIcon sx={{ mr: 2, color: 'text.secondary' }} />
                    <ListItemText
                      primary={material.fileName}
                      secondary={`Größe: ${formatFileSize(material.fileSize)}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => addMaterialToLesson(material)}
                        disabled={loading}
                        color="primary"
                      >
                        <AddIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={onClose} 
            color="primary"
            ref={(el) => {
              if (el) {
                el.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter') {
                    onClose();
                  }
                });
              }
            }}
          >
            Schließen
          </Button>
        </DialogActions>
      </div>

      {/* Material Preview Modal */}
      <Modal
        open={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        aria-labelledby="material-preview-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Box
          sx={{
            width: '90vw',
            height: '90vh',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPreviewMaterial(null);
            }
          }}
          tabIndex={-1}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Material Vorschau</Typography>
            <Box>
              <IconButton 
                onClick={() => previewMaterial && window.open(previewMaterial, '_blank')}
                title="In neuem Tab öffnen"
                sx={{ mr: 1 }}
              >
                <OpenInNewIcon />
              </IconButton>
              <IconButton onClick={() => setPreviewMaterial(null)} title="Schließen">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {previewMaterial && (
              <iframe
                src={previewMaterial}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Material Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}
          </Box>
        </Box>
      </Modal>
    </Dialog>
  );
};

export default MaterialDialog; 