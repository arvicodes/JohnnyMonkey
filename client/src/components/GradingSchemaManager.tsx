import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

interface GradingSchema {
  id: string;
  name: string;
  structure: string;
}

interface Props {
  groupId: string;
}

export const GradingSchemaManager: React.FC<Props> = ({ groupId }) => {
  const [schemas, setSchemas] = useState<GradingSchema[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaStructure, setNewSchemaStructure] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSchemas = async () => {
    try {
      const response = await fetch(`/api/grading-schemas/group/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setSchemas(data);
      }
    } catch (error) {
      setError('Failed to fetch grading schemas');
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, [groupId]);

  const handleCreateSchema = async () => {
    try {
      const response = await fetch('/api/grading-schemas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSchemaName,
          structure: newSchemaStructure,
          groupId
        }),
      });

      if (response.ok) {
        setSuccess('Grading schema created successfully');
        setOpenDialog(false);
        setNewSchemaName('');
        setNewSchemaStructure('');
        fetchSchemas();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create grading schema');
      }
    } catch (error) {
      setError('Failed to create grading schema');
    }
  };

  const handleDeleteSchema = async (id: string) => {
    try {
      const response = await fetch(`/api/grading-schemas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Grading schema deleted successfully');
        fetchSchemas();
      } else {
        setError('Failed to delete grading schema');
      }
    } catch (error) {
      setError('Failed to delete grading schema');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Notenschemata</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Neues Schema
        </Button>
      </Box>

      <List>
        {schemas.map((schema) => (
          <Paper key={schema.id} sx={{ mb: 2 }}>
            <ListItem>
              <ListItemText
                primary={schema.name}
                secondary={
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {schema.structure}
                  </pre>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteSchema(schema.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neues Notenschema erstellen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name des Schemas"
            fullWidth
            value={newSchemaName}
            onChange={(e) => setNewSchemaName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Schema-Struktur"
            fullWidth
            multiline
            rows={10}
            value={newSchemaStructure}
            onChange={(e) => setNewSchemaStructure(e.target.value)}
            placeholder={`Zeugnisnote
- Andere Leistungen (1/2)
  - EPO1 (1/4)
  - EPO2 (1/4)
  - Quizze (1/4)
  - HÜs (1/4)
- Schriftliche Leistungen (1/2)
  - KA1 (1/2)
  - KA2 (1/2)`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateSchema} variant="contained">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error || !!success}
        autoHideDuration={6000}
        onClose={() => {
          setError(null);
          setSuccess(null);
        }}
      >
        <Alert
          onClose={() => {
            setError(null);
            setSuccess(null);
          }}
          severity={error ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 