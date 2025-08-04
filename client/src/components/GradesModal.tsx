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
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Grade as GradeIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

interface GradeNode {
  id: string;
  name: string;
  weight: number;
  children: GradeNode[];
  grade?: number;
}

interface GradingSchema {
  id: string;
  name: string;
  structure: string;
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
          setGradeNodes(parsedNodes);
          await loadExistingGrades(parsedNodes);
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

  const loadExistingGrades = async (nodes: GradeNode[]) => {
    try {
      const response = await fetch(`/api/grades/${student.id}/${gradingSchema?.id}`);
      if (response.ok) {
        const grades = await response.json();
        const updatedNodes = updateNodesWithGrades(nodes, grades);
        setGradeNodes(updatedNodes);
      }
    } catch (error) {
      console.log('No existing grades found or grades table not yet implemented');
      // Für jetzt: Setze die Nodes ohne bestehende Noten
      setGradeNodes(nodes);
    }
  };

  const updateNodesWithGrades = (nodes: GradeNode[], grades: any[]): GradeNode[] => {
    return nodes.map(node => {
      const gradeData = grades.find(g => g.categoryName === node.name);
      const updatedNode = {
        ...node,
        grade: gradeData?.grade || undefined
      };
      
      if (node.children.length > 0) {
        updatedNode.children = updateNodesWithGrades(node.children, grades);
      }
      
      return updatedNode;
    });
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
        children: []
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

  const updateGrade = (nodeId: string, grade: number) => {
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
    setGradeNodes(updateNodes(gradeNodes));
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

  const getGradeColor = (grade: number): string => {
    if (grade >= 1.0 && grade <= 1.5) return colors.success;
    if (grade >= 1.6 && grade <= 2.5) return '#4CAF50';
    if (grade >= 2.6 && grade <= 3.5) return '#FF9800';
    if (grade >= 3.6 && grade <= 4.5) return '#F57C00';
    if (grade >= 4.6 && grade <= 6.0) return colors.accent2;
    return colors.textSecondary;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const grades = collectAllGrades(gradeNodes);
      
      // Für jetzt: Zeige eine Vorschau der zu speichernden Noten
      console.log('Noten zum Speichern:', {
        studentId: student.id,
        schemaId: gradingSchema?.id,
        grades
      });
      
      // Simuliere erfolgreiches Speichern
      setSuccess('Noten-Vorschau erstellt! (Backend-Integration folgt später)');
      setTimeout(() => {
        onClose();
      }, 2000);
      
      /* 
      // Backend-Integration (später zu aktivieren):
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          schemaId: gradingSchema?.id,
          grades
        }),
      });

      if (response.ok) {
        setSuccess('Noten erfolgreich gespeichert!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fehler beim Speichern der Noten');
      }
      */
    } catch (error) {
      setError('Fehler beim Speichern der Noten');
    } finally {
      setSaving(false);
    }
  };

  const collectAllGrades = (nodes: GradeNode[]): any[] => {
    const grades: any[] = [];
    
    const collect = (nodeList: GradeNode[]) => {
      nodeList.forEach(node => {
        if (node.children.length === 0 && node.grade !== undefined) {
          grades.push({
            categoryName: node.name,
            grade: node.grade,
            weight: node.weight
          });
        } else if (node.children.length > 0) {
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

    return (
      <Box key={node.id} sx={{ mb: 0.7 }}>
        <Card 
          variant="outlined" 
          sx={{ 
            borderRadius: 1.4,
            ml: level * 3.5,
            borderLeft: level > 0 ? `4px solid ${isTopLevel ? colors.primary : colors.accent1}` : '1px solid #e0e0e0',
            bgcolor: level === 0 ? colors.cardBg : 
                     level === 1 ? '#fafafa' : 
                     level === 2 ? '#f5f5f5' : '#f0f0f0'
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
                    <GradeIcon sx={{ fontSize: 12 }} />
                  </Avatar>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      color: colors.textPrimary
                    }}
                  >
                    {node.name}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: '0.6rem',
                    color: colors.textSecondary
                  }}
                >
                  Gewichtung: {node.weight}%
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                {!hasChildren && (
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="Note"
                    value={node.grade || ''}
                    onChange={(e) => updateGrade(node.id, parseFloat(e.target.value) || 0)}
                    variant="outlined"
                    inputProps={{ 
                      min: 1, 
                      max: 6, 
                      step: 0.1,
                      style: { 
                        fontSize: '0.65rem',
                        color: node.grade ? getGradeColor(node.grade) : colors.textPrimary
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 0.7,
                        minHeight: '32px'
                      }
                    }}
                  />
                )}
                {hasChildren && node.grade !== undefined && (
                  <Chip 
                    label={`${node.grade.toFixed(1)}`}
                    size="small"
                    sx={{ 
                      bgcolor: getGradeColor(node.grade),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.6rem',
                      height: 24
                    }}
                  />
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {hasChildren && (
          <Box sx={{ mt: 0.35 }}>
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
      <DialogTitle sx={{ pb: 0.7 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
          <GradeIcon sx={{ color: colors.primary, fontSize: 16 }} />
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            fontSize: '0.75rem',
            color: colors.textPrimary
          }}>
            Noten eintragen - {student.name}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: colors.textSecondary }}>
          {groupName} • {gradingSchema?.name}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ p: 1.4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.4, borderRadius: 0.7, fontSize: '0.6rem' }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 1.4, borderRadius: 0.7, fontSize: '0.6rem' }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 1.4 }}>
          <Alert severity="info" sx={{ mb: 1.4, borderRadius: 0.7, fontSize: '0.6rem' }}>
            💡 Frontend-Vorschau: Noten können eingegeben werden, aber werden noch nicht in der Datenbank gespeichert.
          </Alert>
          
          <Typography variant="h6" sx={{ 
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: colors.textPrimary,
            mb: 0.7
          }}>
            Bewertungskategorien
          </Typography>
          
          <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 0.35 }}>
            {gradeNodes.map(node => renderGradeInput(node))}
          </Box>
        </Box>
        
        {finalGrade > 0 && (
          <Paper elevation={1} sx={{ p: 1.4, bgcolor: '#f8f9fa', borderRadius: 1.4 }}>
            <Typography variant="h6" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.7,
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: colors.textPrimary
            }}>
              <AssessmentIcon sx={{ fontSize: 14, color: colors.primary }} />
              Gesamtnote: {finalGrade.toFixed(1)}
            </Typography>
            <Chip 
              label={`${finalGrade.toFixed(1)}`}
              sx={{ 
                bgcolor: getGradeColor(finalGrade),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: 28,
                mt: 0.7
              }}
            />
          </Paper>
        )}
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
          disabled={saving}
          startIcon={saving ? undefined : <SaveIcon sx={{ fontSize: 14 }} />}
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
          {saving ? 'Vorschau...' : 'Vorschau erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GradesModal; 