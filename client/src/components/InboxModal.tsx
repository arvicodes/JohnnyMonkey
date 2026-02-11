import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Chip,
  Badge,
  IconButton,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';
import {
  Close,
  Mail,
  MailOutline,
  Person,
  ArrowBack,
  Send,
  Add
} from '@mui/icons-material';

interface Message {
  id: string;
  subject: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  teacher: {
    id: string;
    name: string;
  };
}

interface InboxModalProps {
  open: boolean;
  onClose: () => void;
}

interface LearningGroup {
  id: string;
  name: string;
  teacher: {
    id: string;
    name: string;
  };
}

const InboxModal: React.FC<InboxModalProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState(0);
  const [learningGroups, setLearningGroups] = useState<LearningGroup[]>([]);
  
  // Neue Nachricht states
  const [newMessageTeacherId, setNewMessageTeacherId] = useState<string>('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingNewMessage, setSendingNewMessage] = useState(false);

  useEffect(() => {
    if (open) {
      loadMessages();
      loadUnreadCount();
      loadLearningGroups();
    }
  }, [open]);
  
  const loadLearningGroups = async () => {
    try {
      const userId = localStorage.getItem('studentId') || localStorage.getItem('userId') || '';
      if (!userId) return;
      
      const response = await fetch(`/api/learning-groups/student/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setLearningGroups(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Lerngruppen:', error);
    }
  };
  
  // Funktion zum Senden einer neuen Nachricht an Lehrer
  const handleSendNewMessage = async () => {
    if (!newMessageTeacherId || !newMessageSubject || !newMessageContent) {
      alert('Bitte füllen Sie alle Felder aus.');
      return;
    }
    
    setSendingNewMessage(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/messages/send-to-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({
          teacherId: newMessageTeacherId,
          subject: newMessageSubject,
          content: newMessageContent
        })
      });
      
      if (response.ok) {
        // Erfolgreich gesendet
        setNewMessageTeacherId('');
        setNewMessageSubject('');
        setNewMessageContent('');
        setTab(0); // Wechsle zum "Posteingang" Tab
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
  
  // Eindeutige Lehrer aus Lerngruppen extrahieren
  const uniqueTeachers = learningGroups.reduce((acc, group) => {
    if (group.teacher && !acc.find(t => t.id === group.teacher.id)) {
      acc.push(group.teacher);
    }
    return acc;
  }, [] as Array<{ id: string; name: string }>);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/messages/student', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/messages/unread-count', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Anzahl:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Fehler beim Markieren:', error);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markAsRead(message.id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
            Posteingang
          </Typography>
          {unreadCount > 0 && (
            <Chip 
              label={unreadCount} 
              size="small" 
              sx={{ 
                bgcolor: '#fff', 
                color: '#1976d2',
                fontWeight: 700,
                height: 20,
                fontSize: '0.7rem',
                '& .MuiChip-label': { px: 0.75 }
              }} 
            />
          )}
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ 
            color: '#fff', 
            p: 0,
            minWidth: 32,
            width: 32,
            height: 32,
            '& .MuiSvgIcon-root': {
              fontSize: 20
            }
          }}
        >
          <Close sx={{ width: '100%', height: '100%' }} />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, minHeight: 300, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs value={tab} onChange={(_, v) => {
          setTab(v);
          setSelectedMessage(null); // Reset selected message when switching tabs
        }} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Posteingang" icon={<Mail sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Neue Nachricht" icon={<Add sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
        
        {tab === 1 ? (
          // Neue Nachricht Tab
          <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, fontSize: '0.9rem' }}>
              Nachricht an Lehrer senden
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Lehrer auswählen */}
              <FormControl fullWidth size="small">
                <InputLabel>Lehrer</InputLabel>
                <Select
                  value={newMessageTeacherId}
                  label="Lehrer"
                  onChange={(e) => setNewMessageTeacherId(e.target.value)}
                  sx={{ fontSize: '0.85rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.85rem' }}>
                    Bitte wählen...
                  </MenuItem>
                  {uniqueTeachers.map(teacher => (
                    <MenuItem key={teacher.id} value={teacher.id} sx={{ fontSize: '0.85rem' }}>
                      {teacher.name}
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
                    setNewMessageTeacherId('');
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
                  disabled={!newMessageTeacherId || !newMessageSubject || !newMessageContent || sendingNewMessage}
                  startIcon={<Send />}
                  sx={{ fontSize: '0.85rem' }}
                >
                  {sendingNewMessage ? 'Wird gesendet...' : 'Senden'}
                </Button>
              </Box>
            </Box>
          </Box>
        ) : loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px" py={2} sx={{ flex: 1 }}>
            <Typography variant="body2">Lade Nachrichten...</Typography>
          </Box>
        ) : selectedMessage ? (
          <Box sx={{ p: 1, flex: 1, overflow: 'auto' }}>
            <Box sx={{ mb: 1 }}>
              <IconButton
                onClick={() => setSelectedMessage(null)}
                sx={{ 
                  p: 0,
                  minWidth: 32,
                  width: 32,
                  height: 32,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              >
                <ArrowBack sx={{ width: '100%', height: '100%' }} />
              </IconButton>
            </Box>
            <Card variant="outlined" sx={{ border: '1px solid #e0e0e0' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {selectedMessage.subject}
                  </Typography>
                  {!selectedMessage.isRead && (
                    <Chip label="Neu" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                  <Person sx={{ fontSize: 14, color: '#666' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {selectedMessage.teacher.name}
                  </Typography>
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
                    lineHeight: 1.5,
                    fontSize: '0.85rem'
                  }}
                >
                  {selectedMessage.content}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center', flex: 1 }}>
            <MailOutline sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Keine Nachrichten
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List sx={{ p: 0 }}>
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleMessageClick(message)}
                    sx={{
                      bgcolor: message.isRead ? '#fff' : '#e3f2fd',
                      py: 0.75,
                      px: 1,
                      '&:hover': { bgcolor: message.isRead ? '#f5f5f5' : '#bbdefb' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.75 }}>
                      {message.isRead ? (
                        <MailOutline sx={{ color: '#999', fontSize: 18 }} />
                      ) : (
                        <Badge color="primary" variant="dot">
                          <Mail sx={{ color: '#1976d2', fontSize: 18 }} />
                        </Badge>
                      )}
                    </Box>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: message.isRead ? 400 : 600,
                            color: message.isRead ? '#666' : '#1976d2',
                            fontSize: '0.8rem',
                            display: 'block',
                            mb: 0.25
                          }}
                        >
                          {message.subject}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {message.teacher.name} • {new Date(message.createdAt).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </Box>
                      }
                      sx={{ my: 0 }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < messages.length - 1 && <Divider sx={{ my: 0 }} />}
              </React.Fragment>
            ))}
          </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InboxModal;

