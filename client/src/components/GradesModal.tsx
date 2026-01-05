import React, { useState, useEffect, useCallback } from 'react';
import {
  Save as SaveIcon,
  Grade as GradeIcon,
  Assessment as AssessmentIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  ExpandLess,
  ExpandMore
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
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox
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
  border: '#e0e0e0' // Neu: Farbe für Linien
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set()); // Neu: Set der erweiterten Kategorien
  const [isGradeReleased, setIsGradeReleased] = useState(false); // Freigabestatus der Gesamtnote

  // Alle Kategorien standardmäßig aufgeklappt
  useEffect(() => {
    if (gradeNodes.length > 0) {
      const allNodeIds = new Set<string>();
      const collectNodeIds = (nodes: GradeNode[]) => {
        nodes.forEach(node => {
          if (node.children.length > 0) {
            allNodeIds.add(node.id);
            collectNodeIds(node.children);
          }
        });
      };
      collectNodeIds(gradeNodes);
      setExpandedNodes(allNodeIds);
    }
  }, [gradeNodes]);

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

  useEffect(() => {
    if (open && student && gradingSchema?.id) {
      loadGradeRelease();
    }
  }, [open, student, gradingSchema?.id]);

  const loadGradeRelease = async () => {
    try {
      if (!gradingSchema?.id) return;
      const response = await fetch(`/api/grades/release/${student.id}/${gradingSchema.id}`);
      if (response.ok) {
        const data = await response.json();
        setIsGradeReleased(data.isReleased || false);
      }
    } catch (error) {
      console.error('Error loading grade release status:', error);
    }
  };

  const toggleGradeRelease = async (isReleased: boolean) => {
    try {
      console.log('toggleGradeRelease called with:', isReleased);
      console.log('gradingSchema?.id:', gradingSchema?.id);
      console.log('student.id:', student.id);
      
      if (!gradingSchema?.id) {
        console.error('No grading schema ID');
        return;
      }
      
      const response = await fetch('/api/grades/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          schemaId: gradingSchema.id,
          isReleased
        })
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        setIsGradeReleased(isReleased);
        setSuccess(isReleased ? 'Gesamtnote wurde freigegeben' : 'Gesamtnote wurde gesperrt');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        setError('Fehler beim Freigeben der Gesamtnote');
      }
    } catch (error) {
      console.error('Error toggling grade release:', error);
      setError('Fehler beim Freigeben der Gesamtnote');
    }
  };

  // Don't render if no student is selected
  if (!student) {
    return null;
  }

  const loadExistingGrades = async (nodes: GradeNode[], schema?: GradingSchema) => {
    try {
      const currentSchema = schema || gradingSchema;
      if (!currentSchema?.id) {
        setGradeNodes(nodes);
        return;
      }
      
      const response = await fetch(`/api/grades/${student.id}/${currentSchema.id}`);
      
      if (response.ok) {
        const grades = await response.json();
        const updatedNodes = updateNodesWithGrades(nodes, grades);
        setGradeNodes(updatedNodes);
      } else {
        setGradeNodes(nodes);
      }
    } catch (error) {
      setGradeNodes(nodes);
    }
  };

  const updateNodesWithGrades = (nodes: GradeNode[], grades: any[]): GradeNode[] => {
    const newLockedGrades = new Set<string>();
    
    const updateNodes = (nodeList: GradeNode[]): GradeNode[] => {
      return nodeList.map(node => {
        // Suche case-insensitive nach der Note
        let gradeData = grades.find(g => g.categoryName === node.name);
        if (!gradeData) {
          // Fallback: Suche case-insensitive
          const nodeNameLower = node.name.toLowerCase().trim();
          gradeData = grades.find(g => g.categoryName.toLowerCase().trim() === nodeNameLower);
        }
        const updatedNode = {
          ...node,
          grade: gradeData?.grade !== undefined && gradeData?.grade !== null ? parseFloat(gradeData.grade.toString()) : undefined,
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
    
    // Berechne Zwischennoten für alle Kategorien mit Kindern
    const updateCalculatedGrades = (nodeList: GradeNode[]): GradeNode[] => {
      return nodeList.map(node => {
        if (node.children.length > 0) {
          const updatedChildren = updateCalculatedGrades(node.children);
          const calculatedGrade = calculateIntermediateGrade({ ...node, children: updatedChildren });
          return {
            ...node,
            children: updatedChildren,
            grade: calculatedGrade !== null ? calculatedGrade : node.grade
          };
        }
        return node;
      });
    };

    const finalNodes = updateCalculatedGrades(updatedNodes);
    setLockedGrades(newLockedGrades);
    return finalNodes;
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
      
      // Verbesserte Regex für verschiedene Formate
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

      // Bereinige den Namen - entferne doppelte Einträge
      let cleanName = name.trim();
      
      // Wenn der Name mit dem vorherigen übereinstimmt, überspringe ihn
      if (stack.length > 0 && stack[stack.length - 1].node.name === cleanName) {
        continue;
      }

      const node: GradeNode = {
        id: generateId(),
        name: cleanName,
        weight: weight,
        children: [],
        originalLevel: Math.floor(indent / 2)
      };

      // Korrekte Hierarchie basierend auf Einrückung
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
    
    // Aktualisiere berechnete Noten für alle Zwischenkategorien
    const updateCalculatedGrades = (nodeList: GradeNode[]): GradeNode[] => {
      return nodeList.map(node => {
        if (node.children.length > 0) {
          const updatedChildren = updateCalculatedGrades(node.children);
          const calculatedGrade = calculateIntermediateGrade({ ...node, children: updatedChildren });
          return {
            ...node,
            children: updatedChildren,
            grade: calculatedGrade !== null ? calculatedGrade : node.grade
          };
        }
        return node;
      });
    };

    const finalNodes = updateCalculatedGrades(updatedNodes);
    setGradeNodes(finalNodes);
  };

  // Berechnet gewichtete Note aus Kindern
  const calculateWeightedGrade = (node: GradeNode): number | null => {
    if (node.children.length === 0) {
      return node.grade !== undefined ? node.grade : null;
    }

    const validChildren = node.children.filter(child => {
      const childGrade = calculateWeightedGrade(child);
      return childGrade !== null;
    });

    if (validChildren.length === 0) {
      return null;
    }

    const totalWeight = validChildren.reduce((sum, child) => sum + child.weight, 0);
    if (totalWeight === 0) {
      return null;
    }

    const weightedSum = validChildren.reduce((sum, child) => {
      const childGrade = calculateWeightedGrade(child);
      return sum + (childGrade! * child.weight);
    }, 0);

    return weightedSum / totalWeight;
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
  const getValidGradeValues = (gradingSystem: string = 'GERMAN'): number[] => {
    if (gradingSystem === 'MSS') {
      // MSS: 0-15 Punkte (nur ganze Zahlen), 0 = Zurücksetzen
      return Array.from({ length: 16 }, (_, i) => i);
    } else {
      // Deutsches System: 0 = Zurücksetzen, dann 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3, 4.7, 5.0, 5.3, 6.0
      return [0, 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3, 4.7, 5.0, 5.3, 6.0];
    }
  };

  // Funktion zur Formatierung der deutschen Notenanzeige
  const formatGermanGrade = (grade: number): string => {
    if (grade === 0) return '0'; // 0 = Zurücksetzen
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

  // Funktion zur Formatierung der MSS-Punkte
  const formatMSSPoints = (points: number): string => {
    return points.toString();
  };

  // Funktion zur Formatierung der Noten basierend auf dem System
  const formatGrade = (grade: number, gradingSystem: string = 'GERMAN'): string => {
    if (gradingSystem === 'MSS') {
      return formatMSSPoints(grade);
    } else {
      return formatGermanGrade(grade);
    }
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
      // MSS-Farben: 15-13 = sehr gut, 12-10 = gut, 9-7 = befriedigend, 6-4 = ausreichend, 3-1 = mangelhaft, 0 = ungenügend/zurücksetzen
      if (grade >= 13) return colors.success;
      if (grade >= 10) return '#4CAF50';
      if (grade >= 7) return '#FF9800';
      if (grade >= 4) return '#F57C00';
      if (grade >= 1) return '#FF5722';
      return colors.accent2; // 0 = ungenügend/zurücksetzen
    } else {
      // Deutsches Schulnotensystem (korrigierte Werte)
      // 0 = Zurücksetzen (graue Farbe)
      if (grade === 0) return colors.textSecondary;
      if (grade >= 1.0 && grade <= 1.7) return colors.success; // 1, 1-, 2+
      if (grade >= 2.0 && grade <= 2.7) return '#4CAF50'; // 2, 2-, 3+
      if (grade >= 3.0 && grade <= 3.7) return '#FF9800'; // 3, 3-, 4+
      if (grade >= 4.0 && grade <= 4.7) return '#F57C00'; // 4, 4-, 5+
      if (grade >= 5.0 && grade <= 6.0) return colors.accent2; // 5, 5-, 6
      return colors.textSecondary;
    }
  };

  // Validiert alle eingegebenen Noten für MSS
  const validateMSSGrades = (nodes: GradeNode[]): boolean => {
    if (gradingSchema?.gradingSystem !== 'MSS') return true;
    
    const validateNode = (node: GradeNode): boolean => {
      if (node.children.length === 0) {
        // Blattknoten - prüfe die Note
        if (node.grade !== undefined) {
          if (!Number.isInteger(node.grade) || node.grade < 0 || node.grade > 15) {
            return false;
          }
        }
        return true;
      } else {
        // Kategorie mit Kindern - prüfe rekursiv
        return node.children.every(validateNode);
      }
    };
    
    return nodes.every(validateNode);
  };

  // Hilfsfunktion zum Finden eines Nodes nach Namen
  const findNodeByName = (nodes: GradeNode[], name: string): GradeNode | null => {
    for (const node of nodes) {
      if (node.name === name) return node;
      if (node.children.length > 0) {
        const found = findNodeByName(node.children, name);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Validiere MSS-Noten
      if (gradingSchema?.gradingSystem === 'MSS' && !validateMSSGrades(gradeNodes)) {
        setError('MSS-Noten müssen zwischen 0 und 15 liegen und ganze Zahlen sein.');
        return;
      }

      // Berechne finale Note
      const finalGrade = calculateWeightedGrade(gradeNodes[0]); // Verwende den Root-Node
      
      if (finalGrade === null) {
        setError('Keine gültigen Noten zum Speichern gefunden.');
        return;
      }

      // Validiere finale Note - erlaube berechnete Werte innerhalb des gültigen Bereichs
      const gradingSystem = gradingSchema?.gradingSystem || 'GERMAN';
      let isValidFinalGrade = false;
      
      if (finalGrade === 0) {
        // 0 ist immer erlaubt (Zurücksetzen)
        isValidFinalGrade = true;
      } else if (gradingSystem === 'MSS') {
        // MSS: 0-15, ganze Zahlen
        isValidFinalGrade = Number.isInteger(finalGrade) && finalGrade >= 0 && finalGrade <= 15;
      } else {
        // GERMAN: 0-6.0, erlaube berechnete Dezimalwerte
        isValidFinalGrade = finalGrade >= 0 && finalGrade <= 6.0;
      }
      
      if (!isValidFinalGrade) {
        setError(`Ungültige finale Note: ${finalGrade.toFixed(2)}. ${gradingSystem === 'MSS' ? 'MSS: 0-15 (ganze Zahlen)' : 'GERMAN: 0-6.0'}`);
        return;
      }

      // Sammle alle Noten
      const gradesToSave: any[] = [];
      const collectGrades = (nodes: GradeNode[]) => {
        nodes.forEach(node => {
          if (node.grade !== undefined) {
            gradesToSave.push({
              categoryName: node.name,
              grade: node.grade,
              weight: node.weight
            });
          }
          if (node.children.length > 0) {
            collectGrades(node.children);
          }
        });
      };
      collectGrades(gradeNodes);

      // Speichere alle Noten in einem Request
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          schemaId: gradingSchema!.id,
          grades: gradesToSave
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Noten');
      }
      
      // Aktualisiere die gesperrten Noten
      const newLockedGrades = new Set<string>();
      gradesToSave.forEach(grade => {
        const node = findNodeByName(gradeNodes, grade.categoryName);
        if (node) {
          newLockedGrades.add(node.id);
        }
      });
      setLockedGrades(prev => {
        const combined = new Set(prev);
        newLockedGrades.forEach(grade => combined.add(grade));
        return combined;
      });

      setSuccess('Noten erfolgreich gespeichert!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error saving grades:', error);
      setError('Fehler beim Speichern der Noten');
    } finally {
      setSaving(false);
    }
  };

  const collectAllGrades = (nodes: GradeNode[]): any[] => {
    const grades: any[] = [];
    
    const collect = (nodeList: GradeNode[]) => {
      nodeList.forEach(node => {
        // Sammle Noten von Blattknoten (ohne Kinder) - diese sind manuell eingegeben
        if (node.children.length === 0 && node.grade !== undefined) {
          grades.push({
            categoryName: node.name,
            grade: node.grade,
            weight: node.weight
          });
        }
        // Sammle auch berechnete Noten von Zwischenkategorien, wenn sie vorhanden sind
        else if (node.children.length > 0 && node.grade !== undefined) {
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

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const formatGermanMini = (grade: number): string => {
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

  const renderGradeNode = (node: GradeNode, level: number = 0): JSX.Element => {
    const isLeaf = node.children.length === 0;
    const isCalculated = !isLeaf && node.grade !== undefined;
    const isLocked = isGradeLocked(node.id);
    
    // Für MSS: Zeige nur die relevanten Einträge, nicht die doppelten "Oberstufe"
    if (gradingSchema?.gradingSystem === 'MSS' && node.name === 'Oberstufe - MSS' && level === 0) {
      // Überspringe den Root-Eintrag für MSS, zeige direkt die Kinder
      return (
        <Box key={node.id}>
          {node.children.map(child => renderGradeNode(child, level + 1))}
        </Box>
      );
    }

    return (
      <Box key={node.id} sx={{ mb: 0.8 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.8,
            pl: level * 1.5,
            borderLeft: level > 0 ? `2px solid ${colors.border}` : 'none',
            py: 0.3
          }}
        >
          {!isLeaf && (
            <IconButton
              size="small"
              onClick={() => toggleNodeExpansion(node.id)}
              sx={{ 
                p: 0,
                minWidth: 20,
                width: 20,
                height: 20,
                '& .MuiSvgIcon-root': {
                  fontSize: 16,
                  width: 16,
                  height: 16
                }
              }}
            >
              {expandedNodes.has(node.id) ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
          
          <Typography
            variant="body2"
            sx={{
              fontSize: isLeaf ? '0.75rem' : '0.8rem',
              // Eindeutige Markierung: Kategorien mit gesetzten Noten sind farbig
              color: isLeaf && node.grade !== undefined ? getGradeColor(node.grade, gradingSchema?.gradingSystem) : (isLeaf ? colors.textPrimary : colors.textSecondary),
              fontWeight: isLeaf && node.grade !== undefined ? 600 : (isLeaf ? 'normal' : 'bold')
            }}
          >
            {node.name}
            {/* Status-Indikator für gesetzte vs. leere Noten */}
            {isLeaf && (
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: node.grade !== undefined ? getGradeColor(node.grade, gradingSchema?.gradingSystem) : '#ccc',
                  ml: 0.5,
                  verticalAlign: 'middle',
                  border: node.grade === undefined ? '1px solid #999' : 'none'
                }}
              />
            )}
          </Typography>
          
          <Typography
            variant="caption"
            sx={{
              color: colors.textSecondary,
              fontSize: '0.65rem'
            }}
          >
            ({node.weight}%)
          </Typography>

          {isLeaf && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
              {/* Formatierte Anzeige der Note */}
              {node.grade !== undefined && gradingSchema?.gradingSystem !== 'MSS' && (
                <Chip
                  label={formatGermanGrade(node.grade)}
                  size="small"
                  sx={{
                    backgroundColor: getGradeColor(node.grade, gradingSchema?.gradingSystem),
                    color: 'white',
                    fontSize: '0.65rem',
                    height: '22px',
                    fontWeight: 600,
                    minWidth: '35px'
                  }}
                />
              )}
              <TextField
                size="small"
                type="number"
                inputProps={{ 
                  step: "0.1", 
                  min: "0", 
                  max: "6"
                }}
                value={node.grade !== undefined ? node.grade : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  // Erlaube explizit "0" als Wert zum Zurücksetzen
                  if (value === '') {
                    updateGrade(node.id, undefined);
                  } else {
                    const grade = parseFloat(value);
                    // Erlaube 0 als gültigen Wert (zum Zurücksetzen)
                    if (!isNaN(grade) && grade >= 0) {
                      // Stelle sicher, dass Dezimalstellen erhalten bleiben
                      updateGrade(node.id, Math.round(grade * 10) / 10);
                    }
                  }
                }}
                disabled={isLocked}
                sx={{
                  width: 100,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0.6,
                    fontSize: '0.65rem',
                    minHeight: '24px',
                    maxHeight: '24px',
                    // Eindeutige Markierung: Gesetzte Noten haben farbigen Hintergrund
                    bgcolor: node.grade !== undefined ? `${getGradeColor(node.grade, gradingSchema?.gradingSystem)}15` : '#f5f5f5',
                    border: node.grade !== undefined ? `2px solid ${getGradeColor(node.grade, gradingSchema?.gradingSystem)}40` : '1px solid #ddd',
                    '&:hover': {
                      bgcolor: node.grade !== undefined ? `${getGradeColor(node.grade, gradingSchema?.gradingSystem)}20` : '#eeeeee'
                    },
                    '&.Mui-focused': {
                      bgcolor: node.grade !== undefined ? `${getGradeColor(node.grade, gradingSchema?.gradingSystem)}25` : '#ffffff',
                      borderColor: node.grade !== undefined ? getGradeColor(node.grade, gradingSchema?.gradingSystem) : colors.primary
                    }
                  }
                }}
                placeholder={node.grade === undefined ? 
                  '0' : 
                  'Bereits gesetzt'
                }
                error={gradingSchema?.gradingSystem === 'MSS' &&
                  node.grade !== undefined &&
                  (!Number.isInteger(node.grade) || node.grade < 0 || node.grade > 15)
                }
                helperText={gradingSchema?.gradingSystem === 'MSS' &&
                  node.grade !== undefined &&
                  (!Number.isInteger(node.grade) || node.grade < 0 || node.grade > 15) &&
                  'MSS: 0-15 (0 = Zurücksetzen)'
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => toggleGradeLock(node.id)}
                        sx={{ 
                          p: 0,
                          minWidth: 18,
                          width: 18,
                          height: 18,
                          '& .MuiSvgIcon-root': {
                            fontSize: 14,
                            width: 14,
                            height: 14
                          }
                        }}
                      >
                        {isLocked ? <LockIcon /> : <LockOpenIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          )}

          {isCalculated && (
            <Chip
              label={`${gradingSchema?.gradingSystem === 'MSS' ?
                node.grade?.toFixed(0) :
                formatGermanMini(node.grade || 0)
              }`}
              size="small"
              sx={{
                ml: 'auto',
                backgroundColor: getGradeColor(node.grade || 0, gradingSchema?.gradingSystem),
                color: 'white',
                fontSize: '0.6rem',
                height: '20px'
              }}
            />
          )}
        </Box>

                  {!isLeaf && (
            <Box sx={{ pl: 2 }}>
              {node.children.map(child => renderGradeNode(child, level + 1))}
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

  const finalGrade = gradeNodes.length > 0 ? calculateWeightedGrade(gradeNodes[0]) : null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth={false}
      sx={{ '& .MuiDialog-paper': { width: '35%', minWidth: 320, maxWidth: 450 } }}
    >
      <DialogTitle sx={{ 
        pb: 1, 
        background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent1}10 100%)`,
        borderBottom: `2px solid ${colors.primary}30`,
        position: 'relative'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ 
            p: 0.3, 
            borderRadius: '50%', 
            bgcolor: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GradeIcon sx={{ color: 'white', fontSize: 14 }} />
          </Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            fontSize: '0.75rem',
            color: colors.textPrimary
          }}>
            Noten eintragen - {student.name}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 1.5, pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ 
            mb: 1, 
            borderRadius: 0.8, 
            fontSize: '0.55rem',
            border: `1px solid ${colors.accent2}30`,
            '& .MuiAlert-icon': { color: colors.accent2 }
          }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ 
            mb: 1, 
            borderRadius: 0.8, 
            fontSize: '0.55rem',
            border: `1px solid ${colors.success}30`,
            '& .MuiAlert-icon': { color: colors.success }
          }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ 
            maxHeight: 400, 
            overflowY: 'auto', 
            pr: 0.4,
            border: `1px solid ${colors.border}`,
            borderRadius: 0.8,
            bgcolor: '#fafbfc'
          }}>
            {gradeNodes.map(node => renderGradeNode(node))}
          </Box>
        </Box>
        
        {finalGrade !== null && finalGrade > 0 && (
          <>
            <Paper elevation={0} sx={{ 
              p: 1, 
              mb: 1,
              background: `linear-gradient(135deg, ${getGradeColor(finalGrade, gradingSchema?.gradingSystem)}15 0%, ${getGradeColor(finalGrade, gradingSchema?.gradingSystem)}08 100%)`,
              borderRadius: 1,
              border: `2px solid ${getGradeColor(finalGrade, gradingSchema?.gradingSystem)}40`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                width: 50, 
                height: 50, 
                background: `radial-gradient(circle, ${getGradeColor(finalGrade, gradingSchema?.gradingSystem)}20 0%, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(15px, -15px)',
                zIndex: 0,
                pointerEvents: 'none'
              }} />
              
              <Typography variant="h6" sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.8,
                fontSize: '0.7rem',
                fontWeight: 700,
                color: colors.textPrimary,
                mb: 0.8,
                position: 'relative',
                zIndex: 1
              }}>
                <AssessmentIcon sx={{ 
                  fontSize: 14, 
                  color: getGradeColor(finalGrade, gradingSchema?.gradingSystem),
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                }} />
                🎯 Gesamtnote
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.2,
                position: 'relative',
                zIndex: 1
              }}>
                <Chip 
                  label={gradingSchema?.gradingSystem === 'MSS' ? 
                    `${finalGrade!.toFixed(0)} Punkte` : 
                    formatGermanGrade(finalGrade!)
                  }
                  sx={{ 
                    bgcolor: getGradeColor(finalGrade, gradingSchema?.gradingSystem),
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 28,
                    px: 1.2,
                    boxShadow: `0 2px 8px ${getGradeColor(finalGrade, gradingSchema?.gradingSystem)}40`,
                    '& .MuiChip-label': { px: 1.2 }
                  }}
                />
                <Typography variant="body2" sx={{ 
                  fontSize: '0.6rem',
                  color: colors.textSecondary,
                  fontWeight: 500
                }}>
                  {gradingSchema?.gradingSystem === 'MSS' ? 
                    'MSS-System' : 
                    'Deutsches System'
                  }
                </Typography>
              </Box>
            </Paper>
            
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 0.8,
                bgcolor: '#f8f9fa',
                borderRadius: 1,
                border: '1px solid #e0e0e0',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: '#f0f0f0'
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Box clicked, current state:', isGradeReleased);
                toggleGradeRelease(!isGradeReleased);
              }}
            >
              <Checkbox
                checked={isGradeReleased}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Checkbox onChange, checked:', e.target.checked);
                  toggleGradeRelease(e.target.checked);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Checkbox onClick');
                }}
                size="small"
                sx={{
                  color: colors.primary,
                  pointerEvents: 'auto',
                  '&.Mui-checked': {
                    color: colors.primary
                  }
                }}
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.65rem', 
                  color: colors.textPrimary,
                  ml: 0.5,
                  userSelect: 'none',
                  pointerEvents: 'auto'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Typography clicked');
                  toggleGradeRelease(!isGradeReleased);
                }}
              >
                Gesamtnote für Schüler freigeben
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 1.5, 
        pt: 0.8,
        background: `linear-gradient(135deg, ${colors.primary}05 0%, ${colors.accent1}03 100%)`,
        borderTop: `1px solid ${colors.border}`
      }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ 
            borderRadius: 1.2, 
            px: 1.8,
            py: 0.6,
            fontSize: '0.65rem',
            height: '28px',
            borderColor: colors.border,
            color: colors.textSecondary,
            fontWeight: 500,
            '&:hover': {
              borderColor: colors.primary,
              color: colors.primary,
              bgcolor: `${colors.primary}08`
            }
          }}
        >
          ❌ Abbrechen
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
          startIcon={saving ? undefined : <SaveIcon sx={{ fontSize: 11 }} />}
          sx={{
            borderRadius: 1.2,
            px: 2.2,
            py: 0.6,
            fontSize: '0.65rem',
            height: '28px',
            fontWeight: 600,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent1} 100%)`,
            boxShadow: `0 2px 8px ${colors.primary}40`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent1} 100%)`,
              boxShadow: `0 4px 12px ${colors.primary}50`,
              transform: 'translateY(-1px)'
            },
            '&:disabled': {
              background: colors.textSecondary,
              boxShadow: 'none',
              transform: 'none'
            }
          }}
        >
          {saving ? '💾 Speichern...' : '💾 Noten speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GradesModal;