import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Slider,
  Typography,
  ButtonGroup
} from '@mui/material';
import {
  Close as CloseIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Crop as CropIcon,
  Check as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

interface ImageEditorProps {
  imageData: string; // Base64 oder Blob URL
  onSave: (editedBlob: Blob, filename: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageData, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Initialer Crop-Bereich = ganzes Bild
      setCropArea({
        x: 0,
        y: 0,
        width: img.width,
        height: img.height
      });
    };
    img.src = imageData;
  }, [imageData]);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawImage();
    }
  }, [image, rotation, brightness, contrast]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas-Größe basierend auf Rotation
    const angle = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(angle));
    const cos = Math.abs(Math.cos(angle));
    
    const newWidth = image.width * cos + image.height * sin;
    const newHeight = image.width * sin + image.height * cos;
    
    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Rotation um Mittelpunkt
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);

    // Filter anwenden
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Bild zeichnen
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !cropMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCropArea({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      width: Math.abs(x - dragStart.x),
      height: Math.abs(y - dragStart.y)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || cropArea.width === 0 || cropArea.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Erstelle neues Canvas mit zugeschnittenem Bereich
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropArea.width;
    croppedCanvas.height = cropArea.height;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    if (croppedCtx) {
      croppedCtx.drawImage(
        canvas,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
      
      // Konvertiere zu Blob
      croppedCanvas.toBlob((blob) => {
        if (blob) {
          // Erstelle neues Bild aus dem Crop
          const img = new Image();
          img.onload = () => {
            setImage(img);
            setCropMode(false);
            setCropArea({ x: 0, y: 0, width: img.width, height: img.height });
          };
          img.src = URL.createObjectURL(blob);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().getTime();
        const filename = `foto_${timestamp}.jpg`;
        onSave(blob, filename);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <Dialog 
      open={true} 
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#1976d2',
        color: 'white',
        py: 1.5,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          📸 Foto bearbeiten
        </Typography>
        <IconButton 
          onClick={onCancel} 
          sx={{ 
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        {/* Werkzeugleiste */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexDirection: 'column' }}>
          {/* Rotation */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              🔄 Drehen:
            </Typography>
            <ButtonGroup size="small">
              <Button 
                onClick={handleRotateLeft}
                startIcon={<RotateLeftIcon />}
                sx={{ fontSize: '0.75rem' }}
              >
                Links
              </Button>
              <Button 
                onClick={handleRotateRight}
                startIcon={<RotateRightIcon />}
                sx={{ fontSize: '0.75rem' }}
              >
                Rechts
              </Button>
              <Button 
                onClick={() => setRotation(0)}
                sx={{ fontSize: '0.75rem' }}
              >
                Zurücksetzen
              </Button>
            </ButtonGroup>
          </Box>

          {/* Helligkeit */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              ☀️ Helligkeit: {brightness}%
            </Typography>
            <Slider
              value={brightness}
              onChange={(_, value) => setBrightness(value as number)}
              min={50}
              max={150}
              step={5}
              marks
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          {/* Kontrast */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              🔆 Kontrast: {contrast}%
            </Typography>
            <Slider
              value={contrast}
              onChange={(_, value) => setContrast(value as number)}
              min={50}
              max={150}
              step={5}
              marks
              valueLabelDisplay="auto"
              size="small"
            />
          </Box>

          {/* Zuschneiden */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              ✂️ Zuschneiden:
            </Typography>
            {!cropMode ? (
              <Button
                variant="outlined"
                startIcon={<CropIcon />}
                onClick={() => setCropMode(true)}
                size="small"
                sx={{ fontSize: '0.75rem' }}
              >
                Zuschneide-Modus aktivieren
              </Button>
            ) : (
              <ButtonGroup size="small">
                <Button
                  startIcon={<CheckIcon />}
                  onClick={applyCrop}
                  variant="contained"
                  color="success"
                  sx={{ fontSize: '0.75rem' }}
                >
                  Anwenden
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={() => {
                    setCropMode(false);
                    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
                  }}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Abbrechen
                </Button>
              </ButtonGroup>
            )}
            {cropMode && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#1976d2', fontStyle: 'italic' }}>
                ✨ Ziehe mit der Maus einen Bereich auf
              </Typography>
            )}
          </Box>
        </Box>

        {/* Canvas für Bildbearbeitung */}
        <Box 
          sx={{ 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            bgcolor: '#333',
            borderRadius: 1,
            p: 1,
            overflow: 'auto',
            maxHeight: '50vh'
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              maxWidth: '100%',
              maxHeight: '45vh',
              cursor: cropMode ? 'crosshair' : 'default',
              border: cropMode ? '2px dashed #fff' : 'none'
            }}
          />
          
          {/* Crop-Overlay */}
          {cropMode && cropArea.width > 0 && (
            <Box
              sx={{
                position: 'absolute',
                left: cropArea.x,
                top: cropArea.y,
                width: cropArea.width,
                height: cropArea.height,
                border: '2px solid #4caf50',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                pointerEvents: 'none'
              }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" sx={{ fontSize: '0.8rem' }}>
          Abbrechen
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="success"
          sx={{ fontSize: '0.8rem' }}
        >
          Speichern & Hochladen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageEditor;

