import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Add as AddIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

interface FlashcardCreationModalProps {
  open: boolean;
  onClose: () => void;
  sourceFile: string;
  fileName: string;
  teacherId: string;
  onSuccess: () => void;
}



interface LearningGroup {
  id: string;
  name: string;
}

interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  cards: any[];
}

export const FlashcardCreationModal: React.FC<FlashcardCreationModalProps> = ({
  open,
  onClose,
  sourceFile,
  fileName,
  teacherId,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New deck form
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [selectedLearningGroupIds, setSelectedLearningGroupIds] = useState<string[]>([]);
  
  // Existing deck form
  const [selectedDeckId, setSelectedDeckId] = useState('');
  
  // Data
  const [learningGroups, setLearningGroups] = useState<LearningGroup[]>([]);
  const [existingDecks, setExistingDecks] = useState<FlashcardDeck[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
      // Set default title from file name
      const defaultTitle = fileName.replace(/\.(docx|doc|txt)$/i, '').replace(/^Cards\s*/i, '');
      setNewDeckTitle(defaultTitle);
    }
  }, [open, fileName]);

  const loadData = async () => {
    try {
      // Load learning groups
      const groupsResponse = await fetch(`/api/learning-groups/teacher/${teacherId}`);
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setLearningGroups(groupsData || []);
      }

      // Load existing flashcard decks
      const decksResponse = await fetch(`/api/flashcards/teacher/${teacherId}`);
      if (decksResponse.ok) {
        const decksData = await decksResponse.json();
        setExistingDecks(decksData.decks || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    }
  };

  const handleCreateNewDeck = async () => {
    if (!newDeckTitle.trim()) {
      setError('Bitte geben Sie einen Titel für das neue Deck ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/flashcards/create-from-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          sourceFile,
          title: newDeckTitle.trim(),
          description: newDeckDescription.trim() || undefined,
          learningGroupIds: selectedLearningGroupIds,
          isPublic: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen des Karteikarten-Decks');
      }

      const result = await response.json();
      setSuccess(`Karteikarten-Deck "${result.deck.title}" erfolgreich erstellt mit ${result.deck.cards.length} Karten!`);
      
      // Close modal after a short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error creating flashcard deck:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Decks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToExistingDeck = async () => {
    if (!selectedDeckId) {
      setError('Bitte wählen Sie ein bestehendes Deck aus');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/flashcards/add-to-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          sourceFile,
          deckId: selectedDeckId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Hinzufügen der Karteikarten');
      }

      const result = await response.json();
      setSuccess(`Karteikarten erfolgreich zum Deck "${result.deck.title}" hinzugefügt!`);
      
      // Close modal after a short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error adding flashcards to existing deck:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler beim Hinzufügen der Karteikarten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setSuccess(null);
      setActiveTab(0);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DescriptionIcon color="primary" />
          Karteikarten aus Word-Dokument erstellen
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Datei: {fileName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab 
            icon={<AddIcon />} 
            label="Neues Deck erstellen" 
            iconPosition="start"
          />
          <Tab 
            icon={<FolderIcon />} 
            label="Zu bestehendem Deck hinzufügen" 
            iconPosition="start"
          />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Neues Karteikarten-Deck erstellen
            </Typography>
            
            <TextField
              fullWidth
              label="Deck-Titel"
              value={newDeckTitle}
              onChange={(e) => setNewDeckTitle(e.target.value)}
              margin="normal"
              required
              helperText="Der Titel wird automatisch aus der Word-Datei übernommen, kann aber angepasst werden"
            />

            <TextField
              fullWidth
              label="Beschreibung (optional)"
              value={newDeckDescription}
              onChange={(e) => setNewDeckDescription(e.target.value)}
              margin="normal"
              multiline
              rows={2}
              helperText="Zusätzliche Beschreibung für das Deck"
            />



            <FormControl fullWidth margin="normal">
              <InputLabel>Lerngruppen zuordnen (optional)</InputLabel>
              <Select
                multiple
                value={selectedLearningGroupIds}
                onChange={(e) => setSelectedLearningGroupIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                label="Lerngruppen zuordnen (optional)"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const group = learningGroups.find(g => g.id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={group?.name || value} 
                          size="small" 
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {learningGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Zu bestehendem Deck hinzufügen
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Bestehendes Deck auswählen</InputLabel>
              <Select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                label="Bestehendes Deck auswählen"
                required
              >
                {existingDecks.map((deck) => (
                  <MenuItem key={deck.id} value={deck.id}>
                    <Box>
                      <Typography variant="body1">{deck.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {deck.cards.length} Karten
                        {deck.description && ` • ${deck.description}`}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {existingDecks.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Sie haben noch keine Karteikarten-Decks erstellt. 
                Erstellen Sie zuerst ein neues Deck im ersten Tab.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Abbrechen
        </Button>
        
        {activeTab === 0 ? (
          <Button
            onClick={handleCreateNewDeck}
            variant="contained"
            disabled={isLoading || !newDeckTitle.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {isLoading ? 'Wird erstellt...' : 'Neues Deck erstellen'}
          </Button>
        ) : (
          <Button
            onClick={handleAddToExistingDeck}
            variant="contained"
            disabled={isLoading || !selectedDeckId}
            startIcon={isLoading ? <CircularProgress size={20} /> : <FolderIcon />}
          >
            {isLoading ? 'Wird hinzugefügt...' : 'Zu Deck hinzufügen'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
