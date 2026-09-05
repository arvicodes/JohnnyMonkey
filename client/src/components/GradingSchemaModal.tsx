import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { determinateLinearProgressSx } from '../lib/muiLinearProgressSx';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  HowToReg as AssignIcon
} from '@mui/icons-material';

interface GradeNode {
  id: string;
  name: string;
  weight: number;
  children: GradeNode[];
  isExpanded?: boolean;
  isEditing?: boolean;
}

interface GradingSchema {
  id?: string;
  name: string;
  structure: string;
  gradingSystem?: string;
  createdAt?: string;
  isActive?: boolean;
  learningGroup?: {
    id: string;
    name: string;
  };
}

interface GradingSchemaModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

// Wie GradesModal – Johnny-Grün, kompakt
const colors = {
  primary: '#2E7D32',
  secondary: '#F57C00',
  accent1: '#1976D2',
  accent2: '#C2185B',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#e0e0e0',
  hover: '#f5f7f5',
  active: '#e8f5e9',
};

const compactBtnSx = {
  borderRadius: 1.2,
  px: 1.5,
  py: 0.4,
  fontSize: '0.65rem',
  height: 28,
  minHeight: 28,
  textTransform: 'none' as const,
  fontWeight: 600,
  boxShadow: 'none',
};

const compactIconBtnSx = {
  width: 24,
  height: 24,
  p: 0.25,
};

const GradingSchemaModal: React.FC<GradingSchemaModalProps> = ({
  open,
  onClose,
  groupId,
  groupName
}) => {
  const [schemaName, setSchemaName] = useState('');
  const [gradingSystem, setGradingSystem] = useState('GERMAN');
  const [gradeNodes, setGradeNodes] = useState<GradeNode[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingSchemas, setExistingSchemas] = useState<GradingSchema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<GradingSchema | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const resetForm = () => {
    setSchemaName('');
    setGradingSystem('GERMAN');
    setGradeNodes([]);
    setError('');
    setSelectedSchema(null);
    setIsEditing(false);
    setShowPreview(false);
  };

  const fetchExistingSchemas = useCallback(async () => {
    try {
      // Load all available grading schemas
      const response = await fetch('/api/grading-schemas/all');
      if (response.ok) {
        const allSchemas = await response.json();
        console.log('📋 Fetched schemas:', allSchemas.map((s: any) => ({ id: s.id, name: s.name, groupId: s.groupId })));
        
        // Mark the active schema (the one that belongs to the current group)
        const schemasWithActiveStatus = allSchemas.map((schema: any) => ({
          ...schema,
          isActive: schema.groupId === groupId
        }));
        
        setExistingSchemas(schemasWithActiveStatus);
      }
    } catch (error) {
      console.error('❌ Error fetching schemas:', error);
    }
  }, [groupId]);

  useEffect(() => {
    if (open) {
      fetchExistingSchemas();
      resetForm();
    }
  }, [open, groupId, fetchExistingSchemas]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const parseSchemaString = (schemaStr: string): GradeNode[] => {
    // Check if the string is JSON format (old format)
    if (schemaStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(schemaStr);
        // Convert the root node to our format
        const convertNode = (node: any): GradeNode => ({
          id: generateId(),
          name: node.name.replace(' (100%)', ''),
          weight: node.weight,
          children: node.children ? node.children.map(convertNode) : [],
          isExpanded: true
        });
        
        return [convertNode(parsed)];
      } catch (error) {
        console.error('Error parsing JSON schema:', error);
        return [];
      }
    }

    // Handle text format (new format)
    // Entferne escaped newlines und teile dann auf
    const cleanStructure = schemaStr.replace(/\\n/g, '\n');
    const lines = cleanStructure.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const result: GradeNode[] = [];
    const stack: { node: GradeNode; indent: number }[] = [];
    let rootName: string | null = null;
    let rootProcessed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      
      // Verschiedene Formate unterstützen
      let match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      if (!match) {
        // Versuche Format ohne Klammern
        match = line.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)%?$/);
      }
      if (!match) {
        // Versuche Format mit nur Prozentzeichen
        match = line.trim().match(/^(.+?)\s*(\d+(?:\.\d+)?)%$/);
      }
      
      if (!match) {
        console.warn('Could not parse line:', line);
        continue;
      }

      const [, name, weightStr] = match;
      const weight = parseFloat(weightStr);
      const trimmedName = name.trim();

      if (isNaN(weight)) {
        console.warn('Invalid weight in line:', line);
        continue;
      }

      // Erkenne die Root-Zeile (keine Einrückung und 100% Gewichtung)
      const isRoot = indent === 0 && Math.abs(weight - 100) < 0.01;
      
      if (isRoot) {
        if (!rootProcessed) {
          // Erste Root-Zeile - speichere den Namen, aber erstelle keinen Node dafür
          // Die Root-Zeile wird beim Speichern automatisch hinzugefügt
          rootName = trimmedName;
          rootProcessed = true;
          continue; // Überspringe die Root-Zeile beim Parsen
        } else {
          // Weitere Root-Zeile - überspringe sie
          console.warn('Skipping duplicate root line:', trimmedName);
          continue;
        }
      }
      
      // Überspringe Zeilen, die den Root-Namen als Kind haben (sollte nicht passieren)
      if (rootName && trimmedName === rootName) {
        console.warn('Skipping root name as child:', trimmedName);
        continue;
      }

      // Filtere doppelte Einträge mit gleichem Namen und gleicher Einrückung
      const isDuplicate = stack.some(item => 
        item.indent === indent && 
        item.node.name === trimmedName
      );
      
      if (isDuplicate) {
        console.warn('Skipping duplicate entry:', trimmedName, 'at level', indent);
        continue;
      }

      const node: GradeNode = {
        id: generateId(),
        name: trimmedName,
        weight: weight,
        children: [],
        isExpanded: true
      };

      // Find the correct parent based on indentation
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        // This is a top-level node (nach der Root-Zeile)
        result.push(node);
      } else {
        // This is a child node
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, indent });
    }

    return result;
  };

  const loadSchema = async (schema: GradingSchema) => {
    try {
      console.log('📖 Loading schema for editing:', { id: schema.id, name: schema.name });
      
      // Lade die neuesten Daten vom Server, um sicherzustellen, dass wir die aktuellste Version haben
      const response = await fetch('/api/grading-schemas/all');
      if (response.ok) {
        const allSchemas = await response.json();
        const freshSchema = allSchemas.find((s: GradingSchema) => s.id === schema.id);
        
        if (freshSchema) {
          console.log('✅ Loaded fresh schema from server:', { id: freshSchema.id, name: freshSchema.name, structureLength: freshSchema.structure?.length });
          setSelectedSchema(freshSchema);
          setSchemaName(freshSchema.name);
          setGradingSystem(freshSchema.gradingSystem || 'GERMAN');
          console.log('📋 Schema structure:', freshSchema.structure);
          
          // Bereinige das Schema vor dem Parsen
          const cleanedStructure = cleanSchemaStructure(freshSchema.structure);
          const parsedNodes = parseSchemaString(cleanedStructure);
          
          console.log('🧹 Cleaned structure:', cleanedStructure);
          console.log('✅ Parsed nodes:', parsedNodes);
          setGradeNodes(parsedNodes);
          setIsEditing(true);
        } else {
          // Fallback: Verwende das übergebene Schema
          console.warn('⚠️ Fresh schema not found, using provided schema');
          setSelectedSchema(schema);
          setSchemaName(schema.name);
          setGradingSystem(schema.gradingSystem || 'GERMAN');
          const cleanedStructure = cleanSchemaStructure(schema.structure);
          const parsedNodes = parseSchemaString(cleanedStructure);
          setGradeNodes(parsedNodes);
          setIsEditing(true);
        }
      } else {
        // Fallback: Verwende das übergebene Schema
        console.warn('⚠️ Failed to fetch fresh schema, using provided schema');
        setSelectedSchema(schema);
        setSchemaName(schema.name);
        setGradingSystem(schema.gradingSystem || 'GERMAN');
        const cleanedStructure = cleanSchemaStructure(schema.structure);
        const parsedNodes = parseSchemaString(cleanedStructure);
        setGradeNodes(parsedNodes);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('❌ Error loading schema:', error);
      setError('Fehler beim Laden des Schemas: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Funktion zum Bereinigen der Schema-Struktur
  // Entfernt doppelte Root-Zeilen und echte Duplikate
  const cleanSchemaStructure = (structure: string): string => {
    const lines = structure.split('\n');
    const cleanedLines: string[] = [];
    const seenEntries = new Map<string, number>(); // Map von "name:indent" zu Zeilennummer
    let rootName: string | null = null;
    let rootFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      const indent = line.search(/\S/);
      
      // Extrahiere den vollständigen Namen (alles vor dem ersten ( mit Gewichtung)
      const nameMatch = trimmedLine.match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      if (nameMatch) {
        const fullName = nameMatch[1].trim(); // Vollständiger Name inkl. Zahlen
        const weight = parseFloat(nameMatch[2]);
        
        // Erkenne die Root-Zeile (keine Einrückung und 100% Gewichtung)
        const isRoot = indent === 0 && Math.abs(weight - 100) < 0.01;
        
        if (isRoot) {
          if (!rootFound) {
            // Erste Root-Zeile - behalte sie
            rootName = fullName;
            rootFound = true;
            cleanedLines.push(line);
          } else {
            // Weitere Root-Zeile mit gleichem Namen - überspringe sie
            console.log('Skipping duplicate root line:', fullName);
            continue;
          }
        } else {
          // Nicht-Root-Zeile
          // Überspringe, wenn sie den gleichen Namen wie die Root hat (sollte nicht als Kind existieren)
          if (rootName && fullName === rootName) {
            console.log('Skipping root name as child:', fullName, 'at indent', indent);
            continue;
          }
          
          const key = `${fullName}:${indent}`;
          
          // Prüfe, ob wir bereits eine Zeile mit demselben Namen und derselben Einrückung gesehen haben
          if (seenEntries.has(key)) {
            console.log('Skipping duplicate entry:', fullName, 'at indent level', indent);
            continue;
          }
          
          seenEntries.set(key, i);
          cleanedLines.push(line);
        }
      } else {
        // Wenn kein Name extrahiert werden kann, füge die Zeile trotzdem hinzu
        cleanedLines.push(line);
      }
    }
    
    return cleanedLines.join('\n');
  };

  const addGradeNode = (parentId?: string) => {
    const newNode: GradeNode = {
      id: generateId(),
      name: '',
      weight: 0,
      children: [],
      isExpanded: true,
      isEditing: true
    };

    if (!parentId) {
      setGradeNodes([...gradeNodes, newNode]);
    } else {
      const updateNodes = (nodes: GradeNode[]): GradeNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [...node.children, newNode]
            };
          }
          return {
            ...node,
            children: updateNodes(node.children)
          };
        });
      };
      setGradeNodes(updateNodes(gradeNodes));
    }
  };

  const updateGradeNode = (nodeId: string, field: keyof GradeNode, value: any) => {
    const updateNodes = (nodes: GradeNode[]): GradeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, [field]: value };
        }
        return {
          ...node,
          children: updateNodes(node.children)
        };
      });
    };
    setGradeNodes(updateNodes(gradeNodes));
  };

  const deleteGradeNode = (nodeId: string) => {
    const deleteFromNodes = (nodes: GradeNode[]): GradeNode[] => {
      return nodes.filter(node => {
        if (node.id === nodeId) {
          return false;
        }
        node.children = deleteFromNodes(node.children);
        return true;
      });
    };
    setGradeNodes(deleteFromNodes(gradeNodes));
  };

  const toggleExpanded = (nodeId: string) => {
    updateGradeNode(nodeId, 'isExpanded', !gradeNodes.find(n => n.id === nodeId)?.isExpanded);
  };

  const calculateWeightSum = (nodes: GradeNode[]): number => {
    return nodes.reduce((sum, node) => sum + node.weight, 0);
  };

  const validateSchema = (nodes: GradeNode[]): boolean => {
    if (nodes.length === 0) return false;
    
    // Only validate the top-level nodes (they should sum to 100%)
    // Subcategories can have arbitrary weights
    const topLevelSum = nodes.reduce((sum, node) => sum + node.weight, 0);
    
    if (Math.abs(topLevelSum - 100) > 0.01) {
      return false;
    }
    
    // Don't validate subcategories - they can have arbitrary weights
    return true;
  };

  const formatSchemaToString = (nodes: GradeNode[], indent: number = 0): string => {
    const lines: string[] = [];
    
    nodes.forEach(node => {
      const line = ' '.repeat(indent) + `${node.name} (${node.weight}%)`;
      lines.push(line);
      
      if (node.children.length > 0) {
        const childLines = formatSchemaToString(node.children, indent + 2);
        lines.push(childLines);
      }
    });
    
    return lines.join('\n');
  };

  const handleSave = async () => {
    if (!schemaName.trim()) {
      setError('Bitte geben Sie einen Namen für das Bewertungsschema ein.');
      return;
    }

    if (gradeNodes.length === 0) {
      setError('Bitte fügen Sie mindestens eine Bewertungskategorie hinzu.');
      return;
    }

    if (!validateSchema(gradeNodes)) {
      setError('Die Hauptkategorien müssen zusammen 100% ergeben. Unterkategorien können beliebige Gewichtungen haben.');
      return;
    }

    setLoading(true);
    try {
      // Füge den Root-Namen hinzu
      const rootLine = `${schemaName} (100%)`;
      const childLines = formatSchemaToString(gradeNodes, 2); // Starte mit 2 Leerzeichen Einrückung
      const schemaString = rootLine + '\n' + childLines;
      
      const method = isEditing && selectedSchema ? 'PUT' : 'POST';
      const url = isEditing && selectedSchema 
        ? `/api/grading-schemas/${selectedSchema.id}`
        : '/api/grading-schemas';

      const requestBody = {
        name: schemaName,
        structure: schemaString,
        gradingSystem: gradingSystem,
        groupId
      };

      console.log('💾 Saving schema:', { method, url });
      console.log('📋 Full schema structure:', schemaString);
      console.log('📊 Grade nodes:', gradeNodes);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const updatedSchema = await response.json();
        console.log('✅ Schema saved successfully:', { id: updatedSchema.id, name: updatedSchema.name, structureLength: updatedSchema.structure?.length });
        // Aktualisiere die Liste der Schemata
        await fetchExistingSchemas();
        // Wenn wir gerade ein Schema bearbeitet haben, aktualisiere es auch im State
        if (isEditing && selectedSchema && selectedSchema.id === updatedSchema.id) {
          setSelectedSchema(updatedSchema);
        }
        resetForm();
        onClose();
      } else {
        const responseText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: responseText };
        }
        console.error('❌ Error saving schema:', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData 
        });
        const errorMessage = errorData.error || `Fehler beim Speichern des Bewertungsschemas (Status: ${response.status})`;
        setError(errorMessage);
      }
    } catch (error) {
      setError('Fehler beim Speichern des Bewertungsschemas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchema = async (schemaId: string) => {
    if (!window.confirm('Möchten Sie dieses Bewertungsschema wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/grading-schemas/${schemaId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchExistingSchemas();
        if (selectedSchema?.id === schemaId) {
          resetForm();
        }
      }
    } catch (error) {
      setError('Fehler beim Löschen des Bewertungsschemas');
    }
  };

  /** Bestehendes Schema für die aktuelle Klasse festlegen (Kopie, Original bleibt bei anderen Gruppen). */
  const handleAssignSchema = async (schema: GradingSchema) => {
    if (!groupId) {
      setError('Keine Lerngruppe ausgewählt.');
      return;
    }
    if (schema.isActive) {
      setError(`„${schema.name}“ ist bereits für ${groupName} aktiv.`);
      return;
    }
    if (!schema.structure?.trim()) {
      setError('Dieses Schema hat keine Struktur und kann nicht zugewiesen werden.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/grading-schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schema.name,
          structure: schema.structure,
          gradingSystem: schema.gradingSystem || 'GERMAN',
          groupId,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorData: { error?: string } = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        setError(errorData.error || 'Schema konnte nicht zugewiesen werden.');
        return;
      }

      await fetchExistingSchemas();
      resetForm();
      onClose();
    } catch (err) {
      console.error('❌ Error assigning schema:', err);
      setError('Fehler beim Zuweisen des Bewertungsschemas');
    } finally {
      setLoading(false);
    }
  };

  const selectSchemaForAssign = (schema: GradingSchema) => {
    setSelectedSchema(schema);
    setIsEditing(false);
    setShowPreview(false);
    setError('');
  };

  const renderCategoryCard = (node: GradeNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const weightSum = hasChildren ? calculateWeightSum(node.children) : 0;
    const isValid = level === 0 && hasChildren ? Math.abs(weightSum - 100) < 0.01 : true;

    return (
      <Box key={node.id} sx={{ mb: 0.5, ml: level * 1.2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            px: 0.8,
            py: 0.4,
            borderRadius: 0.8,
            border: isValid ? `1px solid ${colors.border}` : `1px solid ${colors.error}`,
            borderLeft: level > 0 ? `3px solid ${level === 1 ? colors.primary : colors.accent1}` : undefined,
            bgcolor: level === 0 ? colors.cardBg : colors.hover,
          }}
        >
          <TextField
            size="small"
            placeholder={level === 0 ? 'Hauptkategorie' : 'Unterkategorie'}
            value={node.name}
            onChange={(e) => updateGradeNode(node.id, 'name', e.target.value)}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                fontSize: '0.7rem',
                height: 28,
                bgcolor: colors.cardBg,
              },
              '& .MuiOutlinedInput-input': { py: 0.4, px: 0.8 },
            }}
          />
          <TextField
            size="small"
            type="number"
            value={node.weight}
            onChange={(e) => updateGradeNode(node.id, 'weight', parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            sx={{
              width: 64,
              '& .MuiOutlinedInput-root': { fontSize: '0.7rem', height: 28 },
              '& .MuiOutlinedInput-input': { py: 0.4, px: 0.6 },
            }}
          />
          <Typography sx={{ fontSize: '0.6rem', color: colors.textSecondary, width: 12 }}>%</Typography>
          <Tooltip title="Unterkategorie">
            <IconButton size="small" onClick={() => addGradeNode(node.id)} sx={{ ...compactIconBtnSx, color: colors.primary }}>
              <AddIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          {hasChildren && (
            <Tooltip title={node.isExpanded ? 'Einklappen' : 'Aufklappen'}>
              <IconButton size="small" onClick={() => toggleExpanded(node.id)} sx={{ ...compactIconBtnSx, color: colors.accent1 }}>
                {node.isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Löschen">
            <IconButton size="small" onClick={() => deleteGradeNode(node.id)} sx={{ ...compactIconBtnSx, color: colors.error }}>
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {hasChildren && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.3, mb: 0.2, ml: 0.5 }}>
            <Chip
              size="small"
              label={`${weightSum.toFixed(0)}%`}
              color={isValid ? 'success' : 'error'}
              variant="outlined"
              sx={{ height: 18, fontSize: '0.55rem', '& .MuiChip-label': { px: 0.6 } }}
            />
            {!isValid && level === 0 && (
              <Typography sx={{ fontSize: '0.55rem', color: colors.error }}>muss 100% sein</Typography>
            )}
            <LinearProgress
              variant="determinate"
              value={Math.min(weightSum, 100)}
              sx={{
                flex: 1,
                ...((determinateLinearProgressSx(
                  isValid ? colors.success : colors.error,
                  { height: 4, barGlow: 'transparent' },
                ) as object)),
              }}
            />
          </Box>
        )}

        {hasChildren && node.isExpanded && (
          <Box sx={{ mt: 0.3 }}>
            {node.children.map((child) => renderCategoryCard(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const renderPreview = () => {
    if (!showPreview || gradeNodes.length === 0) return null;

    return (
      <Paper
        elevation={0}
        sx={{
          p: 1,
          mb: 1,
          bgcolor: colors.hover,
          borderRadius: 0.8,
          border: `1px solid ${colors.border}`,
        }}
      >
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: colors.textPrimary, mb: 0.5 }}>
          Vorschau
        </Typography>
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.6rem',
            bgcolor: colors.cardBg,
            p: 0.8,
            borderRadius: 0.6,
            border: `1px solid ${colors.border}`,
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: colors.textPrimary, lineHeight: 1.35 }}>
            {formatSchemaToString(gradeNodes)}
          </pre>
        </Box>
      </Paper>
    );
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth={false}
      sx={{
        '& .MuiDialog-paper': {
          width: isEditing ? 'min(720px, 94vw)' : 'min(440px, 94vw)',
          maxWidth: isEditing ? 720 : 440,
          maxHeight: '88vh',
          borderRadius: 1.5,
          bgcolor: colors.background,
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 1,
          px: 1.5,
          background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent1}10 100%)`,
          borderBottom: `2px solid ${colors.primary}30`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box
            sx={{
              p: 0.3,
              borderRadius: '50%',
              bgcolor: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssessmentIcon sx={{ color: 'white', fontSize: 14 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: colors.textPrimary }}>
            Benotung – {groupName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 1.5, pt: 1.2 }}>
        {error && !isEditing && (
          <Alert severity="error" sx={{ mb: 1, py: 0, fontSize: '0.6rem' }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: isEditing ? 'row' : 'column', gap: 1.2, alignItems: 'stretch' }}>
          <Box sx={{ flex: isEditing ? '0 0 200px' : '1 1 auto', minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: colors.textPrimary, mb: 0.6 }}>
              Schemata
            </Typography>
            <Typography sx={{ fontSize: '0.58rem', color: colors.textSecondary, mb: 0.8, lineHeight: 1.35 }}>
              Anklicken und festlegen — oder neu erstellen.
            </Typography>

            {existingSchemas.length === 0 ? (
              <Typography sx={{ fontSize: '0.65rem', color: colors.textSecondary, py: 2, textAlign: 'center' }}>
                Noch keine Schemata vorhanden.
              </Typography>
            ) : (
              <List dense disablePadding sx={{ maxHeight: isEditing ? '52vh' : '46vh', overflowY: 'auto' }}>
                {existingSchemas.map((schema) => {
                  const isSelected = selectedSchema?.id === schema.id && !isEditing;
                  return (
                    <ListItem
                      key={schema.id}
                      onClick={() => selectSchemaForAssign(schema)}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.15 }}>
                          {!schema.isActive && (
                            <Tooltip title={`Für ${groupName} festlegen`}>
                              <IconButton
                                size="small"
                                disabled={loading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleAssignSchema(schema);
                                }}
                                sx={{ ...compactIconBtnSx, color: colors.success }}
                              >
                                <AssignIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Bearbeiten">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                void loadSchema(schema);
                              }}
                              sx={{ ...compactIconBtnSx, color: colors.primary }}
                            >
                              <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Löschen">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteSchema(schema.id!);
                              }}
                              sx={{ ...compactIconBtnSx, color: colors.error }}
                            >
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                      sx={{
                        py: 0.45,
                        px: 0.8,
                        mb: 0.45,
                        pr: '72px !important',
                        borderRadius: 0.8,
                        border: schema.isActive
                          ? `1.5px solid ${colors.success}`
                          : isSelected
                            ? `1.5px solid ${colors.primary}`
                            : `1px solid ${colors.border}`,
                        bgcolor: schema.isActive ? colors.active : isSelected ? colors.hover : colors.cardBg,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: schema.isActive ? colors.active : colors.hover },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textPrimary }}>
                              {schema.name}
                            </Typography>
                            {schema.isActive && (
                              <Chip
                                label="aktiv"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.5rem',
                                  bgcolor: colors.success,
                                  color: 'white',
                                  '& .MuiChip-label': { px: 0.5 },
                                }}
                              />
                            )}
                            {isSelected && !schema.isActive && (
                              <Chip
                                label="gewählt"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.5rem',
                                  bgcolor: colors.primary,
                                  color: 'white',
                                  '& .MuiChip-label': { px: 0.5 },
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography component="span" sx={{ fontSize: '0.55rem', color: colors.textSecondary }}>
                            {schema.learningGroup?.name
                              ? `von ${schema.learningGroup.name}`
                              : schema.gradingSystem === 'MSS'
                                ? 'MSS'
                                : 'Noten 1–6'}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}

            <Button
              variant="outlined"
              startIcon={<AddIcon sx={{ fontSize: 12 }} />}
              onClick={() => setShowCreateModal(true)}
              fullWidth
              sx={{
                ...compactBtnSx,
                mt: 1,
                borderColor: colors.primary,
                color: colors.primary,
                '&:hover': { borderColor: colors.primary, bgcolor: `${colors.primary}08` },
              }}
            >
              Neues Schema
            </Button>
          </Box>

          {isEditing && (
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                p: 1,
                borderRadius: 0.8,
                border: `1px solid ${colors.border}`,
                bgcolor: colors.cardBg,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textPrimary }}>
                  Schema bearbeiten
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowPreview(!showPreview)}
                  startIcon={
                    showPreview ? (
                      <VisibilityOffIcon sx={{ fontSize: 12 }} />
                    ) : (
                      <VisibilityIcon sx={{ fontSize: 12 }} />
                    )
                  }
                  sx={{ ...compactBtnSx, color: colors.accent1 }}
                >
                  Vorschau
                </Button>
              </Box>

              <TextField
                fullWidth
                size="small"
                label="Name"
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value)}
                sx={{
                  mb: 1,
                  '& .MuiInputLabel-root': { fontSize: '0.7rem' },
                  '& .MuiOutlinedInput-root': { fontSize: '0.7rem', height: 32 },
                }}
              />

              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel sx={{ fontSize: '0.7rem' }}>Notensystem</InputLabel>
                <Select
                  value={gradingSystem}
                  label="Notensystem"
                  onChange={(e) => setGradingSystem(e.target.value)}
                  sx={{ fontSize: '0.7rem', height: 32 }}
                >
                  <MenuItem value="GERMAN" sx={{ fontSize: '0.7rem' }}>
                    Noten 1–6
                  </MenuItem>
                  <MenuItem value="MSS" sx={{ fontSize: '0.7rem' }}>
                    MSS 0–15
                  </MenuItem>
                </Select>
              </FormControl>

              {renderPreview()}

              {error && (
                <Alert severity="error" sx={{ mb: 1, py: 0, fontSize: '0.6rem' }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: colors.textPrimary }}>
                  Kategorien
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                  onClick={() => addGradeNode()}
                  sx={{
                    ...compactBtnSx,
                    bgcolor: colors.primary,
                    '&:hover': { bgcolor: '#256b29' },
                  }}
                >
                  Hauptkategorie
                </Button>
              </Box>
              <Typography sx={{ fontSize: '0.55rem', color: colors.textSecondary, mb: 0.8 }}>
                Hauptkategorien zusammen 100 %.
              </Typography>

              <Box sx={{ maxHeight: '36vh', overflowY: 'auto', pr: 0.3 }}>
                {gradeNodes.map((node) => renderCategoryCard(node))}
              </Box>

              {gradeNodes.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: colors.textPrimary, mb: 0.3 }}>
                    Summe: {calculateWeightSum(gradeNodes).toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(calculateWeightSum(gradeNodes), 100)}
                    sx={determinateLinearProgressSx(
                      Math.abs(calculateWeightSum(gradeNodes) - 100) < 0.01 ? colors.success : colors.error,
                      { height: 5, barGlow: 'transparent' },
                    )}
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 1.5,
          py: 1,
          gap: 0.6,
          borderTop: `1px solid ${colors.border}`,
          background: `linear-gradient(135deg, ${colors.primary}05 0%, ${colors.accent1}03 100%)`,
        }}
      >
        {isEditing ? (
          <>
            <Button
              onClick={() => resetForm()}
              variant="outlined"
              sx={{
                ...compactBtnSx,
                borderColor: colors.border,
                color: colors.textSecondary,
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={loading || !validateSchema(gradeNodes)}
              startIcon={loading ? undefined : <SaveIcon sx={{ fontSize: 12 }} />}
              sx={{
                ...compactBtnSx,
                bgcolor: colors.primary,
                '&:hover': { bgcolor: '#256b29' },
                '&:disabled': { bgcolor: colors.textSecondary },
              }}
            >
              {loading ? 'Speichern…' : 'Aktualisieren'}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{
                ...compactBtnSx,
                borderColor: colors.border,
                color: colors.textSecondary,
              }}
            >
              Schließen
            </Button>
            {selectedSchema && !selectedSchema.isActive && (
              <Button
                onClick={() => void handleAssignSchema(selectedSchema)}
                variant="contained"
                disabled={loading}
                startIcon={<AssignIcon sx={{ fontSize: 12 }} />}
                sx={{
                  ...compactBtnSx,
                  bgcolor: colors.primary,
                  '&:hover': { bgcolor: '#256b29' },
                }}
              >
                {loading ? '…' : `Für ${groupName} festlegen`}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>

    <Dialog
      open={showCreateModal}
      onClose={() => {
        setShowCreateModal(false);
        resetForm();
      }}
      maxWidth={false}
      fullWidth={false}
      sx={{
        zIndex: 1400,
        '& .MuiDialog-paper': {
          width: 'min(520px, 94vw)',
          maxWidth: 520,
          maxHeight: '86vh',
          borderRadius: 1.5,
          bgcolor: colors.background,
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 1,
          px: 1.5,
          background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent1}10 100%)`,
          borderBottom: `2px solid ${colors.primary}30`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box
            sx={{
              p: 0.3,
              borderRadius: '50%',
              bgcolor: colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssessmentIcon sx={{ color: 'white', fontSize: 14 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: colors.textPrimary }}>
            Neues Schema – {groupName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 1.5, pt: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          label="Name"
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          placeholder="z.B. Unter- und Mittelstufe"
          sx={{
            mb: 1,
            '& .MuiInputLabel-root': { fontSize: '0.7rem' },
            '& .MuiOutlinedInput-root': { fontSize: '0.7rem', height: 32 },
          }}
        />

        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel sx={{ fontSize: '0.7rem' }}>Notensystem</InputLabel>
          <Select
            value={gradingSystem}
            label="Notensystem"
            onChange={(e) => setGradingSystem(e.target.value)}
            sx={{ fontSize: '0.7rem', height: 32 }}
          >
            <MenuItem value="GERMAN" sx={{ fontSize: '0.7rem' }}>
              Noten 1–6
            </MenuItem>
            <MenuItem value="MSS" sx={{ fontSize: '0.7rem' }}>
              MSS 0–15
            </MenuItem>
          </Select>
        </FormControl>

        {renderPreview()}

        {error && (
          <Alert severity="error" sx={{ mb: 1, py: 0, fontSize: '0.6rem' }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: colors.textPrimary }}>
            Kategorien
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 12 }} />}
            onClick={() => addGradeNode()}
            sx={{
              ...compactBtnSx,
              bgcolor: colors.primary,
              '&:hover': { bgcolor: '#256b29' },
            }}
          >
            Hauptkategorie
          </Button>
        </Box>
        <Typography sx={{ fontSize: '0.55rem', color: colors.textSecondary, mb: 0.8 }}>
          Hauptkategorien zusammen 100 %. Unterkategorien frei.
        </Typography>

        <Box sx={{ maxHeight: '38vh', overflowY: 'auto', pr: 0.3 }}>
          {gradeNodes.map((node) => renderCategoryCard(node))}
        </Box>

        {gradeNodes.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: colors.textPrimary, mb: 0.3 }}>
              Summe: {calculateWeightSum(gradeNodes).toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(calculateWeightSum(gradeNodes), 100)}
              sx={determinateLinearProgressSx(
                Math.abs(calculateWeightSum(gradeNodes) - 100) < 0.01 ? colors.success : colors.error,
                { height: 5, barGlow: 'transparent' },
              )}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 1.5,
          py: 1,
          gap: 0.6,
          borderTop: `1px solid ${colors.border}`,
          background: `linear-gradient(135deg, ${colors.primary}05 0%, ${colors.accent1}03 100%)`,
        }}
      >
        <Button
          onClick={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          variant="outlined"
          sx={{
            ...compactBtnSx,
            borderColor: colors.border,
            color: colors.textSecondary,
          }}
        >
          Abbrechen
        </Button>
        <Button
          onClick={async () => {
            await handleSave();
            if (!error) {
              setShowCreateModal(false);
              resetForm();
              fetchExistingSchemas();
            }
          }}
          variant="contained"
          disabled={loading || !validateSchema(gradeNodes)}
          startIcon={loading ? undefined : <SaveIcon sx={{ fontSize: 12 }} />}
          sx={{
            ...compactBtnSx,
            bgcolor: colors.primary,
            '&:hover': { bgcolor: '#256b29' },
            '&:disabled': { bgcolor: colors.textSecondary },
          }}
        >
          {loading ? 'Speichern…' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default GradingSchemaModal;
