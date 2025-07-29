import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Chip,
  CircularProgress
} from '@mui/material';

interface User {
  id: string;
  name: string;
  loginCode: string;
  role: string;
  learningGroups: any[];
  teacherGroups: any[];
}

interface LearningGroup {
  id: string;
  name: string;
  teacher: User;
  students: User[];
}

interface Subject {
  id: string;
  name: string;
  description?: string;
  teacher: { id: string; name: string };
  blocks?: any[]; // Added for nested structure
}

interface Note {
  id: string;
  title: string;
  content: string;
  authorId: string;
  isPrivate: boolean;
  tags?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string };
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

const DatabaseViewer: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState<{ users: User[]; learningGroups: LearningGroup[]; subjects: Subject[]; notes: Note[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatabaseContent();
  }, []);

  const fetchDatabaseContent = async () => {
    try {
      const response = await fetch('/api/admin/db-content');
      if (!response.ok) throw new Error('Fehler beim Laden der Daten');
      const result = await response.json();
      setData(result);
    } catch (error) {
      setError('Fehler beim Laden der Datenbank-Inhalte');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="database tables">
          <Tab label="Benutzer" />
          <Tab label="Lerngruppen" />
          <Tab label="Fächer" />
          <Tab label="Notizen" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Login-Code</TableCell>
                  <TableCell>Rolle</TableCell>
                  <TableCell>Lerngruppen</TableCell>
                  {/* Lehrer sehen auch ihre Gruppen */}
                  <TableCell>Lehrer-Gruppen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.loginCode}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={user.role === 'TEACHER' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.learningGroups.map(group => (
                        <Chip 
                          key={group.id}
                          label={group.name}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      {user.teacherGroups.map(group => (
                        <Chip 
                          key={group.id}
                          label={group.name}
                          size="small"
                          color="primary"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Lehrer</TableCell>
                  <TableCell>Schüler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.learningGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.id}</TableCell>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={group.teacher.name}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {group.students.map(student => (
                        <Chip 
                          key={student.id}
                          label={student.name}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Beschreibung</TableCell>
                  <TableCell>Lehrer</TableCell>
                  <TableCell>Struktur</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.subjects?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.id}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>{subject.description}</TableCell>
                    <TableCell>{subject.teacher?.name}</TableCell>
                    <TableCell>
                      {/* Verschachtelte Struktur anzeigen */}
                      {subject.blocks && subject.blocks.length > 0 ? (
                        <Box sx={{ ml: 1 }}>
                          {subject.blocks.map((block: any) => (
                            <Box key={block.id} sx={{ mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 500 }}>
                                Block: {block.name}
                              </Typography>
                              {block.units && block.units.length > 0 && (
                                <Box sx={{ ml: 2 }}>
                                  {block.units.map((unit: any) => (
                                    <Box key={unit.id} sx={{ mb: 0.5 }}>
                                      <Typography variant="body2" sx={{ color: '#388e3c' }}>
                                        Reihe: {unit.name}
                                      </Typography>
                                      {unit.topics && unit.topics.length > 0 && (
                                        <Box sx={{ ml: 2 }}>
                                          {unit.topics.map((topic: any) => (
                                            <Box key={topic.id} sx={{ mb: 0.5 }}>
                                              <Typography variant="body2" sx={{ color: '#e91e63' }}>
                                                Thema: {topic.name}
                                              </Typography>
                                              {topic.lessons && topic.lessons.length > 0 && (
                                                <Box sx={{ ml: 2 }}>
                                                  {topic.lessons.map((lesson: any) => (
                                                    <Typography key={lesson.id} variant="body2" sx={{ color: '#888' }}>
                                                      Stunde: {lesson.name}
                                                    </Typography>
                                                  ))}
                                                </Box>
                                              )}
                                            </Box>
                                          ))}
                                        </Box>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Keine Struktur</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Titel</TableCell>
                  <TableCell>Inhalt</TableCell>
                  <TableCell>Autor</TableCell>
                  <TableCell>Privat</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Reihenfolge</TableCell>
                  <TableCell>Erstellt</TableCell>
                  <TableCell>Aktualisiert</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.notes?.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{note.id}</TableCell>
                    <TableCell>{note.title}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {note.content}
                      </Typography>
                    </TableCell>
                    <TableCell>{note.author?.name || note.authorId}</TableCell>
                    <TableCell>
                      <Chip 
                        label={note.isPrivate ? 'Privat' : 'Öffentlich'} 
                        color={note.isPrivate ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {note.tags && (
                        <Chip 
                          label={note.tags}
                          size="small"
                          sx={{ backgroundColor: note.tags }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{note.order}</TableCell>
                    <TableCell>{new Date(note.createdAt).toLocaleDateString('de-DE')}</TableCell>
                    <TableCell>{new Date(note.updatedAt).toLocaleDateString('de-DE')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default DatabaseViewer; 