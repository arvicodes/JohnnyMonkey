import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Snackbar,
  Alert,
  Tab,
  Tabs
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  Create as CreateIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import DatabaseViewer from './DatabaseViewer';

interface TeacherDashboardProps {
  userId: string;
}

interface LearningGroup {
  id: string;
  name: string;
  students: Student[];
}

interface Student {
  id: string;
  name: string;
  loginCode: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userId }) => {
  const [groups, setGroups] = useState<LearningGroup[]>([]);
  const [openNewGroupDialog, setOpenNewGroupDialog] = useState(false);
  const [openAddStudentsDialog, setOpenAddStudentsDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [mainTabValue, setMainTabValue] = useState(0);

  // Spielerische Farbpalette
  const colors = {
    primary: '#4CAF50', // Freundliches Grün
    secondary: '#FF9800', // Warmes Orange
    accent1: '#2196F3', // Helles Blau
    accent2: '#E91E63', // Fröhliches Pink
    background: '#F5F9FD', // Helles, freundliches Blau
    cardBg: '#FFFFFF',
    success: '#8BC34A',
  };

  useEffect(() => {
    fetchGroups();
  }, [userId]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`http://localhost:3002/api/learning-groups/teacher/${userId}`);
      if (!response.ok) throw new Error('Fehler beim Laden der Gruppen');
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      showSnackbar('Fehler beim Laden der Lerngruppen', 'error');
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/learning-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, teacherId: userId }),
      });
      if (!response.ok) throw new Error('Fehler beim Erstellen der Gruppe');
      await fetchGroups();
      setNewGroupName('');
      setOpenNewGroupDialog(false);
      showSnackbar('Lerngruppe erfolgreich erstellt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Erstellen der Lerngruppe', 'error');
    }
  };

  const handleOpenAddStudents = async (groupId: string) => {
    setSelectedGroupId(groupId);
    try {
      const response = await fetch(`http://localhost:3002/api/learning-groups/${groupId}/available-students`);
      if (!response.ok) throw new Error('Fehler beim Laden der verfügbaren Schüler');
      const data = await response.json();
      setAvailableStudents(data);
      setOpenAddStudentsDialog(true);
    } catch (error) {
      showSnackbar('Fehler beim Laden der verfügbaren Schüler', 'error');
    }
  };

  const handleAddStudents = async () => {
    try {
      const response = await fetch(`http://localhost:3002/api/learning-groups/${selectedGroupId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });
      if (!response.ok) throw new Error('Fehler beim Hinzufügen der Schüler');
      await fetchGroups();
      setOpenAddStudentsDialog(false);
      setSelectedStudents([]);
      showSnackbar('Schüler erfolgreich hinzugefügt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Hinzufügen der Schüler', 'error');
    }
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/learning-groups/${groupId}/students/${studentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Fehler beim Entfernen des Schülers');
      await fetchGroups();
      showSnackbar('Schüler erfolgreich entfernt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Entfernen des Schülers', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleMainTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMainTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: colors.background, p: 0 }}>
      <Grid container spacing={0}>
        {/* Header Section */}
        <Grid item xs={12}>
          <Box sx={{ 
            p: 3, 
            background: `linear-gradient(45deg, ${colors.primary} 30%, ${colors.accent1} 90%)`,
            color: 'white',
            borderRadius: '0 0 20px 20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar 
                sx={{ 
                  width: 60, 
                  height: 60, 
                  bgcolor: colors.secondary,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}
              >
                L
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                  Lehrer-Dashboard
                </Typography>
                <Typography variant="subtitle1">
                  Willkommen im Lehrerbereich! 👋
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tabs value={mainTabValue} onChange={handleMainTabChange} aria-label="dashboard tabs">
              <Tab icon={<GroupIcon />} label="Lerngruppen" />
              <Tab icon={<StorageIcon />} label="Datenbank" />
            </Tabs>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TabPanel value={mainTabValue} index={0}>
            {/* Learning Groups Section */}
            <Box sx={{ p: 2 }}>
              <Card sx={{ 
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                bgcolor: colors.cardBg
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <GroupIcon sx={{ mr: 2, color: colors.primary, fontSize: 40 }} />
                      <Typography variant="h5" component="h2" sx={{ 
                        fontWeight: 'bold', 
                        color: colors.primary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        Meine Lerngruppen
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenNewGroupDialog(true)}
                      sx={{ 
                        bgcolor: colors.primary,
                        '&:hover': { bgcolor: colors.primary, filter: 'brightness(1.1)' },
                        ml: 2,
                        py: 0.5,
                        px: 2,
                        fontSize: '0.75rem',
                        height: '32px',
                        width: '20%'
                      }}
                    >
                      Neue Gruppe
                    </Button>
                  </Box>

                  {groups.map((group) => (
                    <Box key={group.id} sx={{ mb: 4 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 2,
                        p: 2,
                        bgcolor: `${colors.primary}10`,
                        borderRadius: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h6" sx={{ 
                            color: colors.primary, 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {group.name}
                          </Typography>
                          <Chip 
                            label={`${group.students.length} Schüler`}
                            size="small" 
                            sx={{ 
                              ml: 2, 
                              bgcolor: colors.primary,
                              color: 'white',
                              fontWeight: 'bold'
                            }} 
                          />
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={<PersonAddIcon />}
                          onClick={() => handleOpenAddStudents(group.id)}
                          sx={{ 
                            color: colors.primary,
                            borderColor: colors.primary,
                            '&:hover': { 
                              borderColor: colors.primary,
                              bgcolor: `${colors.primary}10`
                            },
                            ml: 2,
                            py: 0.5,
                            px: 2,
                            fontSize: '0.75rem',
                            height: '32px',
                            width: '20%'
                          }}
                        >
                          Schüler hinzufügen
                        </Button>
                      </Box>
                      <Grid container spacing={2}>
                        {group.students.map((student) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={student.id}>
                            <Card variant="outlined" sx={{ 
                              borderRadius: 3,
                              border: 'none',
                              bgcolor: '#f8f9fa',
                              transition: 'transform 0.2s',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                              }
                            }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <Avatar sx={{ bgcolor: colors.accent1, mr: 2 }}>
                                    {student.name.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                      {student.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Code: {student.loginCode}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Chip 
                                    label="Aktiv" 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: colors.success,
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }} 
                                  />
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleRemoveStudent(group.id, student.id)}
                                    sx={{ 
                                      color: colors.accent2,
                                      '&:hover': {
                                        bgcolor: `${colors.accent2}10`
                                      }
                                    }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={1}>
            <DatabaseViewer />
          </TabPanel>
        </Grid>
      </Grid>

      {/* New Group Dialog */}
      <Dialog open={openNewGroupDialog} onClose={() => setOpenNewGroupDialog(false)}>
        <DialogTitle>Neue Lerngruppe erstellen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name der Lerngruppe"
            type="text"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewGroupDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateGroup} variant="contained" color="primary">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Students Dialog */}
      <Dialog open={openAddStudentsDialog} onClose={() => setOpenAddStudentsDialog(false)}>
        <DialogTitle>Schüler hinzufügen</DialogTitle>
        <DialogContent>
          <List>
            {availableStudents.map((student) => (
              <ListItem key={student.id}>
                <ListItemText 
                  primary={student.name}
                  secondary={`Login-Code: ${student.loginCode}`}
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={(event) => {
                      setSelectedStudents(
                        event.target.checked
                          ? [...selectedStudents, student.id]
                          : selectedStudents.filter(id => id !== student.id)
                      );
                    }}
                    checked={selectedStudents.includes(student.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddStudentsDialog(false)}>Abbrechen</Button>
          <Button onClick={handleAddStudents} variant="contained" color="primary">
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeacherDashboard; 