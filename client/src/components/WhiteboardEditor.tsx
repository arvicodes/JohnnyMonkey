import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  ButtonGroup,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Brush as BrushIcon,
  TextFields as TextIcon,
  Circle as CircleIcon,
  Rectangle as RectangleIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  Image as ImageIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

interface WhiteboardEditorProps {
  onClose: () => void;
  onSave: (imageBlob: Blob, filename: string, targetPath: string) => void;
  availablePaths: Array<{ id: string; path: string; name: string }>;
}

type Tool = 'brush' | 'text' | 'circle' | 'rectangle' | 'arrow' | 'eraser' | 'image';

interface DrawAction {
  tool: Tool;
  color: string;
  lineWidth: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  imageData?: string;
}

const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({ onClose, onSave, availablePaths }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [filename, setFilename] = useState('');
  const [selectedPath, setSelectedPath] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1200;
    canvas.height = 800;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    redrawCanvas();
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [actions]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Weißer Hintergrund
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zeichne alle Aktionen
    actions.forEach(action => {
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (action.tool) {
        case 'brush':
        case 'eraser':
          if (action.points && action.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(action.points[0].x, action.points[0].y);
            action.points.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
          break;

        case 'circle':
          if (action.x !== undefined && action.y !== undefined && action.width !== undefined) {
            const radius = Math.abs(action.width) / 2;
            ctx.beginPath();
            ctx.arc(action.x + action.width / 2, action.y + action.width / 2, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
            ctx.strokeRect(action.x, action.y, action.width, action.height);
          }
          break;

        case 'arrow':
          if (action.points && action.points.length >= 2) {
            const start = action.points[0];
            const end = action.points[action.points.length - 1];
            
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Pfeilspitze
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const arrowLength = 15;
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle - Math.PI / 6),
              end.y - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle + Math.PI / 6),
              end.y - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;

        case 'text':
          if (action.text && action.x !== undefined && action.y !== undefined) {
            ctx.font = `${action.fontSize || 24}px Arial`;
            ctx.fillText(action.text, action.x, action.y);
          }
          break;

        case 'image':
          if (action.imageData && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
            const img = new Image();
            img.src = action.imageData;
            ctx.drawImage(img, action.x, action.y, action.width, action.height);
          }
          break;
      }
    });
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    
    const newAction: DrawAction = {
      tool: tool === 'eraser' ? 'brush' : tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
      points: tool === 'brush' || tool === 'eraser' || tool === 'arrow' ? [{ x, y }] : undefined,
      x: tool === 'circle' || tool === 'rectangle' ? x : undefined,
      y: tool === 'circle' || tool === 'rectangle' ? y : undefined,
      width: 0,
      height: 0
    };

    setCurrentAction(newAction);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction) return;

    const { x, y } = getCanvasCoordinates(e);

    if (tool === 'brush' || tool === 'eraser' || tool === 'arrow') {
      setCurrentAction({
        ...currentAction,
        points: [...(currentAction.points || []), { x, y }]
      });
    } else if (tool === 'circle' || tool === 'rectangle') {
      const width = x - (currentAction.x || 0);
      const height = y - (currentAction.y || 0);
      setCurrentAction({
        ...currentAction,
        width,
        height
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAction) return;

    setIsDrawing(false);
    setActions([...actions, currentAction]);
    setCurrentAction(null);
    setRedoStack([]);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }

    const newAction: DrawAction = {
      tool: 'text',
      color,
      lineWidth,
      fontSize,
      text: textInput,
      x: textPosition.x,
      y: textPosition.y
    };

    setActions([...actions, newAction]);
    setTextInput('');
    setShowTextInput(false);
    setRedoStack([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = () => {
          const newAction: DrawAction = {
            tool: 'image',
            color: '#000000',
            lineWidth: 0,
            imageData: event.target?.result as string,
            x: 100,
            y: 100,
            width: Math.min(img.width, 400),
            height: Math.min(img.height, 400) * (img.height / img.width)
          };
          setActions([...actions, newAction]);
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    const lastAction = actions[actions.length - 1];
    setRedoStack([...redoStack, lastAction]);
    setActions(actions.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const actionToRedo = redoStack[redoStack.length - 1];
    setActions([...actions, actionToRedo]);
    setRedoStack(redoStack.slice(0, -1));
  };

  const handleClear = () => {
    if (!window.confirm('Alles löschen?')) return;
    setActions([]);
    setRedoStack([]);
  };

  const handleSaveWhiteboard = () => {
    if (!filename.trim()) {
      alert('Bitte gib einen Dateinamen ein');
      return;
    }

    if (!selectedPath) {
      alert('Bitte wähle einen Speicherort');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const finalFilename = filename.startsWith('W_') ? filename : `W_${filename}`;
        const fullFilename = finalFilename.endsWith('.png') ? finalFilename : `${finalFilename}.png`;
        onSave(blob, fullFilename, selectedPath);
      }
    }, 'image/png');
  };

  // Zeichne currentAction live während des Zeichnens
  useEffect(() => {
    if (currentAction) {
      redrawCanvas();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = currentAction.color;
      ctx.fillStyle = currentAction.color;
      ctx.lineWidth = currentAction.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentAction.tool === 'brush' && currentAction.points && currentAction.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentAction.points[0].x, currentAction.points[0].y);
        currentAction.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (currentAction.tool === 'circle' && currentAction.x !== undefined && currentAction.y !== undefined && currentAction.width !== undefined) {
        const radius = Math.abs(currentAction.width) / 2;
        ctx.beginPath();
        ctx.arc(currentAction.x + currentAction.width / 2, currentAction.y + currentAction.width / 2, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentAction.tool === 'rectangle' && currentAction.x !== undefined && currentAction.y !== undefined && currentAction.width !== undefined && currentAction.height !== undefined) {
        ctx.strokeRect(currentAction.x, currentAction.y, currentAction.width, currentAction.height);
      } else if (currentAction.tool === 'arrow' && currentAction.points && currentAction.points.length >= 2) {
        const start = currentAction.points[0];
        const end = currentAction.points[currentAction.points.length - 1];
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const arrowLength = 15;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - arrowLength * Math.cos(angle - Math.PI / 6),
          end.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - arrowLength * Math.cos(angle + Math.PI / 6),
          end.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
  }, [currentAction]);

  const colors = [
    { name: 'Schwarz', value: '#000000' },
    { name: 'Rot', value: '#f44336' },
    { name: 'Blau', value: '#2196f3' },
    { name: 'Grün', value: '#4caf50' },
    { name: 'Gelb', value: '#ffeb3b' },
    { name: 'Orange', value: '#ff9800' },
    { name: 'Lila', value: '#9c27b0' },
    { name: 'Weiß', value: '#ffffff' }
  ];

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '95vh', maxHeight: '95vh' }
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
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          ✏️ Neues Whiteboard erstellen
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Werkzeugleiste */}
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Werkzeug-Auswahl */}
            <ToggleButtonGroup
              value={tool}
              exclusive
              onChange={(_, newTool) => newTool && setTool(newTool)}
              size="small"
            >
              <ToggleButton value="brush" title="Stift">
                <BrushIcon />
              </ToggleButton>
              <ToggleButton value="text" title="Text">
                <TextIcon />
              </ToggleButton>
              <ToggleButton value="circle" title="Kreis">
                <CircleIcon />
              </ToggleButton>
              <ToggleButton value="rectangle" title="Rechteck">
                <RectangleIcon />
              </ToggleButton>
              <ToggleButton value="arrow" title="Pfeil">
                <ArrowIcon />
              </ToggleButton>
              <ToggleButton value="eraser" title="Radiergummi">
                <DeleteIcon />
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem />

            {/* Farben */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ mr: 0.5, fontWeight: 600 }}>Farbe:</Typography>
              {colors.map(c => (
                <Box
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: c.value,
                    border: color === c.value ? '3px solid #1976d2' : '2px solid #999',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    },
                    transition: 'all 0.2s'
                  }}
                  title={c.name}
                />
              ))}
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Strichstärke */}
            <Box sx={{ width: 150 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                Stärke: {lineWidth}px
              </Typography>
              <Slider
                value={lineWidth}
                onChange={(_, value) => setLineWidth(value as number)}
                min={1}
                max={20}
                size="small"
              />
            </Box>

            {/* Textgröße (nur bei Text-Werkzeug) */}
            {tool === 'text' && (
              <>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ width: 150 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                    Textgröße: {fontSize}px
                  </Typography>
                  <Slider
                    value={fontSize}
                    onChange={(_, value) => setFontSize(value as number)}
                    min={12}
                    max={72}
                    size="small"
                  />
                </Box>
              </>
            )}

            <Divider orientation="vertical" flexItem />

            {/* Aktionen */}
            <ButtonGroup size="small">
              <Button onClick={handleUndo} disabled={actions.length === 0} title="Rückgängig">
                <UndoIcon />
              </Button>
              <Button onClick={handleRedo} disabled={redoStack.length === 0} title="Wiederholen">
                <RedoIcon />
              </Button>
              <Button onClick={handleClear} color="error" title="Alles löschen">
                <DeleteIcon />
              </Button>
            </ButtonGroup>

            <Divider orientation="vertical" flexItem />

            {/* Bild einfügen */}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="whiteboard-image-upload"
            />
            <label htmlFor="whiteboard-image-upload">
              <Button
                component="span"
                size="small"
                startIcon={<ImageIcon />}
                variant="outlined"
              >
                Bild einfügen
              </Button>
            </label>
          </Box>
        </Box>

        {/* Canvas */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#e0e0e0', p: 2, overflow: 'auto' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              border: '2px solid #999',
              borderRadius: '4px',
              cursor: tool === 'eraser' ? 'crosshair' : tool === 'text' ? 'text' : 'crosshair',
              backgroundColor: '#ffffff',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </Box>

        {/* Text-Eingabe Modal */}
        {showTextInput && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'white',
            p: 3,
            borderRadius: 2,
            boxShadow: 3,
            zIndex: 1000,
            minWidth: 300
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Text eingeben
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Text hier eingeben..."
              autoFocus
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleTextSubmit} fullWidth>
                Einfügen
              </Button>
              <Button variant="outlined" onClick={() => setShowTextInput(false)} fullWidth>
                Abbrechen
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5', flexDirection: 'column', gap: 2, alignItems: 'stretch' }}>
        {/* Dateiname und Speicherort */}
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <TextField
            label="Dateiname"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Mein Whiteboard"
            size="small"
            sx={{ flex: 1 }}
            helperText="Wird automatisch mit 'W_' beginnen"
          />
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Speicherort</InputLabel>
            <Select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              label="Speicherort"
            >
              {availablePaths.map(path => (
                <MenuItem key={path.id} value={path.path}>
                  {path.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined">
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveWhiteboard}
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            disabled={!filename.trim() || !selectedPath}
          >
            Speichern
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default WhiteboardEditor;

