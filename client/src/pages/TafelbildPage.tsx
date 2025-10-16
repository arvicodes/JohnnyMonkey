import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Paper,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Badge,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  School as SchoolIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  GridOn as GridIcon,
  Brush as BrushIcon,
  Edit as EditIcon,
  TextFields as TextIcon,
  CropFree as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  ChangeHistory as TriangleIcon,
  ArrowForward as ArrowIcon,
  Image as ImageIcon,
  Clear as EraserIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
  Menu as MenuIcon,
  Note as NoteIcon,
  Description as DescriptionIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  PanTool as PanIcon,
  SelectAll as SelectIcon,
  Palette as PaletteIcon,
  Tune as TuneIcon,
  ContentCopy as CopyIcon,
  FlipToFront as FrontIcon,
  FlipToBack as BackIcon,
  RotateLeft as RotateIcon,
  OpenWith as ResizeIcon,
  ColorLens as ColorLensIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon
} from '@mui/icons-material';

type NotizTool = 'pen' | 'highlighter' | 'text' | 'eraser' | 'select' | 'pan' | 'rectangle' | 'circle' | 'arrow';
type PaperType = 'blank' | 'lined' | 'grid' | 'dotted';

interface NotizObject {
  id: string;
  tool: NotizTool;
  strokeColor: string;
  fillColor?: string;
  lineWidth: number;
  opacity: number;
  points?: Array<{ x: number; y: number; pressure?: number }>;
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
  rotation?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isLocked?: boolean;
  zIndex?: number;
}

interface NotizPage {
  id: string;
  objects: NotizObject[];
  paperType: PaperType;
}

const TafelbildPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State Management
  const [tool, setTool] = useState<NotizTool>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState('normal');
  const [fontStyle, setFontStyle] = useState('normal');
  const [textDecoration, setTextDecoration] = useState('none');
  
  // Page Management
  const [pages, setPages] = useState<NotizPage[]>([
    {
      id: '1',
      objects: [],
      paperType: 'blank'
    }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [paperType, setPaperType] = useState<PaperType>('blank');
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentObject, setCurrentObject] = useState<NotizObject | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<NotizObject[]>([]);
  const [redoStack, setRedoStack] = useState<NotizObject[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  // UI State
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [filename, setFilename] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [groupId, setGroupId] = useState<string>('');
  
  // Zoom and Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Object editing
  const [isRotating, setIsRotating] = useState(false);

  const currentPage = pages[currentPageIndex];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('groupId');
    if (gid) setGroupId(gid);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      // Canvas nutzt den ganzen verfügbaren Platz
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [currentPage, selectedObjects, zoom, pan, paperType]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Draw paper background
    drawPaperBackground(ctx);

    // Draw objects (sorted by zIndex)
    const sortedObjects = [...currentPage.objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    sortedObjects.forEach(obj => {
      drawNotizObject(ctx, obj);
    });

    // Draw current object being drawn
    if (currentObject) {
      drawNotizObject(ctx, currentObject);
    }

    // Draw selection handles
    selectedObjects.forEach(obj => {
      drawSelectionHandles(ctx, obj);
    });

    ctx.restore();
  }, [currentPage, currentObject, selectedObjects, zoom, pan, paperType]);

  const drawPaperBackground = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // White paper background fills entire canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Paper shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(2, 2, canvasWidth, canvasHeight);
    
    // White paper on top
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Paper border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // Draw paper pattern based on type
    switch (paperType) {
      case 'lined':
        drawLinedPaper(ctx, canvasWidth, canvasHeight);
        break;
      case 'grid':
        drawGridPaper(ctx, canvasWidth, canvasHeight);
        break;
      case 'dotted':
        drawDottedPaper(ctx, canvasWidth, canvasHeight);
        break;
    }
  };

  const drawLinedPaper = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    
    const lineSpacing = 20;
    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawGridPaper = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    
    const gridSize = 20;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawDottedPaper = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#e8e8e8';
    
    const dotSpacing = 20;
    const dotSize = 1;
    
    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };


  const drawNotizObject = (ctx: CanvasRenderingContext2D, obj: NotizObject) => {
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

    switch (obj.tool) {
      case 'pen':
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
        }
        break;

      case 'text':
        if (obj.text) {
          ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${obj.fontSize || 16}px ${obj.fontFamily || 'Arial'}`;
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

      case 'rectangle':
        if (obj.width !== undefined && obj.height !== undefined) {
          if (obj.fillColor && obj.fillColor !== 'transparent') {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          }
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
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

      case 'arrow':
        if (obj.points && obj.points.length >= 2) {
          const start = obj.points[0];
          const end = obj.points[obj.points.length - 1];
          
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 20;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            end.y - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            end.y - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
        break;

      case 'eraser':
        if (obj.points && obj.points.length > 0) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = obj.lineWidth * 2;
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          obj.points.forEach(point => ctx.lineTo(point.x, point.y));
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        break;
    }
    
    ctx.restore();
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, obj: NotizObject) => {
    const bounds = getObjectBounds(obj);
    
    // Selection border
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    
    // All handles (corners + sides)
    const handleSize = 12;
    const handles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' },
      // Side handles
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'n' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'e' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 's' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'w' }
    ];
    
    ctx.fillStyle = '#2196f3';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
    });
  };

  const getObjectBounds = (obj: NotizObject) => {
    let minX = obj.x;
    let minY = obj.y;
    let maxX = obj.x + (obj.width || 0);
    let maxY = obj.y + (obj.height || 0);

    if (obj.points && obj.points.length > 0) {
      obj.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }

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

    const width = Math.max(20, maxX - minX);
    const height = Math.max(20, maxY - minY);

    return {
      x: minX - 5,
      y: minY - 5,
      width: width + 10,
      height: height + 10
    };
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom - pan.x,
      y: (e.clientY - rect.top) / zoom - pan.y
    };
  };

  const getHandleAtPoint = (x: number, y: number, obj: NotizObject): string | null => {
    const bounds = getObjectBounds(obj);
    const handleSize = 12; // Größere Handles für bessere Bedienbarkeit
    
    // Corner handles
    const handles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' },
      // Side handles
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'n' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'e' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 's' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'w' }
    ];
    
    for (const handle of handles) {
      const distance = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (distance < handleSize) {
        console.log('Handle detected:', handle.name, 'at', x, y);
        return handle.name;
      }
    }
    
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }

    if (tool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'select') {
      // Check if clicking on a handle
      for (const obj of selectedObjects) {
        const handle = getHandleAtPoint(x, y, obj);
        if (handle) {
          console.log('Handle clicked:', handle);
          setResizeHandle(handle);
          setIsResizing(true);
          setDragStart({ x, y });
          return;
        }
      }

      // Check if clicking on an object
      const clickedObject = [...currentPage.objects].reverse().find(obj => isPointInObject(x, y, obj));
      if (clickedObject) {
        console.log('Object clicked:', clickedObject.id);
        // Check if clicking on already selected object
        if (selectedObjects.some(obj => obj.id === clickedObject.id)) {
          console.log('Starting drag for selected object');
          // Start dragging
          setIsDragging(true);
          setDragStart({ x, y });
        } else {
          console.log('Selecting new object');
          setSelectedObjects([clickedObject]);
        }
        setShowPropertiesPanel(true);
        return; // WICHTIG: Return hier hinzufügen!
      } else {
        console.log('No object clicked, clearing selection');
        setSelectedObjects([]);
        setShowPropertiesPanel(false);
      }
      return;
    }

    setIsDrawing(true);
    
    const newObj: NotizObject = {
      id: Date.now().toString(),
      tool: tool === 'eraser' ? 'pen' : tool,
      strokeColor: tool === 'eraser' ? '#ffffff' : strokeColor,
      fillColor: tool === 'eraser' ? 'transparent' : fillColor,
      lineWidth: tool === 'eraser' ? lineWidth * 2 : lineWidth,
      opacity: tool === 'highlighter' ? 0.3 : opacity,
      points: ['pen', 'highlighter', 'eraser', 'arrow'].includes(tool) ? [{ x, y }] : undefined,
      x,
      y,
      width: ['rectangle', 'circle'].includes(tool) ? 0 : undefined,
      height: ['rectangle', 'circle'].includes(tool) ? 0 : undefined,
      zIndex: currentPage.objects.length
    };

    setCurrentObject(newObj);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && tool === 'pan') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPan(prev => ({
        x: prev.x + deltaX / zoom,
        y: prev.y + deltaY / zoom
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDragging && selectedObjects.length > 0 && dragStart) {
      const { x, y } = getCanvasCoordinates(e);
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      console.log('Dragging:', deltaX, deltaY);
      
      // Update all selected objects
      const updatedObjects = currentPage.objects.map(obj => {
        if (selectedObjects.some(selected => selected.id === obj.id)) {
          // For pen/highlighter objects, move all points
          if (obj.points && obj.points.length > 0) {
            const movedPoints = obj.points.map(point => ({
              x: point.x + deltaX,
              y: point.y + deltaY
            }));
            return { ...obj, points: movedPoints };
          } else {
            // For other objects, move position
            return {
              ...obj,
              x: obj.x + deltaX,
              y: obj.y + deltaY
            };
          }
        }
        return obj;
      });
      
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = { ...updatedPages[currentPageIndex], objects: updatedObjects };
      setPages(updatedPages);
      
      // Update selected objects state
      const updatedSelected = selectedObjects.map(obj => {
        if (obj.points && obj.points.length > 0) {
          const movedPoints = obj.points.map(point => ({
            x: point.x + deltaX,
            y: point.y + deltaY
          }));
          return { ...obj, points: movedPoints };
        } else {
          return {
            ...obj,
            x: obj.x + deltaX,
            y: obj.y + deltaY
          };
        }
      });
      setSelectedObjects(updatedSelected);
      
      setDragStart({ x, y });
      return;
    }

    if (isResizing && selectedObjects.length > 0 && dragStart) {
      const { x, y } = getCanvasCoordinates(e);
      const selected = selectedObjects[0];
      const bounds = getObjectBounds(selected);
      
      console.log('Resizing with handle:', resizeHandle, 'delta:', x - dragStart.x, y - dragStart.y);
      
      // Calculate new bounds based on handle
      let newX = bounds.x;
      let newY = bounds.y;
      let newWidth = bounds.width;
      let newHeight = bounds.height;
      
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      switch (resizeHandle) {
        case 'nw': // Top-left
          newX = bounds.x + deltaX;
          newY = bounds.y + deltaY;
          newWidth = Math.max(20, bounds.width - deltaX);
          newHeight = Math.max(20, bounds.height - deltaY);
          break;
        case 'ne': // Top-right
          newY = bounds.y + deltaY;
          newWidth = Math.max(20, bounds.width + deltaX);
          newHeight = Math.max(20, bounds.height - deltaY);
          break;
        case 'se': // Bottom-right
          newWidth = Math.max(20, bounds.width + deltaX);
          newHeight = Math.max(20, bounds.height + deltaY);
          break;
        case 'sw': // Bottom-left
          newX = bounds.x + deltaX;
          newWidth = Math.max(20, bounds.width - deltaX);
          newHeight = Math.max(20, bounds.height + deltaY);
          break;
        case 'n': // Top
          newY = bounds.y + deltaY;
          newHeight = Math.max(20, bounds.height - deltaY);
          break;
        case 'e': // Right
          newWidth = Math.max(20, bounds.width + deltaX);
          break;
        case 's': // Bottom
          newHeight = Math.max(20, bounds.height + deltaY);
          break;
        case 'w': // Left
          newX = bounds.x + deltaX;
          newWidth = Math.max(20, bounds.width - deltaX);
          break;
      }
      
      // Update the object
      const updatedObjects = currentPage.objects.map(obj => {
        if (obj.id === selected.id) {
          // For pen/highlighter objects, we need to scale the points
          if (obj.points && obj.points.length > 0) {
            const scaleX = newWidth / bounds.width;
            const scaleY = newHeight / bounds.height;
            const offsetX = newX - bounds.x;
            const offsetY = newY - bounds.y;
            
            const scaledPoints = obj.points.map(point => ({
              x: (point.x - bounds.x) * scaleX + newX,
              y: (point.y - bounds.y) * scaleY + newY
            }));
            
            return { ...obj, points: scaledPoints };
          } else {
            // For other objects, update position and size
            return { ...obj, x: newX, y: newY, width: newWidth, height: newHeight };
          }
        }
        return obj;
      });
      
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = { ...updatedPages[currentPageIndex], objects: updatedObjects };
      setPages(updatedPages);
      
      // Update selected objects
      const updatedSelected = selectedObjects.map(obj => {
        if (obj.id === selected.id) {
          if (obj.points && obj.points.length > 0) {
            const scaleX = newWidth / bounds.width;
            const scaleY = newHeight / bounds.height;
            const offsetX = newX - bounds.x;
            const offsetY = newY - bounds.y;
            
            const scaledPoints = obj.points.map(point => ({
              x: (point.x - bounds.x) * scaleX + newX,
              y: (point.y - bounds.y) * scaleY + newY
            }));
            
            return { ...obj, points: scaledPoints };
          } else {
            return { ...obj, x: newX, y: newY, width: newWidth, height: newHeight };
          }
        }
        return obj;
      });
      
      setSelectedObjects(updatedSelected);
      setDragStart({ x, y }); // Update drag start for continuous resizing
      return;
    }

    if (!isDrawing || !currentObject) return;

    const { x, y } = getCanvasCoordinates(e);

    if (['pen', 'highlighter', 'eraser', 'arrow'].includes(tool)) {
      setCurrentObject({
        ...currentObject,
        points: [...(currentObject.points || []), { x, y }]
      });
    } else if (['rectangle', 'circle'].includes(tool)) {
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

    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      return;
    }

    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setDragStart(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentObject) {
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        objects: [...updatedPages[currentPageIndex].objects, currentObject]
      };
      setPages(updatedPages);
      setCurrentObject(null);
      setRedoStack([]);
    }
  };

  const isPointInObject = (x: number, y: number, obj: NotizObject): boolean => {
    if (obj.points && obj.points.length > 0) {
      const threshold = (obj.lineWidth || 5) + 10;
      
      // Check if point is near any individual point
      for (let i = 0; i < obj.points.length; i++) {
        const point = obj.points[i];
        const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        if (distance <= threshold) return true;
      }
      
      // Check if point is near any line segment
      for (let i = 0; i < obj.points.length - 1; i++) {
        const p1 = obj.points[i];
        const p2 = obj.points[i + 1];
        const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (distance <= threshold) return true;
      }
    }
    
    if (obj.width !== undefined && obj.height !== undefined) {
      return x >= obj.x && x <= obj.x + obj.width && y >= obj.y && y <= obj.y + obj.height;
    }
    
    return false;
  };

  const distanceToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      return;
    }

    const newObj: NotizObject = {
      id: Date.now().toString(),
      tool: 'text',
      strokeColor,
      lineWidth,
      opacity,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      textDecoration,
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      zIndex: currentPage.objects.length
    };

    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      objects: [...updatedPages[currentPageIndex].objects, newObj]
    };
    setPages(updatedPages);
    setTextInput('');
    setShowTextInput(false);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (currentPage.objects.length === 0) return;
    const lastObj = currentPage.objects[currentPage.objects.length - 1];
    setRedoStack([...redoStack, lastObj]);
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      objects: updatedPages[currentPageIndex].objects.slice(0, -1)
    };
    setPages(updatedPages);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const objToRedo = redoStack[redoStack.length - 1];
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      objects: [...updatedPages[currentPageIndex].objects, objToRedo]
    };
    setPages(updatedPages);
    setRedoStack(redoStack.slice(0, -1));
  };

  const handleAddPage = () => {
    const newPage: NotizPage = {
      id: (pages.length + 1).toString(),
      objects: [],
      paperType: paperType
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const handleDeletePage = () => {
    if (pages.length <= 1) return;
    const updatedPages = pages.filter((_, index) => index !== currentPageIndex);
    setPages(updatedPages);
    setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const updateSelectedObject = (updates: Partial<NotizObject>) => {
    if (selectedObjects.length === 0) return;
    const selected = selectedObjects[0];
    const updatedObject = { ...selected, ...updates };
    
    const updatedObjects = currentPage.objects.map(obj => 
      obj.id === selected.id ? updatedObject : obj
    );
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = { ...updatedPages[currentPageIndex], objects: updatedObjects };
    setPages(updatedPages);
    
    setSelectedObjects([updatedObject]);
  };

  const handleDeleteSelected = () => {
    if (selectedObjects.length === 0) return;
    const selectedIds = selectedObjects.map(o => o.id);
    const updatedObjects = currentPage.objects.filter(obj => !selectedIds.includes(obj.id));
    
    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = { ...updatedPages[currentPageIndex], objects: updatedObjects };
    setPages(updatedPages);
    
    setSelectedObjects([]);
    setShowPropertiesPanel(false);
  };

  const handleMoveLayer = (direction: 'front' | 'back') => {
    if (selectedObjects.length === 0) return;
    
    const updatedPages = [...pages];
    const currentPageObjects = [...currentPage.objects];
    
    selectedObjects.forEach(selectedObj => {
      const objIndex = currentPageObjects.findIndex(obj => obj.id === selectedObj.id);
      if (objIndex !== -1) {
        const [movedObj] = currentPageObjects.splice(objIndex, 1);
        
        if (direction === 'front') {
          currentPageObjects.push(movedObj);
        } else {
          currentPageObjects.unshift(movedObj);
        }
      }
    });
    
    updatedPages[currentPageIndex] = { ...updatedPages[currentPageIndex], objects: currentPageObjects };
    setPages(updatedPages);
    redrawCanvas();
  };

  const presetColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#ffa500', '#800080', '#008000', '#808080'
  ];

  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f2f2f7' }}>
      {/* Compact Top Toolbar */}
      <Box sx={{ 
        height: 32, 
        bgcolor: '#ffffff', 
        borderBottom: '0.5px solid #c6c6c8',
        display: 'flex',
        alignItems: 'center',
        px: 1,
        justifyContent: 'space-between'
      }}>
        {/* Left side - Title */}
        <Typography variant="body2" sx={{ color: '#000000', fontWeight: 600, fontSize: 14 }}>
          Notiz
        </Typography>
        
        {/* Right side - Actions */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={handleUndo} disabled={currentPage.objects.length === 0} sx={{ width: 24, height: 24 }}>
            <UndoIcon sx={{ fontSize: 14, color: currentPage.objects.length === 0 ? '#c7c7cc' : '#007aff' }} />
          </IconButton>
          <IconButton size="small" onClick={handleRedo} disabled={redoStack.length === 0} sx={{ width: 24, height: 24 }}>
            <RedoIcon sx={{ fontSize: 14, color: redoStack.length === 0 ? '#c7c7cc' : '#007aff' }} />
          </IconButton>
          <IconButton size="small" onClick={() => setShowSaveDialog(true)} sx={{ width: 24, height: 24 }}>
            <SaveIcon sx={{ fontSize: 14, color: '#007aff' }} />
          </IconButton>
        </Box>
      </Box>

      {/* Compact Bottom Toolbar */}
      <Box sx={{ 
        height: 48, 
        bgcolor: '#ffffff', 
        borderTop: '0.5px solid #c6c6c8',
        display: 'flex',
        alignItems: 'center',
        px: 1,
        gap: 1
      }}>
        {/* Compact Tools */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {[
            { value: 'pen', icon: <BrushIcon />, label: 'Stift' },
            { value: 'highlighter', icon: <EditIcon />, label: 'Highlighter' },
            { value: 'text', icon: <TextIcon />, label: 'Text' },
            { value: 'eraser', icon: <EraserIcon />, label: 'Radierer' },
            { value: 'select', icon: <SelectIcon />, label: 'Auswählen' }
          ].map(t => (
            <IconButton
              key={t.value}
              onClick={() => setTool(t.value as NotizTool)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: tool === t.value ? '#007aff' : 'transparent',
                color: tool === t.value ? '#ffffff' : '#000000',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: tool === t.value ? '#0056b3' : '#f2f2f7'
                }
              }}
            >
              {React.cloneElement(t.icon, { sx: { fontSize: 14 } })}
            </IconButton>
          ))}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ height: 24 }} />

        {/* Compact Colors */}
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          {presetColors.slice(0, 6).map(color => (
            <Box
              key={color}
              onClick={() => setStrokeColor(color)}
              sx={{
                width: 20,
                height: 20,
                bgcolor: color,
                border: strokeColor === color ? '1px solid #000000' : '0.5px solid #c6c6c8',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { transform: 'scale(1.1)' }
              }}
            />
          ))}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ height: 24 }} />

        {/* Compact Line Width */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 60 }}>
          <Typography variant="caption" sx={{ color: '#000000', fontSize: 10, minWidth: 20 }}>
            {lineWidth}
          </Typography>
          <Slider
            value={lineWidth}
            onChange={(_, v) => setLineWidth(v as number)}
            min={1}
            max={20}
            size="small"
            sx={{ 
              width: 40, 
              color: '#007aff',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                bgcolor: '#007aff'
              }
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Compact Zoom Controls */}
        <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
          <IconButton size="small" onClick={handleZoomOut} sx={{ width: 20, height: 20 }}>
            <ZoomOutIcon sx={{ fontSize: 12, color: '#000000' }} />
          </IconButton>
          <Typography variant="caption" sx={{ color: '#000000', fontSize: 10, minWidth: 30, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <IconButton size="small" onClick={handleZoomIn} sx={{ width: 20, height: 20 }}>
            <ZoomInIcon sx={{ fontSize: 12, color: '#000000' }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Compact Sidebar */}
        <Box sx={{ 
          width: 160, 
          bgcolor: '#f2f2f7', 
          borderRight: '0.5px solid #c6c6c8',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Compact Sidebar Header */}
          <Box sx={{ 
            height: 28, 
            bgcolor: '#ffffff', 
            borderBottom: '0.5px solid #c6c6c8',
            display: 'flex',
            alignItems: 'center',
            px: 1,
            justifyContent: 'space-between'
          }}>
            <Typography variant="caption" sx={{ color: '#000000', fontWeight: 600, fontSize: 12 }}>
              Seiten
            </Typography>
            <IconButton size="small" onClick={handleAddPage} sx={{ width: 20, height: 20 }}>
              <AddIcon sx={{ fontSize: 12, color: '#007aff' }} />
            </IconButton>
          </Box>

          {/* Compact Pages List */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 0.5 }}>
            {pages.map((page, index) => (
              <Box
                key={page.id}
                onClick={() => setCurrentPageIndex(index)}
                sx={{
                  p: 1,
                  mb: 0.5,
                  bgcolor: index === currentPageIndex ? '#007aff' : '#ffffff',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: '0.5px solid #c6c6c8',
                  '&:hover': {
                    bgcolor: index === currentPageIndex ? '#0056b3' : '#f2f2f7'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ 
                    width: 4, 
                    height: 4, 
                    bgcolor: index === currentPageIndex ? '#ffffff' : '#007aff',
                    borderRadius: '50%'
                  }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: index === currentPageIndex ? '#ffffff' : '#000000',
                      fontWeight: index === currentPageIndex ? 600 : 400,
                      fontSize: 11
                    }}
                  >
                    S{index + 1}
                  </Typography>
                </Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: index === currentPageIndex ? '#ffffff' : '#8e8e93',
                    fontSize: 9,
                    ml: 1.5
                  }}
                >
                  {page.objects.length}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Compact Paper Settings */}
          <Box sx={{ 
            p: 1, 
            bgcolor: '#ffffff', 
            borderTop: '0.5px solid #c6c6c8'
          }}>
            <Typography variant="caption" sx={{ color: '#000000', fontWeight: 600, fontSize: 10, mb: 0.5 }}>
              Papier
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 0.25, mb: 1, flexWrap: 'wrap' }}>
              {[
                { value: 'blank', label: 'Blank' },
                { value: 'lined', label: 'Liniert' },
                { value: 'grid', label: 'Kariert' },
                { value: 'dotted', label: 'Gepunktet' }
              ].map(p => (
                <Button
                  key={p.value}
                  variant={paperType === p.value ? 'contained' : 'outlined'}
                  onClick={() => setPaperType(p.value as PaperType)}
                  size="small"
                  sx={{
                    minWidth: 'auto',
                    px: 0.5,
                    py: 0.25,
                    fontSize: 8,
                    height: 16,
                    bgcolor: paperType === p.value ? '#007aff' : 'transparent',
                    color: paperType === p.value ? '#ffffff' : '#000000',
                    borderColor: '#c6c6c8',
                    '&:hover': {
                      bgcolor: paperType === p.value ? '#0056b3' : '#f2f2f7'
                    }
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Main Content - Full Width */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', bgcolor: '#f2f2f7' }}>
          <Box
            ref={containerRef}
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'stretch',
              alignItems: 'stretch',
              cursor: tool === 'pan' ? 'grab' : 
                      tool === 'select' ? 'default' : 
                      'crosshair'
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                borderRadius: '4px',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </Box>
        </Box>

        {/* Compact Properties Panel */}
        {showPropertiesPanel && selectedObjects.length > 0 && (
          <Box sx={{ 
            width: 160, 
            bgcolor: '#f2f2f7', 
            borderLeft: '0.5px solid #c6c6c8',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Properties Header */}
            <Box sx={{ 
              height: 24, 
              bgcolor: '#ffffff', 
              borderBottom: '0.5px solid #c6c6c8',
              display: 'flex',
              alignItems: 'center',
              px: 1,
              justifyContent: 'space-between'
            }}>
              <Typography variant="caption" sx={{ color: '#000000', fontWeight: 600, fontSize: 10 }}>
                Eigenschaften
              </Typography>
              <IconButton size="small" onClick={() => setShowPropertiesPanel(false)} sx={{ width: 18, height: 18 }}>
                <CloseIcon sx={{ fontSize: 12, color: '#8e8e93' }} />
              </IconButton>
            </Box>

            {/* Properties Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              {selectedObjects[0] && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {/* Colors */}
                  <Box>
                    <Typography variant="caption" sx={{ color: '#000000', fontWeight: 600, fontSize: 9, mb: 0.5, display: 'block' }}>
                      Farbe
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {presetColors.slice(0, 8).map(color => (
                        <Box
                          key={color}
                          onClick={() => updateSelectedObject({ strokeColor: color })}
                          sx={{
                            width: 16,
                            height: 16,
                            bgcolor: color,
                            border: selectedObjects[0].strokeColor === color ? '2px solid #000000' : '1px solid #c6c6c8',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'scale(1.1)' }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Line Width */}
                  <Box>
                    <Typography variant="caption" sx={{ color: '#000000', fontWeight: 600, fontSize: 9, mb: 0.5, display: 'block' }}>
                      Stärke: {selectedObjects[0].lineWidth}
                    </Typography>
                    <Slider
                      value={selectedObjects[0].lineWidth}
                      onChange={(_, v) => updateSelectedObject({ lineWidth: v as number })}
                      min={1}
                      max={20}
                      sx={{ 
                        color: '#007aff',
                        '& .MuiSlider-thumb': { width: 10, height: 10 },
                        '& .MuiSlider-track': { height: 2 },
                        '& .MuiSlider-rail': { height: 2 }
                      }}
                    />
                  </Box>

                  {/* Opacity */}
                  <Box>
                    <Typography variant="caption" sx={{ color: '#000000', fontWeight: 600, fontSize: 9, mb: 0.5, display: 'block' }}>
                      Transparenz: {Math.round(selectedObjects[0].opacity * 100)}%
                    </Typography>
                    <Slider
                      value={selectedObjects[0].opacity}
                      onChange={(_, v) => updateSelectedObject({ opacity: v as number })}
                      min={0.1}
                      max={1}
                      step={0.1}
                      sx={{ 
                        color: '#007aff',
                        '& .MuiSlider-thumb': { width: 10, height: 10 },
                        '& .MuiSlider-track': { height: 2 },
                        '& .MuiSlider-rail': { height: 2 }
                      }}
                    />
                  </Box>

                  {/* Text Properties */}
                  {selectedObjects[0].tool === 'text' && (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#000000', fontWeight: 600, fontSize: 9, mb: 0.5, display: 'block' }}>
                        Text bearbeiten
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        value={selectedObjects[0].text || ''}
                        onChange={(e) => updateSelectedObject({ text: e.target.value })}
                        size="small"
                        placeholder="Text eingeben..."
                        sx={{ 
                          mb: 0.5,
                          '& .MuiOutlinedInput-root': {
                            fontSize: 10,
                            '& .MuiInputBase-input': { py: 0.5 }
                          }
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                          <Select
                            value={selectedObjects[0].fontFamily || 'Arial'}
                            onChange={(e) => updateSelectedObject({ fontFamily: e.target.value })}
                            sx={{ fontSize: 10, height: 24 }}
                          >
                            <MenuItem value="Arial" sx={{ fontSize: 10 }}>Arial</MenuItem>
                            <MenuItem value="Times New Roman" sx={{ fontSize: 10 }}>Times</MenuItem>
                            <MenuItem value="Courier New" sx={{ fontSize: 10 }}>Courier</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          type="number"
                          value={selectedObjects[0].fontSize || 16}
                          onChange={(e) => updateSelectedObject({ fontSize: parseInt(e.target.value) })}
                          size="small"
                          sx={{ width: 50, '& .MuiInputBase-input': { fontSize: 10, height: 24 } }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    <IconButton
                      onClick={() => handleMoveLayer('back')}
                      size="small"
                      sx={{ width: 16, height: 16, p: 0 }}
                      title="Nach hinten"
                    >
                      <ArrowDownwardIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleMoveLayer('front')}
                      size="small"
                      sx={{ width: 16, height: 16, p: 0 }}
                      title="Nach vorne"
                    >
                      <ArrowUpwardIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                    <IconButton
                      onClick={handleDeleteSelected}
                      size="small"
                      sx={{ width: 16, height: 16, p: 0, color: '#ff3b30' }}
                      title="Löschen"
                    >
                      <DeleteIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Compact Text Input Dialog */}
      {showTextInput && (
        <Dialog 
          open={true} 
          onClose={() => setShowTextInput(false)} 
          maxWidth="xs" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              bgcolor: '#ffffff'
            }
          }}
        >
          <DialogTitle sx={{ 
            color: '#000000', 
            fontWeight: 600, 
            fontSize: 14,
            borderBottom: '0.5px solid #c6c6c8',
            py: 1
          }}>
            Text eingeben
          </DialogTitle>
          <DialogContent sx={{ p: 1.5 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              autoFocus
              placeholder="Text eingeben..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: 12,
                  borderRadius: 1
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 1.5, gap: 0.5 }}>
            <Button 
              onClick={() => setShowTextInput(false)}
              size="small"
              sx={{ 
                color: '#007aff',
                fontWeight: 600,
                fontSize: 12
              }}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleTextSubmit} 
              variant="contained"
              size="small"
              sx={{
                bgcolor: '#007aff',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: 1,
                px: 2,
                '&:hover': {
                  bgcolor: '#0056b3'
                }
              }}
            >
              Einfügen
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Compact Save Dialog */}
      <Dialog 
        open={showSaveDialog} 
        onClose={() => setShowSaveDialog(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: '#ffffff'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#000000', 
          fontWeight: 600, 
          fontSize: 14,
          borderBottom: '0.5px solid #c6c6c8',
          py: 1
        }}>
          Notiz speichern
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <TextField
            label="Dateiname"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            fullWidth
            size="small"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                fontSize: 12,
                borderRadius: 1
              }
            }}
            helperText="Wird automatisch mit 'N_' beginnen"
          />
        </DialogContent>
        <DialogActions sx={{ p: 1.5, gap: 0.5 }}>
          <Button 
            onClick={() => setShowSaveDialog(false)}
            size="small"
            sx={{ 
              color: '#007aff',
              fontWeight: 600,
              fontSize: 12
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={() => {
              alert(`Notiz "${filename}" würde gespeichert werden!`);
              window.close();
            }}
            variant="contained"
            size="small"
            disabled={!filename.trim()}
            sx={{
              bgcolor: '#34c759',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 1,
              px: 2,
              '&:hover': {
                bgcolor: '#30b04f'
              },
              '&:disabled': {
                bgcolor: '#c7c7cc',
                color: '#8e8e93'
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TafelbildPage;