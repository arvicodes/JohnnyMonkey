import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  ButtonGroup,
  Typography,
  TextField,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Link,
  Paper
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
  ArrowForward as ArrowIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Home as HomeIcon
} from '@mui/icons-material';

type Tool = 'brush' | 'text' | 'circle' | 'rectangle' | 'arrow' | 'eraser' | 'image' | 'select';

interface DrawObject {
  id: string;
  tool: Tool;
  color: string;
  lineWidth: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  imageData?: string;
}

interface DirectoryItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

const WhiteboardPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [objects, setObjects] = useState<DrawObject[]>([]);
  const [redoStack, setRedoStack] = useState<DrawObject[]>([]);
  const [currentObject, setCurrentObject] = useState<DrawObject | null>(null);
  const [selectedObject, setSelectedObject] = useState<DrawObject | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [filename, setFilename] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [directoryContents, setDirectoryContents] = useState<DirectoryItem[]>([]);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string>('');

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('groupId');
    if (gid) {
      setGroupId(gid);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fullscreen canvas
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 60; // Minus toolbar height
      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [objects, selectedObject]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all objects
    objects.forEach(obj => {
      drawObject(ctx, obj);
      
      // Show selection box
      if (selectedObject && selectedObject.id === obj.id) {
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const bounds = getObjectBounds(obj);
        ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
        ctx.setLineDash([]);
      }
    });

    // Draw current object being created
    if (currentObject) {
      drawObject(ctx, currentObject);
    }
  };

  const drawObject = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    ctx.strokeStyle = obj.color;
    ctx.fillStyle = obj.color;
    ctx.lineWidth = obj.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (obj.tool) {
      case 'brush':
      case 'eraser':
        if (obj.points && obj.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          obj.points.forEach(point => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        break;

      case 'circle':
        if (obj.width !== undefined) {
          const radius = Math.abs(obj.width) / 2;
          ctx.beginPath();
          ctx.arc(obj.x + obj.width / 2, obj.y + obj.width / 2, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (obj.width !== undefined && obj.height !== undefined) {
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        }
        break;

      case 'arrow':
        if (obj.points && obj.points.length >= 2) {
          const start = obj.points[0];
          const end = obj.points[obj.points.length - 1];
          
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
        break;

      case 'text':
        if (obj.text) {
          ctx.font = `${obj.fontSize || 24}px Arial`;
          ctx.fillText(obj.text, obj.x, obj.y);
        }
        break;

      case 'image':
        if (obj.imageData && obj.width !== undefined && obj.height !== undefined) {
          const img = new Image();
          img.src = obj.imageData;
          ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
        }
        break;
    }
  };

  const getObjectBounds = (obj: DrawObject) => {
    let minX = obj.x;
    let minY = obj.y;
    let maxX = obj.x + (obj.width || 0);
    let maxY = obj.y + (obj.height || 0);

    if (obj.points) {
      obj.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }

    if (obj.text && obj.fontSize) {
      maxX = obj.x + obj.text.length * obj.fontSize * 0.6;
      maxY = obj.y + obj.fontSize;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  const isPointInObject = (x: number, y: number, obj: DrawObject): boolean => {
    const bounds = getObjectBounds(obj);
    return x >= bounds.x - 5 && x <= bounds.x + bounds.width + 5 &&
           y >= bounds.y - 5 && y <= bounds.y + bounds.height + 5;
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    // Select mode: check if clicking on existing object
    if (tool === 'select') {
      const clickedObject = [...objects].reverse().find(obj => isPointInObject(x, y, obj));
      if (clickedObject) {
        setSelectedObject(clickedObject);
        const bounds = getObjectBounds(clickedObject);
        setDragOffset({ x: x - bounds.x, y: y - bounds.y });
        setIsDrawing(true);
      } else {
        setSelectedObject(null);
      }
      return;
    }

    if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    setSelectedObject(null);
    
    const newObj: DrawObject = {
      id: Date.now().toString(),
      tool: tool === 'eraser' ? 'brush' : tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
      points: tool === 'brush' || tool === 'eraser' || tool === 'arrow' ? [{ x, y }] : undefined,
      x,
      y,
      width: 0,
      height: 0
    };

    setCurrentObject(newObj);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const { x, y } = getCanvasCoordinates(e);

    // Drag selected object
    if (tool === 'select' && selectedObject) {
      const bounds = getObjectBounds(selectedObject);
      const deltaX = x - dragOffset.x - bounds.x;
      const deltaY = y - dragOffset.y - bounds.y;

      const updatedObject = { ...selectedObject };
      updatedObject.x += deltaX;
      updatedObject.y += deltaY;

      if (updatedObject.points) {
        updatedObject.points = updatedObject.points.map(p => ({
          x: p.x + deltaX,
          y: p.y + deltaY
        }));
      }

      setObjects(objects.map(obj => obj.id === selectedObject.id ? updatedObject : obj));
      setSelectedObject(updatedObject);
      redrawCanvas();
      return;
    }

    if (!currentObject) return;

    if (tool === 'brush' || tool === 'eraser' || tool === 'arrow') {
      setCurrentObject({
        ...currentObject,
        points: [...(currentObject.points || []), { x, y }]
      });
    } else if (tool === 'circle' || tool === 'rectangle') {
      const width = x - currentObject.x;
      const height = y - currentObject.y;
      setCurrentObject({
        ...currentObject,
        width,
        height
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    
    if (tool !== 'select' && currentObject) {
      setObjects([...objects, currentObject]);
      setCurrentObject(null);
      setRedoStack([]);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }

    const newObj: DrawObject = {
      id: Date.now().toString(),
      tool: 'text',
      color,
      lineWidth,
      fontSize,
      text: textInput,
      x: textPosition.x,
      y: textPosition.y
    };

    setObjects([...objects, newObj]);
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
          const newObj: DrawObject = {
            id: Date.now().toString(),
            tool: 'image',
            color: '#000000',
            lineWidth: 0,
            imageData: event.target?.result as string,
            x: 100,
            y: 100,
            width: Math.min(img.width, 400),
            height: Math.min(img.height, 400) * (img.height / img.width)
          };
          setObjects([...objects, newObj]);
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUndo = () => {
    if (objects.length === 0) return;
    const lastObj = objects[objects.length - 1];
    setRedoStack([...redoStack, lastObj]);
    setObjects(objects.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const objToRedo = redoStack[redoStack.length - 1];
    setObjects([...objects, objToRedo]);
    setRedoStack(redoStack.slice(0, -1));
  };

  const handleClear = () => {
    if (!window.confirm('Alles löschen?')) return;
    setObjects([]);
    setRedoStack([]);
    setSelectedObject(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedObject) return;
    setObjects(objects.filter(obj => obj.id !== selectedObject.id));
    setSelectedObject(null);
  };

  const loadDirectory = async (path: string) => {
    try {
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(path)}&recursive=false`);
      if (response.ok) {
        const data = await response.json();
        if (data.root && data.root.children) {
          setDirectoryContents(data.root.children.filter((item: DirectoryItem) => item.type === 'directory'));
        }
      }
    } catch (error) {
      console.error('Error loading directory:', error);
    }
  };

  const handleOpenSaveDialog = async () => {
    setShowSaveDialog(true);
    
    // Load assigned folders for this group
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/assigned-folders`);
      if (response.ok) {
        const folders = await response.json();
        setDirectoryContents(folders.map((f: string) => ({
          name: f.split('/').pop() || f,
          path: f,
          type: 'directory' as const
        })));
        setCurrentPath('');
        setPathHistory([]);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const handleFolderClick = (folderPath: string) => {
    setPathHistory([...pathHistory, currentPath]);
    setCurrentPath(folderPath);
    loadDirectory(folderPath);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentPath('');
      setPathHistory([]);
    } else {
      const newPath = pathHistory[index];
      setCurrentPath(newPath);
      setPathHistory(pathHistory.slice(0, index));
    }
  };

  const handleSaveWhiteboard = async () => {
    if (!filename.trim()) {
      alert('Bitte gib einen Dateinamen ein');
      return;
    }

    if (!currentPath) {
      alert('Bitte wähle einen Speicherort');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (blob) {
        const finalFilename = filename.startsWith('W_') ? filename : `W_${filename}`;
        const fullFilename = finalFilename.endsWith('.png') ? finalFilename : `${finalFilename}.png`;
        
        const formData = new FormData();
        formData.append('file', blob, fullFilename);
        formData.append('targetPath', currentPath);

        try {
          const response = await fetch('/api/file-system-paths/save-file', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            alert('Whiteboard erfolgreich gespeichert!');
            window.close();
          } else {
            const error = await response.json();
            alert(error.error || 'Fehler beim Speichern');
          }
        } catch (error) {
          console.error('Error saving:', error);
          alert('Fehler beim Speichern');
        }
      }
    }, 'image/png');
  };

  const colors = [
    '#000000', '#f44336', '#2196f3', '#4caf50', 
    '#ffeb3b', '#ff9800', '#9c27b0', '#ffffff'
  ];

  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* Compact Toolbar */}
      <Paper sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        p: 0.5, 
        borderRadius: 0,
        boxShadow: 1,
        flexWrap: 'wrap'
      }}>
        {/* Tools */}
        <ToggleButtonGroup
          value={tool}
          exclusive
          onChange={(_, newTool) => newTool && setTool(newTool)}
          size="small"
        >
          <ToggleButton value="select" title="Auswählen">✋</ToggleButton>
          <ToggleButton value="brush" title="Stift"><BrushIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="text" title="Text"><TextIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="circle" title="Kreis"><CircleIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="rectangle" title="Rechteck"><RectangleIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="arrow" title="Pfeil"><ArrowIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="eraser" title="Radierer">🧹</ToggleButton>
        </ToggleButtonGroup>

        {/* Colors */}
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          {colors.map(c => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 20,
                height: 20,
                bgcolor: c,
                border: color === c ? '2px solid #1976d2' : '1px solid #999',
                cursor: 'pointer',
                '&:hover': { transform: 'scale(1.1)' }
              }}
            />
          ))}
        </Box>

        {/* Line Width */}
        <Box sx={{ width: 80, mx: 1 }}>
          <Slider
            value={lineWidth}
            onChange={(_, v) => setLineWidth(v as number)}
            min={1}
            max={20}
            size="small"
          />
        </Box>

        {/* Font Size (for text) */}
        {tool === 'text' && (
          <Box sx={{ width: 80, mx: 1 }}>
            <Slider
              value={fontSize}
              onChange={(_, v) => setFontSize(v as number)}
              min={12}
              max={72}
              size="small"
            />
          </Box>
        )}

        {/* Actions */}
        <ButtonGroup size="small">
          <IconButton onClick={handleUndo} disabled={objects.length === 0} size="small" title="Rückgängig">
            <UndoIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={handleRedo} disabled={redoStack.length === 0} size="small" title="Wiederholen">
            <RedoIcon fontSize="small" />
          </IconButton>
          {selectedObject && (
            <IconButton onClick={handleDeleteSelected} size="small" color="error" title="Löschen">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton onClick={handleClear} size="small" color="error" title="Alles löschen">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </ButtonGroup>

        {/* Image Upload */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <IconButton component="span" size="small" title="Bild">
            <ImageIcon fontSize="small" />
          </IconButton>
        </label>

        <Box sx={{ flexGrow: 1 }} />

        {/* Save */}
        <IconButton onClick={handleOpenSaveDialog} size="small" color="success" title="Speichern">
          <SaveIcon />
        </IconButton>
        
        <IconButton onClick={() => window.close()} size="small" title="Schließen">
          <CloseIcon />
        </IconButton>
      </Paper>

      {/* Canvas */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: tool === 'eraser' ? 'crosshair' : 
                    tool === 'text' ? 'text' : 
                    tool === 'select' ? 'move' : 'crosshair',
            backgroundColor: '#ffffff'
          }}
        />
      </Box>

      {/* Text Input Dialog */}
      {showTextInput && (
        <Dialog open={true} onClose={() => setShowTextInput(false)}>
          <DialogTitle>Text eingeben</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              autoFocus
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTextInput(false)}>Abbrechen</Button>
            <Button onClick={handleTextSubmit} variant="contained">Einfügen</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Whiteboard speichern</DialogTitle>
        <DialogContent>
          <TextField
            label="Dateiname"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            fullWidth
            sx={{ mb: 2, mt: 1 }}
            helperText="Wird automatisch mit 'W_' beginnen"
          />

          {/* Breadcrumbs */}
          <Breadcrumbs sx={{ mb: 1 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => handleBreadcrumbClick(-1)}
              sx={{ cursor: 'pointer' }}
            >
              <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
              Start
            </Link>
            {pathHistory.map((path, index) => (
              <Link
                key={index}
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick(index)}
                sx={{ cursor: 'pointer' }}
              >
                {path.split('/').pop()}
              </Link>
            ))}
            {currentPath && (
              <Typography variant="body2" color="text.primary">
                {currentPath.split('/').pop()}
              </Typography>
            )}
          </Breadcrumbs>

          {/* Directory List */}
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {directoryContents.map(item => (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton onClick={() => handleFolderClick(item.path)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FolderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item.name} />
                  </ListItemButton>
                </ListItem>
              ))}
              {directoryContents.length === 0 && (
                <ListItem>
                  <ListItemText primary="Keine Ordner verfügbar" sx={{ textAlign: 'center', color: 'text.secondary' }} />
                </ListItem>
              )}
            </List>
          </Paper>

          {currentPath && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Ausgewählt: {currentPath}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleSaveWhiteboard} 
            variant="contained" 
            color="success"
            disabled={!filename.trim() || !currentPath}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhiteboardPage;

