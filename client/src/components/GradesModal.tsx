import React, { useState, useEffect, useCallback } from 'react';
import {
  Save as SaveIcon,
  Grade as GradeIcon,
  Assessment as AssessmentIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  IconButton
} from '@mui/material';

interface GradeNode {
  id: string;
  name: string;
  weight: number;
  children: GradeNode[];
  grade?: number;
  locked?: boolean; // Neu: ob die Note gesperrt ist
  originalLevel?: number; // Neu: ursprüngliches Level für Einrückung
}

interface GradingSchema {
  id: string;
  name: string;
  structure: string;
  gradingSystem?: string;
}

interface Student {
  id: string;
  name: string;
  loginCode: string;
  avatarEmoji?: string;
}

interface GradesModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
  groupId: string;
  groupName: string;
}

// App color palette
const colors = {
  primary: '#2E7D32',
  secondary: '#F57C00',
  accent1: '#1976D2',
  accent2: '#C2185B',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  success: '#4CAF50',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
};

const GradesModal: React.FC<GradesModalProps> = ({
  open,
  onClose,
  student,
  groupId,
  groupName
}) => {
  const [gradingSchema, setGradingSchema] = useState<GradingSchema | null>(null);
  const [gradeNodes, setGradeNodes] = useState<GradeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lockedGrades, setLockedGrades] = useState<Set<string>>(new Set()); // Neu: Set der gesperrten Noten-IDs

  const fetchGradingSchema = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/grading-schemas/${groupId}`);
      if (response.ok) {
        const schemas = await response.json();
        if (schemas.length > 0) {
          const schema = schemas[0]; // Verwende das erste Schema
          setGradingSchema(schema);
          const parsedNodes = parseSchemaString(schema.structure);
          // Verwende die vollständige Hierarchie ohne Filterung
          setGradeNodes(parsedNodes);
          // Lade bestehende Noten nachdem das Schema gesetzt wurde
          await loadExistingGrades(parsedNodes, schema);
        } else {
          setError('Kein Bewertungsschema für diese Lerngruppe gefunden.');
        }
      }
    } catch (error) {
      setError('Fehler beim Laden des Bewertungsschemas');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (open && student) {
      fetchGradingSchema();
    }
  }, [open, groupId, student, fetchGradingSchema]);

  // Don't render if no student is selected
  if (!student) {
    return null;
  }

  const loadExistingGrades = async (nodes: GradeNode[], schema?: GradingSchema) => {
    try {
      const currentSchema = schema || gradingSchema;
      if (!currentSchema?.id) {
        console.log('Debug - No schema ID, setting nodes directly');
        setGradeNodes(nodes);
        return;
      }
      
      console.log('Debug - Loading grades for student:', student.id, 'schema:', currentSchema.id);
      const response = await fetch(`/api/grades/${student.id}/${currentSchema.id}`);
      console.log('Debug - Load response status:', response.status);
      
      if (response.ok) {
        const grades = await response.json();
        console.log('Debug - Loaded grades:', grades);
        const updatedNodes = updateNodesWithGrades(nodes, grades);
        console.log('Debug - Updated nodes:', updatedNodes);
        setGradeNodes(updatedNodes);
      } else {
        console.log('Debug - No existing grades found, setting nodes directly');
        setGradeNodes(nodes);
      }
    } catch (error) {
      console.log('Debug - Error loading grades:', error);
      console.log('Debug - Setting nodes directly due to error');
      setGradeNodes(nodes);
    }
  };

  const updateNodesWithGrades = (nodes: GradeNode[], grades: any[]): GradeNode[] => {
    const newLockedGrades = new Set<string>();
    
    const updateNodes = (nodeList: GradeNode[]): GradeNode[] => {
      return nodeList.map(node => {
        const gradeData = grades.find(g => g.categoryName === node.name);
        const updatedNode = {
          ...node,
          grade: gradeData?.grade || undefined,
          locked: false // Neue Noten sind nicht gesperrt
        };
        
        // Nur Noten sperren, die bereits in der Datenbank existieren
        if (gradeData?.grade !== undefined) {
          newLockedGrades.add(node.id);
        }
        
        if (node.children.length > 0) {
          updatedNode.children = updateNodes(node.children);
        }
        
        return updatedNode;
      });
    };
    
    const updatedNodes = updateNodes(nodes);
    setLockedGrades(newLockedGrades);
    return updatedNodes;
  };

  const toggleGradeLock = (nodeId: string) => {
    setLockedGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const isGradeLocked = (nodeId: string): boolean => {
    return lockedGrades.has(nodeId);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const parseSchemaString = (schemaStr: string): GradeNode[] => {
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
      
      let match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      if (!match) {
        match = line.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)%?$/);
      }
      if (!match) {
        match = line.trim().match(/^(.+?)\s*(\d+(?:\.\d+)?)%$/);
      }
      
      if (!match) continue;

      const [, name, weightStr] = match;
      const weight = parseFloat(weightStr);

      if (isNaN(weight)) continue;

      const node: GradeNode = {
        id: generateId(),
        name: name.trim(),
        weight: weight,
        children: [],
        originalLevel: Math.floor(indent / 2) // Speichere das ursprüngliche Level basierend auf Einrückung
      };

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, indent });
    }

    return result;
  };



  const updateGrade = (nodeId: string, grade: number | undefined) => {
    // Prüfe ob die Note gesperrt ist
    if (isGradeLocked(nodeId)) {
      console.log('Grade is locked, cannot update');
      return;
    }

    const updateNodes = (nodes: GradeNode[]): GradeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, grade };
        }
        return {
          ...node,
          children: updateNodes(node.children)
        };
      });
    };
    
    const updatedNodes = updateNodes(gradeNodes);
    setGradeNodes(updatedNodes);
  };

  const calculateWeightedGrade = (nodes: GradeNode[]): number => {
    let totalWeight = 0;
    let weightedSum = 0;

    const calculate = (nodeList: GradeNode[]) => {
      nodeList.forEach(node => {
        if (node.children.length === 0 && node.grade !== undefined) {
          totalWeight += node.weight;
          weightedSum += (node.grade * node.weight);
        } else if (node.children.length > 0) {
          calculate(node.children);
        }
      });
    };

    calculate(nodes);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  // Berechnet Zwischensummen für ALLE Kategorien mit Kindern (rekursiv)
  const calculateIntermediateGrade = (node: GradeNode): number | null => {
    if (node.children.length === 0) {
      return node.grade !== undefined ? node.grade : null;
    }

    let totalWeight = 0;
    let weightedSum = 0;
    let hasValidGrades = false;

    // Rekursiv alle Kinder durchgehen
    node.children.forEach(child => {
      const childGrade = calculateIntermediateGrade(child);
      if (childGrade !== null) {
        totalWeight += child.weight;
        weightedSum += (childGrade * child.weight);
        hasValidGrades = true;
      }
    });

    return hasValidGrades && totalWeight > 0 ? weightedSum / totalWeight : null;
  };

  // Gültige Notenwerte basierend auf dem Notensystem


  // Funktion zur Formatierung der deutschen Notenanzeige
  const formatGermanGrade = (grade: number): string => {
    if (grade === 1.0) return '1';
    if (grade === 1.3) return '1-';
    if (grade === 1.7) return '2+';
    if (grade === 2.0) return '2';
    if (grade === 2.3) return '2-';
    if (grade === 2.7) return '3+';
    if (grade === 3.0) return '3';
    if (grade === 3.3) return '3-';
    if (grade === 3.7) return '4+';
    if (grade === 4.0) return '4';
    if (grade === 4.3) return '4-';
    if (grade === 4.7) return '5+';
    if (grade === 5.0) return '5';
    if (grade === 5.3) return '5-';
    if (grade === 6.0) return '6';
    return grade.toFixed(1);
  };

  // Funktion zur Konvertierung von deutschen Notentexten zu numerischen Werten
  const convertGermanGradeTextToNumber = (text: string): number | null => {
    const cleanText = text.trim().toLowerCase();
    
    // Direkte Zuordnung
    const gradeMap: { [key: string]: number } = {
      '1': 1.0,
      '1-': 1.3,
      '2+': 1.7,
      '2': 2.0,
      '2-': 2.3,
      '3+': 2.7,
      '3': 3.0,
      '3-': 3.3,
      '4+': 3.7,
      '4': 4.0,
      '4-': 4.3,
      '5+': 4.7,
      '5': 5.0,
      '5-': 5.3,
      '6': 6.0
    };
    
    return gradeMap[cleanText] || null;
  };

  const getGradeColor = (grade: number, gradingSystem: string = 'GERMAN'): string => {
    if (gradingSystem === 'MSS') {
      // MSS-Farben: 15-13 = sehr gut, 12-10 = gut, 9-7 = befriedigend, 6-4 = ausreichend, 3-1 = mangelhaft, 0 = ungenügend
      if (grade >= 13) return colors.success;
      if (grade >= 10) return '#4CAF50';
      if (grade >= 7) return '#FF9800';
      if (grade >= 4) return '#F57C00';
      if (grade >= 1) return '#FF5722';
      return colors.accent2; // 0 = ungenügend
    } else {
      // Deutsches Schulnotensystem (korrigierte Werte)
      if (grade >= 1.0 && grade <= 1.7) return colors.success; // 1, 1-, 2+
      if (grade >= 2.0 && grade <= 2.7) return '#4CAF50'; // 2, 2-, 3+
      if (grade >= 3.0 && grade <= 3.7) return '#FF9800'; // 3, 3-, 4+
      if (grade >= 4.0 && grade <= 4.7) return '#F57C00'; // 4, 4-, 5+
      if (grade >= 5.0 && grade <= 6.0) return colors.accent2; // 5, 5-, 6
      return colors.textSecondary;
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const grades = collectAllGrades(gradeNodes);
      
      console.log('Debug - Grades to save:', grades);
      console.log('Debug - Student ID:', student.id);
      console.log('Debug - Schema ID:', gradingSchema?.id);
      
      if (!gradingSchema?.id) {
        setError('Kein Bewertungsschema gefunden');
        return;
      }

      if (grades.length === 0) {
        setError('Keine Noten zum Speichern vorhanden');
        return;
      }

      const requestBody = {
        studentId: student.id,
        schemaId: gradingSchema.id,
        grades
      };
      
      console.log('Debug - Request body:', requestBody);

      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Debug - Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Debug - Success result:', result);
        setSuccess('Noten erfolgreich gespeichert!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        console.log('Debug - Error data:', errorData);
        setError(errorData.error || 'Fehler beim Speichern der Noten');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Noten:', error);
      setError('Fehler beim Speichern der Noten');
    } finally {
      setSaving(false);
    }
  };

  const collectAllGrades = (nodes: GradeNode[]): any[] => {
    const grades: any[] = [];
    
    const collect = (nodeList: GradeNode[]) => {
      nodeList.forEach(node => {
        // Sammle nur Noten von Blattknoten (ohne Kinder) - diese sind manuell eingegeben
        if (node.children.length === 0 && node.grade !== undefined) {
          grades.push({
            categoryName: node.name,
            grade: node.grade,
            weight: node.weight
          });
        }
        // Rekursiv durch alle Kinder gehen
        if (node.children.length > 0) {
          collect(node.children);
        }
      });
    };

    collect(nodes);
    return grades;
  };

  const renderGradeInput = (node: GradeNode, level: number = 0) => {
    const isTopLevel = level === 0;
    const hasChildren = node.children.length > 0;
    // Verwende originalLevel falls verfügbar, sonst das übergebene level
    const displayLevel = node.originalLevel !== undefined ? node.originalLevel : level;

    return (
      <Box key={node.id} sx={{ mb: 0.4 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderRadius: 1,
            ml: displayLevel * 4, // Kompaktere Einrückung
            borderLeft: displayLevel > 0 ? `3px solid ${isTopLevel ? colors.primary : 
                              displayLevel === 1 ? colors.accent1 : 
                              displayLevel === 2 ? colors.secondary : colors.accent2}` : '1px solid #e0e0e0',
            bgcolor: displayLevel === 0 ? '#ffffff' : 
                     displayLevel === 1 ? '#f8fbff' : 
                     displayLevel === 2 ? '#fff8f5' : '#f5f8ff',
            borderColor: displayLevel === 0 ? '#e0e0e0' : 
                        displayLevel === 1 ? '#d0e0f0' : 
                        displayLevel === 2 ? '#f0d0c0' : '#e0d0f0'
          }}
        >
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'nowrap' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.6rem',
                  fontWeight: 'bold',
                  color: colors.textPrimary,
                  minWidth: '100px'
                }}
              >
                {node.name}
              </Typography>
              
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.55rem',
                  color: colors.textSecondary,
                  minWidth: '60px'
                }}
              >
                {node.weight}%
              </Typography>
              
              {!hasChildren ? (
                // Nur für Blattknoten (ohne Kinder) - manuelle Eingabe
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontSize: '0.5rem',
                      color: colors.textSecondary,
                      fontStyle: 'italic',
                      minWidth: '50px'
                    }}
                  >
                    Eingabe
                  </Typography>
                  <TextField
                    size="small"
                    value={node.grade !== undefined ? 
                      (gradingSchema?.gradingSystem === 'MSS' ? 
                        node.grade.toString() : 
                        formatGermanGrade(node.grade)
                      ) : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateGrade(node.id, undefined);
                      } else {
                        // Für MSS: Nur Zahlen 0-15
                        if (gradingSchema?.gradingSystem === 'MSS') {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 0 && numValue <= 15) {
                            updateGrade(node.id, numValue);
                          }
                        } else {
                          // Für deutsche Noten: Konvertiere Text zu numerischem Wert
                          const germanGrade = convertGermanGradeTextToNumber(value);
                          if (germanGrade !== null) {
                            updateGrade(node.id, germanGrade);
                          }
                        }
                      }
                    }}
                    placeholder={gradingSchema?.gradingSystem === 'MSS' ? '0-15' : '1, 1-, 2+, 2, 2-, 3+, 3, 3-, 4+, 4, 4-, 5+, 5, 5-, 6'}
                    disabled={isGradeLocked(node.id)}
                    sx={{ 
                      fontSize: '0.6rem',
                      flex: 1,
                      maxWidth: '100px',
                      '& .MuiInputBase-input': { 
                        fontSize: '0.6rem',
                        padding: '4px 8px'
                      },
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0.6,
                        minHeight: '28px',
                        ...(isGradeLocked(node.id) && {
                          bgcolor: '#f8f8f8',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: colors.accent2,
                            borderWidth: '1.5px'
                          }
                        })
                      }
                    }}
                  />
                  {node.grade !== undefined && (
                    <Chip
                      label={gradingSchema?.gradingSystem === 'MSS' ? 
                        `${node.grade} Punkte` : 
                        formatGermanGrade(node.grade)
                      }
                      size="small"
                      sx={{
                        bgcolor: getGradeColor(node.grade, gradingSchema?.gradingSystem),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.55rem',
                        height: 20,
                        px: 0.6
                      }}
                    />
                  )}
                  {node.grade !== undefined && (
                    <IconButton
                      size="small"
                      onClick={() => toggleGradeLock(node.id)}
                      sx={{ 
                        p: 0.3,
                        bgcolor: isGradeLocked(node.id) ? colors.accent2 : 'transparent',
                        color: isGradeLocked(node.id) ? 'white' : colors.textSecondary,
                        border: `1px solid ${isGradeLocked(node.id) ? colors.accent2 : '#ddd'}`,
                        borderRadius: 0.6,
                        width: '24px',
                        height: '24px',
                        '&:hover': {
                          bgcolor: isGradeLocked(node.id) ? colors.accent2 : colors.primary,
                          color: 'white',
                          borderColor: isGradeLocked(node.id) ? colors.accent2 : colors.primary
                        },
                        transition: 'all 0.2s ease'
                      }}
                      title={isGradeLocked(node.id) ? 'Note entsperren' : 'Note sperren'}
                    >
                      {isGradeLocked(node.id) ? <LockIcon sx={{ fontSize: 12 }} /> : <LockOpenIcon sx={{ fontSize: 12 }} />}
                    </IconButton>
                  )}
                </Box>
              ) : (
                // Für Kategorien mit Kindern - automatisch berechnete Note
                (() => {
                  const intermediateGrade = calculateIntermediateGrade(node);
                  return intermediateGrade !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.5rem',
                          color: colors.textSecondary,
                          fontStyle: 'italic',
                          minWidth: '50px'
                        }}
                      >
                        Berechnet
                      </Typography>
                      <Chip 
                        label={`${gradingSchema?.gradingSystem === 'MSS' ? 
                          `${intermediateGrade.toFixed(0)} Punkte` : 
                          formatGermanGrade(intermediateGrade)
                        }`}
                        size="small"
                        sx={{ 
                          bgcolor: getGradeColor(intermediateGrade, gradingSchema?.gradingSystem),
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.55rem',
                          height: 20,
                          opacity: 0.8
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.5rem',
                          color: colors.textSecondary,
                          fontStyle: 'italic',
                          minWidth: '50px'
                        }}
                      >
                        Berechnet
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.55rem',
                          color: colors.textSecondary,
                          fontStyle: 'italic'
                        }}
                      >
                        Keine Noten
                      </Typography>
                    </Box>
                  );
                })()
              )}
              

            </Box>
          </CardContent>
        </Card>
        
        {hasChildren && (
          <Box sx={{ mt: 0.2 }}>
            {node.children.map(child => renderGradeInput(child, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Lade Bewertungsschema...</Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </DialogContent>
      </Dialog>
    );
  }

  const finalGrade = calculateWeightedGrade(gradeNodes);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <GradeIcon sx={{ color: colors.primary, fontSize: 14 }} />
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '0.7rem',
            color: colors.textPrimary
          }}>
            Noten eintragen - {student.name}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: colors.textSecondary }}>
          {groupName} • {gradingSchema?.name}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ p: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1, borderRadius: 0.6, fontSize: '0.55rem' }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 1, borderRadius: 0.6, fontSize: '0.55rem' }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 1 }}>
          
          <Typography variant="h6" sx={{ 
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: colors.textPrimary,
            mb: 0.5
          }}>
            Bewertungskategorien
          </Typography>
          
          <Box sx={{ maxHeight: 350, overflowY: 'auto', pr: 0.3 }}>
            {gradeNodes.map(node => renderGradeInput(node))}
          </Box>
        </Box>
        
        {finalGrade > 0 && (
          <Paper elevation={1} sx={{ p: 1, bgcolor: '#f8f9fa', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              fontSize: '0.7rem',
              fontWeight: 'bold',
              color: colors.textPrimary
            }}>
              <AssessmentIcon sx={{ fontSize: 12, color: colors.primary }} />
              Gesamtnote: {gradingSchema?.gradingSystem === 'MSS' ? 
                `${finalGrade.toFixed(0)} Punkte` : 
                formatGermanGrade(finalGrade)
              }
            </Typography>
            <Chip 
              label={gradingSchema?.gradingSystem === 'MSS' ? 
                `${finalGrade.toFixed(0)} Punkte` : 
                formatGermanGrade(finalGrade)
              }
              sx={{ 
                bgcolor: getGradeColor(finalGrade, gradingSchema?.gradingSystem),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.65rem',
                height: 24,
                mt: 0.5
              }}
            />
          </Paper>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 1 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ 
            borderRadius: 0.6, 
            px: 0.6,
            py: 0.15,
            fontSize: '0.55rem',
            height: '20px'
          }}
        >
          Abbrechen
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
          startIcon={saving ? undefined : <SaveIcon sx={{ fontSize: 12 }} />}
          sx={{ 
            borderRadius: 0.6, 
            px: 0.6,
            py: 0.15,
            fontSize: '0.55rem',
            height: '20px',
            fontWeight: 'bold',
            bgcolor: colors.primary,
            '&:hover': { bgcolor: colors.primary, filter: 'brightness(1.1)' }
          }}
        >
          {saving ? 'Speichern...' : 'Noten speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GradesModal;