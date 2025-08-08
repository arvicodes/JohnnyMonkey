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
}

interface GradingSchemaModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

// App color palette
const colors = {
  primary: '#2E7D32', // Dunkleres Grün für besseren Kontrast
  secondary: '#F57C00', // Dunkleres Orange
  accent1: '#1976D2', // Dunkleres Blau
  accent2: '#C2185B', // Dunkleres Pink
  background: '#F8FAFC', // Helleres, moderneres Blau
  cardBg: '#FFFFFF',
  success: '#4CAF50',
  textPrimary: '#2C3E50', // Dunkler Text für bessere Lesbarkeit
  textSecondary: '#7F8C8D', // Grauer Text für Sekundärinformationen
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
      const response = await fetch(`/api/grading-schemas/${groupId}`);
      if (response.ok) {
        const schemas = await response.json();
        setExistingSchemas(schemas);
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
      <Box key={node.id} sx={{ mb: 0.7 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderRadius: 1.4,
            border: isValid ? '1px solid #e0e0e0' : '1px solid #f44336',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transform: 'translateY(-1px)'
            },
            // Klare Einrückung basierend auf Level
            ml: level * 3.5,
            // Visueller Indikator für Hierarchie
            borderLeft: level > 0 ? `4px solid ${isTopLevel ? colors.primary : colors.accent1}` : '1px solid #e0e0e0',
            // Hintergrundfarbe für verschiedene Ebenen
            bgcolor: isValid ? 
              (level === 0 ? colors.cardBg : 
               level === 1 ? '#fafafa' : 
               level === 2 ? '#f5f5f5' : '#f0f0f0') : '#ffebee'
          }}
        >
          <CardContent sx={{ p: 1.4, '&:last-child': { pb: 1.4 } }}>
            <Grid container spacing={0.7} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: isTopLevel ? colors.primary : 
                              level === 1 ? colors.accent1 : 
                              level === 2 ? colors.secondary : colors.accent2,
                      width: 20,
                      height: 20,
                      fontSize: '0.6rem'
                    }}
                  >
                    {isTopLevel ? <CategoryIcon sx={{ fontSize: 12 }} /> : 
                     level === 1 ? <SubdirectoryIcon sx={{ fontSize: 12 }} /> :
                     level === 2 ? <SubdirectoryIcon sx={{ fontSize: 12 }} /> :
                     <SubdirectoryIcon sx={{ fontSize: 12 }} />}
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
                        borderRadius: 0.7,
                        fontSize: '0.65rem',
                        minHeight: '32px'
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
                      borderRadius: 0.7,
                      fontSize: '0.65rem',
                      minHeight: '32px'
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', gap: 0.35, justifyContent: 'flex-end' }}>
                  <Tooltip title="Unterkategorie hinzufügen">
                    <IconButton 
                      size="small" 
                      onClick={() => addGradeNode(node.id)}
                      sx={{ 
                        bgcolor: colors.primary,
                        color: 'white',
                        width: 24,
                        height: 24,
                        '&:hover': { bgcolor: colors.primary, filter: 'brightness(1.1)' }
                      }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
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
                          width: 24,
                          height: 24,
                          '&:hover': { bgcolor: colors.accent1, filter: 'brightness(1.1)' }
                        }}
                      >
                        {node.isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  <Tooltip title="Kategorie löschen">
                    <IconButton 
                      size="small" 
                      onClick={() => deleteGradeNode(node.id)}
                      sx={{ 
                        bgcolor: colors.accent2,
                        color: 'white',
                        width: 24,
                        height: 24,
                        '&:hover': { bgcolor: colors.accent2, filter: 'brightness(1.1)' }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
            
            {hasChildren && (
              <Box sx={{ mt: 0.7 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.35 }}>
                  <Chip 
                    icon={isValid ? <CheckCircleIcon sx={{ fontSize: 12 }} /> : <ErrorIcon sx={{ fontSize: 12 }} />}
                    label={`Summe: ${weightSum.toFixed(1)}%`}
                    color={isValid ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.6rem',
                      height: 18
                    }}
                  />
                  {!isValid && level === 0 && (
                    <Typography variant="caption" color="error" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}>
                      Sollte 100% sein
                    </Typography>
                  )}
                  {level > 0 && (
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.6rem' }}>
                      Unterkategorien können beliebige Gewichtungen haben
                    </Typography>
                  )}
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(weightSum, 100)} 
                  sx={{ 
                    height: 3,
                    borderRadius: 1.5,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isValid ? colors.success : '#f44336',
                      borderRadius: 1.5,
                    }
                  }} 
                />
              </Box>
            )}
          </CardContent>
        </Card>
        
        {/* Rekursiv alle Kinder rendern - nur wenn expanded */}
        {hasChildren && node.isExpanded && (
          <Box sx={{ mt: 0.35 }}>
            {node.children.map(child => renderCategoryCard(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const renderPreview = () => {
    if (!showPreview || gradeNodes.length === 0) return null;

    return (
      <Paper elevation={1} sx={{ p: 1.4, mb: 1.4, bgcolor: '#f8f9fa', borderRadius: 1.4 }}>
        <Typography variant="h6" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.7,
          fontSize: '0.75rem',
          fontWeight: 'bold',
          color: colors.textPrimary
        }}>
          <VisibilityIcon sx={{ fontSize: 14, color: colors.primary }} />
          Vorschau des Schemas
        </Typography>
        <Box sx={{ 
          fontFamily: 'monospace', 
          fontSize: '0.6rem', 
          bgcolor: 'white', 
          p: 0.7, 
          borderRadius: 0.7,
          border: '1px solid #e0e0e0'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
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
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ pb: 0.7 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
          <AssessmentIcon sx={{ color: colors.primary, fontSize: 16 }} />
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '0.75rem',
            color: colors.textPrimary
          }}>
            Bewertungsschema {isEditing ? 'bearbeiten' : 'erstellen'} - {groupName}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 1.4 }}>
        <Grid container spacing={1.4}>
          {/* Existing Schemas Section */}
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 1.4, height: 'fit-content', borderRadius: 1.4 }}>
              <Typography variant="h6" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.7,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: colors.textPrimary
              }}>
                <CategoryIcon sx={{ fontSize: 14, color: colors.primary }} />
                Bestehende Schemata
              </Typography>
              
              {existingSchemas.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 1.4 }}>
                  <CategoryIcon sx={{ fontSize: 24, color: 'grey.400', mb: 0.7 }} />
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.6rem' }}>
                    Noch keine Bewertungsschemata vorhanden.
                  </Typography>
                </Box>
              ) : (
                <List dense>
                  {existingSchemas.map((schema) => (
                    <ListItem 
                      key={schema.id}
                      sx={{ 
                        border: selectedSchema?.id === schema.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        borderRadius: 0.7,
                        mb: 0.35,
                        bgcolor: selectedSchema?.id === schema.id ? '#e3f2fd' : 'white',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: selectedSchema?.id === schema.id ? '#e3f2fd' : '#f5f5f5',
                          transform: 'translateX(1px)'
                        }
                      }}
                    >
                      <ListItemText
                        primary={schema.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                              {schema.createdAt ? new Date(schema.createdAt).toLocaleDateString('de-DE') : ''}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled' }}>
                              {schema.gradingSystem === 'GERMAN' ? 'Deutsches Notensystem' : 'MSS-Punktesystem'}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                              {schema.structure.substring(0, 100)}...
                            </Typography>
                          </Box>
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: '0.65rem',
                            fontWeight: 'bold'
                          },
                          '& .MuiListItemText-secondary': {
                            fontSize: '0.6rem'
                          }
                        }}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 0.2 }}>
                          <Tooltip title="Bearbeiten">
                            <IconButton 
                              size="small" 
                              onClick={() => loadSchema(schema)}
                              sx={{ 
                                color: colors.primary,
                                width: 20,
                                height: 20
                              }}
                            >
                              <EditIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Löschen">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteSchema(schema.id!)}
                              sx={{ 
                                color: colors.accent2,
                                width: 20,
                                height: 20
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 12 }} />
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
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
                fullWidth
                sx={{ 
                  mt: 0.7,
                  borderRadius: 0.7,
                  py: 0.2,
                  px: 0.7,
                  fontSize: '0.6rem',
                  height: '24px',
                  bgcolor: colors.primary,
                  '&:hover': { bgcolor: colors.primary, filter: 'brightness(1.1)' }
                }}
              >
                Neues Schema erstellen
              </Button>
            </Paper>
          </Grid>

          {/* Schema Editor Section */}
          <Grid item xs={12} md={8}>
            <Paper elevation={1} sx={{ p: 1.4, borderRadius: 1.4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.4 }}>
                <Typography variant="h6" sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.7,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: colors.textPrimary
                }}>
                  <AssessmentIcon sx={{ fontSize: 14, color: colors.primary }} />
                  {isEditing ? 'Schema bearbeiten' : 'Neues Schema erstellen'}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={showPreview ? <VisibilityOffIcon sx={{ fontSize: 14 }} /> : <VisibilityIcon sx={{ fontSize: 14 }} />}
                  onClick={() => setShowPreview(!showPreview)}
                  sx={{ 
                    borderRadius: 0.7,
                    py: 0.2,
                    px: 0.7,
                    fontSize: '0.6rem',
                    height: '24px'
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
                  mb: 1.4,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0.7,
                    fontSize: '0.65rem',
                    minHeight: '32px'
                  }
                }}
              />
              
              <FormControl fullWidth size="small" sx={{ mb: 1.4 }}>
                <InputLabel sx={{ fontSize: '0.65rem' }}>Notensystem</InputLabel>
                <Select
                  value={gradingSystem}
                  onChange={(e) => setGradingSystem(e.target.value)}
                  label="Notensystem"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0.7,
                      fontSize: '0.65rem',
                      minHeight: '32px'
                    }
                  }}
                >
                  <MenuItem value="GERMAN" sx={{ fontSize: '0.65rem' }}>
                    Deutsches Schulnotensystem (1-6)
                  </MenuItem>
                  <MenuItem value="MSS" sx={{ fontSize: '0.65rem' }}>
                    MSS-Punktesystem (0-15)
                  </MenuItem>
                </Select>
              </FormControl>
              
              {renderPreview()}
              
              {error && (
                <Alert severity="error" sx={{ mb: 1.4, borderRadius: 0.7, fontSize: '0.6rem' }}>
                  {error}
                </Alert>
              )}
              
              <Box sx={{ mb: 1.4 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.7,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: colors.textPrimary
                }}>
                  <CategoryIcon sx={{ fontSize: 14, color: colors.primary }} />
                  Bewertungskategorien
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 0.7, fontSize: '0.6rem' }}>
                  Erstellen Sie Kategorien und Unterkategorien mit Gewichtungen. 
                  Die Hauptkategorien müssen zusammen 100% ergeben. Unterkategorien können beliebige Gewichtungen haben.
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                  onClick={() => addGradeNode()}
                  sx={{ 
                    mb: 0.7,
                    borderRadius: 0.7,
                    py: 0.2,
                    px: 0.7,
                    fontSize: '0.6rem',
                    height: '24px',
                    bgcolor: colors.primary,
                    '&:hover': { bgcolor: colors.primary, filter: 'brightness(1.1)' }
                  }}
                >
                  Hauptkategorie hinzufügen
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.35 }}>
                {gradeNodes.map(node => renderCategoryCard(node))}
              </Box>
              
              {gradeNodes.length > 0 && (
                <Paper elevation={1} sx={{ mt: 1.4, p: 1.4, bgcolor: '#f8f9fa', borderRadius: 1.4 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.7,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: colors.textPrimary
                  }}>
                    <InfoIcon sx={{ fontSize: 14, color: colors.primary }} />
                    Gesamtsumme: {calculateWeightSum(gradeNodes).toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(calculateWeightSum(gradeNodes), 100)} 
                    sx={{ 
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: Math.abs(calculateWeightSum(gradeNodes) - 100) < 0.01 ? colors.success : '#f44336',
                        borderRadius: 2,
                      }
                    }} 
                  />
                  {Math.abs(calculateWeightSum(gradeNodes) - 100) > 0.01 && (
                    <Typography color="error" variant="body2" sx={{ mt: 0.35, fontWeight: 'bold', fontSize: '0.6rem' }}>
                      Die Gesamtsumme muss 100% betragen.
                    </Typography>
                  )}
                </Paper>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 1.4 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ 
            borderRadius: 0.7, 
            px: 0.7,
            py: 0.2,
            fontSize: '0.6rem',
            height: '24px'
          }}
        >
          Abbrechen
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading || !validateSchema(gradeNodes)}
          startIcon={loading ? undefined : <SaveIcon sx={{ fontSize: 14 }} />}
          sx={{ 
            borderRadius: 0.7, 
            px: 0.7,
            py: 0.2,
            fontSize: '0.6rem',
            height: '24px',
            fontWeight: 'bold',
            bgcolor: colors.primary,
            '&:hover': { bgcolor: colors.primary, filter: 'brightness(1.1)' }
          }}
        >
          {loading ? 'Speichern...' : (isEditing ? 'Aktualisieren' : 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GradingSchemaModal; 