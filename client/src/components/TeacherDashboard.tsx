import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Badge,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  Note as NoteIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

interface TeacherDashboardProps {
  userId: string;
  onLogout: () => void;
}

interface LearningGroup {
  id: string;
  name: string;
  studentCount: number;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface Quiz {
  id: string;
  title: string;
  questionCount: number;
  createdAt: string;
}

export default function TeacherDashboard({ userId, onLogout }: TeacherDashboardProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [learningGroups, setLearningGroups] = useState<LearningGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });

  // Mock data for demonstration
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setLearningGroups([
          { id: '1', name: 'Klasse 7a', studentCount: 24 },
          { id: '2', name: 'Klasse 7b', studentCount: 22 },
          { id: '3', name: 'Klasse 8a', studentCount: 26 }
        ]);
        
        setSubjects([
          { id: '1', name: 'Mathematik', description: 'Grundlagen der Algebra' },
          { id: '2', name: 'Informatik', description: 'Programmierung und Algorithmen' }
        ]);
        
        setQuizzes([
          { id: '1', title: 'Algebra Grundlagen', questionCount: 15, createdAt: '2024-01-15' },
          { id: '2', title: 'Python Basics', questionCount: 20, createdAt: '2024-01-20' }
        ]);
        
        setLoading(false);
      } catch (err) {
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Dashboard wird geladen...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" sx={{ mb: 2 }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Teacher Dashboard
          </Typography>
          <Button color="inherit" onClick={onLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
            <Tab icon={<GroupIcon />} label="Lerngruppen" />
            <Tab icon={<SchoolIcon />} label="Fächer" />
            <Tab icon={<QuizIcon />} label="Quizze" />
            <Tab icon={<NoteIcon />} label="Notizen" />
            <Tab icon={<AssessmentIcon />} label="Bewertungen" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <Box sx={{ mt: 2 }}>
          {currentTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  Lerngruppen ({learningGroups.length})
                </Typography>
              </Grid>
              {learningGroups.map((group) => (
                <Grid item xs={12} md={6} lg={4} key={group.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{group.name}</Typography>
                        <Chip label={`${group.studentCount} Schüler`} color="primary" size="small" />
                      </Box>
                      <Box mt={2} display="flex" gap={1}>
                        <Button size="small" startIcon={<VisibilityIcon />}>
                          Anzeigen
                        </Button>
                        <Button size="small" startIcon={<EditIcon />}>
                          Bearbeiten
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<AddIcon />}>
                  Neue Lerngruppe
                </Button>
              </Grid>
            </Grid>
          )}

          {currentTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  Fächer ({subjects.length})
                </Typography>
              </Grid>
              {subjects.map((subject) => (
                <Grid item xs={12} md={6} lg={4} key={subject.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{subject.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {subject.description}
                      </Typography>
                      <Box mt={2} display="flex" gap={1}>
                        <Button size="small" startIcon={<FolderIcon />}>
                          Ordner
                        </Button>
                        <Button size="small" startIcon={<EditIcon />}>
                          Bearbeiten
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<AddIcon />}>
                  Neues Fach
                </Button>
              </Grid>
            </Grid>
          )}

          {currentTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  Quizze ({quizzes.length})
                </Typography>
              </Grid>
              {quizzes.map((quiz) => (
                <Grid item xs={12} md={6} lg={4} key={quiz.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{quiz.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {quiz.questionCount} Fragen
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Erstellt: {new Date(quiz.createdAt).toLocaleDateString('de-DE')}
                      </Typography>
                      <Box mt={2} display="flex" gap={1}>
                        <Button size="small" startIcon={<VisibilityIcon />}>
                          Anzeigen
                        </Button>
                        <Button size="small" startIcon={<EditIcon />}>
                          Bearbeiten
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<AddIcon />}>
                  Neues Quiz
                </Button>
              </Grid>
            </Grid>
          )}

          {currentTab === 3 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                Notizen
              </Typography>
              <Alert severity="info">
                Notizen-Funktion wird noch implementiert.
              </Alert>
            </Box>
          )}

          {currentTab === 4 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                Bewertungen
              </Typography>
              <Alert severity="info">
                Bewertungs-Funktion wird noch implementiert.
              </Alert>
            </Box>
          )}
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}