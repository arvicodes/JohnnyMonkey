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
  Paper,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  ToggleButton,
  Chip
} from '@mui/material';
import CollaborativeWhiteboard from '../components/CollaborativeWhiteboard';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  Folder as FolderIcon,
  Home as HomeIcon,
  ContentCopy as CopyIcon,
  FlipToFront as FrontIcon,
  FlipToBack as BackIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  GridOn as GridIcon
} from '@mui/icons-material';

type Tool = 'brush' | 'pen' | 'marker' | 'text' | 'line' | 'circle' | 'rectangle' | 'triangle' | 'arrow' | 'polygon' | 'eraser' | 'image' | 'select' | 'freeform' | 'connector' | 'stamp' | 'highlighter';

interface DrawObject {
  id: string;
  tool: Tool;
  strokeColor: string;
  fillColor?: string;
  lineWidth: number;
  opacity: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  points?: Array<{ x: number; y: number }>;
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  imageData?: string;
  rotation?: number;
  locked?: boolean;
}

interface DirectoryItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

const WhiteboardPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontStyle, setFontStyle] = useState('normal');
  const [textDecoration, setTextDecoration] = useState('none');
  const [showGrid, setShowGrid] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [objects, setObjects] = useState<DrawObject[]>([]);
  const [redoStack, setRedoStack] = useState<DrawObject[]>([]);
  const [currentObject, setCurrentObject] = useState<DrawObject | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<DrawObject[]>([]);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ 
    x: number; 
    y: number; 
    objX: number; 
    objY: number; 
    objWidth: number; 
    objHeight: number; 
    rotation: number 
  } | null>(null);
  const [showObjectPanel, setShowObjectPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [filename, setFilename] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [directoryContents, setDirectoryContents] = useState<DirectoryItem[]>([]);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState<'stroke' | 'fill' | null>(null);
  const [hoveredObject, setHoveredObject] = useState<DrawObject | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showStamps, setShowStamps] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<DrawObject | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('groupId');
    if (gid) setGroupId(gid);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 50;
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for our shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 's':
            e.preventDefault();
            handleOpenSaveDialog();
            break;
          case 'a':
            e.preventDefault();
            setSelectedObjects([...objects]);
            break;
          case 'c':
            e.preventDefault();
            if (selectedObjects.length > 0) {
              handleDuplicate();
            }
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            if (selectedObjects.length > 0) {
              handleDeleteSelected();
            }
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            if (selectedObjects.length > 0) {
              handleDeleteSelected();
            }
            break;
          case 'Escape':
            setSelectedObjects([]);
            setShowObjectPanel(false);
            setShowColorPicker(null);
            setShowStamps(false);
            setShowTemplates(false);
            setIsConnecting(false);
            setConnectionStart(null);
            setSelectedStamp(null);
            setTool('select');
            break;
          case ' ':
            e.preventDefault();
            setIsPanning(true);
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [objects, selectedObjects]);

  useEffect(() => {
    redrawCanvas();
  }, [objects, selectedObjects, showGrid, zoom, panOffset]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    if (showGrid) {
      drawGrid(ctx);
    }

    objects.forEach(obj => {
      if (!obj.locked) drawObject(ctx, obj);
      if (selectedObjects.some(s => s.id === obj.id)) {
        drawSelectionHandles(ctx, obj);
      }
    });

    if (currentObject) {
      drawObject(ctx, currentObject);
    }

    // Draw connection preview if in connector mode
    if (tool === 'connector' && connectionStart) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      const startCenter = {
        x: connectionStart.x + (connectionStart.width || 0) / 2,
        y: connectionStart.y + (connectionStart.height || 0) / 2
      };
      ctx.beginPath();
      ctx.moveTo(startCenter.x, startCenter.y);
      ctx.lineTo(startCenter.x + 50, startCenter.y + 50); // Preview line
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Restore transformations
    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 30;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    const bounds = getObjectBounds(obj);
    
    // Selection border
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    
    // Corner handles - larger and more visible
    const handleSize = 20; // Match hit detection size
    const cornerHandles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' }
    ];
    
    ctx.fillStyle = '#2196f3';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    
    cornerHandles.forEach(handle => {
      // Draw a circle for better visibility
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw a cross inside for better visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(handle.x - 4, handle.y);
      ctx.lineTo(handle.x + 4, handle.y);
      ctx.moveTo(handle.x, handle.y - 4);
      ctx.lineTo(handle.x, handle.y + 4);
      ctx.stroke();
      ctx.strokeStyle = '#2196f3';
    });
    
    // Rotation handle - larger and more visible
    const centerX = bounds.x + bounds.width / 2;
    const rotateHandleY = bounds.y - 25;
    ctx.beginPath();
    ctx.arc(centerX, rotateHandleY, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Rotation line
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, bounds.y);
    ctx.lineTo(centerX, rotateHandleY);
    ctx.stroke();
  };

  const applyLineStyle = (ctx: CanvasRenderingContext2D, style: 'solid' | 'dashed' | 'dotted') => {
    switch (style) {
      case 'dashed':
        ctx.setLineDash([10, 5]);
        break;
      case 'dotted':
        ctx.setLineDash([2, 3]);
        break;
      default:
        ctx.setLineDash([]);
    }
  };

  const drawObject = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    ctx.save();
    ctx.globalAlpha = obj.opacity;
    
    if (obj.rotation) {
      const bounds = getObjectBounds(obj);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((obj.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }
    
    ctx.strokeStyle = obj.strokeColor;
    ctx.fillStyle = obj.fillColor || 'transparent';
    ctx.lineWidth = obj.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    applyLineStyle(ctx, obj.lineStyle);

    switch (obj.tool) {
      case 'brush':
      case 'pen':
      case 'marker':
      case 'eraser':
      case 'freeform':
        if (obj.points && obj.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          obj.points.forEach(point => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }
        break;

      case 'highlighter':
        if (obj.points && obj.points.length > 0) {
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = obj.lineWidth * 2;
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          obj.points.forEach(point => ctx.lineTo(point.x, point.y));
          ctx.stroke();
          ctx.globalAlpha = obj.opacity;
        }
        break;

      case 'line':
        if (obj.points && obj.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          ctx.lineTo(obj.points[obj.points.length - 1].x, obj.points[obj.points.length - 1].y);
          ctx.stroke();
        }
        break;

      case 'circle':
        if (obj.width !== undefined && obj.height !== undefined) {
          const radius = Math.min(Math.abs(obj.width), Math.abs(obj.height)) / 2;
          const centerX = obj.x + obj.width / 2;
          const centerY = obj.y + obj.height / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          if (obj.fillColor && obj.fillColor !== 'transparent') ctx.fill();
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (obj.width !== undefined && obj.height !== undefined) {
          if (obj.fillColor && obj.fillColor !== 'transparent') {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          }
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        }
        break;

      case 'triangle':
        if (obj.width !== undefined && obj.height !== undefined) {
          ctx.beginPath();
          ctx.moveTo(obj.x + obj.width / 2, obj.y);
          ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
          ctx.lineTo(obj.x, obj.y + obj.height);
          ctx.closePath();
          if (obj.fillColor && obj.fillColor !== 'transparent') ctx.fill();
          ctx.stroke();
        }
        break;

      case 'arrow':
        if (obj.points && obj.points.length >= 2) {
          const start = obj.points[0];
          const end = obj.points[obj.points.length - 1];
          
          // Draw main arrow line
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = Math.max(15, obj.lineWidth * 3);
          const arrowAngle = Math.PI / 6; // 30 degrees
          
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - arrowAngle),
            end.y - arrowLength * Math.sin(angle - arrowAngle)
          );
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + arrowAngle),
            end.y - arrowLength * Math.sin(angle + arrowAngle)
          );
          ctx.stroke();
        }
        break;

      case 'text':
        if (obj.text) {
          ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${obj.fontSize || 24}px ${obj.fontFamily || 'Arial'}`;
          ctx.fillStyle = obj.strokeColor;
          ctx.fillText(obj.text, obj.x, obj.y);
          
          if (obj.textDecoration === 'underline') {
            const width = ctx.measureText(obj.text).width;
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + 2);
            ctx.lineTo(obj.x + width, obj.y + 2);
            ctx.stroke();
          }
        }
        break;

      case 'image':
        if (obj.imageData && obj.width !== undefined && obj.height !== undefined) {
          const img = new Image();
          img.src = obj.imageData;
          ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
        }
        break;

      case 'connector':
        if (obj.points && obj.points.length >= 2) {
          const start = obj.points[0];
          const end = obj.points[obj.points.length - 1];
          
          // Draw connection line
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          
          // Draw connection points
          ctx.fillStyle = obj.strokeColor;
          ctx.beginPath();
          ctx.arc(start.x, start.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(end.x, end.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          
          // Reset line dash
          ctx.setLineDash([]);
        }
        break;

      case 'stamp':
        if (obj.text) {
          // Draw stamp text without border
          ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${obj.fontSize || 16}px ${obj.fontFamily || 'Arial'}`;
          ctx.fillStyle = obj.strokeColor;
          ctx.fillText(obj.text, obj.x, obj.y);
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

    // For objects with points (lines, arrows, brush strokes, etc.)
    if (obj.points && obj.points.length > 0) {
      obj.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }

    // For text objects
    if (obj.text && obj.fontSize) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily || 'Arial'}`;
          const metrics = ctx.measureText(obj.text);
          maxX = obj.x + metrics.width;
          maxY = obj.y;
          minY = obj.y - obj.fontSize;
        }
      }
    }

    // Calculate final dimensions
    const width = Math.max(20, maxX - minX);
    const height = Math.max(20, maxY - minY);

    // Add some padding for better selection
    const padding = 5;
    return {
      x: minX - padding,
      y: minY - padding,
      width: width + (padding * 2),
      height: height + (padding * 2)
    };
  };

  const isPointInObject = (x: number, y: number, obj: DrawObject): boolean => {
    // Check actual object geometry, not selection bounds
    if (obj.points && obj.points.length > 0) {
      // For drawn paths (pen, brush, marker, etc.)
      return isPointInPath(x, y, obj);
    } else if (obj.text) {
      // For text objects
      return isPointInText(x, y, obj);
    } else if (obj.tool === 'image' && obj.imageData) {
      // For images
      return x >= obj.x && x <= obj.x + (obj.width || 0) &&
             y >= obj.y && y <= obj.y + (obj.height || 0);
    } else {
      // For shapes (rectangle, circle, etc.)
      return isPointInShape(x, y, obj);
    }
  };

  const isPointInPath = (x: number, y: number, obj: DrawObject): boolean => {
    if (!obj.points || obj.points.length === 0) return false;
    
    // Simple distance-based collision for paths
    const threshold = (obj.lineWidth || 5) + 10; // Add some padding
    
    for (let i = 0; i < obj.points.length; i++) {
      const point = obj.points[i];
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      if (distance <= threshold) return true;
    }
    
    // Check line segments for better collision detection
    for (let i = 0; i < obj.points.length - 1; i++) {
      const p1 = obj.points[i];
      const p2 = obj.points[i + 1];
      if (isPointNearLine(x, y, p1.x, p1.y, p2.x, p2.y, threshold)) {
        return true;
      }
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

  const isPointInText = (x: number, y: number, obj: DrawObject): boolean => {
    if (!obj.text || !obj.fontSize) return false;
    
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily || 'Arial'}`;
    const metrics = ctx.measureText(obj.text);
    
    return x >= obj.x && x <= obj.x + metrics.width &&
           y >= obj.y - obj.fontSize && y <= obj.y;
  };

  const isPointInShape = (x: number, y: number, obj: DrawObject): boolean => {
    const w = obj.width || 0;
    const h = obj.height || 0;
    
    switch (obj.tool) {
      case 'rectangle':
      case 'triangle':
        return x >= obj.x && x <= obj.x + w && y >= obj.y && y <= obj.y + h;
        
      case 'circle':
        const centerX = obj.x + w / 2;
        const centerY = obj.y + h / 2;
        const radius = Math.min(w, h) / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= radius;
        
      case 'arrow':
      case 'line':
        if (!obj.points || obj.points.length < 2) return false;
        const p1 = obj.points[0];
        const p2 = obj.points[obj.points.length - 1];
        const threshold = (obj.lineWidth || 5) + 10;
        return isPointNearLine(x, y, p1.x, p1.y, p2.x, p2.y, threshold);
        
      default:
        return x >= obj.x && x <= obj.x + w && y >= obj.y && y <= obj.y + h;
    }
  };

  const getHandleAtPoint = (x: number, y: number, obj: DrawObject): string | null => {
    const bounds = getObjectBounds(obj);
    const centerX = bounds.x + bounds.width / 2;
    const rotateHandleY = bounds.y - 25;
    
    // Check rotation handle first (highest priority)
    const distToRotate = Math.sqrt((x - centerX) ** 2 + (y - rotateHandleY) ** 2);
    if (distToRotate < 20) return 'rotate';
    
    // Check corner handles with larger hit area
    const handleSize = 20; // Increased hit area
    const cornerHandles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' }
    ];
    
    for (const handle of cornerHandles) {
      const distance = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (distance < handleSize) {
        return handle.name;
      }
    }
    
    return null;
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

    // Handle middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x, y });
      return;
    }

    // Always check for object selection first (regardless of current tool)
    const clickedObject = [...objects].reverse().find(obj => !obj.locked && isPointInObject(x, y, obj));
    
    if (clickedObject) {
      // If clicking on an object, select it and check for handles
      setSelectedObjects([clickedObject]);
      setShowObjectPanel(true);
      
      const handle = getHandleAtPoint(x, y, clickedObject);
      if (handle) {
        setResizeHandle(handle);
        
        // Calculate object bounds for objects without explicit width/height
        const bounds = getObjectBounds(clickedObject);
        const objWidth = clickedObject.width !== undefined ? clickedObject.width : bounds.width - 10;
        const objHeight = clickedObject.height !== undefined ? clickedObject.height : bounds.height - 10;
        
        setResizeStart({
          x, y,
          objX: clickedObject.x,
          objY: clickedObject.y,
          objWidth,
          objHeight,
          rotation: clickedObject.rotation || 0
        });
        setIsDrawing(true);
        return;
      }
      
      // Start dragging the object immediately - no need for hand tool
      setDragStart({ x, y });
      setIsDragging(true);
      setIsDrawing(true);
      return;
    } else {
      // Clicked on empty space - clear selection
      setSelectedObjects([]);
      setShowObjectPanel(false);
    }

    // If no object was clicked, proceed with drawing
    if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }

    if (tool === 'connector') {
      if (!connectionStart) {
        // First click - select start object
        const startObj = [...objects].reverse().find(obj => !obj.locked && isPointInObject(x, y, obj));
        if (startObj) {
          setConnectionStart(startObj);
          console.log('Start object selected:', startObj);
        } else {
          // Click on empty space - cancel connector mode
          setIsConnecting(false);
          setTool('select');
        }
      } else {
        // Second click - create connection
        const endObj = [...objects].reverse().find(obj => !obj.locked && isPointInObject(x, y, obj));
        if (endObj && endObj.id !== connectionStart.id) {
          const startCenter = {
            x: connectionStart.x + (connectionStart.width || 0) / 2,
            y: connectionStart.y + (connectionStart.height || 0) / 2
          };
          const endCenter = {
            x: endObj.x + (endObj.width || 0) / 2,
            y: endObj.y + (endObj.height || 0) / 2
          };
          
          const newConnector: DrawObject = {
            id: Date.now().toString(),
            tool: 'connector',
            strokeColor,
            lineWidth,
            opacity,
            lineStyle,
            points: [startCenter, endCenter],
            x: Math.min(startCenter.x, endCenter.x),
            y: Math.min(startCenter.y, endCenter.y),
            width: Math.abs(endCenter.x - startCenter.x),
            height: Math.abs(endCenter.y - startCenter.y)
          };
          setObjects([...objects, newConnector]);
          console.log('Connector created:', newConnector);
        } else if (!endObj) {
          // Click on empty space - cancel connector mode
          setConnectionStart(null);
          setIsConnecting(false);
          setTool('select');
        }
        setConnectionStart(null);
        setIsConnecting(false);
        setTool('select');
      }
      return;
    }

    if (tool === 'stamp') {
      if (selectedStamp) {
        const newStamp: DrawObject = {
          id: Date.now().toString(),
          tool: 'stamp',
          strokeColor,
          lineWidth,
          opacity,
          lineStyle,
          text: selectedStamp,
          x,
          y,
          width: 100,
          height: 30,
          fontSize: 16,
          fontFamily: 'Arial',
          fontWeight: 'bold'
        };
        setObjects([...objects, newStamp]);
        setSelectedStamp(null);
        setShowStamps(false);
        setTool('select');
      } else {
        setShowStamps(true);
      }
      return;
    }

    setIsDrawing(true);
    setSelectedObjects([]);
    
    const newObj: DrawObject = {
      id: Date.now().toString(),
      tool: tool === 'eraser' ? 'pen' : tool,
      strokeColor: tool === 'eraser' ? '#ffffff' : strokeColor,
      fillColor: tool === 'eraser' ? 'transparent' : fillColor,
      lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
      opacity,
      lineStyle,
      points: ['brush', 'pen', 'marker', 'eraser', 'arrow', 'line'].includes(tool) ? [{ x, y }] : undefined,
      x,
      y,
      width: ['circle', 'rectangle', 'triangle', 'image'].includes(tool) ? 0 : undefined,
      height: ['circle', 'rectangle', 'triangle', 'image'].includes(tool) ? 0 : undefined
    };

    setCurrentObject(newObj);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    // Handle panning with middle mouse button or space key
    if (isPanning) {
      const deltaX = x - panStart.x;
      const deltaY = y - panStart.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x, y });
      return;
    }
    
    // Check for hovered objects when not drawing
    if (!isDrawing) {
      const hovered = [...objects].reverse().find(obj => !obj.locked && isPointInObject(x, y, obj));
      setHoveredObject(hovered || null);
      
      // Check if hovering over a resize handle
      if (hovered) {
        const handle = getHandleAtPoint(x, y, hovered);
        if (handle) {
          // Set cursor based on handle type
          const canvas = canvasRef.current;
          if (canvas) {
            if (handle === 'rotate') {
              canvas.style.cursor = 'grab';
            } else if (handle === 'nw' || handle === 'se') {
              canvas.style.cursor = 'nw-resize';
            } else if (handle === 'ne' || handle === 'sw') {
              canvas.style.cursor = 'ne-resize';
            }
          }
        } else {
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.style.cursor = 'grab';
          }
        }
      } else {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = 'default';
        }
      }
    }
    
    if (!isDrawing) return;

    if (selectedObjects[0] && resizeHandle && resizeStart) {
      const selected = selectedObjects[0];
      const updatedObject = { ...selected };
      
      if (resizeHandle === 'rotate') {
        // Rotation logic
        const bounds = getObjectBounds(selected);
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
        updatedObject.rotation = angle + 90;
      } else {
        // Resize logic - much simpler approach
        const dx = x - resizeStart.x;
        const dy = y - resizeStart.y;
        
        let newX = resizeStart.objX;
        let newY = resizeStart.objY;
        let newWidth = resizeStart.objWidth;
        let newHeight = resizeStart.objHeight;
        
        // Apply resize based on which handle is being dragged
        switch (resizeHandle) {
          case 'nw': // Top-left
            newX = resizeStart.objX + dx;
            newY = resizeStart.objY + dy;
            newWidth = Math.max(10, resizeStart.objWidth - dx);
            newHeight = Math.max(10, resizeStart.objHeight - dy);
            break;
          case 'ne': // Top-right
            newY = resizeStart.objY + dy;
            newWidth = Math.max(10, resizeStart.objWidth + dx);
            newHeight = Math.max(10, resizeStart.objHeight - dy);
            break;
          case 'se': // Bottom-right
            newWidth = Math.max(10, resizeStart.objWidth + dx);
            newHeight = Math.max(10, resizeStart.objHeight + dy);
            break;
          case 'sw': // Bottom-left
            newX = resizeStart.objX + dx;
            newWidth = Math.max(10, resizeStart.objWidth - dx);
            newHeight = Math.max(10, resizeStart.objHeight + dy);
            break;
        }
        
        // Update object properties
        updatedObject.x = newX;
        updatedObject.y = newY;
        
        // For shapes with width/height
        if (updatedObject.width !== undefined) {
          updatedObject.width = newWidth;
        }
        if (updatedObject.height !== undefined) {
          updatedObject.height = newHeight;
        }
        
        // Special handling for circles - keep them circular
        if (updatedObject.tool === 'circle') {
          const size = Math.min(newWidth, newHeight);
          updatedObject.width = size;
          updatedObject.height = size;
        }
        
        // For objects with points (lines, arrows, brush strokes)
        if (updatedObject.points && updatedObject.points.length > 0) {
          const scaleX = newWidth / resizeStart.objWidth;
          const scaleY = newHeight / resizeStart.objHeight;
          updatedObject.points = updatedObject.points.map(point => ({
            x: newX + (point.x - resizeStart.objX) * scaleX,
            y: newY + (point.y - resizeStart.objY) * scaleY
          }));
          
          // For objects without explicit width/height, we need to set them
          if (updatedObject.width === undefined) {
            updatedObject.width = newWidth;
          }
          if (updatedObject.height === undefined) {
            updatedObject.height = newHeight;
          }
        }
        
        // For text objects, scale font size
        if (updatedObject.tool === 'text' && updatedObject.fontSize) {
          const scale = Math.min(newWidth / resizeStart.objWidth, newHeight / resizeStart.objHeight);
          updatedObject.fontSize = Math.max(12, Math.min(96, updatedObject.fontSize * scale));
        }
      }
      
      setObjects(objects.map(obj => obj.id === selected.id ? updatedObject : obj));
      setSelectedObjects([updatedObject]);
      return;
    }

    if (selectedObjects[0] && isDragging && !resizeHandle) {
      const selected = selectedObjects[0];
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;

      const updatedObject = { ...selected };
      updatedObject.x += deltaX;
      updatedObject.y += deltaY;

      if (updatedObject.points) {
        updatedObject.points = updatedObject.points.map(p => ({
          x: p.x + deltaX,
          y: p.y + deltaY
        }));
      }

      setObjects(objects.map(obj => obj.id === selected.id ? updatedObject : obj));
      setSelectedObjects([updatedObject]);
      setDragStart({ x, y });
      return;
    }

    if (!currentObject) return;

    if (['brush', 'pen', 'marker', 'eraser', 'arrow', 'line', 'freeform', 'highlighter'].includes(tool)) {
      setCurrentObject({
        ...currentObject,
        points: [...(currentObject.points || []), { x, y }]
      });
    } else if (['circle', 'rectangle', 'triangle'].includes(tool)) {
      const width = x - currentObject.x;
      const height = y - currentObject.y;
      setCurrentObject({
        ...currentObject,
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? x : currentObject.x,
        y: height < 0 ? y : currentObject.y
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    if (!isDrawing) return;
    setIsDrawing(false);
    setIsDragging(false);
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
      strokeColor,
      fillColor,
      lineWidth,
      opacity,
      lineStyle,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      textDecoration,
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
            strokeColor: '#000000',
            lineWidth: 0,
            opacity: 1,
            lineStyle: 'solid',
            imageData: event.target?.result as string,
            x: 100,
            y: 100,
            width: Math.min(img.width, 500),
            height: (Math.min(img.width, 500) / img.width) * img.height
          };
          setObjects([...objects, newObj]);
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                const img = new Image();
                img.onload = () => {
                  const newObj: DrawObject = {
                    id: Date.now().toString(),
                    tool: 'image',
                    strokeColor: '#000000',
                    lineWidth: 0,
                    opacity: 1,
                    lineStyle: 'solid',
                    imageData: e.target?.result as string,
                    x: 100,
                    y: 100,
                    width: Math.min(img.width, 500),
                    height: (Math.min(img.width, 500) / img.width) * img.height
                  };
                  setObjects([...objects, newObj]);
                };
                img.src = e.target.result as string;
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    } catch (err) {
      console.log('Paste not supported or failed:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const file = imageFiles[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const newObj: DrawObject = {
              id: Date.now().toString(),
              tool: 'image',
              strokeColor: '#000000',
              lineWidth: 0,
              opacity: 1,
              lineStyle: 'solid',
              imageData: event.target?.result as string,
              x: x - 50,
              y: y - 50,
              width: Math.min(img.width, 500),
              height: (Math.min(img.width, 500) / img.width) * img.height
            };
            setObjects([...objects, newObj]);
          };
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUndo = () => {
    if (objects.length === 0) return;
    const lastObj = objects[objects.length - 1];
    setRedoStack([...redoStack, lastObj]);
    setObjects(objects.slice(0, -1));
    setSelectedObjects([]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const objToRedo = redoStack[redoStack.length - 1];
    setObjects([...objects, objToRedo]);
    setRedoStack(redoStack.slice(0, -1));
  };

  const handleClear = () => {
    if (!window.confirm('Whiteboard komplett löschen?')) return;
    setObjects([]);
    setRedoStack([]);
    setSelectedObjects([]);
  };

  const handleDuplicate = () => {
    if (selectedObjects.length === 0) return;
    const duplicated = selectedObjects.map(obj => ({
      ...obj,
      id: Date.now().toString() + Math.random(),
      x: obj.x + 20,
      y: obj.y + 20
    }));
    setObjects([...objects, ...duplicated]);
    setSelectedObjects(duplicated);
  };

  const handleBringToFront = () => {
    if (selectedObjects.length === 0) return;
    const selected = selectedObjects[0];
    setObjects([...objects.filter(o => o.id !== selected.id), selected]);
  };

  const handleSendToBack = () => {
    if (selectedObjects.length === 0) return;
    const selected = selectedObjects[0];
    setObjects([selected, ...objects.filter(o => o.id !== selected.id)]);
  };

  const handleDeleteSelected = () => {
    if (selectedObjects.length === 0) return;
    const selectedIds = selectedObjects.map(o => o.id);
    setObjects(objects.filter(obj => !selectedIds.includes(obj.id)));
    setSelectedObjects([]);
    setShowObjectPanel(false);
  };

  const updateSelectedObject = (updates: Partial<DrawObject>) => {
    if (selectedObjects.length === 0) return;
    const selected = selectedObjects[0];
    const updatedObject = { ...selected, ...updates };
    setObjects(objects.map(obj => obj.id === selected.id ? updatedObject : obj));
    setSelectedObjects([updatedObject]);
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

  const handleSaveWhiteboard = async (format: 'png' | 'pdf' | 'svg' = 'png') => {
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

    const finalFilename = filename.startsWith('W_') ? filename : `W_${filename}`;
    
    if (format === 'svg') {
      // SVG Export
      const svgData = generateSVG();
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const fullFilename = finalFilename.endsWith('.svg') ? finalFilename : `${finalFilename}.svg`;
      
      const formData = new FormData();
      formData.append('file', blob, fullFilename);
      formData.append('targetPath', currentPath);

      try {
        const response = await fetch('/api/file-system-paths/save-file', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          alert('Whiteboard als SVG gespeichert!');
          window.close();
        } else {
          const error = await response.json();
          alert(error.error || 'Fehler beim Speichern');
        }
      } catch (error) {
        console.error('Error saving SVG:', error);
        alert('Fehler beim Speichern');
      }
    } else if (format === 'pdf') {
      // PDF Export (simplified - would need a proper PDF library)
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fullFilename = finalFilename.endsWith('.pdf') ? finalFilename : `${finalFilename}.pdf`;
          
          const formData = new FormData();
          formData.append('file', blob, fullFilename);
          formData.append('targetPath', currentPath);

          try {
            const response = await fetch('/api/file-system-paths/save-file', {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              alert('Whiteboard als PDF gespeichert!');
              window.close();
            } else {
              const error = await response.json();
              alert(error.error || 'Fehler beim Speichern');
            }
          } catch (error) {
            console.error('Error saving PDF:', error);
            alert('Fehler beim Speichern');
          }
        }
      }, 'application/pdf');
    } else {
      // PNG Export (original)
      canvas.toBlob(async (blob) => {
        if (blob) {
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
    }
  };

  const generateSVG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const svgWidth = canvas.width;
    const svgHeight = canvas.height;
    
    let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
    svgContent += `<rect width="100%" height="100%" fill="white"/>`;
    
    objects.forEach(obj => {
      switch (obj.tool) {
        case 'rectangle':
          if (obj.width !== undefined && obj.height !== undefined) {
            svgContent += `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" 
              fill="${obj.fillColor || 'none'}" stroke="${obj.strokeColor}" stroke-width="${obj.lineWidth}"/>`;
          }
          break;
        case 'circle':
          if (obj.width !== undefined && obj.height !== undefined) {
            const radius = Math.min(Math.abs(obj.width), Math.abs(obj.height)) / 2;
            const centerX = obj.x + obj.width / 2;
            const centerY = obj.y + obj.height / 2;
            svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" 
              fill="${obj.fillColor || 'none'}" stroke="${obj.strokeColor}" stroke-width="${obj.lineWidth}"/>`;
          }
          break;
        case 'text':
          if (obj.text) {
            svgContent += `<text x="${obj.x}" y="${obj.y}" font-family="${obj.fontFamily || 'Arial'}" 
              font-size="${obj.fontSize || 24}" fill="${obj.strokeColor}">${obj.text}</text>`;
          }
          break;
        // Add more cases as needed
      }
    });
    
    svgContent += '</svg>';
    return svgContent;
  };

  const presetColors = [
    '#000000', '#ffffff', '#f44336', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
  ];

  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
      {/* Collaborative Features */}
      {groupId && (
        <CollaborativeWhiteboard
          groupId={groupId}
          onUserJoin={(user) => {
            console.log('User joined:', user);
          }}
          onUserLeave={(userId) => {
            console.log('User left:', userId);
          }}
          onCursorMove={(userId, x, y) => {
            // Handle remote cursor movement
          }}
          onObjectChange={(newObjects) => {
            setObjects(newObjects);
          }}
        />
      )}

      {/* Save Button */}
      <IconButton
        onClick={handleOpenSaveDialog}
        sx={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 2000,
          bgcolor: '#4caf50',
          color: 'white',
          width: 40,
          height: 40,
          boxShadow: 3,
          '&:hover': { bgcolor: '#45a049', transform: 'scale(1.05)' }
        }}
        title="Speichern"
      >
        <SaveIcon />
      </IconButton>

      {/* Modern Toolbar */}
      <Paper elevation={0} sx={{ 
        borderRadius: 0, 
        borderBottom: '1px solid #e0e0e0',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Compact Main Tools */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ 
            fontWeight: 600, 
            color: 'white', 
            minWidth: 60,
            fontSize: '0.75rem',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            Tools
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[
              { value: 'select', icon: '✋', label: 'Auswählen' },
              { value: 'pen', icon: '🖊️', label: 'Stift' },
              { value: 'brush', icon: '🖌️', label: 'Pinsel' },
              { value: 'marker', icon: '🖍️', label: 'Marker' },
              { value: 'highlighter', icon: '🖍️', label: 'Textmarker' },
              { value: 'line', icon: '📏', label: 'Linie' },
              { value: 'rectangle', icon: '▭', label: 'Rechteck' },
              { value: 'circle', icon: '⭕', label: 'Kreis' },
              { value: 'triangle', icon: '△', label: 'Dreieck' },
              { value: 'arrow', icon: '➡️', label: 'Pfeil' },
              { value: 'freeform', icon: '✏️', label: 'Freihand' },
              { value: 'connector', icon: '🔗', label: 'Verbinder' },
              { value: 'text', icon: 'A', label: 'Text' },
              { value: 'stamp', icon: '🏷️', label: 'Stempel' },
              { value: 'image', icon: '🖼️', label: 'Bild' },
              { value: 'eraser', icon: '🧹', label: 'Radieren' }
            ].map(t => (
              <Tooltip key={t.value} title={t.label}>
                <Box
                  onClick={() => {
                    if (t.value === 'image') {
                      document.getElementById('image-upload')?.click();
                    } else if (t.value === 'stamp') {
                      setTool(t.value as Tool);
                      setShowStamps(true);
                    } else if (t.value === 'connector') {
                      setTool(t.value as Tool);
                      setIsConnecting(true);
                    } else {
                      setTool(t.value as Tool);
                    }
                  }}
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: tool === t.value ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                    boxShadow: tool === t.value ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.25)',
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      borderColor: 'rgba(255,255,255,0.4)'
                    }
                  }}
                >
                  {t.icon}
                </Box>
              </Tooltip>
            ))}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
            <Tooltip title="Rückgängig">
              <span>
                <IconButton 
                  onClick={handleUndo} 
                  disabled={objects.length === 0} 
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 28,
                    height: 28,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                      transform: 'scale(1.05)'
                    },
                    '&:disabled': {
                      color: 'rgba(255,255,255,0.3)',
                      bgcolor: 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  <UndoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Wiederholen">
              <span>
                <IconButton 
                  onClick={handleRedo} 
                  disabled={redoStack.length === 0} 
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 28,
                    height: 28,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
                    '&:disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <RedoIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Duplizieren">
              <span>
                <IconButton 
                  onClick={handleDuplicate} 
                  disabled={selectedObjects.length === 0} 
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 28,
                    height: 28,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
                    '&:disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <CopyIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="In Vordergrund">
              <span>
                <IconButton 
                  onClick={handleBringToFront} 
                  disabled={selectedObjects.length === 0} 
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 28,
                    height: 28,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
                    '&:disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <FrontIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="In Hintergrund">
              <span>
                <IconButton 
                  onClick={handleSendToBack} 
                  disabled={selectedObjects.length === 0} 
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 28,
                    height: 28,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
                    '&:disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <BackIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Löschen">
              <span>
                <IconButton 
                  onClick={selectedObjects.length > 0 ? handleDeleteSelected : handleClear} 
                  size="small"
                  sx={{
                    color: '#ff6b6b',
                    bgcolor: 'rgba(255,107,107,0.1)',
                    border: '1px solid rgba(255,107,107,0.3)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': { 
                      bgcolor: 'rgba(255,107,107,0.2)', 
                      transform: 'scale(1.1)',
                      boxShadow: '0 4px 12px rgba(255,107,107,0.3)'
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Compact Zoom Controls */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5, 
            mr: 1,
            bgcolor: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
            px: 1,
            py: 0.25,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <Tooltip title="Heranzoomen">
              <IconButton 
                onClick={() => setZoom(Math.min(zoom * 1.2, 5))} 
                size="small"
                sx={{
                  color: 'white',
                  width: 24,
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' }
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>+</Typography>
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ 
              minWidth: 50, 
              textAlign: 'center',
              color: 'white',
              fontWeight: 600,
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="Herauszoomen">
              <IconButton 
                onClick={() => setZoom(Math.max(zoom / 1.2, 0.1))} 
                size="small"
                sx={{
                  color: 'white',
                  width: 24,
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' }
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>-</Typography>
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom zurücksetzen">
              <IconButton 
                onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} 
                size="small"
                sx={{
                  color: 'white',
                  width: 24,
                  height: 24,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' }
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>100%</Typography>
              </IconButton>
            </Tooltip>
          </Box>

          <Tooltip title="Vorlagen">
            <IconButton 
              onClick={() => setShowTemplates(true)} 
              size="small"
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' }
              }}
            >
              <Typography variant="caption" sx={{ fontSize: '1rem' }}>📋</Typography>
            </IconButton>
          </Tooltip>

          <Tooltip title="Raster ein/aus">
            <IconButton 
              onClick={() => setShowGrid(!showGrid)} 
              size="small"
              sx={{
                color: showGrid ? '#4caf50' : 'white',
                bgcolor: showGrid ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': { 
                  bgcolor: showGrid ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.2)', 
                  transform: 'scale(1.1)' 
                }
              }}
            >
              <GridIcon />
            </IconButton>
          </Tooltip>

          <IconButton 
            onClick={() => window.close()} 
            size="small"
            sx={{
              color: '#ff6b6b',
              bgcolor: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              backdropFilter: 'blur(10px)',
              '&:hover': { 
                bgcolor: 'rgba(255,107,107,0.2)', 
                transform: 'scale(1.1)',
                boxShadow: '0 4px 12px rgba(255,107,107,0.3)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Compact Properties */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          px: 2, 
          py: 0.75, 
          bgcolor: 'rgba(255,255,255,0.05)', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Colors */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ 
              fontWeight: 600, 
              fontSize: '0.75rem', 
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              Strich
            </Typography>
            <Box
              onClick={() => setShowColorPicker('stroke')}
              sx={{
                width: 24,
                height: 24,
                bgcolor: strokeColor,
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                '&:hover': { 
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  borderColor: 'rgba(255,255,255,0.6)'
                }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ 
              fontWeight: 600, 
              fontSize: '0.75rem', 
              color: 'rgba(255,255,255,0.8)',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              Füllung
            </Typography>
            <Box
              onClick={() => setShowColorPicker('fill')}
              sx={{
                width: 24,
                height: 24,
                bgcolor: fillColor === 'transparent' ? 'white' : fillColor,
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                backgroundImage: fillColor === 'transparent' ? 
                  'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                backgroundSize: '6px 6px',
                backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                '&:hover': { 
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  borderColor: 'rgba(255,255,255,0.6)'
                }
              }}
            />
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Line Properties */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666' }}>
              Dicke
            </Typography>
            <Slider
              value={lineWidth}
              onChange={(_, v) => setLineWidth(v as number)}
              min={1}
              max={30}
              size="small"
              sx={{ width: 80 }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666', minWidth: 20 }}>
              {lineWidth}
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select
              value={lineStyle}
              onChange={(e) => setLineStyle(e.target.value as any)}
              sx={{ fontSize: '0.75rem', height: 28 }}
            >
              <MenuItem value="solid">━━━</MenuItem>
              <MenuItem value="dashed">- - -</MenuItem>
              <MenuItem value="dotted">· · ·</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666' }}>
              Transparenz
            </Typography>
            <Slider
              value={opacity}
              onChange={(_, v) => setOpacity(v as number)}
              min={0.1}
              max={1}
              step={0.1}
              size="small"
              sx={{ width: 60 }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666' }}>
              {Math.round(opacity * 100)}%
            </Typography>
          </Box>

          {/* Text Properties */}
          {tool === 'text' && (
            <>
              <Divider orientation="vertical" flexItem />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  sx={{ fontSize: '0.75rem', height: 28 }}
                >
                  <MenuItem value="Arial">Arial</MenuItem>
                  <MenuItem value="Times New Roman">Times</MenuItem>
                  <MenuItem value="Courier New">Courier</MenuItem>
                  <MenuItem value="Comic Sans MS">Comic Sans</MenuItem>
                  <MenuItem value="Georgia">Georgia</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <ToggleButton
                  value="bold"
                  selected={fontWeight === 'bold'}
                  onChange={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                  size="small"
                  sx={{ width: 32, height: 28 }}
                >
                  <BoldIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton
                  value="italic"
                  selected={fontStyle === 'italic'}
                  onChange={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                  size="small"
                  sx={{ width: 32, height: 28 }}
                >
                  <ItalicIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton
                  value="underline"
                  selected={textDecoration === 'underline'}
                  onChange={() => setTextDecoration(textDecoration === 'underline' ? 'none' : 'underline')}
                  size="small"
                  sx={{ width: 32, height: 28 }}
                >
                  <UnderlineIcon fontSize="small" />
                </ToggleButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666' }}>
                  Größe
                </Typography>
                <Slider
                  value={fontSize}
                  onChange={(_, v) => setFontSize(v as number)}
                  min={12}
                  max={96}
                  size="small"
                  sx={{ width: 80 }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666', minWidth: 20 }}>
                  {fontSize}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      {/* Canvas */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          style={{
            cursor: isPanning ? 'grabbing' :
                    isDragging ? 'grabbing' :
                    resizeHandle ? 'nw-resize' :
                    hoveredObject ? 'grab' :
                    tool === 'eraser' ? 'crosshair' : 
                    tool === 'text' ? 'text' : 
                    tool === 'connector' ? 'crosshair' :
                    tool === 'stamp' ? 'crosshair' :
                    'default',
            backgroundColor: '#ffffff'
          }}
        />
      </Box>

      {/* Color Picker Popover */}
      {showColorPicker && (
        <Paper
          sx={{
            position: 'fixed',
            top: 120,
            left: showColorPicker === 'stroke' ? 100 : 220,
            zIndex: 1500,
            p: 2,
            boxShadow: 5,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {showColorPicker === 'stroke' ? 'Strichfarbe' : 'Füllfarbe'}
            </Typography>
            <IconButton size="small" onClick={() => setShowColorPicker(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.5, mb: 1 }}>
            {showColorPicker === 'fill' && (
              <Box
                onClick={() => {
                  setFillColor('transparent');
                  setShowColorPicker(null);
                }}
                sx={{
                  width: 36,
                  height: 36,
                  border: '2px solid #333',
                  borderRadius: 1,
                  cursor: 'pointer',
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
                title="Transparent"
              />
            )}
            {presetColors.map(c => (
              <Box
                key={c}
                onClick={() => {
                  if (showColorPicker === 'stroke') {
                    setStrokeColor(c);
                    if (selectedObjects[0]) {
                      updateSelectedObject({ strokeColor: c });
                    }
                  } else {
                    setFillColor(c);
                    if (selectedObjects[0]) {
                      updateSelectedObject({ fillColor: c });
                    }
                  }
                  setShowColorPicker(null);
                }}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: c,
                  border: '2px solid #333',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { transform: 'scale(1.1)', boxShadow: 2 }
                }}
              />
            ))}
          </Box>
          
          <TextField
            type="color"
            value={showColorPicker === 'stroke' ? strokeColor : (fillColor === 'transparent' ? '#ffffff' : fillColor)}
            onChange={(e) => {
              if (showColorPicker === 'stroke') {
                setStrokeColor(e.target.value);
                if (selectedObjects[0]) {
                  updateSelectedObject({ strokeColor: e.target.value });
                }
              } else {
                setFillColor(e.target.value);
                if (selectedObjects[0]) {
                  updateSelectedObject({ fillColor: e.target.value });
                }
              }
            }}
            size="small"
            fullWidth
            label="Eigene Farbe"
          />
        </Paper>
      )}

      {/* Text Input Dialog */}
      {showTextInput && (
        <Dialog open={true} onClose={() => setShowTextInput(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Text eingeben</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              autoFocus
              sx={{ mt: 1 }}
              placeholder="Ihren Text hier eingeben..."
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
            onClick={() => handleSaveWhiteboard('png')} 
            variant="outlined"
            disabled={!filename.trim() || !currentPath}
          >
            PNG
          </Button>
          <Button 
            onClick={() => handleSaveWhiteboard('svg')} 
            variant="outlined"
            disabled={!filename.trim() || !currentPath}
          >
            SVG
          </Button>
          <Button 
            onClick={() => handleSaveWhiteboard('pdf')} 
            variant="contained" 
            color="success"
            disabled={!filename.trim() || !currentPath}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden Image Upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        id="image-upload"
      />

      {/* Stamps Dialog */}
      <Dialog open={showStamps} onClose={() => setShowStamps(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stempel auswählen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 2 }}>
            {[
              '✓', '✗', '!', '?', '★', '♥', '♦', '♠', '♣',
              'OK', 'NEIN', 'JA', 'GUT', 'SCHLECHT', 'WICHTIG',
              'INFO', 'HINWEIS', 'TIP', 'ACHTUNG'
            ].map(stamp => (
              <Box
                key={stamp}
                onClick={() => {
                  setSelectedStamp(stamp);
                  setShowStamps(false);
                  // Tool bleibt auf 'stamp' für das nächste Klicken
                }}
                sx={{
                  p: 2,
                  border: '2px solid #e0e0e0',
                  borderRadius: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  '&:hover': {
                    borderColor: '#1976d2',
                    backgroundColor: '#f5f5f5'
                  }
                }}
              >
                {stamp}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStamps(false)}>Abbrechen</Button>
        </DialogActions>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onClose={() => setShowTemplates(false)} maxWidth="md" fullWidth>
        <DialogTitle>Vorlagen auswählen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 2 }}>
            {[
              { name: 'Mindmap', icon: '🧠', description: 'Mindmap-Vorlage' },
              { name: 'Diagramm', icon: '📊', description: 'Flussdiagramm-Vorlage' },
              { name: 'Tabelle', icon: '📋', description: 'Tabellen-Vorlage' },
              { name: 'Zeitachse', icon: '⏰', description: 'Zeitachse-Vorlage' },
              { name: 'Venn', icon: '⭕', description: 'Venn-Diagramm' },
              { name: 'Gantt', icon: '📅', description: 'Gantt-Chart' }
            ].map(template => (
              <Box
                key={template.name}
                onClick={() => {
                  setSelectedTemplate(template.name);
                  setShowTemplates(false);
                  // Hier könnten wir die Vorlage laden
                }}
                sx={{
                  p: 2,
                  border: '2px solid #e0e0e0',
                  borderRadius: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: '#1976d2',
                    backgroundColor: '#f5f5f5'
                  }
                }}
              >
                <Typography variant="h4" sx={{ mb: 1 }}>{template.icon}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{template.name}</Typography>
                <Typography variant="caption" color="text.secondary">{template.description}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplates(false)}>Abbrechen</Button>
        </DialogActions>
      </Dialog>

      {/* Object Properties Panel */}
      {showObjectPanel && selectedObjects[0] && (
        <Paper
          sx={{
            position: 'fixed',
            top: 120,
            right: 20,
            zIndex: 1500,
            p: 2,
            minWidth: 280,
            maxWidth: 320,
            boxShadow: 5,
            borderRadius: 2,
            bgcolor: 'white'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Objekt-Eigenschaften
            </Typography>
            <IconButton size="small" onClick={() => setShowObjectPanel(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {selectedObjects[0] && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Object Type */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666' }}>
                  Typ: {selectedObjects[0].tool}
                </Typography>
              </Box>

              {/* Colors */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666', mb: 1, display: 'block' }}>
                  Farben
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Strich</Typography>
                    <Box
                      onClick={() => {
                        setShowColorPicker('stroke');
                        setStrokeColor(selectedObjects[0].strokeColor);
                      }}
                      sx={{
                        width: 30,
                        height: 30,
                        bgcolor: selectedObjects[0].strokeColor,
                        border: '2px solid #333',
                        borderRadius: 1,
                        cursor: 'pointer',
                        boxShadow: 1,
                        '&:hover': { transform: 'scale(1.05)' }
                      }}
                    />
                  </Box>
                  {['rectangle', 'circle', 'triangle'].includes(selectedObjects[0].tool) && (
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Füllung</Typography>
                      <Box
                        onClick={() => {
                          setShowColorPicker('fill');
                          setFillColor(selectedObjects[0].fillColor || 'transparent');
                        }}
                        sx={{
                          width: 30,
                          height: 30,
                          bgcolor: selectedObjects[0].fillColor === 'transparent' ? 'white' : selectedObjects[0].fillColor,
                          border: '2px solid #333',
                          borderRadius: 1,
                          cursor: 'pointer',
                          boxShadow: 1,
                          backgroundImage: selectedObjects[0].fillColor === 'transparent' ? 
                            'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                          backgroundSize: '6px 6px',
                          backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                          '&:hover': { transform: 'scale(1.05)' }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Line Properties */}
              {['brush', 'pen', 'marker', 'line', 'arrow', 'rectangle', 'circle', 'triangle'].includes(selectedObjects[0].tool) && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666', mb: 1, display: 'block' }}>
                    Linie
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 40 }}>
                      Dicke
                    </Typography>
                    <Slider
                      value={selectedObjects[0].lineWidth}
                      onChange={(_, v) => updateSelectedObject({ lineWidth: v as number })}
                      min={1}
                      max={30}
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 20 }}>
                      {selectedObjects[0].lineWidth}
                    </Typography>
                  </Box>
                  
                  <FormControl size="small" sx={{ mt: 1, minWidth: '100%' }}>
                    <Select
                      value={selectedObjects[0].lineStyle}
                      onChange={(e) => updateSelectedObject({ lineStyle: e.target.value as any })}
                      sx={{ fontSize: '0.7rem', height: 28 }}
                    >
                      <MenuItem value="solid">━━━ Durchgezogen</MenuItem>
                      <MenuItem value="dashed">- - - Gestrichelt</MenuItem>
                      <MenuItem value="dotted">· · · Gepunktet</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              {/* Opacity */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666', mb: 1, display: 'block' }}>
                  Transparenz
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 40 }}>
                    {Math.round(selectedObjects[0].opacity * 100)}%
                  </Typography>
                  <Slider
                    value={selectedObjects[0].opacity}
                    onChange={(_, v) => updateSelectedObject({ opacity: v as number })}
                    min={0.1}
                    max={1}
                    step={0.1}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                </Box>
              </Box>

              {/* Text Properties */}
              {selectedObjects[0].tool === 'text' && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666', mb: 1, display: 'block' }}>
                    Text
                  </Typography>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={selectedObjects[0].text || ''}
                    onChange={(e) => updateSelectedObject({ text: e.target.value })}
                    size="small"
                    sx={{ mb: 1 }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 40 }}>
                      Größe
                    </Typography>
                    <Slider
                      value={selectedObjects[0].fontSize || 24}
                      onChange={(_, v) => updateSelectedObject({ fontSize: v as number })}
                      min={12}
                      max={96}
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 20 }}>
                      {selectedObjects[0].fontSize || 24}
                    </Typography>
                  </Box>

                  <FormControl size="small" sx={{ mb: 1, minWidth: '100%' }}>
                    <Select
                      value={selectedObjects[0].fontFamily || 'Arial'}
                      onChange={(e) => updateSelectedObject({ fontFamily: e.target.value })}
                      sx={{ fontSize: '0.7rem', height: 28 }}
                    >
                      <MenuItem value="Arial">Arial</MenuItem>
                      <MenuItem value="Times New Roman">Times</MenuItem>
                      <MenuItem value="Courier New">Courier</MenuItem>
                      <MenuItem value="Comic Sans MS">Comic Sans</MenuItem>
                      <MenuItem value="Georgia">Georgia</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <ToggleButton
                      value="bold"
                      selected={selectedObjects[0].fontWeight === 'bold'}
                      onChange={() => updateSelectedObject({ 
                        fontWeight: selectedObjects[0].fontWeight === 'bold' ? 'normal' : 'bold' 
                      })}
                      size="small"
                      sx={{ width: 32, height: 28 }}
                    >
                      <BoldIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                      value="italic"
                      selected={selectedObjects[0].fontStyle === 'italic'}
                      onChange={() => updateSelectedObject({ 
                        fontStyle: selectedObjects[0].fontStyle === 'italic' ? 'normal' : 'italic' 
                      })}
                      size="small"
                      sx={{ width: 32, height: 28 }}
                    >
                      <ItalicIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                      value="underline"
                      selected={selectedObjects[0].textDecoration === 'underline'}
                      onChange={() => updateSelectedObject({ 
                        textDecoration: selectedObjects[0].textDecoration === 'underline' ? 'none' : 'underline' 
                      })}
                      size="small"
                      sx={{ width: 32, height: 28 }}
                    >
                      <UnderlineIcon fontSize="small" />
                    </ToggleButton>
                  </Box>
                </Box>
              )}

              {/* Rotation */}
              {selectedObjects[0].tool !== 'text' && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666', mb: 1, display: 'block' }}>
                    Rotation
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 40 }}>
                      {Math.round(selectedObjects[0].rotation || 0)}°
                    </Typography>
                    <Slider
                      value={selectedObjects[0].rotation || 0}
                      onChange={(_, v) => updateSelectedObject({ rotation: v as number })}
                      min={0}
                      max={360}
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                  </Box>
                </Box>
              )}

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDeleteSelected}
                  color="error"
                  sx={{ flexGrow: 1 }}
                >
                  Löschen
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDuplicate}
                  sx={{ flexGrow: 1 }}
                >
                  Kopieren
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Status Bar */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        px: 2, 
        py: 0.5, 
        bgcolor: '#f5f5f5', 
        borderTop: '1px solid #e0e0e0',
        fontSize: '0.7rem'
      }}>
        <Chip label={`Objekte: ${objects.length}`} size="small" />
        {selectedObjects.length > 0 && (
          <Chip label={`Ausgewählt: ${selectedObjects.length}`} size="small" color="primary" />
        )}
        <Chip label={`Zoom: ${Math.round(zoom * 100)}%`} size="small" />
        {isConnecting && (
          <Chip label="Verbinder aktiv" size="small" color="secondary" />
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ color: '#666' }}>
          Tastatur: Strg+Z (Rückgängig), Strg+S (Speichern), Leertaste (Verschieben), ESC (Abbrechen)
        </Typography>
      </Box>
    </Box>
  );
};

export default WhiteboardPage;

