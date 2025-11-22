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
  Paper
} from '@mui/material';
import {
  Close,
  Mail,
  MailOutline,
  Person,
  ArrowBack
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

const InboxModal: React.FC<InboxModalProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (open) {
      loadMessages();
      loadUnreadCount();
    }
  }, [open]);

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
      
      <DialogContent sx={{ p: 0, minHeight: 300, maxHeight: '70vh', overflow: 'auto' }}>
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
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <MailOutline sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Keine Nachrichten
            </Typography>
          </Box>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InboxModal;

