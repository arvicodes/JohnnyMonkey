import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Tooltip,
  Chip,
  Slider,
  FormControl,
  Select,
  MenuItem,
  ToggleButton,
  TextField
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  FlipToFront as FrontIcon,
  FlipToBack as BackIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  GridOn as GridIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Layers as LayersIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';
import useWhiteboardPerformance from '../hooks/useWhiteboardPerformance';

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
  layer?: number;
  visible?: boolean;
}

interface AdvancedWhiteboardProps {
  groupId?: string;
  initialObjects?: DrawObject[];
  onSave?: (objects: DrawObject[]) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf') => void;
  enableCollaboration?: boolean;
  enableLayers?: boolean;
  enableTemplates?: boolean;
  enablePerformanceMode?: boolean;
}

const AdvancedWhiteboard: React.FC<AdvancedWhiteboardProps> = ({
  groupId,
  initialObjects = [],
  onSave,
  onExport,
  enableCollaboration = false,
  enableLayers = true,
  enableTemplates = true,
  enablePerformanceMode = true
}) => {
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
  const [objects, setObjects] = useState<DrawObject[]>(
    initialObjects.map(obj => ({
      ...obj,
      layer: obj.layer || 0,
      visible: obj.visible !== false
    }))
  );
  const [redoStack, setRedoStack] = useState<DrawObject[]>([]);
  const [currentObject, setCurrentObject] = useState<DrawObject | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<DrawObject[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showLayers, setShowLayers] = useState(false);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [layers, setLayers] = useState<Array<{ id: number; name: string; visible: boolean; locked: boolean }>>([
    { id: 0, name: 'Ebene 1', visible: true, locked: false }
  ]);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);

  // Performance optimization
  const {
    visibleObjects,
    processObjects,
    getCachedObject,
    setCachedObject,
    getLazyObjects,
    clearCache,
    getPerformanceMetrics
  } = useWhiteboardPerformance(objects, {
    enableLazyLoading: enablePerformanceMode,
    enableObjectCaching: enablePerformanceMode,
    enableViewportCulling: enablePerformanceMode,
    maxObjectsPerFrame: 100,
    debounceMs: 16
  });

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 100;
      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Redraw canvas when objects change
  useEffect(() => {
    redrawCanvas();
  }, [objects, selectedObjects, currentObject, showGrid, zoom, panOffset, layers]);

  // Redraw canvas with performance optimizations
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx);
    }

    // Draw objects with performance optimizations
    const objectsToDraw = enablePerformanceMode ? getLazyObjects() : visibleObjects;
    objectsToDraw.forEach(obj => {
      if (obj.visible !== false && layers.find(l => l.id === obj.layer)?.visible !== false) {
        drawObject(ctx, obj);
      }
    });

    // Draw selection handles
    selectedObjects.forEach(obj => {
      if (obj.visible !== false) {
        drawSelectionHandles(ctx, obj);
      }
    });

    // Draw current object
    if (currentObject) {
      drawObject(ctx, currentObject);
    }

    ctx.restore();
  }, [visibleObjects, selectedObjects, currentObject, showGrid, zoom, panOffset, enablePerformanceMode, getLazyObjects, layers]);

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

  const drawObject = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    // Check cache first
    const cached = getCachedObject(obj);
    if (cached) {
      ctx.putImageData(cached, obj.x, obj.y);
      return;
    }

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

    // Apply line style
    switch (obj.lineStyle) {
      case 'dashed':
        ctx.setLineDash([10, 5]);
        break;
      case 'dotted':
        ctx.setLineDash([2, 3]);
        break;
      default:
        ctx.setLineDash([]);
    }

    // Draw based on tool type
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

      case 'text':
        if (obj.text) {
          ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${obj.fontSize || 24}px ${obj.fontFamily || 'Arial'}`;
          ctx.fillStyle = obj.strokeColor;
          ctx.fillText(obj.text, obj.x, obj.y);
        }
        break;
    }
    
    ctx.restore();

    // Cache complex objects
    if (enablePerformanceMode && ['rectangle', 'circle', 'text'].includes(obj.tool)) {
      const imageData = ctx.getImageData(obj.x, obj.y, obj.width || 100, obj.height || 100);
      setCachedObject(obj, imageData);
    }
  };

  const getObjectBounds = (obj: DrawObject) => {
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

    const width = Math.max(20, maxX - minX);
    const height = Math.max(20, maxY - minY);

    return {
      x: minX - 5,
      y: minY - 5,
      width: width + 10,
      height: height + 10
    };
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, obj: DrawObject) => {
    const bounds = getObjectBounds(obj);
    
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    
    const handleSize = 8;
    const cornerHandles = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height }
    ];
    
    ctx.fillStyle = '#2196f3';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    cornerHandles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  };

  // Layer management
  const addLayer = () => {
    const newLayer = {
      id: Math.max(...layers.map(l => l.id)) + 1,
      name: `Ebene ${layers.length + 1}`,
      visible: true,
      locked: false
    };
    setLayers([...layers, newLayer]);
  };

  const toggleLayerVisibility = (layerId: number) => {
    setLayers(layers.map(l => 
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  const toggleLayerLock = (layerId: number) => {
    setLayers(layers.map(l => 
      l.id === layerId ? { ...l, locked: !l.locked } : l
    ));
  };

  // Mouse event handlers
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
    
    if (e.button === 1) { // Middle mouse button
      setIsPanning(true);
      setPanStart({ x, y });
      return;
    }

    if (tool === 'select') {
      // Handle selection logic here
      return;
    }

    setIsDrawing(true);
    const newObj: DrawObject = {
      id: Date.now().toString(),
      tool,
      strokeColor,
      fillColor,
      lineWidth,
      opacity,
      lineStyle,
      points: ['brush', 'pen', 'marker', 'eraser', 'freeform', 'highlighter'].includes(tool) ? [{ x, y }] : undefined,
      x,
      y,
      width: ['circle', 'rectangle', 'triangle'].includes(tool) ? 0 : undefined,
      height: ['circle', 'rectangle', 'triangle'].includes(tool) ? 0 : undefined,
      layer: currentLayer,
      visible: true
    };

    setCurrentObject(newObj);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (isPanning) {
      const deltaX = x - panStart.x;
      const deltaY = y - panStart.y;
      setPanOffset({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY
      });
      setPanStart({ x, y });
      return;
    }
    
    if (!isDrawing || !currentObject) return;

    if (['brush', 'pen', 'marker', 'eraser', 'freeform', 'highlighter'].includes(tool)) {
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
    
    if (currentObject) {
      setObjects([...objects, currentObject]);
      setCurrentObject(null);
      setRedoStack([]);
    }
  };

  // Performance metrics
  const metrics = getPerformanceMetrics();

  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
      {/* Advanced Toolbar */}
      <Paper elevation={3} sx={{ borderRadius: 0, borderBottom: '3px solid #1976d2' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: '#f5f5f5' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', minWidth: 60 }}>
            Werkzeuge
          </Typography>
          
          {/* Tool buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[
              { value: 'select', icon: '✋', label: 'Auswählen' },
              { value: 'pen', icon: '🖊️', label: 'Stift' },
              { value: 'brush', icon: '🖌️', label: 'Pinsel' },
              { value: 'highlighter', icon: '🖍️', label: 'Textmarker' },
              { value: 'rectangle', icon: '▭', label: 'Rechteck' },
              { value: 'circle', icon: '⭕', label: 'Kreis' },
              { value: 'text', icon: 'A', label: 'Text' },
              { value: 'eraser', icon: '🧹', label: 'Radieren' }
            ].map(t => (
              <Tooltip key={t.value} title={t.label}>
                <Box
                  onClick={() => setTool(t.value as Tool)}
                  sx={{
                    px: 1.2,
                    py: 0.6,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: tool === t.value ? '#1976d2' : 'white',
                    color: tool === t.value ? 'white' : '#333',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    border: '2px solid',
                    borderColor: tool === t.value ? '#1565c0' : '#e0e0e0',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: tool === t.value ? '#1565c0' : '#f5f5f5',
                      transform: 'translateY(-2px)',
                      boxShadow: 1
                    }
                  }}
                >
                  {t.icon}
                </Box>
              </Tooltip>
            ))}
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Advanced Controls */}
          {enableLayers && (
            <Tooltip title="Ebenen">
              <IconButton onClick={() => setShowLayers(true)} size="small">
                <LayersIcon />
              </IconButton>
            </Tooltip>
          )}

          {enablePerformanceMode && (
            <Tooltip title="Performance-Metriken">
              <IconButton onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)} size="small">
                <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>⚡</Typography>
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Raster ein/aus">
            <IconButton onClick={() => setShowGrid(!showGrid)} size="small" color={showGrid ? 'primary' : 'default'}>
              <GridIcon />
            </IconButton>
          </Tooltip>

          <IconButton onClick={() => window.close()} size="small" aria-label="Fenster schließen">
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
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
          style={{
            cursor: isPanning ? 'grabbing' : 'default',
            backgroundColor: '#ffffff'
          }}
        />
      </Box>

      {/* Performance Metrics */}
      {showPerformanceMetrics && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            zIndex: 1500,
            p: 2,
            minWidth: 200,
            boxShadow: 5,
            borderRadius: 2
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Performance-Metriken
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption">Objekte: {metrics.totalObjects}</Typography>
            <Typography variant="caption">Sichtbar: {metrics.visibleObjects}</Typography>
            <Typography variant="caption">Gecacht: {metrics.cachedObjects}</Typography>
            <Typography variant="caption">Speicher: {Math.round(metrics.memoryUsage / 1024)}KB</Typography>
          </Box>
        </Paper>
      )}

      {/* Layers Dialog */}
      <Dialog open={showLayers} onClose={() => setShowLayers(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={dialogCloseTitleSx}>
          Ebenen verwalten
          <DialogCloseIconButton onClose={() => setShowLayers(false)} />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            {layers.map(layer => (
              <Box key={layer.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  size="small"
                  onClick={() => toggleLayerVisibility(layer.id)}
                  color={layer.visible ? 'primary' : 'default'}
                >
                  {layer.visible ? '👁️' : '🙈'}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => toggleLayerLock(layer.id)}
                  color={layer.locked ? 'error' : 'default'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </IconButton>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {layer.name}
                </Typography>
                <Chip
                  label={layer.id}
                  size="small"
                  color={currentLayer === layer.id ? 'primary' : 'default'}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={addLayer}>Neue Ebene</Button>
          <Button onClick={() => setShowLayers(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedWhiteboard;
