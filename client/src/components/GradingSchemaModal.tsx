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
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  LinearProgress,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Assessment as AssessmentIcon,
  Category as CategoryIcon,
  SubdirectoryArrowRight as SubdirectoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
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

// App color palette - Moderner und akzentuierter
const colors = {
  primary: '#1E88E5', // Modernes Blau
  secondary: '#FF6B35', // Lebendiges Orange
  accent1: '#7C4DFF', // Elegantes Violett
  accent2: '#E91E63', // Modernes Pink
  background: '#FAFBFF', // Sehr helles Blau
  cardBg: '#FFFFFF',
  success: '#00C853', // Lebendiges Grün
  warning: '#FF9800', // Warmes Orange
  error: '#F44336', // Klares Rot
  textPrimary: '#1A237E', // Dunkles Blau
  textSecondary: '#546E7A', // Modernes Grau
  border: '#E3F2FD', // Helles Blau
  hover: '#F5F9FF', // Sehr helles Blau für Hover
  active: '#E8F4FD' // Helles Blau für aktive Elemente
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
        
        // Mark the active schema (the one that belongs to the current group)
        const schemasWithActiveStatus = allSchemas.map((schema: any) => ({
          ...schema,
          isActive: schema.groupId === groupId
        }));
        
        setExistingSchemas(schemasWithActiveStatus);
      }
    } catch (error) {
      console.error('Error fetching schemas:', error);
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

      if (isNaN(weight)) {
        console.warn('Invalid weight in line:', line);
        continue;
      }

      // Filtere doppelte Einträge mit gleichem Namen und gleicher Einrückung
      const isDuplicate = stack.some(item => 
        item.indent === indent && 
        item.node.name === name.trim()
      );
      
      if (isDuplicate) {
        console.warn('Skipping duplicate entry:', name.trim(), 'at level', indent);
        continue;
      }

      const node: GradeNode = {
        id: generateId(),
        name: name.trim(),
        weight: weight,
        children: [],
        isExpanded: true
      };

      // Find the correct parent based on indentation
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        // This is a top-level node
        result.push(node);
      } else {
        // This is a child node
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, indent });
    }

    return result;
  };

  const loadSchema = (schema: GradingSchema) => {
    try {
      setSelectedSchema(schema);
      setSchemaName(schema.name);
      setGradingSystem(schema.gradingSystem || 'GERMAN');
      console.log('Loading schema structure:', schema.structure);
      const parsedNodes = parseSchemaString(schema.structure);
      console.log('Parsed nodes:', parsedNodes);
      setGradeNodes(parsedNodes);
      setIsEditing(true);
    } catch (error) {
      console.error('Error loading schema:', error);
      setError('Fehler beim Laden des Schemas: ' + (error instanceof Error ? error.message : String(error)));
    }
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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        await fetchExistingSchemas();
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
        setError(errorData.error || 'Fehler beim Speichern des Bewertungsschemas');
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

  const renderCategoryCard = (node: GradeNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const weightSum = hasChildren ? calculateWeightSum(node.children) : 0;
    const isValid = level === 0 && hasChildren ? Math.abs(weightSum - 100) < 0.01 : true;
    const isTopLevel = level === 0;

    return (
      <Box key={node.id} sx={{ mb: 1 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderRadius: 2,
            border: isValid ? `1px solid ${colors.border}` : `2px solid ${colors.error}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transform: 'translateY(-2px)'
            },
            // Klare Einrückung basierend auf Level
            ml: level * 2,
            // Visueller Indikator für Hierarchie
            borderLeft: level > 0 ? `4px solid ${isTopLevel ? colors.primary : colors.accent1}` : 'none',
            // Hintergrundfarbe für verschiedene Ebenen
            bgcolor: isValid ? 
              (level === 0 ? colors.cardBg : 
               level === 1 ? colors.hover : 
               level === 2 ? colors.active : '#f8f9fa') : '#ffebee'
          }}
        >
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: isTopLevel ? colors.primary : 
                              level === 1 ? colors.accent1 : 
                              level === 2 ? colors.secondary : colors.accent2,
                      width: 24,
                      height: 24,
                      fontSize: '0.7rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isTopLevel ? <CategoryIcon sx={{ fontSize: 14 }} /> : 
                     level === 1 ? <SubdirectoryIcon sx={{ fontSize: 14 }} /> :
                     level === 2 ? <SubdirectoryIcon sx={{ fontSize: 14 }} /> :
                     <SubdirectoryIcon sx={{ fontSize: 14 }} />}
                  </Avatar>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={isTopLevel ? "Hauptkategorie" : 
                                level === 1 ? "Unterkategorie" :
                                level === 2 ? "Unter-Unterkategorie" : "Kategorie"}
                    value={node.name}
                    onChange={(e) => updateGradeNode(node.id, 'name', e.target.value)}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        fontSize: '0.75rem',
                        minHeight: '36px',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: colors.primary
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: colors.primary,
                          borderWidth: 2
                        }
                      }
                    }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  placeholder="Gewichtung %"
                  value={node.weight}
                  onChange={(e) => updateGradeNode(node.id, 'weight', parseFloat(e.target.value) || 0)}
                  variant="outlined"
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      fontSize: '0.75rem',
                      minHeight: '36px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.primary
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.primary,
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <Tooltip title="Unterkategorie hinzufügen">
                    <IconButton 
                      size="small" 
                      onClick={() => addGradeNode(node.id)}
                      sx={{ 
                        bgcolor: colors.primary,
                        color: 'white',
                        width: 28,
                        height: 28,
                        '&:hover': { 
                          bgcolor: colors.accent1,
                          transform: 'scale(1.1)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }
                      }}
                    >
                      <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  
                  {hasChildren && (
                    <Tooltip title={node.isExpanded ? "Einklappen" : "Aufklappen"}>
                      <IconButton 
                        size="small" 
                        onClick={() => toggleExpanded(node.id)}
                        sx={{ 
                          bgcolor: colors.accent1,
                          color: 'white',
                          width: 28,
                          height: 28,
                          '&:hover': { 
                            bgcolor: colors.primary,
                            transform: 'scale(1.1)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                          }
                        }}
                      >
                        {node.isExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  <Tooltip title="Kategorie löschen">
                    <IconButton 
                      size="small" 
                      onClick={() => deleteGradeNode(node.id)}
                      sx={{ 
                        bgcolor: colors.error,
                        color: 'white',
                        width: 28,
                        height: 28,
                        '&:hover': { 
                          bgcolor: '#d32f2f',
                          transform: 'scale(1.1)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
            
            {hasChildren && (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip 
                    icon={isValid ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ErrorIcon sx={{ fontSize: 14 }} />}
                    label={`Summe: ${weightSum.toFixed(1)}%`}
                    color={isValid ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      height: 24,
                      borderWidth: 2
                    }}
                  />
                  {!isValid && level === 0 && (
                    <Typography variant="caption" color="error" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                      Sollte 100% sein
                    </Typography>
                  )}
                  {level > 0 && (
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                      Unterkategorien können beliebige Gewichtungen haben
                    </Typography>
                  )}
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(weightSum, 100)} 
                  sx={{ 
                    height: 6,
                    borderRadius: 3,
                    bgcolor: colors.border,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isValid ? colors.success : colors.error,
                      borderRadius: 3,
                    }
                  }} 
                />
              </Box>
            )}
          </CardContent>
        </Card>
        
        {/* Rekursiv alle Kinder rendern - nur wenn expanded */}
        {hasChildren && node.isExpanded && (
          <Box sx={{ mt: 0.5 }}>
            {node.children.map(child => renderCategoryCard(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const renderPreview = () => {
    if (!showPreview || gradeNodes.length === 0) return null;

    return (
      <Paper elevation={0} sx={{ 
        p: 2, 
        mb: 2, 
        bgcolor: colors.hover, 
        borderRadius: 2,
        border: `1px solid ${colors.border}`
      }}>
        <Typography variant="h6" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          fontSize: '0.9rem',
          fontWeight: 'bold',
          color: colors.textPrimary,
          mb: 1
        }}>
          <VisibilityIcon sx={{ fontSize: 18, color: colors.primary }} />
          Vorschau des Schemas
        </Typography>
        <Box sx={{ 
          fontFamily: 'monospace', 
          fontSize: '0.75rem', 
          bgcolor: colors.cardBg, 
          p: 1.5, 
          borderRadius: 2,
          border: `1px solid ${colors.border}`,
          maxHeight: 200,
          overflowY: 'auto'
        }}>
          <pre style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            color: colors.textPrimary,
            lineHeight: 1.5
          }}>
            {formatSchemaToString(gradeNodes)}
          </pre>
        </Box>
      </Paper>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md" // Wieder breiter gemacht
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          background: colors.background
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1, 
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent1} 100%)`,
        color: 'white',
        borderRadius: '8px 8px 0 0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon sx={{ color: 'white', fontSize: 20 }} />
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '1rem',
            color: 'white'
          }}>
            Bewertungsschema {isEditing ? 'bearbeiten' : 'erstellen'} - {groupName}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, background: colors.background }}>
        <Grid container spacing={2}>
          {/* Existing Schemata Section - Schmaler */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ 
              p: 2, 
              height: 'fit-content', 
              borderRadius: 2,
              border: `2px solid ${colors.border}`,
              background: colors.cardBg
            }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: colors.textPrimary,
                mb: 2
              }}>
                <CategoryIcon sx={{ fontSize: 18, color: colors.primary }} />
                Bestehende Schemata
              </Typography>
              
              {existingSchemas.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CategoryIcon sx={{ fontSize: 32, color: colors.textSecondary, mb: 1 }} />
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                    Noch keine Bewertungsschemata vorhanden.
                  </Typography>
                </Box>
              ) : (
                <List dense sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {existingSchemas.map((schema) => (
                    <ListItem 
                      key={schema.id}
                      sx={{ 
                        border: schema.isActive ? `2px solid ${colors.success}` : (selectedSchema?.id === schema.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`),
                        borderRadius: 1.5,
                        mb: 1,
                        bgcolor: schema.isActive ? colors.active : (selectedSchema?.id === schema.id ? colors.hover : colors.cardBg),
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: schema.isActive ? colors.active : (selectedSchema?.id === schema.id ? colors.hover : colors.hover),
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                              {schema.name}
                            </Typography>
                            {schema.isActive && (
                              <Chip 
                                label="Aktiv" 
                                size="small" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.6rem',
                                  bgcolor: colors.success,
                                  color: 'white',
                                  fontWeight: 'bold'
                                }} 
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.7rem', color: colors.textSecondary }}>
                              {schema.createdAt ? new Date(schema.createdAt).toLocaleDateString('de-DE') : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: colors.accent1, fontWeight: 'bold' }}>
                              {schema.gradingSystem === 'GERMAN' ? 'Deutsches Notensystem' : 'MSS-Punktesystem'}
                            </Typography>
                          </Box>
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          },
                          '& .MuiListItemText-secondary': {
                            fontSize: '0.7rem'
                          }
                        }}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Bearbeiten">
                            <IconButton 
                              size="small" 
                              onClick={() => loadSchema(schema)}
                              sx={{ 
                                color: colors.primary,
                                width: 28,
                                height: 28,
                                '&:hover': { bgcolor: colors.hover }
                              }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Löschen">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteSchema(schema.id!)}
                              sx={{ 
                                color: colors.error,
                                width: 28,
                                height: 28,
                                '&:hover': { bgcolor: '#FFEBEE' }
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }}/>
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Button
                variant="contained"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
                fullWidth
                sx={{ 
                  mt: 2,
                  borderRadius: 2,
                  py: 1,
                  px: 2,
                  fontSize: '0.8rem',
                  height: '36px',
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent1} 100%)`,
                  '&:hover': { 
                    background: `linear-gradient(135deg, ${colors.accent1} 0%, ${colors.primary} 100%)`,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }
                }}
              >
                Neues Schema erstellen
              </Button>
            </Paper>
          </Grid>

          {/* Schema Editor Section - Breiter */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ 
              p: 2, 
              borderRadius: 2,
              border: `2px solid ${colors.border}`,
              background: colors.cardBg
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: colors.textPrimary
                }}>
                  <AssessmentIcon sx={{ fontSize: 18, color: colors.primary }} />
                  {isEditing ? 'Schema bearbeiten' : 'Neues Schema erstellen'}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={showPreview ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                  onClick={() => setShowPreview(!showPreview)}
                  sx={{ 
                    borderRadius: 2,
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.7rem',
                    height: '32px',
                    borderColor: colors.primary,
                    color: colors.primary,
                    '&:hover': { 
                      borderColor: colors.accent1,
                      bgcolor: colors.hover
                    }
                  }}
                >
                  {showPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
                </Button>
              </Box>
              
              <TextField
                fullWidth
                label="Name des Bewertungsschemas"
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value)}
                placeholder="z.B. Mathematik Bewertung 2024"
                variant="outlined"
                size="small"
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: '0.8rem',
                    minHeight: '40px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                      borderWidth: 2
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.8rem',
                    color: colors.textSecondary
                  }
                }}
              />
              
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel sx={{ fontSize: '0.8rem', color: colors.textSecondary }}>Notensystem</InputLabel>
                <Select
                  value={gradingSystem}
                  onChange={(e) => setGradingSystem(e.target.value)}
                  label="Notensystem"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.8rem',
                      minHeight: '40px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.primary
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: colors.primary,
                        borderWidth: 2
                      }
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.8rem',
                      color: colors.textSecondary
                    }
                  }}
                >
                  <MenuItem value="GERMAN" sx={{ fontSize: '0.8rem' }}>
                    Deutsches Schulnotensystem (1-6)
                  </MenuItem>
                  <MenuItem value="MSS" sx={{ fontSize: '0.8rem' }}>
                    MSS-Punktesystem (0-15)
                  </MenuItem>
                </Select>
              </FormControl>
              
              {renderPreview()}
              
              {error && (
                <Alert severity="error" sx={{ 
                  mb: 2, 
                  borderRadius: 2, 
                  fontSize: '0.8rem',
                  border: `1px solid ${colors.error}`,
                  '& .MuiAlert-icon': {
                    color: colors.error
                  }
                }}>
                  {error}
                </Alert>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: colors.textPrimary,
                  mb: 1
                }}>
                  <CategoryIcon sx={{ fontSize: 18, color: colors.primary }} />
                  Bewertungskategorien
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5, fontSize: '0.75rem', lineHeight: 1.4 }}>
                  Erstellen Sie Kategorien und Unterkategorien mit Gewichtungen. 
                  Die Hauptkategorien müssen zusammen 100% ergeben. Unterkategorien können beliebige Gewichtungen haben.
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={() => addGradeNode()}
                  sx={{ 
                    mb: 1.5,
                    borderRadius: 2,
                    py: 0.8,
                    px: 2,
                    fontSize: '0.8rem',
                    height: '36px',
                    background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.accent2} 100%)`,
                    '&:hover': { 
                      background: `linear-gradient(135deg, ${colors.accent2} 0%, ${colors.secondary} 100%)`,
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }
                  }}
                >
                  Hauptkategorie hinzufügen
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 350, overflowY: 'auto', pr: 1 }}>
                {gradeNodes.map(node => renderCategoryCard(node))}
              </Box>
              
              {gradeNodes.length > 0 && (
                <Paper elevation={0} sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: colors.hover, 
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: colors.textPrimary,
                    mb: 1
                  }}>
                    <InfoIcon sx={{ fontSize: 18, color: colors.primary }} />
                    Gesamtsumme: {calculateWeightSum(gradeNodes).toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(calculateWeightSum(gradeNodes), 100)} 
                    sx={{ 
                      height: 8,
                      borderRadius: 4,
                      bgcolor: colors.border,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: Math.abs(calculateWeightSum(gradeNodes) - 100) < 0.01 ? colors.success : colors.error,
                        borderRadius: 4,
                      }
                    }} 
                  />
                  {Math.abs(calculateWeightSum(gradeNodes) - 100) > 0.01 && (
                    <Typography color="error" variant="body2" sx={{ mt: 1, fontWeight: 'bold', fontSize: '0.75rem' }}>
                      Die Gesamtsumme muss 100% betragen.
                    </Typography>
                  )}
                </Paper>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 2, 
        background: colors.background,
        borderTop: `1px solid ${colors.border}`,
        borderRadius: '0 0 8px 8px'
      }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ 
            borderRadius: 2, 
            px: 2,
            py: 1,
            fontSize: '0.8rem',
            height: '36px',
            borderColor: colors.textSecondary,
            color: colors.textSecondary,
            '&:hover': {
              borderColor: colors.textPrimary,
              bgcolor: colors.hover
            }
          }}
        >
          Abbrechen
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading || !validateSchema(gradeNodes)}
          startIcon={loading ? undefined : <SaveIcon sx={{ fontSize: 16 }} />}
          sx={{ 
            borderRadius: 2, 
            px: 2,
            py: 1,
            fontSize: '0.8rem',
            height: '36px',
            fontWeight: 'bold',
            background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`,
            '&:hover': { 
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.success} 100%)`,
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            },
            '&:disabled': {
              background: colors.textSecondary
            }
          }}
        >
          {loading ? 'Speichern...' : (isEditing ? 'Aktualisieren' : 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GradingSchemaModal; 