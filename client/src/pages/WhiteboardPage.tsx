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
  KeyboardArrowUp as ForwardIcon,
  KeyboardArrowDown as BackwardIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  GridOn as GridIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

type Tool = 'brush' | 'pen' | 'marker' | 'text' | 'line' | 'circle' | 'rectangle' | 'triangle' | 'arrow' | 'polygon' | 'eraser' | 'image' | 'select' | 'freeform' | 'connector' | 'highlighter' | 'icon';

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
  endX?: number;
  endY?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  imageData?: string;
  rotation?: number;
  locked?: boolean;
  groupId?: string;
  iconType?: string;
  iconSize?: number;
}

interface DirectoryItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  depth?: number;
  children?: any[];
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
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string>('😀');
  const [iconSize, setIconSize] = useState(32);
  const [userRole, setUserRole] = useState<'teacher' | 'student'>('teacher'); // TODO: Get from auth context
  // Entfernt: saveFormat und showFormatSelector werden nicht mehr benötigt
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{start: {x: number, y: number}, end: {x: number, y: number}} | null>(null);
  const [showGroupControls, setShowGroupControls] = useState(false);
  const [showTableConfig, setShowTableConfig] = useState(false);
  const [tableConfig, setTableConfig] = useState({ rows: 4, cols: 3 });
  const [showTimelineConfig, setShowTimelineConfig] = useState(false);
  const [timelineConfig, setTimelineConfig] = useState({ points: 4, showAxis: true, showLabels: true });
  const [showVennConfig, setShowVennConfig] = useState(false);
  const [vennConfig, setVennConfig] = useState({ circles: 2, showLabels: true, showIntersection: true });
  const [showMindmapConfig, setShowMindmapConfig] = useState(false);
  const [mindmapConfig, setMindmapConfig] = useState({ branches: 4, showConnections: true, showSubBranches: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<DrawObject | null>(null);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 100, y: 100 });
  const textInputRef = useRef<HTMLInputElement>(null);

  // Neue Funktion: Änderungen direkt sichern
  const handleSaveChanges = async () => {
    if (!filename.trim()) {
      console.log('Filename is required');
      alert('Bitte geben Sie einen Dateinamen ein');
      return;
    }

    // Wenn kein currentPath gesetzt ist, verwende einen Standard-Pfad
    let savePath = currentPath;
    if (!savePath) {
      savePath = 'git-intern/Mathe/Klasse 7'; // Standard-Pfad für neue Dateien
      console.log('No current path set, using default path:', savePath);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const finalFilename = filename.startsWith('W_') ? filename : `W_${filename}`;
    
    // Ensure the path starts with 'git-intern/' for proper saving
    if (!savePath.startsWith('git-intern/')) {
      savePath = `git-intern/${savePath}`;
    }
    
    console.log('Saving changes with path:', savePath);
    console.log('Saving changes with filename:', finalFilename);
    
    // Erstelle Whiteboard-Daten
    const whiteboardData = {
      objects: objects,
      metadata: {
        created: new Date().toISOString(),
        version: '1.0',
        userRole: userRole,
        canvasSize: {
          width: canvas.width,
          height: canvas.height
        }
      }
    };
    
    const jsonData = JSON.stringify(whiteboardData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const fullFilename = finalFilename.endsWith('.wb') ? finalFilename : `${finalFilename}.wb`;
    
    const formData = new FormData();
    formData.append('file', blob, fullFilename);
    formData.append('targetPath', savePath);
    formData.append('format', 'editable');

    try {
      const response = await fetch('/api/file-system-paths/save-file', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        console.log('Änderungen erfolgreich gesichert!');
      } else {
        const error = await response.json();
        console.error('Fehler beim Sichern:', error.error);
        alert(`Fehler beim Sichern: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Fehler beim Sichern der Änderungen');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('groupId');
    if (gid) setGroupId(gid);
    
    // Check for loadFile parameter to load a whiteboard file
    const loadFile = params.get('loadFile');
    const filename = params.get('filename');
    if (loadFile && filename) {
      loadWhiteboardFile(loadFile, filename);
    }

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

  // Funktion um zu prüfen, ob ein Modal geöffnet ist
  const isModalOpen = () => {
    return showSaveDialog || 
           showTextInput || 
           showTableConfig || 
           showTimelineConfig || 
           showVennConfig || 
           showMindmapConfig || 
           showTemplates || 
           showIconPicker;
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
    console.log('⌨️ Key pressed:', e.key, 'Meta:', e.metaKey, 'Ctrl:', e.ctrlKey);
    
    // Wenn ein Modal geöffnet ist, keine Whiteboard-Shortcuts verarbeiten
    if (isModalOpen()) {
      console.log('⌨️ Modal is open, ignoring whiteboard shortcuts');
      return;
    }
    
    // Tool shortcuts (work without modifiers)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 't':
          e.preventDefault();
          console.log('⌨️ Opening text input dialog');
          // Setze Position in der Mitte des Canvas
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            setTextPosition({ 
              x: rect.width / 2, 
              y: rect.height / 2 
            });
          }
          setShowTextInput(true);
          setSelectedObjects([]);
          setShowObjectPanel(false);
          return;
        case 's':
          e.preventDefault();
          console.log('⌨️ Switching to pen tool');
          setTool('pen');
          // Focus canvas and clear selection
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          setSelectedObjects([]);
          setShowObjectPanel(false);
          return;
        case 'p':
          e.preventDefault();
          console.log('⌨️ Switching to arrow tool');
          setTool('arrow');
          // Focus canvas and clear selection
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          setSelectedObjects([]);
          setShowObjectPanel(false);
          return;
        case 'k':
          e.preventDefault();
          console.log('⌨️ Switching to circle tool');
          setTool('circle');
          // Focus canvas and clear selection
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          setSelectedObjects([]);
          setShowObjectPanel(false);
          return;
        case 'd':
          e.preventDefault();
          console.log('⌨️ Switching to triangle tool');
          setTool('triangle');
          // Focus canvas and clear selection
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          setSelectedObjects([]);
          setShowObjectPanel(false);
          return;
        case 'r':
          e.preventDefault();
          console.log('⌨️ Switching to rectangle tool');
          setTool('rectangle');
          // Focus canvas and clear selection
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          setSelectedObjects([]);
          setShowObjectPanel(false);
          return;
        case 'b':
          e.preventDefault();
          console.log('⌨️ Switching to image tool');
          setTool('image');
          // Focus canvas and clear selection
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          setSelectedObjects([]);
          setShowObjectPanel(false);
          // Trigger file input for image upload
          setTimeout(() => {
            const fileInput = document.getElementById('image-upload') as HTMLInputElement;
            if (fileInput) {
              fileInput.click();
            }
          }, 100);
          return;
        case 'v':
          e.preventDefault();
          console.log('⌨️ Switching to select tool');
          setTool('select');
          // Focus canvas and clear selection
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
          setSelectedObjects([]);
          setShowObjectPanel(false);
          return;
      }
    }
    
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
            if (!currentPath) {
              // Nur bei neuen Dateien: Speicher-Dialog öffnen (genau wie das Speichern-Icon)
              handleOpenSaveDialog();
            }
            // Bei bestehenden Dateien: nichts tun (automatisches Speichern läuft bereits)
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
            deleteSelectedObjects();
            break;
          case 'd':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              duplicateSelectedObjects();
            }
            break;
          case 'g':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              groupSelectedObjects();
            }
            break;
          case 'u':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              ungroupSelectedObjects();
            }
            break;
          case 'o':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              rotateSelectedObjects(90);
            }
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            deleteSelectedObjects();
            break;
          case 'Escape':
            setSelectedObjects([]);
            setShowObjectPanel(false);
            setShowColorPicker(null);
            setShowTemplates(false);
            setIsConnecting(false);
            setConnectionStart(null);
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
  }, [objects, selectedObjects, handleSaveChanges, showSaveDialog, showTextInput, showTableConfig, showTimelineConfig, showVennConfig, showMindmapConfig, showTemplates, showIconPicker]);

  useEffect(() => {
    redrawCanvas();
  }, [objects, selectedObjects, showGrid, zoom, panOffset]);

  // Fokus auf Text-Input setzen, wenn Dialog geöffnet wird
  useEffect(() => {
    if (showTextInput && textInputRef.current) {
      // Kleine Verzögerung, damit der Dialog vollständig gerendert ist
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [showTextInput]);

  // Automatisches Speichern beim Schließen des Tabs
  useEffect(() => {
    let lastSaveTime = 0;
    const SAVE_COOLDOWN = 5000; // 5 Sekunden Cooldown zwischen Speicherungen
    let isSaving = false;

    const autoSave = async () => {
      const now = Date.now();
      if (now - lastSaveTime < SAVE_COOLDOWN || isSaving) {
        console.log('⏳ Speichern übersprungen (Cooldown oder bereits am Speichern)');
        return;
      }

      if (currentPath && filename && objects.length > 0) {
        console.log('🔄 Automatisches Speichern...');
        isSaving = true;
        lastSaveTime = now;
        
        try {
          await handleSaveChanges();
          console.log('✅ Automatisches Speichern erfolgreich!');
        } catch (error) {
          console.error('❌ Fehler beim automatischen Speichern:', error);
        } finally {
          isSaving = false;
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warnung anzeigen und synchron speichern
      if (currentPath && filename && objects.length > 0) {
        console.log('🔄 Stille automatische Speicherung beim Schließen...');
        
        // KEINE Warnung anzeigen - stille Speicherung
        // e.preventDefault(); // Entfernt - keine Warnung
        // e.returnValue = ''; // Entfernt - keine Warnung
        
        // Synchrones Speichern für beforeunload
        const canvas = canvasRef.current;
        if (!canvas) return;

        const finalFilename = filename.startsWith('W_') ? filename : `W_${filename}`;
        const fullFilename = finalFilename.endsWith('.wb') ? finalFilename : `${finalFilename}.wb`;
        
        // Erstelle Whiteboard-Daten mit Metadaten für sendBeacon
        const whiteboardData = {
          objects: objects,
          metadata: {
            created: new Date().toISOString(),
            version: '1.0',
            userRole: userRole,
            canvasSize: {
              width: canvas.width,
              height: canvas.height
            },
            // Metadaten für sendBeacon einbetten
            saveMetadata: {
              filename: fullFilename,
              targetPath: currentPath,
              format: 'editable'
            }
          }
        };
        
        const jsonData = JSON.stringify(whiteboardData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        const formData = new FormData();
        formData.append('file', blob, fullFilename);
        formData.append('targetPath', currentPath);
        formData.append('format', 'editable');

        // Verwende sendBeacon für zuverlässiges Speichern beim Schließen
        if (navigator.sendBeacon) {
          // sendBeacon kann nur Blob oder String senden, nicht FormData
          const success = navigator.sendBeacon('/api/file-system-paths/save-file-beacon', jsonData);
          if (success) {
            console.log('✅ Stille automatische Speicherung erfolgreich!');
          } else {
            console.error('❌ Stille automatische Speicherung fehlgeschlagen');
          }
        } else {
          // Fallback: Asynchroner fetch
          fetch('/api/file-system-paths/save-file-beacon', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: jsonData,
            keepalive: true // Wichtig für das Schließen des Tabs
          }).then(response => {
            if (response.ok) {
              console.log('✅ Stille automatische Speicherung mit fetch erfolgreich!');
            } else {
              console.error('❌ Stille automatische Speicherung mit fetch fehlgeschlagen');
            }
          }).catch(error => {
            console.error('❌ Fehler bei der stillen automatischen Speicherung:', error);
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      // Stille automatische Speicherung wenn Tab versteckt wird (z.B. Tab-Wechsel)
      if (document.hidden) {
        autoSave();
      }
    };

    const handlePageHide = () => {
      // Stille automatische Speicherung wenn Seite versteckt wird
      autoSave();
    };

    const handleUnload = () => {
      // Stille automatische Speicherung beim Entladen der Seite
      autoSave();
    };

    // Event Listener hinzufügen
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // Periodisches automatisches Speichern alle 30 Sekunden
    const autoSaveInterval = setInterval(() => {
      if (currentPath && filename && objects.length > 0) {
        console.log('⏰ Periodisches automatisches Speichern...');
        autoSave();
      }
    }, 30000); // 30 Sekunden

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      clearInterval(autoSaveInterval);
    };
  }, [currentPath, filename, objects, userRole, handleSaveChanges]);

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

    // Draw selection box
    if (selectionBox) {
      const { start, end } = selectionBox;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      
      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
      ctx.fillRect(x, y, width, height);
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
    
    // Selection border - more subtle
    ctx.strokeStyle = 'rgba(33, 150, 210, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);
    
    // Corner handles - much smaller and more subtle
    const handleSize = 8; // Much smaller
    const cornerHandles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' }
    ];
    
    ctx.fillStyle = 'rgba(33, 150, 210, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    
    cornerHandles.forEach(handle => {
      // Draw a small square instead of circle
      ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
    });
    
    // Edge handles for resizing - smaller and more subtle
    const edgeHandles = [
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'n' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'e' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 's' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'w' }
    ];
    
    edgeHandles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
    });
    
    // Rotation handle - smaller and more subtle
    const centerX = bounds.x + bounds.width / 2;
    const rotateHandleY = bounds.y - 15; // Closer to object
    ctx.fillStyle = 'rgba(33, 150, 210, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, rotateHandleY, 6, 0, 2 * Math.PI); // Smaller radius
    ctx.fill();
    ctx.stroke();
    
    // Rotation line - more subtle
    ctx.strokeStyle = 'rgba(33, 150, 210, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, bounds.y);
    ctx.lineTo(centerX, rotateHandleY);
    ctx.stroke();
  };

  const applyLineStyle = (ctx: CanvasRenderingContext2D, style: 'solid' | 'dashed' | 'dotted') => {
    console.log('🎨 Applying line style:', style);
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
          const img = new window.Image();
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

      case 'icon':
        if (obj.iconType) {
          const size = obj.iconSize || 32;
          ctx.font = `${size}px Arial`;
          ctx.fillStyle = obj.strokeColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obj.iconType, obj.x + size/2, obj.y + size/2);
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
            // For other text objects, use text metrics
            const fontSize = obj.fontSize;
            ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${fontSize}px ${obj.fontFamily || 'Arial'}`;
          const metrics = ctx.measureText(obj.text);
          maxX = obj.x + metrics.width;
          maxY = obj.y;
            minY = obj.y - fontSize;
          }
        }
      }

    // For icon objects
    if (obj.tool === 'icon' && obj.iconSize) {
      const size = obj.iconSize;
      maxX = obj.x + size;
      maxY = obj.y + size;
      minX = obj.x;
      minY = obj.y;
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
        return x >= obj.x && x <= obj.x + w && y >= obj.y && y <= obj.y + h;
        
      case 'triangle':
        // Triangle hit detection - check if point is inside triangle
        const topY = obj.y;
        const bottomY = obj.y + h;
        const leftX = obj.x;
        const rightX = obj.x + w;
        
        // Check if point is inside triangle using barycentric coordinates
        const denom = (bottomY - topY) * (rightX - leftX);
        if (denom === 0) return false;
        
        const a = ((bottomY - topY) * (x - leftX) + (rightX - leftX) * (y - topY)) / denom;
        const b = ((topY - bottomY) * (x - leftX) + (leftX - rightX) * (y - bottomY)) / denom;
        const c = 1 - a - b;
        
        return a >= 0 && b >= 0 && c >= 0;
        
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
    const rotateHandleY = bounds.y - 15; // Match the new position
    
    // Check rotation handle first (highest priority)
    const distToRotate = Math.sqrt((x - centerX) ** 2 + (y - rotateHandleY) ** 2);
    if (distToRotate < 15) return 'rotate'; // Smaller hit area
    
    // Check corner handles with appropriate hit area for smaller handles
    const handleSize = 15; // Smaller hit area but still usable
    const cornerHandles = [
      { x: bounds.x, y: bounds.y, name: 'nw' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'se' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'sw' }
    ];
    
    // Check each handle with improved distance calculation
    for (const handle of cornerHandles) {
      const distance = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (distance < handleSize) {
        console.log(`🎯 Handle ${handle.name} detected at distance ${distance.toFixed(2)}`);
        return handle.name;
      }
    }
    
    // Additional check for edge handles (optional - for more precise control)
    const edgeThreshold = 10; // Smaller threshold for more precise control
    
    // Top edge
    if (Math.abs(y - bounds.y) < edgeThreshold && x >= bounds.x && x <= bounds.x + bounds.width) {
      return 'nw'; // Default to top-left for top edge
    }
    
    // Bottom edge
    if (Math.abs(y - (bounds.y + bounds.height)) < edgeThreshold && x >= bounds.x && x <= bounds.x + bounds.width) {
      return 'sw'; // Default to bottom-left for bottom edge
    }
    
    // Left edge
    if (Math.abs(x - bounds.x) < edgeThreshold && y >= bounds.y && y <= bounds.y + bounds.height) {
      return 'nw'; // Default to top-left for left edge
    }
    
    // Right edge
    if (Math.abs(x - (bounds.x + bounds.width)) < edgeThreshold && y >= bounds.y && y <= bounds.y + bounds.height) {
      return 'ne'; // Default to top-right for right edge
    }
    
    return null;
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Transform coordinates to account for zoom and pan
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    
    return {
      x: (rawX - panOffset.x) / zoom,
      y: (rawY - panOffset.y) / zoom
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

    // Handle Ctrl/Cmd + Click for multi-select
    const isMultiSelectClick = e.ctrlKey || e.metaKey;

    // Always check for object selection first (regardless of current tool)
    const clickedObject = [...objects].reverse().find(obj => !obj.locked && isPointInObject(x, y, obj));
    
    if (clickedObject) {
      if (isMultiSelectClick) {
        // Multi-select: add/remove from selection
        const isAlreadySelected = selectedObjects.some(obj => obj.id === clickedObject.id);
        if (isAlreadySelected) {
          // Remove from selection
          setSelectedObjects(selectedObjects.filter(obj => obj.id !== clickedObject.id));
        } else {
          // Add to selection
          setSelectedObjects([...selectedObjects, clickedObject]);
        }
      } else {
        // Single select: select object and its group
        const groupId = clickedObject.groupId;
        let newSelectedObjects = [clickedObject];
        
        if (groupId) {
          // Select all objects in the same group
          const groupObjects = objects.filter(obj => obj.groupId === groupId && obj.id !== clickedObject.id);
          newSelectedObjects = [clickedObject, ...groupObjects];
        }
        
        setSelectedObjects(newSelectedObjects);
      }
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
      // Clicked on empty space - start selection box or clear selection
      if (tool === 'select') {
        // Start selection box
        setSelectionBox({ start: { x, y }, end: { x, y } });
        setSelectedObjects([]);
        setShowObjectPanel(false);
      } else {
      setSelectedObjects([]);
      setShowObjectPanel(false);
      }
    }

    // If no object was clicked, proceed with drawing
    if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }

    if (tool === 'icon') {
      const newIcon: DrawObject = {
        id: Date.now().toString(),
        tool: 'icon',
        strokeColor,
        lineWidth,
        opacity,
        lineStyle,
        x: x - iconSize / 2,
        y: y - iconSize / 2,
        width: iconSize,
        height: iconSize,
        iconType: selectedIcon,
        iconSize: iconSize
      };
      setObjects([...objects, newIcon]);
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
    
    // Update last mouse position for paste operations
    setLastMousePosition({ x, y });
    
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
    
    // Handle selection box
    if (selectionBox && tool === 'select') {
      setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null);
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
        // Improved resize logic with better image handling
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
        
        // Special handling for images - maintain aspect ratio
        if (updatedObject.tool === 'image' && updatedObject.imageData) {
          // Get original image dimensions
          const img = new window.Image();
          img.onload = () => {
            const originalAspectRatio = img.width / img.height;
            
            // Maintain aspect ratio based on the primary resize direction
            if (resizeHandle === 'nw' || resizeHandle === 'se') {
              // Use width as primary dimension
              newHeight = newWidth / originalAspectRatio;
              if (resizeHandle === 'nw') {
                newY = resizeStart.objY + resizeStart.objHeight - newHeight;
              }
            } else {
              // Use height as primary dimension
              newWidth = newHeight * originalAspectRatio;
              if (resizeHandle === 'ne') {
                newX = resizeStart.objX + resizeStart.objWidth - newWidth;
              }
            }
            
            // Update the object with corrected dimensions
            const correctedObject = {
              ...updatedObject,
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight
            };
            
            setObjects(objects.map(obj => obj.id === selected.id ? correctedObject : obj));
            setSelectedObjects([correctedObject]);
          };
          img.src = updatedObject.imageData;
          return; // Exit early, the image load handler will update the object
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
        
        // Special handling for icons - maintain square aspect ratio and update iconSize
        if (updatedObject.tool === 'icon') {
          const size = Math.min(newWidth, newHeight);
          updatedObject.width = size;
          updatedObject.height = size;
          updatedObject.iconSize = size;
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

      // Move all selected objects (including grouped objects)
      setObjects(objects.map(obj => {
        if (selectedObjects.some(sel => sel.id === obj.id)) {
          const updatedObject = { ...obj };
      updatedObject.x += deltaX;
      updatedObject.y += deltaY;

      if (updatedObject.points) {
        updatedObject.points = updatedObject.points.map(p => ({
          x: p.x + deltaX,
          y: p.y + deltaY
        }));
      }

          // Update endX and endY for lines and arrows
          if (updatedObject.endX !== undefined) {
            updatedObject.endX += deltaX;
          }
          if (updatedObject.endY !== undefined) {
            updatedObject.endY += deltaY;
          }

          return updatedObject;
        }
        return obj;
      }));
      
      // Update selected objects with new positions
      const updatedSelectedObjects = selectedObjects.map(sel => {
        const updated = { ...sel };
        updated.x += deltaX;
        updated.y += deltaY;
        if (updated.points) {
          updated.points = updated.points.map(p => ({
            x: p.x + deltaX,
            y: p.y + deltaY
          }));
        }
        if (updated.endX !== undefined) updated.endX += deltaX;
        if (updated.endY !== undefined) updated.endY += deltaY;
        return updated;
      });
      
      setSelectedObjects(updatedSelectedObjects);
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
    
    // Handle selection box completion
    if (selectionBox && tool === 'select') {
      const { start, end } = selectionBox;
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      
      // Find all objects within the selection box
      const boxedObjects = objects.filter(obj => {
        const bounds = getObjectBounds(obj);
        return bounds.x >= minX && bounds.x + bounds.width <= maxX &&
               bounds.y >= minY && bounds.y + bounds.height <= maxY;
      });
      
      setSelectedObjects(boxedObjects);
      setShowObjectPanel(boxedObjects.length > 0);
      setSelectionBox(null);
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


  // Helper function to get all objects in a group
  const getGroupObjects = (groupId: string) => {
    return objects.filter(obj => obj.groupId === groupId);
  };

  // Helper function to move all objects in a group
  const moveGroup = (groupId: string, deltaX: number, deltaY: number) => {
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        obj.groupId === groupId 
          ? { 
              ...obj, 
              x: obj.x + deltaX, 
              y: obj.y + deltaY,
              endX: obj.endX ? obj.endX + deltaX : undefined,
              endY: obj.endY ? obj.endY + deltaY : undefined
            }
          : obj
      )
    );
  };

  // Group selected objects
  const groupSelectedObjects = () => {
    if (selectedObjects.length < 2) return;
    
    const groupId = `group-${Date.now()}`;
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        selectedObjects.some(sel => sel.id === obj.id)
          ? { ...obj, groupId }
          : obj
      )
    );
    console.log(`📦 Grouped ${selectedObjects.length} objects with ID: ${groupId}`);
  };

  // Ungroup selected objects
  const ungroupSelectedObjects = () => {
    if (selectedObjects.length === 0) return;
    
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        selectedObjects.some(sel => sel.id === obj.id)
          ? { ...obj, groupId: undefined }
          : obj
      )
    );
    
    // Update selected objects to remove groupId
    setSelectedObjects(selectedObjects.map(obj => ({ ...obj, groupId: undefined })));
    console.log(`📦 Ungrouped ${selectedObjects.length} objects`);
  };

  // Select all objects in the same group
  const selectGroup = () => {
    if (selectedObjects.length === 0) return;
    
    const groupId = selectedObjects[0].groupId;
    if (!groupId) return;
    
    const groupObjects = objects.filter(obj => obj.groupId === groupId);
    setSelectedObjects(groupObjects);
    setShowObjectPanel(true);
    console.log(`📦 Selected entire group with ${groupObjects.length} objects`);
  };

  // Duplicate selected objects
  const duplicateSelectedObjects = () => {
    if (selectedObjects.length === 0) return;
    
    const duplicatedObjects = selectedObjects.map(obj => ({
      ...obj,
      id: `${obj.id}-copy-${Date.now()}`,
      x: obj.x + 20,
      y: obj.y + 20,
      endX: obj.endX ? obj.endX + 20 : undefined,
      endY: obj.endY ? obj.endY + 20 : undefined,
      groupId: undefined // Don't copy group membership
    }));
    
    setObjects(prevObjects => [...prevObjects, ...duplicatedObjects]);
    setSelectedObjects(duplicatedObjects);
    console.log(`📋 Duplicated ${selectedObjects.length} objects`);
  };

  // Delete selected objects
  const deleteSelectedObjects = () => {
    if (selectedObjects.length === 0) return;
    
    setObjects(prevObjects => 
      prevObjects.filter(obj => !selectedObjects.some(sel => sel.id === obj.id))
    );
    setSelectedObjects([]);
    setShowObjectPanel(false);
    console.log(`🗑️ Deleted ${selectedObjects.length} objects`);
  };

  // Rotate selected objects
  const rotateSelectedObjects = (angle: number) => {
    if (selectedObjects.length === 0) return;
    
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        selectedObjects.some(sel => sel.id === obj.id)
          ? { ...obj, rotation: (obj.rotation || 0) + angle }
          : obj
      )
    );
    console.log(`🔄 Rotated ${selectedObjects.length} objects by ${angle}°`);
  };

  // Flip selected objects horizontally
  const flipSelectedObjectsHorizontal = () => {
    if (selectedObjects.length === 0) return;
    
    // Calculate center point of selection
    const bounds = selectedObjects.reduce((acc, obj) => {
      const objBounds = getObjectBounds(obj);
      return {
        minX: Math.min(acc.minX, objBounds.x),
        maxX: Math.max(acc.maxX, objBounds.x + objBounds.width),
        minY: Math.min(acc.minY, objBounds.y),
        maxY: Math.max(acc.maxY, objBounds.y + objBounds.height)
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    
    const centerX = (bounds.minX + bounds.maxX) / 2;
    
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        selectedObjects.some(sel => sel.id === obj.id)
          ? { 
              ...obj, 
              x: centerX - (obj.x - centerX) - (obj.width || 0),
              endX: obj.endX ? centerX - (obj.endX - centerX) : undefined
            }
          : obj
      )
    );
    console.log(`🔄 Flipped ${selectedObjects.length} objects horizontally`);
  };

  // Flip selected objects vertically
  const flipSelectedObjectsVertical = () => {
    if (selectedObjects.length === 0) return;
    
    // Calculate center point of selection
    const bounds = selectedObjects.reduce((acc, obj) => {
      const objBounds = getObjectBounds(obj);
      return {
        minX: Math.min(acc.minX, objBounds.x),
        maxX: Math.max(acc.maxX, objBounds.x + objBounds.width),
        minY: Math.min(acc.minY, objBounds.y),
        maxY: Math.max(acc.maxY, objBounds.y + objBounds.height)
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    setObjects(prevObjects => 
      prevObjects.map(obj => 
        selectedObjects.some(sel => sel.id === obj.id)
          ? { 
              ...obj, 
              y: centerY - (obj.y - centerY) - (obj.height || 0),
              endY: obj.endY ? centerY - (obj.endY - centerY) : undefined
            }
          : obj
      )
    );
    console.log(`🔄 Flipped ${selectedObjects.length} objects vertically`);
  };

  // Create customizable timeline
  const createCustomTimeline = (points: number, showAxis: boolean, showLabels: boolean) => {
    const centerX = canvasRef.current ? canvasRef.current.width / 2 : 400;
    const centerY = canvasRef.current ? canvasRef.current.height / 2 : 300;
    const timelineGroupId = 'timeline-group';
    
    let timelineObjects: DrawObject[] = [];
    
    // Timeline axis (double size)
    if (showAxis) {
      timelineObjects.push({
        id: 'timeline-axis',
        tool: 'line',
        strokeColor: '#1976d2',
        fillColor: 'transparent',
        lineWidth: 8,
        opacity: 1,
        lineStyle: 'solid',
        x: centerX - 400,
        y: centerY,
        endX: centerX + 400,
        endY: centerY,
        groupId: timelineGroupId
      });
    }
    
    // Timeline events (double size)
    const eventSpacing = 800 / (points - 1);
    const events = [];
    
    for (let i = 0; i < points; i++) {
      const x = centerX - 400 + (i * eventSpacing);
      const y = centerY + (i % 2 === 0 ? -160 : 160); // Alternate above/below
      events.push({
        x,
        y,
        text: `${2020 + i}`,
        description: `Ereignis ${i + 1}`
      });
    }
    
    events.forEach((event, index) => {
      // Event circle (double size)
      timelineObjects.push({
        id: `event-${index + 1}`,
        tool: 'circle',
        strokeColor: '#4caf50',
        fillColor: '#e8f5e8',
        lineWidth: 4,
        opacity: 1,
        lineStyle: 'solid',
        x: event.x - 16,
        y: event.y - 16,
        width: 32,
        height: 32,
        groupId: timelineGroupId
      });
      
      // Connection line to timeline (double size)
      timelineObjects.push({
        id: `event-line-${index + 1}`,
        tool: 'line',
        strokeColor: '#666',
        fillColor: 'transparent',
        lineWidth: 2,
        opacity: 1,
        lineStyle: 'dashed',
        x: event.x,
        y: event.y,
        endX: event.x,
        endY: centerY,
        groupId: timelineGroupId
      });
      
      if (showLabels) {
        // Year text (double size)
        timelineObjects.push({
          id: `year-${index + 1}`,
          tool: 'text',
          strokeColor: '#1976d2',
          fillColor: 'transparent',
          lineWidth: 1,
          opacity: 1,
          lineStyle: 'solid',
          fontSize: 28,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          text: event.text,
          x: event.x - 30,
          y: event.y - 40,
          groupId: timelineGroupId
        });
        
        // Event description (double size)
        timelineObjects.push({
          id: `desc-${index + 1}`,
          tool: 'text',
          strokeColor: '#666',
          fillColor: 'transparent',
          lineWidth: 1,
          opacity: 1,
          lineStyle: 'solid',
          fontSize: 24,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          text: event.description,
          x: event.x - 50,
          y: event.y + 60,
          groupId: timelineGroupId
        });
      }
    });
    
    setObjects(timelineObjects);
    console.log(`⏰ Created custom timeline with ${points} points`);
  };

  // Create customizable venn diagram
  const createCustomVenn = (circles: number, showLabels: boolean, showIntersection: boolean) => {
    const centerX = canvasRef.current ? canvasRef.current.width / 2 : 400;
    const centerY = canvasRef.current ? canvasRef.current.height / 2 : 300;
    const vennGroupId = 'venn-group';
    
    let vennObjects: DrawObject[] = [];
    
    const vennRadius = 160; // double size
    const vennDistance = 120; // double size
    
    if (circles === 2) {
      // Circle 1
      vennObjects.push({
        id: 'venn1',
        tool: 'circle',
        strokeColor: '#ff5722',
        fillColor: '#ffebee',
        lineWidth: 4,
        opacity: 0.7,
        lineStyle: 'solid',
        x: centerX - vennDistance - vennRadius,
        y: centerY - vennRadius,
        width: vennRadius * 2,
        height: vennRadius * 2,
        groupId: vennGroupId
      });
      
      // Circle 2
      vennObjects.push({
        id: 'venn2',
        tool: 'circle',
        strokeColor: '#2196f3',
        fillColor: '#e3f2fd',
        lineWidth: 4,
        opacity: 0.7,
        lineStyle: 'solid',
        x: centerX + vennDistance - vennRadius,
        y: centerY - vennRadius,
        width: vennRadius * 2,
        height: vennRadius * 2,
        groupId: vennGroupId
      });
      
      if (showLabels) {
        // Labels (double size)
        vennObjects.push({
          id: 'venn-label1',
          tool: 'text',
          strokeColor: '#ff5722',
          fillColor: 'transparent',
          lineWidth: 1,
          opacity: 1,
          lineStyle: 'solid',
          fontSize: 32,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          text: 'Set A',
          x: centerX - vennDistance - 40,
          y: centerY - vennRadius - 40,
          groupId: vennGroupId
        });
        
        vennObjects.push({
          id: 'venn-label2',
          tool: 'text',
          strokeColor: '#2196f3',
          fillColor: 'transparent',
          lineWidth: 1,
          opacity: 1,
          lineStyle: 'solid',
          fontSize: 32,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          text: 'Set B',
          x: centerX + vennDistance - 40,
          y: centerY - vennRadius - 40,
          groupId: vennGroupId
        });
        
        if (showIntersection) {
          vennObjects.push({
            id: 'venn-intersection',
            tool: 'text',
            strokeColor: '#666',
            fillColor: 'transparent',
            lineWidth: 1,
            opacity: 1,
            lineStyle: 'solid',
            fontSize: 28,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            text: 'A ∩ B',
            x: centerX - 30,
            y: centerY + 10,
            groupId: vennGroupId
          });
        }
      }
    } else if (circles === 3) {
      // Three circles in triangular formation
      const colors = ['#ff5722', '#2196f3', '#4caf50'];
      const positions = [
        { x: centerX, y: centerY - vennRadius },
        { x: centerX - vennRadius, y: centerY + vennRadius },
        { x: centerX + vennRadius, y: centerY + vennRadius }
      ];
      
      positions.forEach((pos, index) => {
        vennObjects.push({
          id: `venn${index + 1}`,
          tool: 'circle',
          strokeColor: colors[index],
          fillColor: colors[index] + '20',
          lineWidth: 4,
          opacity: 0.7,
          lineStyle: 'solid',
          x: pos.x - vennRadius,
          y: pos.y - vennRadius,
          width: vennRadius * 2,
          height: vennRadius * 2,
          groupId: vennGroupId
        });
        
        if (showLabels) {
          vennObjects.push({
            id: `venn-label${index + 1}`,
            tool: 'text',
            strokeColor: colors[index],
            fillColor: 'transparent',
            lineWidth: 1,
            opacity: 1,
            lineStyle: 'solid',
            fontSize: 32,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fontStyle: 'normal',
            textDecoration: 'none',
            text: `Set ${String.fromCharCode(65 + index)}`,
            x: pos.x - 40,
            y: pos.y - vennRadius - 40,
            groupId: vennGroupId
          });
        }
      });
    }
    
    setObjects(vennObjects);
    console.log(`⭕ Created custom venn diagram with ${circles} circles`);
  };

  // Create customizable mindmap
  const createCustomMindmap = (branches: number, showConnections: boolean, showSubBranches: boolean) => {
    const centerX = canvasRef.current ? canvasRef.current.width / 2 : 400;
    const centerY = canvasRef.current ? canvasRef.current.height / 2 : 300;
    const mindmapGroupId = 'mindmap-group';
    
    let mindmapObjects: DrawObject[] = [];
    
    // Central topic (double size)
    mindmapObjects.push({
      id: 'central-topic',
      tool: 'circle',
      strokeColor: '#1976d2',
      fillColor: '#e3f2fd',
      lineWidth: 6,
      opacity: 1,
      lineStyle: 'solid',
      x: centerX - 100,
      y: centerY - 100,
      width: 200,
      height: 200,
      groupId: mindmapGroupId
    });
    
    // Central text (double size)
    mindmapObjects.push({
      id: 'central-text',
      tool: 'text',
      strokeColor: '#1976d2',
      fillColor: 'transparent',
      lineWidth: 1,
      opacity: 1,
      lineStyle: 'solid',
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      text: 'Hauptthema',
      x: centerX - 60,
      y: centerY + 10,
      groupId: mindmapGroupId
    });
    
    // Calculate branch positions
    const branchDistance = 300;
    const branches_data = [];
    
    for (let i = 0; i < branches; i++) {
      const angle = (i * 2 * Math.PI) / branches;
      const x = centerX + Math.cos(angle) * branchDistance;
      const y = centerY + Math.sin(angle) * branchDistance;
      branches_data.push({
        x,
        y,
        text: `Zweig ${i + 1}`,
        angle
      });
    }
    
    branches_data.forEach((branch, index) => {
      // Branch circle (double size)
      mindmapObjects.push({
        id: `branch-${index + 1}`,
        tool: 'circle',
        strokeColor: '#4caf50',
        fillColor: '#e8f5e8',
        lineWidth: 4,
        opacity: 1,
        lineStyle: 'solid',
        x: branch.x - 60,
        y: branch.y - 60,
        width: 120,
        height: 120,
        groupId: mindmapGroupId
      });
      
      // Branch text (double size)
      mindmapObjects.push({
        id: `branch-text-${index + 1}`,
        tool: 'text',
        strokeColor: '#4caf50',
        fillColor: 'transparent',
        lineWidth: 1,
        opacity: 1,
        lineStyle: 'solid',
        fontSize: 28,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        text: branch.text,
        x: branch.x - 40,
        y: branch.y + 10,
        groupId: mindmapGroupId
      });
      
      if (showConnections) {
        // Connection line
        mindmapObjects.push({
          id: `connection-${index + 1}`,
          tool: 'line',
          strokeColor: '#666',
          fillColor: 'transparent',
          lineWidth: 4,
          opacity: 1,
          lineStyle: 'solid',
          x: centerX,
          y: centerY,
          endX: branch.x,
          endY: branch.y,
          groupId: mindmapGroupId
        });
      }
      
      if (showSubBranches) {
        // Add sub-branches
        const subBranchDistance = 150;
        const subBranches = 2;
        
        for (let j = 0; j < subBranches; j++) {
          const subAngle = branch.angle + (j - 0.5) * 0.5;
          const subX = branch.x + Math.cos(subAngle) * subBranchDistance;
          const subY = branch.y + Math.sin(subAngle) * subBranchDistance;
          
          // Sub-branch circle
          mindmapObjects.push({
            id: `sub-branch-${index + 1}-${j + 1}`,
            tool: 'circle',
            strokeColor: '#ff9800',
            fillColor: '#fff3e0',
            lineWidth: 3,
            opacity: 1,
            lineStyle: 'solid',
            x: subX - 40,
            y: subY - 40,
            width: 80,
            height: 80,
            groupId: mindmapGroupId
          });
          
          // Sub-branch text
          mindmapObjects.push({
            id: `sub-branch-text-${index + 1}-${j + 1}`,
            tool: 'text',
            strokeColor: '#ff9800',
            fillColor: 'transparent',
            lineWidth: 1,
            opacity: 1,
            lineStyle: 'solid',
            fontSize: 20,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            text: `Unter-${j + 1}`,
            x: subX - 25,
            y: subY + 5,
            groupId: mindmapGroupId
          });
          
          if (showConnections) {
            // Sub-connection line
            mindmapObjects.push({
              id: `sub-connection-${index + 1}-${j + 1}`,
              tool: 'line',
              strokeColor: '#999',
              fillColor: 'transparent',
              lineWidth: 2,
              opacity: 1,
              lineStyle: 'solid',
              x: branch.x,
              y: branch.y,
              endX: subX,
              endY: subY,
              groupId: mindmapGroupId
            });
          }
        }
      }
    });
    
    setObjects(mindmapObjects);
    console.log(`🧠 Created custom mindmap with ${branches} branches`);
  };

  // Create customizable table
  const createCustomTable = (rows: number, cols: number) => {
    const centerX = canvasRef.current ? canvasRef.current.width / 2 : 400;
    const centerY = canvasRef.current ? canvasRef.current.height / 2 : 300;
    const tableGroupId = 'table-group';
    
    const cellWidth = 160; // double size
    const cellHeight = 60; // double size
    const startX = centerX - (cols * cellWidth) / 2;
    const startY = centerY - (rows * cellHeight) / 2;
    
    let tableObjects: DrawObject[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * cellWidth;
        const y = startY + row * cellHeight;
        
        // Cell border
        tableObjects.push({
          id: `cell-${row}-${col}`,
          tool: 'rectangle',
          strokeColor: '#666',
          fillColor: row === 0 ? '#f0f0f0' : 'transparent',
          lineWidth: 2,
          opacity: 1,
          lineStyle: 'solid',
          x: x,
          y: y,
          width: cellWidth,
          height: cellHeight,
          groupId: tableGroupId
        });
        
        // Cell text
        tableObjects.push({
          id: `cell-text-${row}-${col}`,
          tool: 'text',
          strokeColor: '#333',
          fillColor: 'transparent',
          lineWidth: 1,
          opacity: 1,
          lineStyle: 'solid',
          fontSize: 24,
          fontFamily: 'Arial',
          fontWeight: row === 0 ? 'bold' : 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          text: row === 0 ? `Spalte ${col + 1}` : `Zelle ${row}-${col + 1}`,
          x: x + 10,
          y: y + 40,
          groupId: tableGroupId
        });
      }
    }
    
    setObjects(tableObjects);
    console.log(`📋 Created custom table with ${rows} rows and ${cols} columns`);
  };

  const loadTemplate = (templateName: string) => {
    // Clear current whiteboard
    setObjects([]);
    setRedoStack([]);
    
    const centerX = canvasRef.current ? canvasRef.current.width / 2 : 400;
    const centerY = canvasRef.current ? canvasRef.current.height / 2 : 300;
    
    let templateObjects: DrawObject[] = [];
    
    switch (templateName) {
      case 'Mindmap':
        // Open mindmap configuration dialog
        setShowMindmapConfig(true);
        return;
        
      case 'Diagramm':
        const diagramGroupId = 'diagram-group';
        
        // Flowchart boxes (double size)
        const boxes = [
          { x: centerX - 200, y: centerY - 300, text: 'Start', color: '#4caf50' },
          { x: centerX - 200, y: centerY - 100, text: 'Prozess', color: '#2196f3' },
          { x: centerX - 200, y: centerY + 100, text: 'Entscheidung', color: '#ff9800' },
          { x: centerX + 200, y: centerY + 100, text: 'Ja', color: '#4caf50' },
          { x: centerX - 200, y: centerY + 300, text: 'Nein', color: '#f44336' }
        ];
        
        boxes.forEach((box, index) => {
          templateObjects.push({
            id: `box-${index + 1}`,
            tool: 'rectangle',
            strokeColor: box.color,
            fillColor: box.color + '20',
            lineWidth: 4,
            opacity: 1,
            lineStyle: 'solid',
            x: box.x - 100,
            y: box.y - 40,
            width: 200,
            height: 80,
            groupId: diagramGroupId
          });
          
          templateObjects.push({
            id: `box-text-${index + 1}`,
            tool: 'text',
            strokeColor: box.color,
            fillColor: 'transparent',
            lineWidth: 1,
            opacity: 1,
            lineStyle: 'solid',
            fontSize: 28,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            text: box.text,
            x: box.x - 60,
            y: box.y + 10,
            groupId: diagramGroupId
          });
        });
        
        // Arrows (double size)
        const arrows = [
          { from: { x: centerX - 200, y: centerY - 220 }, to: { x: centerX - 200, y: centerY - 140 } },
          { from: { x: centerX - 200, y: centerY - 20 }, to: { x: centerX - 200, y: centerY + 60 } },
          { from: { x: centerX - 100, y: centerY + 100 }, to: { x: centerX + 100, y: centerY + 100 } },
          { from: { x: centerX - 200, y: centerY + 140 }, to: { x: centerX - 200, y: centerY + 220 } }
        ];
        
        arrows.forEach((arrow, index) => {
          templateObjects.push({
            id: `arrow-${index + 1}`,
            tool: 'arrow',
            strokeColor: '#666',
            fillColor: 'transparent',
            lineWidth: 4,
            opacity: 1,
            lineStyle: 'solid',
            x: arrow.from.x,
            y: arrow.from.y,
            endX: arrow.to.x,
            endY: arrow.to.y,
            groupId: diagramGroupId
          });
        });
        break;
        
      case 'Tabelle':
        // Open table configuration dialog
        setShowTableConfig(true);
        return;
        
      case 'Zeitachse':
        // Open timeline configuration dialog
        setShowTimelineConfig(true);
        return;
        
      case 'Venn':
        // Open venn configuration dialog
        setShowVennConfig(true);
        return;
        
      case 'Gantt':
        const ganttGroupId = 'gantt-group';
        
        // Gantt chart structure (double size)
        const ganttStartX = centerX - 400;
        const ganttStartY = centerY - 200;
        const taskHeight = 50; // double size
        const taskSpacing = 60; // double size
        
        const tasks = [
          { name: 'Aufgabe 1', start: 0, duration: 120, color: '#4caf50' },
          { name: 'Aufgabe 2', start: 40, duration: 80, color: '#2196f3' },
          { name: 'Aufgabe 3', start: 80, duration: 160, color: '#ff9800' },
          { name: 'Aufgabe 4', start: 160, duration: 60, color: '#9c27b0' }
        ];
        
        // Timeline (double size)
        templateObjects.push({
          id: 'gantt-timeline',
          tool: 'line',
          strokeColor: '#666',
          fillColor: 'transparent',
          lineWidth: 4,
          opacity: 1,
          lineStyle: 'solid',
          x: ganttStartX,
          y: ganttStartY - 40,
          endX: ganttStartX + 400,
          endY: ganttStartY - 40,
          groupId: ganttGroupId
        });
        
        // Time markers (double size)
        for (let i = 0; i <= 10; i++) {
          const x = ganttStartX + (i * 40);
          templateObjects.push({
            id: `time-marker-${i}`,
            tool: 'line',
            strokeColor: '#ccc',
            fillColor: 'transparent',
            lineWidth: 2,
            opacity: 1,
            lineStyle: 'solid',
            x: x,
            y: ganttStartY - 50,
            endX: x,
            endY: ganttStartY + 200,
            groupId: ganttGroupId
          });
          
          templateObjects.push({
            id: `time-label-${i}`,
            tool: 'text',
            strokeColor: '#666',
            fillColor: 'transparent',
            lineWidth: 1,
            opacity: 1,
            lineStyle: 'solid',
            fontSize: 20,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            text: `${i * 10}`,
            x: x - 10,
            y: ganttStartY - 60,
            groupId: ganttGroupId
          });
        }
        
        // Task bars (double size)
        tasks.forEach((task, index) => {
          const y = ganttStartY + (index * taskSpacing);
          
          // Task bar
          templateObjects.push({
            id: `task-${index + 1}`,
            tool: 'rectangle',
            strokeColor: task.color,
            fillColor: task.color,
            lineWidth: 2,
            opacity: 0.8,
            lineStyle: 'solid',
            x: ganttStartX + task.start,
            y: y,
            width: task.duration,
            height: taskHeight,
            groupId: ganttGroupId
          });
          
          // Task label (double size)
          templateObjects.push({
            id: `task-label-${index + 1}`,
            tool: 'text',
            strokeColor: '#333',
            fillColor: 'transparent',
            lineWidth: 1,
            opacity: 1,
            lineStyle: 'solid',
            fontSize: 24,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            text: task.name,
            x: ganttStartX - 160,
            y: y + 34,
            groupId: ganttGroupId
          });
        });
        break;
        
      default:
        console.log('Unknown template:', templateName);
        return;
    }
    
    setObjects(templateObjects);
    console.log(`📋 Template "${templateName}" loaded with ${templateObjects.length} objects`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
                const img = new window.Image();
        img.onload = () => {
          // Calculate optimal size while maintaining aspect ratio
          const maxWidth = 400;
          const maxHeight = 300;
          const aspectRatio = img.width / img.height;
          
          let width = img.width;
          let height = img.height;
          
          // Scale down if too large
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
          
          // Ensure minimum size
          width = Math.max(width, 50);
          height = Math.max(height, 50);
          
          // Get current mouse position from the last mouse event
          const mouseX = lastMousePosition.x - (width / 2);
          const mouseY = lastMousePosition.y - (height / 2);
          
          const newObj: DrawObject = {
            id: Date.now().toString(),
            tool: 'image',
            strokeColor: '#000000',
            lineWidth: 0,
            opacity: 1,
            lineStyle: 'solid',
            imageData: event.target?.result as string,
            x: mouseX,
            y: mouseY,
            width: Math.round(width),
            height: Math.round(height)
          };
          
          console.log(`📸 Image loaded: ${img.width}x${img.height} -> ${width}x${height}`);
          setObjects([...objects, newObj]);
        };
        img.onerror = () => {
          console.error('Failed to load image');
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async () => {
    try {
      console.log('📋 Attempting to paste from clipboard...');
      
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        console.log('📋 Clipboard API not available');
        return;
      }
      
      const clipboardItems = await navigator.clipboard.read();
      console.log('📋 Clipboard items:', clipboardItems);
      
      if (!clipboardItems || clipboardItems.length === 0) {
        console.log('📋 Clipboard is empty');
        return;
      }
      
      for (const clipboardItem of clipboardItems) {
        console.log('📋 Processing clipboard item:', clipboardItem.types);
        
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            console.log('📋 Found image in clipboard:', type);
            const blob = await clipboardItem.getType(type);
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                const img = new window.Image();
                img.onload = () => {
                  // Calculate optimal size while maintaining aspect ratio
                  const maxWidth = 400;
                  const maxHeight = 300;
                  const aspectRatio = img.width / img.height;
                  
                  let width = img.width;
                  let height = img.height;
                  
                  // Scale down if too large
                  if (width > maxWidth) {
                    width = maxWidth;
                    height = width / aspectRatio;
                  }
                  if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                  }
                  
                  // Ensure minimum size
                  width = Math.max(width, 50);
                  height = Math.max(height, 50);
                  
                  // Get current mouse position from the last mouse event
                  const mouseX = lastMousePosition.x - (width / 2);
                  const mouseY = lastMousePosition.y - (height / 2);
                  
                  const newObj: DrawObject = {
                    id: Date.now().toString(),
                    tool: 'image',
                    strokeColor: '#000000',
                    lineWidth: 0,
                    opacity: 1,
                    lineStyle: 'solid',
                    imageData: e.target?.result as string,
                    x: mouseX,
                    y: mouseY,
                    width: Math.round(width),
                    height: Math.round(height)
                  };
                  
                  console.log(`📋 Pasted image: ${img.width}x${img.height} -> ${width}x${height}`);
                  setObjects([...objects, newObj]);
                };
                img.onerror = () => {
                  console.error('Failed to load pasted image');
                };
                img.src = e.target.result as string;
              }
            };
            reader.readAsDataURL(blob);
            return; // Exit after processing image
          } else if (type === 'text/plain') {
            console.log('📋 Found text in clipboard');
            const textBlob = await clipboardItem.getType(type);
            const text = await textBlob.text();
            
            if (text.trim()) {
              // Get current mouse position from the last mouse event
              const mouseX = lastMousePosition.x;
              const mouseY = lastMousePosition.y;
              
              const newObj: DrawObject = {
                id: Date.now().toString(),
                tool: 'text',
                strokeColor: strokeColor,
                fillColor: 'transparent',
                lineWidth: 0,
                opacity: opacity,
                lineStyle: 'solid',
                text: text.trim(),
                x: mouseX,
                y: mouseY,
                fontSize: fontSize,
                fontFamily: fontFamily,
                fontWeight: fontWeight,
                fontStyle: fontStyle,
                textDecoration: textDecoration
              };
              
              console.log(`📋 Pasted text: "${text.trim()}"`);
              setObjects([...objects, newObj]);
              return; // Exit after processing text
          }
        }
      }
      }
      
      console.log('📋 No supported content found in clipboard');
    } catch (err) {
      console.log('📋 Paste not supported or failed:', err);
      if (err instanceof Error) {
        console.log('📋 Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
      // Fallback: Try to read text from clipboard
      try {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          // Get current mouse position from the last mouse event
          const mouseX = lastMousePosition.x;
          const mouseY = lastMousePosition.y;
          
          const newObj: DrawObject = {
            id: Date.now().toString(),
            tool: 'text',
            strokeColor: strokeColor,
            fillColor: 'transparent',
            lineWidth: 0,
            opacity: opacity,
            lineStyle: 'solid',
            text: text.trim(),
            x: mouseX,
            y: mouseY,
            fontSize: fontSize,
            fontFamily: fontFamily,
            fontWeight: fontWeight,
            fontStyle: fontStyle,
            textDecoration: textDecoration
          };
          
          console.log(`📋 Pasted text (fallback): "${text.trim()}"`);
          setObjects([...objects, newObj]);
        }
      } catch (textErr) {
        console.log('📋 Text paste also failed:', textErr);
      }
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
          const img = new window.Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            // Calculate drop position with zoom and pan transformation
            const rect = canvas.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;
            const x = (rawX - panOffset.x) / zoom;
            const y = (rawY - panOffset.y) / zoom;
            
            // Calculate optimal size while maintaining aspect ratio
            const maxWidth = 400;
            const maxHeight = 300;
            const aspectRatio = img.width / img.height;
            
            let width = img.width;
            let height = img.height;
            
            // Scale down if too large
            if (width > maxWidth) {
              width = maxWidth;
              height = width / aspectRatio;
            }
            if (height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }
            
            // Ensure minimum size
            width = Math.max(width, 50);
            height = Math.max(height, 50);
            
            const newObj: DrawObject = {
              id: Date.now().toString(),
              tool: 'image',
              strokeColor: '#000000',
              lineWidth: 0,
              opacity: 1,
              lineStyle: 'solid',
              imageData: event.target?.result as string,
              x: x - width / 2, // Center the image on drop point
              y: y - height / 2,
              width: Math.round(width),
              height: Math.round(height)
            };
            
            console.log(`🎯 Dropped image at (${x}, ${y}): ${img.width}x${img.height} -> ${width}x${height}`);
            setObjects([...objects, newObj]);
          };
          img.onerror = () => {
            console.error('Failed to load dropped image');
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

  const handleBringForward = () => {
    if (selectedObjects.length === 0) return;
    const selected = selectedObjects[0];
    const currentIndex = objects.findIndex(o => o.id === selected.id);
    if (currentIndex < objects.length - 1) {
      const newObjects = [...objects];
      [newObjects[currentIndex], newObjects[currentIndex + 1]] = [newObjects[currentIndex + 1], newObjects[currentIndex]];
      setObjects(newObjects);
    }
  };

  const handleSendBackward = () => {
    if (selectedObjects.length === 0) return;
    const selected = selectedObjects[0];
    const currentIndex = objects.findIndex(o => o.id === selected.id);
    if (currentIndex > 0) {
      const newObjects = [...objects];
      [newObjects[currentIndex], newObjects[currentIndex - 1]] = [newObjects[currentIndex - 1], newObjects[currentIndex]];
      setObjects(newObjects);
    }
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


  const handleOpenSaveDialog = async () => {
    setShowSaveDialog(true);
    
    // Load all available directories from the J-M-Reihen folder
    try {
      // Use the correct API endpoint to read the directory structure
      const basePath = 'git-intern/Mathe/Klasse 7';
      
      console.log('Loading directories for save dialog from:', basePath);
      
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(basePath)}&recursive=true`);
      if (response.ok) {
        const data = await response.json();
        console.log('Directory data received:', data);
        
        if (data.root && data.root.children && Array.isArray(data.root.children)) {
          console.log('Raw API response children:', data.root.children);
          
          // Collect directories and files hierarchically, preserving the tree structure
          const collectDirectoriesHierarchical = (items: any[], depth: number = 0): any[] => {
            const allItems: any[] = [];
            
            for (const item of items) {
              console.log('Processing item:', item.name, 'type:', item.type, 'depth:', depth);
              
              // Add both directories and files
              allItems.push({
                name: item.name,
                path: item.path,
                type: item.type,
                depth: depth,
                children: item.children || [],
                extension: item.type === 'file' ? item.name.split('.').pop() : undefined
              });
              
              // Recursively collect from children (only for directories)
              if (item.type === 'directory' && item.children && Array.isArray(item.children)) {
                allItems.push(...collectDirectoriesHierarchical(item.children, depth + 1));
              }
            }
            
            return allItems;
          };
          
          const allItems = collectDirectoriesHierarchical(data.root.children);
          
          console.log('All items found (directories and files):', allItems);
          console.log('Setting directoryContents to:', allItems);
          setDirectoryContents(allItems);
          setCurrentPath(basePath);
          setPathHistory([]);
          return;
        } else {
          console.log('No valid data structure found:', data);
        }
      } else {
        console.error('Failed to load directories:', response.status, response.statusText);
      }
      
      // Fallback: show empty list
      setDirectoryContents([]);
      setCurrentPath('');
      setPathHistory([]);
    } catch (error) {
      console.error('Error loading folders:', error);
      setDirectoryContents([]);
      setCurrentPath('');
      setPathHistory([]);
    }
  };

  // Neue Funktion: Beide Formate automatisch speichern
  const handleSaveBothFormats = async () => {
    if (!filename.trim()) {
      console.log('Filename is required');
      alert('Bitte geben Sie einen Dateinamen ein');
      return;
    }

    try {
      // Speichere zuerst als .wb (bearbeitbar) - ohne Dialog zu schließen
      await handleSaveWhiteboard('editable', false);
      
      // Dann als .pdf - ohne Dialog zu schließen
      await handleSaveWhiteboard('pdf', false);
      
      // Dialog schließen
      setShowSaveDialog(false);
      
      console.log('✅ Beide Formate erfolgreich gespeichert!');
    } catch (error) {
      console.error('❌ Fehler beim Speichern beider Formate:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    }
  };

  const handleSaveWhiteboard = async (format: 'png' | 'pdf' | 'svg' | 'editable' = 'png', closeDialog: boolean = true) => {
    if (!filename.trim()) {
      console.log('Filename is required');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const finalFilename = filename.startsWith('W_') ? filename : `W_${filename}`;
    
    // Use currentPath if available, otherwise use default path
    let savePath = currentPath || 'git-intern/Mathe/Klasse 7';
    
    // Ensure the path starts with 'git-intern/' for proper saving
    if (!savePath.startsWith('git-intern/')) {
      savePath = `git-intern/${savePath}`;
    }
    
    console.log('Saving with path:', savePath);
    console.log('Saving with filename:', finalFilename);
    
    if (format === 'svg') {
      // SVG Export
      const svgData = generateSVG();
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const fullFilename = finalFilename.endsWith('.svg') ? finalFilename : `${finalFilename}.svg`;
      
      const formData = new FormData();
      formData.append('file', blob, fullFilename);
      formData.append('targetPath', savePath);

      try {
        const response = await fetch('/api/file-system-paths/save-file', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          console.log('Whiteboard als SVG gespeichert!');
          // Dialog schließen statt window.close()
          if (closeDialog) setShowSaveDialog(false);
        } else {
          const error = await response.json();
          console.error('Fehler beim Speichern:', error.error);
        }
      } catch (error) {
        console.error('Error saving SVG:', error);
      }
    } else if (format === 'pdf') {
      // PDF Export - als PNG speichern, aber mit .pdf Endung
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fullFilename = finalFilename.endsWith('.pdf') ? finalFilename : `${finalFilename}.pdf`;
          
          // Erstelle einen neuen Blob mit korrektem MIME-Type für PDF
          const pdfBlob = new Blob([blob], { type: 'application/pdf' });
          
          const formData = new FormData();
          formData.append('file', pdfBlob, fullFilename);
          formData.append('targetPath', savePath);

          try {
            const response = await fetch('/api/file-system-paths/save-file', {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              console.log('Whiteboard als PDF gespeichert!');
              // Dialog schließen statt window.close()
              if (closeDialog) setShowSaveDialog(false);
            } else {
              const error = await response.json();
              console.error('Fehler beim Speichern:', error.error);
            }
          } catch (error) {
            console.error('Error saving PDF:', error);
          }
        }
      }, 'image/png'); // Verwende PNG-Format für bessere Kompatibilität
    } else if (format === 'editable') {
      // Save as editable whiteboard format (JSON)
      const whiteboardData = {
        objects: objects,
        metadata: {
          created: new Date().toISOString(),
          version: '1.0',
          userRole: userRole,
          canvasSize: {
            width: canvas.width,
            height: canvas.height
          }
        }
      };
      
      const jsonData = JSON.stringify(whiteboardData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const fullFilename = finalFilename.endsWith('.wb') ? finalFilename : `${finalFilename}.wb`;
      
      const formData = new FormData();
      formData.append('file', blob, fullFilename);
      formData.append('targetPath', savePath);
      formData.append('format', 'editable');

      try {
        const response = await fetch('/api/file-system-paths/save-file', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          console.log('Whiteboard als bearbeitbare Datei gespeichert!');
          setShowSaveDialog(false);
        } else {
          const error = await response.json();
          console.error('Fehler beim Speichern:', error.error);
        }
      } catch (error) {
        console.error('Error saving editable whiteboard:', error);
      }
    } else {
      // PNG Export (original)
      canvas.toBlob(async (blob) => {
        if (blob) {
          const fullFilename = finalFilename.endsWith('.png') ? finalFilename : `${finalFilename}.png`;
          
          const formData = new FormData();
          formData.append('file', blob, fullFilename);
          formData.append('targetPath', savePath);

          try {
            const response = await fetch('/api/file-system-paths/save-file', {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              console.log('Whiteboard erfolgreich gespeichert!');
              // Dialog schließen statt window.close()
              if (closeDialog) setShowSaveDialog(false);
            } else {
              const error = await response.json();
              console.error('Fehler beim Speichern:', error.error);
            }
          } catch (error) {
            console.error('Error saving:', error);
          }
        }
      }, 'image/png');
    }
  };

  const loadWhiteboardFile = async (filePath: string, fileName: string) => {
    try {
      // Set the filename for saving
      setFilename(fileName);
      
      // Set the current path for saving (remove the filename from the path)
      const pathParts = filePath.split('/');
      pathParts.pop(); // Remove the filename
      let directoryPath = pathParts.join('/');
      
      // Ensure the path starts with 'git-intern/' for proper saving
      if (!directoryPath.startsWith('git-intern/')) {
        directoryPath = `git-intern/${directoryPath}`;
      }
      
      setCurrentPath(directoryPath);
      
      console.log('Loaded file path:', filePath);
      console.log('Set current path to:', directoryPath);
      console.log('Set filename to:', fileName);
      
      // Load the whiteboard file
      const response = await fetch(`/api/file-system-paths/load-whiteboard?filePath=${encodeURIComponent(filePath)}`);
      
      if (response.ok) {
        const whiteboardData = await response.json();
        
        if (whiteboardData.objects && Array.isArray(whiteboardData.objects)) {
          setObjects(whiteboardData.objects);
          
          // Restore canvas size if available
          if (whiteboardData.metadata?.canvasSize) {
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = whiteboardData.metadata.canvasSize.width;
              canvas.height = whiteboardData.metadata.canvasSize.height;
            }
          }
          
          // Clear URL parameters after loading
          const url = new URL(window.location.href);
          url.searchParams.delete('loadFile');
          url.searchParams.delete('filename');
          window.history.replaceState({}, '', url.toString());
          
          console.log('Whiteboard erfolgreich geladen!');
          redrawCanvas();
        } else {
          console.error('Ungültige Whiteboard-Datei');
        }
      } else {
        console.error('Fehler beim Laden der Whiteboard-Datei');
      }
    } catch (error) {
      console.error('Error loading whiteboard:', error);
    }
  };

  const handleLoadWhiteboard = async (filePath: string) => {
    try {
      // Set the current path for saving (remove the filename from the path)
      const pathParts = filePath.split('/');
      pathParts.pop(); // Remove the filename
      let directoryPath = pathParts.join('/');
      
      // Ensure the path starts with 'git-intern/' for proper saving
      if (!directoryPath.startsWith('git-intern/')) {
        directoryPath = `git-intern/${directoryPath}`;
      }
      
      setCurrentPath(directoryPath);
      
      const response = await fetch(`/api/file-system-paths/load-file?path=${encodeURIComponent(filePath)}`);
      
      if (response.ok) {
        const whiteboardData = await response.json();
        
        if (whiteboardData.objects && Array.isArray(whiteboardData.objects)) {
          setObjects(whiteboardData.objects);
          
          // Restore canvas size if available
          if (whiteboardData.metadata?.canvasSize) {
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = whiteboardData.metadata.canvasSize.width;
              canvas.height = whiteboardData.metadata.canvasSize.height;
            }
          }
          
          console.log('Whiteboard erfolgreich geladen!');
          redrawCanvas();
        } else {
          console.error('Ungültiges Whiteboard-Format');
        }
      } else {
        const error = await response.json();
        console.error('Fehler beim Laden:', error.error);
      }
    } catch (error) {
      console.error('Error loading whiteboard:', error);
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
        case 'icon':
          if (obj.iconType) {
            const size = obj.iconSize || 32;
            svgContent += `<text x="${obj.x + size/2}" y="${obj.y + size/2}" font-family="Arial" 
              font-size="${size}" fill="${obj.strokeColor}" text-anchor="middle" dominant-baseline="middle">${obj.iconType}</text>`;
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

  const iconCategories = {
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
    shapes: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎵', '🎶', '💱', '💲', '⚕️', '♻️', '🔱', '📛', '🔰', '⭕', '✅', '☑️', '✔️', '❌', '❎', '➰', '➿', '〰️', '〽️', '✳️', '✴️', '❇️', '©️', '®️', '™️'],
    arrows: ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🔀', '🔁', '🔂', '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝']
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>


      {/* Modern Toolbar */}
      <Paper elevation={0} sx={{ 
        borderRadius: 0, 
        borderBottom: '1px solid #e0e0e0',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Compact Main Tools */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[
              { value: 'select', icon: '✋', label: 'Auswählen' },
              { value: 'pen', icon: '🖊️', label: 'Stift' },
              { value: 'highlighter', icon: '🖍️', label: 'Textmarker' },
              { value: 'line', icon: '📏', label: 'Linie' },
              { value: 'rectangle', icon: '▭', label: 'Rechteck' },
              { value: 'circle', icon: '⭕', label: 'Kreis' },
              { value: 'triangle', icon: '△', label: 'Dreieck' },
              { value: 'arrow', icon: '➡️', label: 'Pfeil' },
              { value: 'text', icon: 'A', label: 'Text' },
              { value: 'icon', icon: '😀', label: 'Icons' },
              { value: 'image', icon: '🖼️', label: 'Bild' },
              { value: 'eraser', icon: '🧹', label: 'Radieren' }
            ].map(t => (
              <Tooltip key={t.value} title={t.label}>
                <Box
                  onClick={() => {
                    if (t.value === 'image') {
                      document.getElementById('image-upload')?.click();
                    } else if (t.value === 'icon') {
                      setShowIconPicker(true);
                    } else if (t.value === 'highlighter') {
                      setTool(t.value as Tool);
                      setLineWidth(15); // Textmarker ist dicker
                    } else if (t.value === 'eraser') {
                      setTool(t.value as Tool);
                      setLineWidth(20); // Radierer ist größer und schneller
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
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '& .MuiSvgIcon-root': {
                      width: '100%',
                      height: '100%',
                      fontSize: '0.9rem'
                    },
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
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '& .MuiSvgIcon-root': {
                      width: '100%',
                      height: '100%',
                      fontSize: '0.9rem'
                    },
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
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '& .MuiSvgIcon-root': {
                      width: '100%',
                      height: '100%',
                      fontSize: '0.9rem'
                    },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' },
                    '&:disabled': { color: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <CopyIcon />
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
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '& .MuiSvgIcon-root': {
                      width: '100%',
                      height: '100%',
                      fontSize: '0.9rem'
                    },
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
            <Tooltip title="Speichern">
              <span>
                <IconButton 
                  onClick={handleOpenSaveDialog} 
                  size="small"
                  sx={{
                    color: '#4caf50',
                    bgcolor: 'rgba(76,175,80,0.1)',
                    border: '1px solid rgba(76,175,80,0.3)',
                    backdropFilter: 'blur(10px)',
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '& .MuiSvgIcon-root': {
                      width: '100%',
                      height: '100%',
                      fontSize: '0.9rem'
                    },
                    '&:hover': { 
                      bgcolor: 'rgba(76,175,80,0.2)', 
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 12px rgba(76,175,80,0.3)'
                    }
                  }}
                >
                  <SaveIcon />
                </IconButton>
              </span>
            </Tooltip>
            {/* Änderungen sichern Button - nur bei bestehenden Dateien anzeigen */}
            {currentPath && (
              <Tooltip title="Änderungen sichern (Strg+S)">
                <span>
                  <IconButton 
                    onClick={handleSaveChanges} 
                    size="small"
                    sx={{
                      color: '#2196f3',
                      bgcolor: 'rgba(33,150,243,0.1)',
                      border: '1px solid rgba(33,150,243,0.3)',
                      backdropFilter: 'blur(10px)',
                      width: 24,
                      height: 24,
                      minWidth: 24,
                      minHeight: 24,
                      '& .MuiSvgIcon-root': {
                        width: '100%',
                        height: '100%',
                        fontSize: '0.9rem'
                      },
                      '&:hover': { 
                        bgcolor: 'rgba(33,150,243,0.2)', 
                        transform: 'scale(1.05)',
                        boxShadow: '0 4px 12px rgba(33,150,243,0.3)'
                      }
                    }}
                  >
                    <SaveIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}

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
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  minHeight: 20,
                  '& .MuiTypography-root': {
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' }
                }}
              >
                <Typography variant="caption">+</Typography>
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
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  minHeight: 20,
                  '& .MuiTypography-root': {
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' }
                }}
              >
                <Typography variant="caption">-</Typography>
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom zurücksetzen">
              <IconButton 
                onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} 
                size="small"
                sx={{
                  color: 'white',
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  minHeight: 20,
                  '& .MuiTypography-root': {
                    fontSize: '0.6rem',
                    fontWeight: 'bold'
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.05)' }
                }}
              >
                <Typography variant="caption">100%</Typography>
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
                width: 24,
                height: 24,
                minWidth: 24,
                minHeight: 24,
                '& .MuiTypography-root': {
                  fontSize: '0.8rem'
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' }
              }}
            >
              <Typography variant="caption">📋</Typography>
            </IconButton>
          </Tooltip>

          {/* Group Controls */}
          {selectedObjects.length > 0 && (
            <>
              <Tooltip title="Gruppieren">
            <IconButton 
                  onClick={groupSelectedObjects}
                  disabled={selectedObjects.length < 2}
              size="small"
              sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' },
                    '&:disabled': { opacity: 0.5 }
                  }}
                >
                  <Typography variant="caption">📦</Typography>
            </IconButton>
          </Tooltip>

              <Tooltip title="Gruppe aufteilen">
          <IconButton 
                  onClick={ungroupSelectedObjects}
            size="small"
            sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' }
                  }}
                >
                  <Typography variant="caption">📤</Typography>
          </IconButton>
              </Tooltip>

              <Tooltip title="Duplizieren">
                <IconButton 
                  onClick={duplicateSelectedObjects}
                  size="small"
              sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                width: 24,
                height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' }
                  }}
                >
                  <Typography variant="caption">📋</Typography>
                </IconButton>
              </Tooltip>

              <Tooltip title="Löschen">
                <IconButton 
                  onClick={deleteSelectedObjects}
                  size="small"
              sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                width: 24,
                height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '&:hover': { bgcolor: 'rgba(255,0,0,0.3)', transform: 'scale(1.1)' }
                  }}
                >
                  <Typography variant="caption">🗑️</Typography>
                </IconButton>
              </Tooltip>

              <Tooltip title="90° drehen">
                <IconButton 
                  onClick={() => rotateSelectedObjects(90)}
              size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' }
                  }}
                >
                  <Typography variant="caption">🔄</Typography>
                </IconButton>
              </Tooltip>

              <Tooltip title="Horizontal spiegeln">
                <IconButton 
                  onClick={flipSelectedObjectsHorizontal}
              size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' }
                  }}
                >
                  <Typography variant="caption">↔️</Typography>
                </IconButton>
              </Tooltip>

              <Tooltip title="Vertikal spiegeln">
                <IconButton 
                  onClick={flipSelectedObjectsVertical}
                  size="small"
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', transform: 'scale(1.1)' }
                  }}
                >
                  <Typography variant="caption">↕️</Typography>
                </IconButton>
              </Tooltip>
            </>
          )}

          <Tooltip title="Raster ein/aus">
            <IconButton 
              onClick={() => setShowGrid(!showGrid)} 
                  size="small"
              sx={{
                color: showGrid ? '#4caf50' : 'white',
                bgcolor: showGrid ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                width: 24,
                height: 24,
                minWidth: 24,
                minHeight: 24,
                '& .MuiSvgIcon-root': {
                  width: '100%',
                  height: '100%',
                  fontSize: '0.9rem'
                },
                '&:hover': { 
                  bgcolor: showGrid ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.2)', 
                  transform: 'scale(1.1)' 
                }
              }}
            >
              <GridIcon />
            </IconButton>
          </Tooltip>

          {/* Aktuelle Datei-Anzeige */}
          <Tooltip 
            title={currentPath ? currentPath.replace('git-intern/', '') : 'Neue Datei'}
            placement="bottom"
            arrow
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'rgba(0,0,0,0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  maxWidth: 300
                }
              }
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(255,255,255,0.1)',
              borderRadius: 1,
              px: 1.5,
              py: 0.5,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              minWidth: 150,
              maxWidth: 250,
              cursor: 'help'
            }}>
              <FolderIcon sx={{ fontSize: '0.9rem', color: '#4caf50' }} />
              <Typography variant="caption" sx={{ 
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 500,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {filename || 'Neue Datei'}
              </Typography>
            </Box>
          </Tooltip>
              </Box>

      </Paper>

      {/* Canvas */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
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
                    'default',
            backgroundColor: '#ffffff'
          }}
        />
      </Box>

      {/* Color Picker Popover */}
      {showColorPicker && (
        <>
          {console.log('🎨 Rendering color picker:', showColorPicker)}
        <Paper
          sx={{
            position: 'fixed',
            top: 200,
            right: 20,
            zIndex: 2000,
            p: 2,
            boxShadow: 5,
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {showColorPicker === 'stroke' ? 'Strichfarbe' : 'Füllfarbe'}
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setShowColorPicker(null)}
              sx={{
                width: 20,
                height: 20,
                minWidth: 20,
                minHeight: 20,
                '& .MuiSvgIcon-root': {
                  width: '100%',
                  height: '100%',
                  fontSize: '0.8rem'
                }
              }}
            >
              <CloseIcon />
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
        </>
      )}

      {/* Text Input Dialog */}
      {showTextInput && (
        <Dialog 
          open={true} 
          onClose={() => setShowTextInput(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Text eingeben</DialogTitle>
          <DialogContent>
            <TextField
              ref={textInputRef}
              fullWidth
              multiline
              rows={4}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              autoFocus
              sx={{ mt: 1 }}
              placeholder="Ihren Text hier eingeben..."
              onKeyDown={(e) => {
                // Enter zum Einfügen, Escape zum Abbrechen
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // Direkte Implementierung statt handleTextSubmit()
                  if (textInput.trim()) {
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
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowTextInput(false);
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTextInput(false)}>Abbrechen</Button>
            <Button onClick={handleTextSubmit} variant="contained">Einfügen</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Save Dialog */}
      <Dialog 
        open={showSaveDialog} 
        onClose={() => setShowSaveDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Whiteboard speichern</DialogTitle>
        <DialogContent>
          <TextField
            label="Dateiname"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            fullWidth
            sx={{ mb: 2, mt: 1 }}
            helperText="Wird automatisch mit 'W_' beginnen"
            autoFocus
            onKeyDown={(e) => {
              // Enter zum Speichern, Escape zum Abbrechen
              if (e.key === 'Enter') {
                e.preventDefault();
                // Öffne das normale Speicher-Dialog statt direkte Speicherung
                // Das ist sicherer, da handleSaveWhiteboard sehr komplex ist
                const saveButton = document.querySelector('button[type="button"]:last-child') as HTMLButtonElement;
                if (saveButton) {
                  saveButton.click();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowSaveDialog(false);
              }
            }}
          />


          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Verfügbare Ordner:
          </Typography>

          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {directoryContents.map(item => {
                const depth = item.depth || 0;
                const displayName = item.name;
                const isFile = item.type === 'file';
                const isDirectory = item.type === 'directory';
                
                return (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton 
                      onClick={() => isDirectory ? setCurrentPath(item.path) : null}
                      disabled={isFile}
                      sx={{ 
                        pl: 1 + (depth * 1), // Very compact indentation
                        '&:hover': { bgcolor: isFile ? 'transparent' : 'action.hover' },
                        opacity: isFile ? 0.6 : 1,
                        minHeight: 24, // Very compact height
                        py: 0.25
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 20, mr: 0.5 }}>
                        {isDirectory ? (
                          <FolderIcon sx={{ fontSize: 14, color: '#ff9800' }} />
                        ) : (
                          <DescriptionIcon sx={{ fontSize: 12, color: '#666' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={displayName}
                        primaryTypographyProps={{ 
                          fontSize: '0.75rem',
                          fontWeight: isDirectory ? 500 : 400,
                          color: isFile ? 'text.secondary' : 'text.primary',
                          lineHeight: 1.2
                        }}
                      />
                      {isFile && (
                        <Chip 
                          label={item.extension || 'Datei'} 
                          size="small" 
                          variant="outlined"
                          sx={{ ml: 0.5, fontSize: '0.65rem', height: 16 }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
              {directoryContents.length === 0 && (
                <ListItem>
                  <ListItemText 
                    primary="Keine Ordner verfügbar" 
                    sx={{ textAlign: 'center', color: 'text.secondary' }} 
                  />
                </ListItem>
              )}
            </List>
          </Paper>

          {currentPath && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Ausgewählt: {currentPath.split('/').pop()}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Abbrechen</Button>
          
          {/* Main save button - saves both formats automatically */}
          <Button 
            onClick={() => handleSaveBothFormats()} 
            variant="contained" 
            sx={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)'
              }
            }}
            disabled={!filename.trim()}
          >
            💾 Speichern (beide Formate)
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


      {/* Table Configuration Dialog */}
      <Dialog open={showTableConfig} onClose={() => setShowTableConfig(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tabelle konfigurieren</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 80 }}>Zeilen:</Typography>
              <TextField
                type="number"
                value={tableConfig.rows}
                onChange={(e) => setTableConfig(prev => ({ ...prev, rows: Math.max(1, parseInt(e.target.value) || 1) }))}
                inputProps={{ min: 1, max: 20 }}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 80 }}>Spalten:</Typography>
              <TextField
                type="number"
                value={tableConfig.cols}
                onChange={(e) => setTableConfig(prev => ({ ...prev, cols: Math.max(1, parseInt(e.target.value) || 1) }))}
                inputProps={{ min: 1, max: 20 }}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <Box sx={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              p: 2, 
              backgroundColor: '#f9f9f9',
              display: 'grid',
              gridTemplateColumns: `repeat(${tableConfig.cols}, 1fr)`,
              gap: 1,
              maxHeight: 200,
              overflow: 'auto'
            }}>
              {Array.from({ length: tableConfig.rows * tableConfig.cols }, (_, i) => {
                const row = Math.floor(i / tableConfig.cols);
                const col = i % tableConfig.cols;
                return (
                  <Box
                    key={i}
                    sx={{
                      width: 30,
                      height: 20,
                      border: '1px solid #ccc',
                      backgroundColor: row === 0 ? '#e3f2fd' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: row === 0 ? 'bold' : 'normal'
                    }}
                  >
                    {row === 0 ? `S${col + 1}` : `${row}-${col + 1}`}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTableConfig(false)}>Abbrechen</Button>
          <Button 
            onClick={() => {
              createCustomTable(tableConfig.rows, tableConfig.cols);
              setShowTableConfig(false);
            }}
            variant="contained"
          >
            Tabelle erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Configuration Dialog */}
      <Dialog open={showTimelineConfig} onClose={() => setShowTimelineConfig(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Zeitachse konfigurieren</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Anzahl Punkte:</Typography>
              <TextField
                type="number"
                value={timelineConfig.points}
                onChange={(e) => setTimelineConfig(prev => ({ ...prev, points: Math.max(2, parseInt(e.target.value) || 2) }))}
                inputProps={{ min: 2, max: 10 }}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Achse anzeigen:</Typography>
              <input
                type="checkbox"
                checked={timelineConfig.showAxis}
                onChange={(e) => setTimelineConfig(prev => ({ ...prev, showAxis: e.target.checked }))}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Labels anzeigen:</Typography>
              <input
                type="checkbox"
                checked={timelineConfig.showLabels}
                onChange={(e) => setTimelineConfig(prev => ({ ...prev, showLabels: e.target.checked }))}
              />
            </Box>
            <Box sx={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              p: 2, 
              backgroundColor: '#f9f9f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 100
            }}>
              <Typography variant="body2" color="text.secondary">
                Vorschau: {timelineConfig.points} Punkte, {timelineConfig.showAxis ? 'mit' : 'ohne'} Achse, {timelineConfig.showLabels ? 'mit' : 'ohne'} Labels
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTimelineConfig(false)}>Abbrechen</Button>
          <Button 
            onClick={() => {
              createCustomTimeline(timelineConfig.points, timelineConfig.showAxis, timelineConfig.showLabels);
              setShowTimelineConfig(false);
            }}
            variant="contained"
          >
            Zeitachse erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Venn Configuration Dialog */}
      <Dialog open={showVennConfig} onClose={() => setShowVennConfig(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Venn-Diagramm konfigurieren</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Anzahl Kreise:</Typography>
              <TextField
                type="number"
                value={vennConfig.circles}
                onChange={(e) => setVennConfig(prev => ({ ...prev, circles: Math.max(2, Math.min(3, parseInt(e.target.value) || 2)) }))}
                inputProps={{ min: 2, max: 3 }}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Labels anzeigen:</Typography>
              <input
                type="checkbox"
                checked={vennConfig.showLabels}
                onChange={(e) => setVennConfig(prev => ({ ...prev, showLabels: e.target.checked }))}
              />
            </Box>
            {vennConfig.circles === 2 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ minWidth: 120 }}>Schnittmenge anzeigen:</Typography>
                <input
                  type="checkbox"
                  checked={vennConfig.showIntersection}
                  onChange={(e) => setVennConfig(prev => ({ ...prev, showIntersection: e.target.checked }))}
                />
              </Box>
            )}
            <Box sx={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              p: 2, 
              backgroundColor: '#f9f9f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 100
            }}>
              <Typography variant="body2" color="text.secondary">
                Vorschau: {vennConfig.circles} Kreise, {vennConfig.showLabels ? 'mit' : 'ohne'} Labels{vennConfig.circles === 2 && vennConfig.showIntersection ? ', mit Schnittmenge' : ''}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVennConfig(false)}>Abbrechen</Button>
          <Button 
            onClick={() => {
              createCustomVenn(vennConfig.circles, vennConfig.showLabels, vennConfig.showIntersection);
              setShowVennConfig(false);
            }}
            variant="contained"
          >
            Venn-Diagramm erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mindmap Configuration Dialog */}
      <Dialog open={showMindmapConfig} onClose={() => setShowMindmapConfig(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mindmap konfigurieren</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Anzahl Zweige:</Typography>
              <TextField
                type="number"
                value={mindmapConfig.branches}
                onChange={(e) => setMindmapConfig(prev => ({ ...prev, branches: Math.max(2, Math.min(8, parseInt(e.target.value) || 2)) }))}
                inputProps={{ min: 2, max: 8 }}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Verbindungslinien:</Typography>
              <input
                type="checkbox"
                checked={mindmapConfig.showConnections}
                onChange={(e) => setMindmapConfig(prev => ({ ...prev, showConnections: e.target.checked }))}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ minWidth: 120 }}>Unterzweige:</Typography>
              <input
                type="checkbox"
                checked={mindmapConfig.showSubBranches}
                onChange={(e) => setMindmapConfig(prev => ({ ...prev, showSubBranches: e.target.checked }))}
              />
            </Box>
            <Box sx={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              p: 2, 
              backgroundColor: '#f9f9f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 100
            }}>
              <Typography variant="body2" color="text.secondary">
                Vorschau: {mindmapConfig.branches} Zweige, {mindmapConfig.showConnections ? 'mit' : 'ohne'} Verbindungen, {mindmapConfig.showSubBranches ? 'mit' : 'ohne'} Unterzweige
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMindmapConfig(false)}>Abbrechen</Button>
          <Button 
            onClick={() => {
              createCustomMindmap(mindmapConfig.branches, mindmapConfig.showConnections, mindmapConfig.showSubBranches);
              setShowMindmapConfig(false);
            }}
            variant="contained"
          >
            Mindmap erstellen
          </Button>
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
                  loadTemplate(template.name);
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
            <IconButton 
              size="small" 
              onClick={() => setShowObjectPanel(false)}
              sx={{
                width: 20,
                height: 20,
                minWidth: 20,
                minHeight: 20,
                '& .MuiSvgIcon-root': {
                  width: '100%',
                  height: '100%',
                  fontSize: '0.8rem'
                }
              }}
            >
              <CloseIcon />
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

              {/* General Properties - Colors */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666', mb: 1, display: 'block' }}>
                  Farben
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Strich</Typography>
                    <Box
                      onClick={() => {
                        console.log('🎨 Opening stroke color picker');
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

              {/* General Properties - Line Settings */}
              {['brush', 'pen', 'marker', 'line', 'arrow', 'rectangle', 'circle', 'triangle'].includes(selectedObjects[0].tool) && (
                <>
                  {console.log('🔧 Rendering line settings for tool:', selectedObjects[0].tool)}
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
                  
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    <Button
                      variant={selectedObjects[0].lineStyle === 'solid' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        console.log('🔧 Line style changed to: solid');
                        updateSelectedObject({ lineStyle: 'solid' });
                      }}
                      sx={{ fontSize: '0.6rem', py: 0.3, px: 1, minHeight: 24 }}
                    >
                      ━━━
                    </Button>
                    <Button
                      variant={selectedObjects[0].lineStyle === 'dashed' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        console.log('🔧 Line style changed to: dashed');
                        updateSelectedObject({ lineStyle: 'dashed' });
                      }}
                      sx={{ fontSize: '0.6rem', py: 0.3, px: 1, minHeight: 24 }}
                    >
                      - - -
                    </Button>
                    <Button
                      variant={selectedObjects[0].lineStyle === 'dotted' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        console.log('🔧 Line style changed to: dotted');
                        updateSelectedObject({ lineStyle: 'dotted' });
                      }}
                      sx={{ fontSize: '0.6rem', py: 0.3, px: 1, minHeight: 24 }}
                    >
                      · · ·
                    </Button>
                </Box>
                </Box>
                </>
              )}

              {/* General Properties - Opacity */}
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

              {/* Layer Controls */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#666', mb: 1, display: 'block' }}>
                  Position
                </Typography>
                
                {/* Extreme Layer Controls */}
                <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleBringToFront}
                    sx={{ 
                      flexGrow: 1, 
                      fontSize: '0.65rem',
                      py: 0.4,
                      minHeight: 26
                    }}
                    title="Ganz nach vorne bringen"
                  >
                    <FrontIcon fontSize="small" sx={{ mr: 0.3 }} />
                    Ganz vorne
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSendToBack}
                    sx={{ 
                      flexGrow: 1, 
                      fontSize: '0.65rem',
                      py: 0.4,
                      minHeight: 26
                    }}
                    title="Ganz nach hinten senden"
                  >
                    <BackIcon fontSize="small" sx={{ mr: 0.3 }} />
                    Ganz hinten
                  </Button>
                </Box>
                
                {/* Step-by-step Layer Controls */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleBringForward}
                    sx={{ 
                      flexGrow: 1, 
                      fontSize: '0.65rem',
                      py: 0.4,
                      minHeight: 26
                    }}
                    title="Eins nach vorne"
                  >
                    <ForwardIcon fontSize="small" sx={{ mr: 0.3 }} />
                    Nach vorne
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSendBackward}
                    sx={{ 
                      flexGrow: 1, 
                      fontSize: '0.65rem',
                      py: 0.4,
                      minHeight: 26
                    }}
                    title="Eins nach hinten"
                  >
                    <BackwardIcon fontSize="small" sx={{ mr: 0.3 }} />
                    Nach hinten
                  </Button>
                </Box>
              </Box>

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

      {/* Icon Picker Dialog */}
      <Dialog 
        open={showIconPicker} 
        onClose={() => setShowIconPicker(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            maxHeight: '70vh',
            margin: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 1,
          px: 2,
          minHeight: 'auto',
          position: 'relative'
        }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 500 }}>
            Icons & Emojis
          </Typography>
          <IconButton 
            onClick={() => setShowIconPicker(false)}
            sx={{ 
              color: 'white',
              p: 0.5,
              minWidth: 'auto',
              width: 24,
              height: 24,
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 1.5 }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold', fontSize: '0.8rem' }}>
              Größe: {iconSize}px
            </Typography>
            <Slider
              value={iconSize}
              onChange={(_, value) => setIconSize(value as number)}
              min={16}
              max={128}
              step={8}
              sx={{ width: '100%' }}
              size="small"
            />
          </Box>
          
          {Object.entries(iconCategories).map(([category, icons]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ 
                mb: 0.5, 
                textTransform: 'capitalize',
                fontWeight: 'bold',
                color: '#2c3e50',
                fontSize: '0.9rem'
              }}>
                {category === 'emojis' ? 'Emojis' : 
                 category === 'symbols' ? 'Symbole' :
                 category === 'shapes' ? 'Formen' : 'Pfeile'}
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                gap: 0.5,
                maxHeight: '150px',
                overflowY: 'auto',
                p: 0.5,
                border: '1px solid #e0e0e0',
                borderRadius: 1
              }}>
                {icons.map((icon, index) => (
                  <Box
                    key={index}
                    onClick={() => {
                      setSelectedIcon(icon);
                      setTool('icon');
                      setShowIconPicker(false);
                    }}
                    sx={{
                      p: 0.5,
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 0.5,
                      fontSize: '1.2rem',
                      minHeight: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: selectedIcon === icon ? 'rgba(33, 150, 210, 0.1)' : 'transparent',
                      border: selectedIcon === icon ? '1px solid #2196d4' : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(33, 150, 210, 0.1)',
                        transform: 'scale(1.05)'
                      }
                    }}
                  >
                    {icon}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </DialogContent>
      </Dialog>

    </Box>
  );
};

export default WhiteboardPage;

