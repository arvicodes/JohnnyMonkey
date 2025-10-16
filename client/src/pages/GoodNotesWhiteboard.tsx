import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Slider,
  Tooltip,
  Paper,
  Button,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  MoveUp as BringToFrontIcon,
  MoveDown as SendToBackIcon,
  GridOn as GridIcon,
  Palette as PaletteIcon,
  Brush as BrushIcon,
  Edit as PenIcon,
  TextFields as TextIcon,
  CropFree as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  Straighten as LineIcon,
  ArrowForward as ArrowIcon,
  Image as ImageIcon,
  Clear as ClearIcon,
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Highlighter as MarkerIcon
} from '@mui/icons-material';

// GoodNotes-style color palette
const GOODNOTES_COLORS = [
  '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA',
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D92', '#8E8E93', '#A2845E',
  '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#5E5CE6',
  '#BF5AF2', '#FF375F', '#1C1C1E', '#2C2C2E', '#3A3A3C', '#48484A',
  '#636366', '#8E8E93', '#AEAEB2', '#C7C7CC', '#D1D1D6', '#E5E5EA',
  '#F2F2F7', '#FFFFFF'
];

interface DrawObject {
  id: string;
  type: 'path' | 'text' | 'shape' | 'image';
  tool: 'pen' | 'highlighter' | 'marker' | 'text' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'image';
  color: string;
  strokeWidth: number;
  opacity: number;
  points?: Array<{ x: number; y: number; pressure?: number }>;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  scale?: number;
  imageData?: string;
  timestamp: number;
}

interface GoodNotesWhiteboardProps {
  groupId?: string;
  onClose?: () => void;
}

const GoodNotesWhiteboard: React.FC<GoodNotesWhiteboardProps> = ({ groupId, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [objects, setObjects] = useState<DrawObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<DrawObject | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number; pressure?: number }>>([]);
  
  // GoodNotes-style tools
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'marker' | 'text' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'image'>('pen');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // GoodNotes-style text properties
  const [textContent, setTextContent] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  
  // GoodNotes-style interaction states
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  // GoodNotes-style UI states
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  
  // GoodNotes-style canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // GoodNotes-style canvas settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // GoodNotes-style background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Initial redraw
    redrawCanvas();
  }, []);

  // GoodNotes-style drawing functions
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx);
    }
    
    // Draw all objects
    objects.forEach(obj => {
      drawObject(ctx, obj);
    });
    
    // Draw current path
    if (currentPath.length > 0) {
      drawPath(ctx, currentPath, activeTool, selectedColor, strokeWidth, opacity);
    }
    
    // Draw selection handles
    if (selectedObject) {
      drawSelectionHandles(ctx, selectedObject);
    }
  }, [objects, currentPath, activeTool, selectedColor, strokeWidth, opacity, showGrid, selectedObject]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#E5E5EA';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    const gridSize = 20;
    const startX = 0;
    const startY = 0;
    const endX = ctx.canvas.width;
    const endY = ctx.canvas.height;
    
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: Array<{ x: number; y: number; pressure?: number }>, tool: string, color: string, width: number, opacity: number) => {
    if (path.length < 2) return;
    
    ctx.save();
    ctx.globalAlpha = opacity;
    
    if (tool === 'highlighter') {
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = width * 2;
    } else if (tool === 'marker') {
      ctx.lineWidth = width * 1.5;
    } else {
      ctx.lineWidth = width;
    }
    
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      ctx.lineTo(point.x, point.y);
    }
    
    ctx.stroke();
    ctx.restore();
  };

  const drawObject = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    ctx.save();
    
    if (obj.rotation) {
      const centerX = (obj.x || 0) + (obj.width || 0) / 2;
      const centerY = (obj.y || 0) + (obj.height || 0) / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((obj.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }
    
    ctx.globalAlpha = obj.opacity;
    
    switch (obj.type) {
      case 'path':
        if (obj.points) {
          drawPath(ctx, obj.points, obj.tool, obj.color, obj.strokeWidth, obj.opacity);
        }
        break;
        
      case 'text':
        if (obj.text && obj.x !== undefined && obj.y !== undefined) {
          ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
          ctx.fillStyle = obj.color;
          ctx.fillText(obj.text, obj.x, obj.y);
        }
        break;
        
      case 'shape':
        drawShape(ctx, obj);
        break;
        
      case 'image':
        if (obj.imageData && obj.x !== undefined && obj.y !== undefined && obj.width && obj.height) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, obj.x!, obj.y!, obj.width!, obj.height!);
          };
          img.src = obj.imageData;
        }
        break;
    }
    
    ctx.restore();
  };

  const drawShape = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    if (obj.x === undefined || obj.y === undefined || !obj.width || !obj.height) return;
    
    ctx.fillStyle = obj.color;
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = obj.strokeWidth;
    
    switch (obj.tool) {
      case 'rectangle':
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, Math.min(obj.width, obj.height) / 2, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'line':
        if (obj.points && obj.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          ctx.lineTo(obj.points[obj.points.length - 1].x, obj.points[obj.points.length - 1].y);
          ctx.stroke();
        }
        break;
      case 'arrow':
        if (obj.points && obj.points.length >= 2) {
          const start = obj.points[0];
          const end = obj.points[obj.points.length - 1];
          
          // Draw line
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          
          // Draw arrowhead
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 20;
          const arrowAngle = Math.PI / 6;
          
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - arrowLength * Math.cos(angle - arrowAngle), end.y - arrowLength * Math.sin(angle - arrowAngle));
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(end.x - arrowLength * Math.cos(angle + arrowAngle), end.y - arrowLength * Math.sin(angle + arrowAngle));
          ctx.stroke();
        }
        break;
    }
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    if (obj.x === undefined || obj.y === undefined || !obj.width || !obj.height) return;
    
    const bounds = {
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height
    };
    
    // GoodNotes-style selection border
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    
    // GoodNotes-style corner handles
    const handleSize = 12;
    const handles = [
      { x: bounds.x, y: bounds.y }, // NW
      { x: bounds.x + bounds.width, y: bounds.y }, // NE
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // SE
      { x: bounds.x, y: bounds.y + bounds.height } // SW
    ];
    
    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
    
    // GoodNotes-style rotation handle
    const centerX = bounds.x + bounds.width / 2;
    const rotateHandleY = bounds.y - 30;
    
    // Rotation line
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(centerX, bounds.y);
    ctx.lineTo(centerX, rotateHandleY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Rotation handle
    ctx.beginPath();
    ctx.arc(centerX, rotateHandleY, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, rotateHandleY, 4, 0, 2 * Math.PI);
    ctx.fill();
  };

  // GoodNotes-style interaction functions
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  const isPointInObject = (x: number, y: number, obj: DrawObject): boolean => {
    if (obj.type === 'path' && obj.points) {
      // Check if point is near the path
      const threshold = obj.strokeWidth + 8;
      for (let i = 0; i < obj.points.length - 1; i++) {
        const p1 = obj.points[i];
        const p2 = obj.points[i + 1];
        if (isPointNearLine(x, y, p1.x, p1.y, p2.x, p2.y, threshold)) {
          return true;
        }
      }
      return false;
    } else if (obj.type === 'text' && obj.x !== undefined && obj.y !== undefined) {
      // Check text bounds
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx || !obj.text) return false;
      
      ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
      const metrics = ctx.measureText(obj.text);
      
      return x >= obj.x && x <= obj.x + metrics.width &&
             y >= obj.y - obj.fontSize! && y <= obj.y;
    } else if (obj.x !== undefined && obj.y !== undefined && obj.width && obj.height) {
      // Check shape bounds
      return x >= obj.x && x <= obj.x + obj.width &&
             y >= obj.y && y <= obj.y + obj.height;
    }
    return false;
  };

  const isPointNearLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, threshold: number): boolean => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B) <= threshold;
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));
    
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  };

  const getHandleAtPoint = (x: number, y: number, obj: DrawObject): string | null => {
    if (obj.x === undefined || obj.y === undefined || !obj.width || !obj.height) return null;
    
    // Check rotation handle first
    const centerX = obj.x + obj.width / 2;
    const rotateHandleY = obj.y - 30;
    const distToRotate = Math.sqrt((x - centerX) ** 2 + (y - rotateHandleY) ** 2);
    if (distToRotate < 15) return 'rotate';
    
    // Check corner handles
    const handleSize = 14;
    const handles = [
      { x: obj.x, y: obj.y, name: 'nw' },
      { x: obj.x + obj.width, y: obj.y, name: 'ne' },
      { x: obj.x + obj.width, y: obj.y + obj.height, name: 'se' },
      { x: obj.x, y: obj.y + obj.height, name: 'sw' }
    ];
    
    for (const handle of handles) {
      if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
        return handle.name;
      }
    }
    
    return null;
  };

  // GoodNotes-style mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    // Check for object selection
    const clickedObject = [...objects].reverse().find(obj => isPointInObject(x, y, obj));
    
    if (clickedObject) {
      setSelectedObject(clickedObject);
      
      // Check for handle interaction
      const handle = getHandleAtPoint(x, y, clickedObject);
      if (handle) {
        setResizeHandle(handle);
        setIsResizing(true);
        setDragStart({ x, y });
        return;
      }
      
      // Start dragging
      setIsDragging(true);
      setDragStart({ x, y });
      return;
    }
    
    // Clear selection
    setSelectedObject(null);
    
    // Start drawing
    if (activeTool === 'text') {
      setTextPosition({ x, y });
      setShowTextDialog(true);
      return;
    }
    
    if (['pen', 'highlighter', 'marker', 'line', 'arrow'].includes(activeTool)) {
      setIsDrawing(true);
      setCurrentPath([{ x, y, pressure: 1 }]);
    } else if (['rectangle', 'circle'].includes(activeTool)) {
      setIsDrawing(true);
      const newObj: DrawObject = {
        id: Date.now().toString(),
        type: 'shape',
        tool: activeTool,
        color: selectedColor,
        strokeWidth,
        opacity,
        x,
        y,
        width: 0,
        height: 0,
        timestamp: Date.now()
      };
      setObjects([...objects, newObj]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (isResizing && selectedObject && resizeHandle) {
      // Handle resizing
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      if (resizeHandle === 'rotate') {
        const centerX = (selectedObject.x || 0) + (selectedObject.width || 0) / 2;
        const centerY = (selectedObject.y || 0) + (selectedObject.height || 0) / 2;
        const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
        
        setSelectedObject({
          ...selectedObject,
          rotation: angle
        });
        
        setObjects(objects.map(obj => 
          obj.id === selectedObject.id ? { ...obj, rotation: angle } : obj
        ));
      } else {
        // Handle corner resizing
        let newWidth = selectedObject.width || 0;
        let newHeight = selectedObject.height || 0;
        let newX = selectedObject.x || 0;
        let newY = selectedObject.y || 0;
        
        if (resizeHandle.includes('e')) newWidth += dx;
        if (resizeHandle.includes('w')) { newWidth -= dx; newX += dx; }
        if (resizeHandle.includes('s')) newHeight += dy;
        if (resizeHandle.includes('n')) { newHeight -= dy; newY += dy; }
        
        const updatedObject = {
          ...selectedObject,
          x: newX,
          y: newY,
          width: Math.max(10, newWidth),
          height: Math.max(10, newHeight)
        };
        
        setSelectedObject(updatedObject);
        setObjects(objects.map(obj => 
          obj.id === selectedObject.id ? updatedObject : obj
        ));
      }
      
      setDragStart({ x, y });
    } else if (isDragging && selectedObject) {
      // Handle dragging
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      const updatedObject = {
        ...selectedObject,
        x: (selectedObject.x || 0) + dx,
        y: (selectedObject.y || 0) + dy
      };
      
      setSelectedObject(updatedObject);
      setObjects(objects.map(obj => 
        obj.id === selectedObject.id ? updatedObject : obj
        ));
      
      setDragStart({ x, y });
    } else if (isDrawing && ['pen', 'highlighter', 'marker', 'line', 'arrow'].includes(activeTool)) {
      // Continue drawing path
      setCurrentPath([...currentPath, { x, y, pressure: 1 }]);
    } else if (isDrawing && ['rectangle', 'circle'].includes(activeTool)) {
      // Update shape size
      const startX = dragStart.x;
      const startY = dragStart.y;
      const width = x - startX;
      const height = y - startY;
      
      setObjects(objects.map((obj, index) => 
        index === objects.length - 1 ? { ...obj, width, height } : obj
      ));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPath.length > 0) {
      // Finish drawing path
      const newObj: DrawObject = {
        id: Date.now().toString(),
        type: 'path',
        tool: activeTool,
        color: selectedColor,
        strokeWidth,
        opacity,
        points: [...currentPath],
        timestamp: Date.now()
      };
      
      setObjects([...objects, newObj]);
      setCurrentPath([]);
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // GoodNotes-style actions
  const handleUndo = () => {
    if (objects.length > 0) {
      setObjects(objects.slice(0, -1));
    }
  };

  const handleClear = () => {
    setObjects([]);
    setSelectedObject(null);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    const blob = await fetch(dataURL).then(r => r.blob());
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddText = () => {
    if (!textContent.trim()) return;
    
    const newObj: DrawObject = {
      id: Date.now().toString(),
      type: 'text',
      tool: 'text',
      color: selectedColor,
      strokeWidth: 1,
      opacity,
      text: textContent,
      x: textPosition.x,
      y: textPosition.y,
      fontSize,
      fontFamily,
      timestamp: Date.now()
    };
    
    setObjects([...objects, newObj]);
    setTextContent('');
    setShowTextDialog(false);
  };

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f5f5f7',
      overflow: 'hidden'
    }}>
      {/* GoodNotes-style toolbar */}
      <Paper sx={{ 
        p: 1, 
        borderRadius: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e5e5ea'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Tools */}
          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
            <Tooltip title="Pen">
              <IconButton 
                onClick={() => setActiveTool('pen')}
                sx={{ 
                  bgcolor: activeTool === 'pen' ? '#007AFF' : 'transparent',
                  color: activeTool === 'pen' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'pen' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <PenIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Highlighter">
              <IconButton 
                onClick={() => setActiveTool('highlighter')}
                sx={{ 
                  bgcolor: activeTool === 'highlighter' ? '#007AFF' : 'transparent',
                  color: activeTool === 'highlighter' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'highlighter' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <BrushIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Marker">
              <IconButton 
                onClick={() => setActiveTool('marker')}
                sx={{ 
                  bgcolor: activeTool === 'marker' ? '#007AFF' : 'transparent',
                  color: activeTool === 'marker' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'marker' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <MarkerIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Text">
              <IconButton 
                onClick={() => setActiveTool('text')}
                sx={{ 
                  bgcolor: activeTool === 'text' ? '#007AFF' : 'transparent',
                  color: activeTool === 'text' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'text' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <TextIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          {/* Shapes */}
          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
            <Tooltip title="Rectangle">
              <IconButton 
                onClick={() => setActiveTool('rectangle')}
                sx={{ 
                  bgcolor: activeTool === 'rectangle' ? '#007AFF' : 'transparent',
                  color: activeTool === 'rectangle' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'rectangle' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <RectangleIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Circle">
              <IconButton 
                onClick={() => setActiveTool('circle')}
                sx={{ 
                  bgcolor: activeTool === 'circle' ? '#007AFF' : 'transparent',
                  color: activeTool === 'circle' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'circle' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <CircleIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Line">
              <IconButton 
                onClick={() => setActiveTool('line')}
                sx={{ 
                  bgcolor: activeTool === 'line' ? '#007AFF' : 'transparent',
                  color: activeTool === 'line' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'line' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <LineIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Arrow">
              <IconButton 
                onClick={() => setActiveTool('arrow')}
                sx={{ 
                  bgcolor: activeTool === 'arrow' ? '#007AFF' : 'transparent',
                  color: activeTool === 'arrow' ? 'white' : 'inherit',
                  '&:hover': { bgcolor: activeTool === 'arrow' ? '#0056CC' : 'rgba(0,0,0,0.04)' }
                }}
              >
                <ArrowIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          {/* Color picker */}
          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
            <Tooltip title="Color">
              <IconButton onClick={() => setShowColorPicker(!showColorPicker)}>
                <Box sx={{ 
                  width: 24, 
                  height: 24, 
                  bgcolor: selectedColor, 
                  borderRadius: '50%',
                  border: '2px solid #e5e5ea'
                }} />
              </IconButton>
            </Tooltip>
          </Box>
          
          {/* Stroke width */}
          <Box sx={{ minWidth: 120, mr: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              Stroke: {strokeWidth}px
            </Typography>
            <Slider
              value={strokeWidth}
              onChange={(_, value) => setStrokeWidth(value as number)}
              min={1}
              max={20}
              size="small"
              sx={{ color: '#007AFF' }}
            />
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
            <Tooltip title="Undo">
              <IconButton onClick={handleUndo} disabled={objects.length === 0}>
                <UndoIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Clear">
              <IconButton onClick={handleClear} disabled={objects.length === 0}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Grid">
              <IconButton 
                onClick={() => setShowGrid(!showGrid)}
                sx={{ 
                  bgcolor: showGrid ? '#007AFF' : 'transparent',
                  color: showGrid ? 'white' : 'inherit'
                }}
              >
                <GridIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Save">
              <IconButton onClick={handleSave}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
            
            {onClose && (
              <Tooltip title="Close">
                <IconButton onClick={onClose}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        {/* Color picker */}
        {showColorPicker && (
          <Box sx={{ 
            mt: 1, 
            p: 1, 
            bgcolor: 'white', 
            borderRadius: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {GOODNOTES_COLORS.map(color => (
                <Box
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    setShowColorPicker(false);
                  }}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: color,
                    borderRadius: '50%',
                    border: selectedColor === color ? '3px solid #007AFF' : '2px solid #e5e5ea',
                    cursor: 'pointer',
                    '&:hover': { transform: 'scale(1.1)' }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>
      
      {/* Canvas */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: isDragging ? 'grabbing' :
                    isResizing ? 'nw-resize' :
                    selectedObject ? 'grab' :
                    activeTool === 'text' ? 'text' :
                    'crosshair',
            width: '100%',
            height: '100%',
            backgroundColor: '#FFFFFF'
          }}
        />
      </Box>
      
      {/* Text dialog */}
      <Dialog open={showTextDialog} onClose={() => setShowTextDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Text</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Text"
            fullWidth
            multiline
            rows={3}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Font Size</InputLabel>
              <Select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as number)}
                label="Font Size"
              >
                {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map(size => (
                  <MenuItem key={size} value={size}>{size}px</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Font Family</InputLabel>
              <Select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                label="Font Family"
              >
                <MenuItem value="Arial">Arial</MenuItem>
                <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                <MenuItem value="Helvetica">Helvetica</MenuItem>
                <MenuItem value="Georgia">Georgia</MenuItem>
                <MenuItem value="Verdana">Verdana</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTextDialog(false)}>Cancel</Button>
          <Button onClick={handleAddText} variant="contained">Add Text</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoodNotesWhiteboard;
