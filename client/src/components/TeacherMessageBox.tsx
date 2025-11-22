import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  Close,
  Mail,
  MailOutline,
  Send,
  Person,
  ArrowBack
} from '@mui/icons-material';

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

interface TeacherMessageBoxProps {
  open: boolean;
  onClose: () => void;
}

const TeacherMessageBox: React.FC<TeacherMessageBoxProps> = ({ open, onClose }) => {
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (open) {
      loadSentMessages();
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
        console.log('✅ Gesendete Nachrichten geladen:', data.messages?.length || 0);
        setSentMessages(data.messages || []);
      } else {
        const errorText = await response.text().catch(() => 'Unbekannter Fehler');
        console.error('❌ Fehler beim Laden:', response.status, errorText);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
    } finally {
      setLoading(false);
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
            '& .MuiSvgIcon-root': {
              fontSize: 20
            }
          }}
        >
          <Close sx={{ width: '100%', height: '100%' }} />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, minHeight: 300, maxHeight: '70vh', overflow: 'auto' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Gesendet" icon={<Send sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px" py={2}>
            <Typography variant="body2">Lade Nachrichten...</Typography>
          </Box>
        ) : selectedMessage ? (
          <Box sx={{ p: 1 }}>
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
                </Box>
                <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                  <Person sx={{ fontSize: 14, color: '#666' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    An: {selectedMessage.student.name}
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
        ) : sentMessages.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <MailOutline sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Noch keine Nachrichten gesendet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {sentMessages.map((message, index) => (
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
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#1976d2',
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
                            An: {message.student.name} • {new Date(message.createdAt).toLocaleString('de-DE', {
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
                {index < sentMessages.length - 1 && <Divider sx={{ my: 0 }} />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeacherMessageBox;

