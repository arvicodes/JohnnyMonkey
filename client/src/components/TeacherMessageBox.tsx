import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  Chip,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
  Button
} from '@mui/material';
import {
  Close,
  Mail,
  MailOutline,
  Send,
  Person,
  ArrowBack,
  Search,
  Clear,
  FilterList,
  Add,
  Delete
} from '@mui/icons-material';
import { Tabs, Tab } from '@mui/material';

interface Message {
  id: string;
  subject: string;
  content: string;
  studentId: string;
  student: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface LearningGroup {
  id: string;
  name: string;
  students: Array<{
    id: string;
    name: string;
  }>;
}

interface TeacherMessageBoxProps {
  open: boolean;
  onClose: () => void;
  userId?: string; // Optional userId prop
}

const TeacherMessageBox: React.FC<TeacherMessageBoxProps> = ({ open, onClose, userId: propUserId }) => {
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [learningGroups, setLearningGroups] = useState<LearningGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Neue Nachricht states
  const [newMessageGroupId, setNewMessageGroupId] = useState<string>('');
  const [newMessageStudentId, setNewMessageStudentId] = useState<string>('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingNewMessage, setSendingNewMessage] = useState(false);

  useEffect(() => {
    if (open) {
      loadSentMessages();
      loadLearningGroups();
    }
  }, [open]);

  const loadSentMessages = async () => {
    try {
      setLoading(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      const response = await fetch('/api/messages/teacher', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSentMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLearningGroups = async () => {
    try {
      setLoadingGroups(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Versuche userId aus Prop, localStorage oder API zu holen
      let userId = propUserId || localStorage.getItem('userId') || '';
      
      if (!userId) {
        // Hole userId vom aktuellen User
        const userResponse = await fetch('/api/users/current', {
          headers: {
            'Content-Type': 'application/json',
            'x-login-code': loginCode
          }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userId = userData.id;
        }
      }
      
      if (!userId) {
        console.warn('⚠️ Keine userId gefunden');
        setLearningGroups([]);
        return;
      }
      
      const response = await fetch(`/api/learning-groups/teacher/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const groups = await response.json();
        setLearningGroups(Array.isArray(groups) ? groups : []);
      } else {
        console.error('❌ Fehler beim Laden der Lerngruppen:', response.status);
        setLearningGroups([]);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Lerngruppen:', error);
      setLearningGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Finde die Lerngruppe für einen Schüler
  const getStudentGroup = (studentId: string): LearningGroup | null => {
    for (const group of learningGroups) {
      if (group.students?.some(s => s.id === studentId)) {
        return group;
      }
    }
    return null;
  };

  // Gefilterte und sortierte Nachrichten
  const filteredMessages = useMemo(() => {
    let filtered = [...sentMessages];

    // Suche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.subject.toLowerCase().includes(query) ||
        msg.content.toLowerCase().includes(query) ||
        msg.student.name.toLowerCase().includes(query)
      );
    }

    // Lerngruppen-Filter
    if (selectedGroupId !== 'all') {
      const group = learningGroups.find(g => g.id === selectedGroupId);
      if (group && group.students) {
        const studentIds = group.students.map(s => s.id);
        filtered = filtered.filter(msg => studentIds.includes(msg.studentId));
      }
    }

    // Datumsfilter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(msg => new Date(msg.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(msg => new Date(msg.createdAt) <= toDate);
    }

    // Sortierung
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [sentMessages, searchQuery, selectedGroupId, dateFrom, dateTo, sortOrder, learningGroups]);

  const hasActiveFilters = selectedGroupId !== 'all' || dateFrom || dateTo || searchQuery;
  
  // Funktion zum Senden einer neuen Nachricht
  const handleSendNewMessage = async () => {
    if (!newMessageStudentId || !newMessageSubject || !newMessageContent) {
      alert('Bitte füllen Sie alle Felder aus.');
      return;
    }
    
    setSendingNewMessage(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({
          studentId: newMessageStudentId,
          subject: newMessageSubject,
          content: newMessageContent
        })
      });
      
      if (response.ok) {
        // Erfolgreich gesendet
        setNewMessageGroupId('');
        setNewMessageStudentId('');
        setNewMessageSubject('');
        setNewMessageContent('');
        setTab(0); // Wechsle zum "Gesendet" Tab
        await loadSentMessages(); // Lade Nachrichten neu
        alert('Nachricht erfolgreich gesendet!');
      } else {
        const errorData = await response.json();
        alert(`Fehler beim Senden: ${errorData.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      alert('Fehler beim Senden der Nachricht.');
    } finally {
      setSendingNewMessage(false);
    }
  };
  
  // Hole Schüler einer ausgewählten Lerngruppe
  const selectedGroup = learningGroups.find(g => g.id === newMessageGroupId);
  const availableStudents = selectedGroup?.students || [];
  
  // Funktion zum Löschen einer Nachricht
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
      return;
    }
    
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });
      
      if (response.ok) {
        // Entferne Nachricht aus der Liste
        setSentMessages(prev => prev.filter(msg => msg.id !== messageId));
        // Wenn die gelöschte Nachricht gerade angezeigt wird, zurück zur Liste
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
        alert('Nachricht erfolgreich gelöscht!');
      } else {
        const errorData = await response.json();
        alert(`Fehler beim Löschen: ${errorData.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Nachricht:', error);
      alert('Fehler beim Löschen der Nachricht.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        bgcolor: '#1976d2', 
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 0.75,
        px: 1.5
      }}>
        <Box display="flex" alignItems="center" gap={0.75}>
          <Mail sx={{ fontSize: 18 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
            Nachrichten
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ 
            color: '#fff', 
            p: 0,
            minWidth: 32,
            width: 32,
            height: 32,
            '& .MuiSvgIcon-root': { fontSize: 20 }
          }}
        >
          <Close sx={{ width: '100%', height: '100%' }} />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, minHeight: 400, maxHeight: '75vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs value={tab} onChange={(_, v) => {
          setTab(v);
          setSelectedMessage(null); // Reset selected message when switching tabs
        }} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Gesendet" icon={<Send sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Neue Nachricht" icon={<Add sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {/* Filter-Bereich - Kompakt und schön */}
        {!selectedMessage && (
          <Paper elevation={0} sx={{ 
            pt: 2,
            px: 1.5,
            pb: 1, 
            bgcolor: '#f8f9fa', 
            borderBottom: '1px solid #e0e0e0',
            flexShrink: 0
          }}>
            {/* Alle Filter in einer Zeile */}
            <Box display="flex" gap={0.75} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  minWidth: 180,
                  flex: '1 1 auto',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.8rem',
                    height: '36px',
                    bgcolor: '#fff'
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 16, color: '#666' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        sx={{ p: 0.25, '& .MuiSvgIcon-root': { fontSize: 14 } }}
                      >
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel sx={{ fontSize: '0.8rem' }}>Lerngruppe</InputLabel>
                <Select
                  value={selectedGroupId}
                  label="Lerngruppe"
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  sx={{ 
                    fontSize: '0.8rem',
                    height: '36px',
                    bgcolor: '#fff',
                    '& .MuiSelect-select': { py: 0.75 }
                  }}
                >
                  <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>Alle Gruppen</MenuItem>
                  {loadingGroups ? (
                    <MenuItem value="loading" disabled sx={{ fontSize: '0.8rem' }}>
                      Lade Gruppen...
                    </MenuItem>
                  ) : learningGroups.length > 0 ? (
                    learningGroups.map(group => (
                      <MenuItem key={group.id} value={group.id} sx={{ fontSize: '0.8rem' }}>
                        {group.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="none" disabled sx={{ fontSize: '0.8rem' }}>
                      Keine Gruppen gefunden
                    </MenuItem>
                  )}
                </Select>
              </FormControl>

              <TextField
                size="small"
                type="date"
                label="Von"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  minWidth: 120,
                  bgcolor: '#fff',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.8rem',
                    height: '36px'
                  },
                  '& .MuiInputLabel-root': { fontSize: '0.8rem' }
                }}
              />

              <TextField
                size="small"
                type="date"
                label="Bis"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  minWidth: 120,
                  bgcolor: '#fff',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.8rem',
                    height: '36px'
                  },
                  '& .MuiInputLabel-root': { fontSize: '0.8rem' }
                }}
              />

              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel sx={{ fontSize: '0.8rem' }}>Sortierung</InputLabel>
                <Select
                  value={sortOrder}
                  label="Sortierung"
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                  sx={{ 
                    fontSize: '0.8rem',
                    height: '36px',
                    bgcolor: '#fff',
                    '& .MuiSelect-select': { py: 0.75 }
                  }}
                >
                  <MenuItem value="newest" sx={{ fontSize: '0.8rem' }}>Neueste</MenuItem>
                  <MenuItem value="oldest" sx={{ fontSize: '0.8rem' }}>Älteste</MenuItem>
                </Select>
              </FormControl>

              {hasActiveFilters && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGroupId('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  sx={{ 
                    p: 0.5,
                    bgcolor: '#fff',
                    '& .MuiSvgIcon-root': { fontSize: 16 },
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                  title="Filter zurücksetzen"
                >
                  <Clear />
                </IconButton>
              )}
            </Box>

            {/* Ergebnis-Anzeige */}
            {hasActiveFilters && (
              <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: '#666', fontSize: '0.7rem' }}>
                {filteredMessages.length} von {sentMessages.length} Nachrichten
              </Typography>
            )}
          </Paper>
        )}

        {/* Content-Bereich */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {tab === 1 ? (
            // Neue Nachricht Tab
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, fontSize: '0.9rem' }}>
                Neue Nachricht an Schüler senden
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Lerngruppe auswählen */}
                <FormControl fullWidth size="small">
                  <InputLabel>Lerngruppe</InputLabel>
                  <Select
                    value={newMessageGroupId}
                    label="Lerngruppe"
                    onChange={(e) => {
                      setNewMessageGroupId(e.target.value);
                      setNewMessageStudentId(''); // Reset Schüler-Auswahl
                    }}
                    sx={{ fontSize: '0.85rem' }}
                  >
                    <MenuItem value="" sx={{ fontSize: '0.85rem' }}>
                      Bitte wählen...
                    </MenuItem>
                    {loadingGroups ? (
                      <MenuItem value="loading" disabled sx={{ fontSize: '0.85rem' }}>
                        Lade Gruppen...
                      </MenuItem>
                    ) : learningGroups.length > 0 ? (
                      learningGroups.map(group => (
                        <MenuItem key={group.id} value={group.id} sx={{ fontSize: '0.85rem' }}>
                          {group.name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="none" disabled sx={{ fontSize: '0.85rem' }}>
                        Keine Gruppen gefunden
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
                
                {/* Schüler auswählen */}
                <FormControl fullWidth size="small" disabled={!newMessageGroupId || availableStudents.length === 0}>
                  <InputLabel>Schüler</InputLabel>
                  <Select
                    value={newMessageStudentId}
                    label="Schüler"
                    onChange={(e) => setNewMessageStudentId(e.target.value)}
                    sx={{ fontSize: '0.85rem' }}
                  >
                    <MenuItem value="" sx={{ fontSize: '0.85rem' }}>
                      Bitte wählen...
                    </MenuItem>
                    {availableStudents.map(student => (
                      <MenuItem key={student.id} value={student.id} sx={{ fontSize: '0.85rem' }}>
                        {student.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Betreff */}
                <TextField
                  fullWidth
                  size="small"
                  label="Betreff"
                  value={newMessageSubject}
                  onChange={(e) => setNewMessageSubject(e.target.value)}
                  sx={{ fontSize: '0.85rem' }}
                  InputProps={{
                    sx: { fontSize: '0.85rem' }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: '0.85rem' }
                  }}
                />
                
                {/* Inhalt */}
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Nachricht"
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  sx={{ fontSize: '0.85rem' }}
                  InputProps={{
                    sx: { fontSize: '0.85rem' }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: '0.85rem' }
                  }}
                />
                
                {/* Senden Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setNewMessageGroupId('');
                      setNewMessageStudentId('');
                      setNewMessageSubject('');
                      setNewMessageContent('');
                    }}
                    disabled={sendingNewMessage}
                    sx={{ fontSize: '0.85rem' }}
                  >
                    Zurücksetzen
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSendNewMessage}
                    disabled={!newMessageStudentId || !newMessageSubject || !newMessageContent || sendingNewMessage}
                    startIcon={<Send />}
                    sx={{ fontSize: '0.85rem' }}
                  >
                    {sendingNewMessage ? 'Wird gesendet...' : 'Senden'}
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
              <Typography variant="body2" color="text.secondary">Lade Nachrichten...</Typography>
            </Box>
          ) : selectedMessage ? (
            <Box sx={{ p: 1.5 }}>
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    onClick={() => setSelectedMessage(null)}
                    sx={{ 
                      p: 0,
                      minWidth: 32,
                      width: 32,
                      height: 32,
                      '& .MuiSvgIcon-root': { fontSize: 20 }
                    }}
                  >
                    <ArrowBack sx={{ width: '100%', height: '100%' }} />
                  </IconButton>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#666' }}>
                    Zurück
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  sx={{ 
                    p: 0,
                    minWidth: 20,
                    width: 20,
                    height: 20,
                    color: '#d32f2f',
                    '&:hover': { bgcolor: '#ffebee' },
                    '& .MuiSvgIcon-root': { fontSize: 14 }
                  }}
                  title="Nachricht löschen"
                >
                  <Delete sx={{ width: '100%', height: '100%' }} />
                </IconButton>
              </Box>
              <Card variant="outlined" sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', mb: 1 }}>
                    {selectedMessage.subject}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mb={1} flexWrap="wrap">
                    <Person sx={{ fontSize: 14, color: '#666' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      An: {selectedMessage.student.name.split(' ')[0]} {selectedMessage.student.name.split(' ').slice(-1)[0]}
                    </Typography>
                    {(() => {
                      const studentGroup = getStudentGroup(selectedMessage.studentId);
                      return studentGroup && (
                        <Chip
                          label={studentGroup.name}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: '#e3f2fd',
                            color: '#1976d2',
                            '& .MuiChip-label': { px: 0.75 }
                          }}
                        />
                      );
                    })()}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.7rem' }}>
                      {new Date(selectedMessage.createdAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1, my: 0.5 }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      fontSize: '0.85rem',
                      color: '#333'
                    }}
                  >
                    {selectedMessage.content}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ) : filteredMessages.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <MailOutline sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                {sentMessages.length === 0 
                  ? 'Noch keine Nachrichten gesendet'
                  : 'Keine Nachrichten gefunden'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredMessages.map((message, index) => {
                const studentGroup = getStudentGroup(message.studentId);
                return (
                  <React.Fragment key={message.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => setSelectedMessage(message)}
                        sx={{
                          py: 0.75,
                          px: 1,
                          '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.1} flexWrap="wrap">
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: '#1976d2',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {message.subject}
                              </Typography>
                              {studentGroup && (
                                <Chip
                                  label={studentGroup.name}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    bgcolor: '#e3f2fd',
                                    color: '#1976d2',
                                    '& .MuiChip-label': { px: 0.5 }
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              An: {message.student.name} • {new Date(message.createdAt).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          }
                          sx={{ my: 0 }}
                        />
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(message.id);
                          }}
                          sx={{ 
                            p: 0,
                            minWidth: 20,
                            width: 20,
                            height: 20,
                            color: '#d32f2f',
                            '&:hover': { bgcolor: '#ffebee' },
                            ml: 0.5,
                            '& .MuiSvgIcon-root': { fontSize: 14 }
                          }}
                          title="Nachricht löschen"
                        >
                          <Delete sx={{ width: '100%', height: '100%' }} />
                        </IconButton>
                      </ListItemButton>
                    </ListItem>
                    {index < filteredMessages.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherMessageBox;
