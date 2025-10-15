import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  TextField,
  Slider,
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
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  Folder as FolderIcon,
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
  rotation?: number; // Rotation in degrees
  scaleX?: number;
  scaleY?: number;
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
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'rotate'
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number; rotation: number } | null>(null);
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
      
      // Show selection box and handles
      if (selectedObject && selectedObject.id === obj.id) {
        drawSelectionHandles(ctx, obj);
      }
    });

    // Draw current object being created
    if (currentObject) {
      drawObject(ctx, currentObject);
    }
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    const bounds = getObjectBounds(obj);
    const rotation = obj.rotation || 0;
    
    ctx.save();
    
    // Translate to center for rotation
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
    
    // Selection box
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    
    // Resize handles (8 corners and midpoints)
    const handleSize = 8;
    const handles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'n' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'e' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 's' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'w' }
    ];
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
    
    // Rotation handle
    const rotateHandleY = bounds.y - 30;
    ctx.beginPath();
    ctx.arc(centerX, rotateHandleY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Line to rotation handle
    ctx.beginPath();
    ctx.moveTo(centerX, bounds.y);
    ctx.lineTo(centerX, rotateHandleY);
    ctx.stroke();
    
    ctx.restore();
  };

  const drawObject = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    ctx.save();
    
    // Apply rotation
    if (obj.rotation) {
      const bounds = getObjectBounds(obj);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((obj.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }
    
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
    
    ctx.restore();
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

  const getHandleAtPoint = (x: number, y: number, obj: DrawObject): string | null => {
    const bounds = getObjectBounds(obj);
    const rotation = obj.rotation || 0;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Rotation handle
    const rotateHandleY = bounds.y - 30;
    const distToRotate = Math.sqrt((x - centerX) ** 2 + (y - rotateHandleY) ** 2);
    if (distToRotate < 10) return 'rotate';
    
    const handleSize = 8;
    const handles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'n' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'e' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 's' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'w' }
    ];
    
    for (const handle of handles) {
      if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
        return handle.name;
      }
    }
    
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    // Select mode: check if clicking on existing object or handles
    if (tool === 'select') {
      if (selectedObject) {
        const handle = getHandleAtPoint(x, y, selectedObject);
        if (handle) {
          setResizeHandle(handle);
          const bounds = getObjectBounds(selectedObject);
          setResizeStart({
            x,
            y,
            width: bounds.width,
            height: bounds.height,
            rotation: selectedObject.rotation || 0
          });
          setIsDrawing(true);
          return;
        }
      }
      
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

    // Handle resize/rotate
    if (tool === 'select' && selectedObject && resizeHandle && resizeStart) {
      const bounds = getObjectBounds(selectedObject);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      const updatedObject = { ...selectedObject };
      
      if (resizeHandle === 'rotate') {
        // Calculate rotation
        const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
        updatedObject.rotation = angle + 90;
      } else {
        // Calculate new dimensions based on handle
        const dx = x - resizeStart.x;
        const dy = y - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = updatedObject.x;
        let newY = updatedObject.y;
        
        if (resizeHandle.includes('e')) {
          newWidth = resizeStart.width + dx;
        }
        if (resizeHandle.includes('w')) {
          newWidth = resizeStart.width - dx;
          newX = updatedObject.x + dx;
        }
        if (resizeHandle.includes('s')) {
          newHeight = resizeStart.height + dy;
        }
        if (resizeHandle.includes('n')) {
          newHeight = resizeStart.height - dy;
          newY = updatedObject.y + dy;
        }
        
        // Apply new dimensions
        if (updatedObject.width !== undefined) updatedObject.width = Math.max(10, newWidth);
        if (updatedObject.height !== undefined) updatedObject.height = Math.max(10, newHeight);
        updatedObject.x = newX;
        updatedObject.y = newY;
        
        // For text, adjust font size
        if (updatedObject.tool === 'text' && updatedObject.fontSize) {
          const scale = Math.max(newWidth / resizeStart.width, newHeight / resizeStart.height);
          updatedObject.fontSize = Math.max(12, updatedObject.fontSize * scale);
        }
      }
      
      setObjects(objects.map(obj => obj.id === selectedObject.id ? updatedObject : obj));
      setSelectedObject(updatedObject);
      redrawCanvas();
      return;
    }

    // Drag selected object
    if (tool === 'select' && selectedObject && !resizeHandle) {
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
    setResizeHandle(null);
    setResizeStart(null);
    
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
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5', position: 'relative' }}>
      {/* Save Button - Top Right */}
      <IconButton
        onClick={handleOpenSaveDialog}
        color="success"
        size="small"
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          zIndex: 1000,
          bgcolor: '#4caf50',
          color: 'white',
          '&:hover': {
            bgcolor: '#45a049'
          },
          boxShadow: 1,
          width: 32,
          height: 32
        }}
        title="Speichern"
      >
        <SaveIcon fontSize="small" />
      </IconButton>

      {/* Modern Toolbar */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        px: 2,
        py: 1,
        bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Werkzeuge */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {[
            { value: 'select', icon: '✋', label: 'Auswahl' },
            { value: 'brush', icon: '✏️', label: 'Zeichnen' },
            { value: 'text', icon: '📝', label: 'Text' },
            { value: 'rectangle', icon: '▭', label: 'Rechteck' },
            { value: 'circle', icon: '⭕', label: 'Kreis' },
            { value: 'arrow', icon: '➡️', label: 'Pfeil' },
            { value: 'image', icon: '🖼️', label: 'Bild' },
            { value: 'eraser', icon: '🧹', label: 'Radieren' }
          ].map(t => (
            <Box
              key={t.value}
              onClick={() => {
                if (t.value === 'image') {
                  document.getElementById('image-upload')?.click();
                } else {
                  setTool(t.value as Tool);
                }
              }}
              sx={{
                px: 1.5,
                py: 0.8,
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: tool === t.value ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white',
                fontSize: '1.2rem',
                transition: 'all 0.2s',
                border: tool === t.value ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.15)',
                  transform: 'translateY(-2px)'
                }
              }}
              title={t.label}
            >
              {t.icon}
            </Box>
          ))}
        </Box>

        <Box sx={{ width: 1, height: 30, bgcolor: 'rgba(255,255,255,0.2)' }} />

        {/* Farben */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {colors.map(c => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: c,
                border: color === c ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.15)',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
                }
              }}
            />
          ))}
        </Box>

        <Box sx={{ width: 1, height: 30, bgcolor: 'rgba(255,255,255,0.2)' }} />

        {/* Stärke */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'white', fontWeight: 600, minWidth: 50 }}>
            {tool === 'text' ? `Größe: ${fontSize}` : `Dicke: ${lineWidth}`}
          </Typography>
          <Slider
            value={tool === 'text' ? fontSize : lineWidth}
            onChange={(_, v) => tool === 'text' ? setFontSize(v as number) : setLineWidth(v as number)}
            min={tool === 'text' ? 12 : 1}
            max={tool === 'text' ? 72 : 20}
            size="small"
            sx={{
              color: 'white',
              '& .MuiSlider-thumb': {
                bgcolor: 'white'
              },
              '& .MuiSlider-track': {
                bgcolor: 'white'
              },
              '& .MuiSlider-rail': {
                bgcolor: 'rgba(255,255,255,0.3)'
              }
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Aktionen */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton 
            onClick={handleUndo} 
            disabled={objects.length === 0}
            size="small" 
            sx={{ 
              color: 'white',
              '&:disabled': { color: 'rgba(255,255,255,0.3)' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
            }}
            title="Rückgängig"
          >
            <UndoIcon fontSize="small" />
          </IconButton>
          <IconButton 
            onClick={handleRedo} 
            disabled={redoStack.length === 0}
            size="small" 
            sx={{ 
              color: 'white',
              '&:disabled': { color: 'rgba(255,255,255,0.3)' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
            }}
            title="Wiederholen"
          >
            <RedoIcon fontSize="small" />
          </IconButton>
          <IconButton 
            onClick={handleClear}
            size="small" 
            sx={{ 
              color: '#ff6b6b',
              '&:hover': { bgcolor: 'rgba(255,107,107,0.15)' }
            }}
            title="Alles löschen"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ width: 1, height: 30, bgcolor: 'rgba(255,255,255,0.2)' }} />

        {/* Close */}
        <IconButton 
          onClick={() => window.close()} 
          size="small" 
          sx={{ 
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
          }}
          title="Schließen"
        >
          <CloseIcon />
        </IconButton>

        {/* Hidden Image Upload */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          id="image-upload"
        />
      </Box>

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

