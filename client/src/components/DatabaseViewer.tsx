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
  const [data, setData] = useState<{ users: User[]; learningGroups: LearningGroup[]; subjects: Subject[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatabaseContent();
  }, []);

  const fetchDatabaseContent = async () => {
    try {
      const response = await fetch('http://localhost:3005/api/admin/db-content');
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
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.subjects?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.id}</TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>{subject.description}</TableCell>
                    <TableCell>{subject.teacher?.name}</TableCell>
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