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
  Paper
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
  FilterList
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
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Gesendet" icon={<Send sx={{ fontSize: 16 }} />} iconPosition="start" />
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
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
              <Typography variant="body2" color="text.secondary">Lade Nachrichten...</Typography>
            </Box>
          ) : selectedMessage ? (
            <Box sx={{ p: 1.5 }}>
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                          py: 1,
                          px: 1.5,
                          '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={0.75} mb={0.25} flexWrap="wrap">
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: '#1976d2',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {message.subject}
                              </Typography>
                              {studentGroup && (
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
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              An: {message.student.name} • {new Date(message.createdAt).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          }
                        />
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
