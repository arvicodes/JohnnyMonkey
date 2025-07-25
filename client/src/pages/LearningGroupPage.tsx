import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Breadcrumbs,
  Link,
  Grid
} from '@mui/material';
import { GradingSchemaManager } from '../components/GradingSchemaManager';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

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

interface LearningGroup {
  id: string;
  name: string;
}

export const LearningGroupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [group, setGroup] = useState<LearningGroup | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentDetails, setAssignmentDetails] = useState<any[]>([]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`/api/learning-groups/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/learning-groups/${id}/assignments`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Hilfsfunktion: Hole den Namen für einen Assignment-Typ und eine refId
  const fetchNameForAssignment = async (type: string, refId: string) => {
    let url = '';
    if (type === 'subject') url = `/api/subjects/${refId}`;
    if (type === 'block') url = `/api/blocks/${refId}`;
    if (type === 'unit') url = `/api/units/${refId}`;
    if (type === 'topic') url = `/api/topics/${refId}`;
    if (type === 'lesson') url = `/api/lessons/${refId}`;
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.name || null;
    } catch {
      return null;
    }
  };

  // Lade Details (Namen) zu allen Assignments
  useEffect(() => {
    if (assignments.length === 0) {
      setAssignmentDetails([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const details = await Promise.all(assignments.map(async (a) => {
        const name = await fetchNameForAssignment(a.type, a.refId);
        return { ...a, name };
      }));
      if (!cancelled) setAssignmentDetails(details);
    })();
    return () => { cancelled = true; };
  }, [assignments]);

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
      fetchAssignments();
    }
  }, [id]);

  if (!group) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              color="inherit"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </Link>
            <Typography color="text.primary">{group.name}</Typography>
          </Breadcrumbs>
        </Box>
        <Typography variant="h4" component="h1">
          {group.name}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="group tabs">
          <Tab label="Übersicht" />
          <Tab label="Notenschemata" />
          <Tab label="Schüler" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography>Übersicht der Lerngruppe</Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography variant="h6">Zugeordnete Inhalte aus „Meine Fächer“</Typography>
            {assignmentDetails.length === 0 && <Typography>Keine Inhalte zugeordnet.</Typography>}
            {assignmentDetails.length > 0 && (
              <Box>
                {['subject', 'block', 'unit', 'topic', 'lesson'].map(type => {
                  const items = assignmentDetails.filter(a => a.type === type);
                  if (items.length === 0) return null;
                  let label = '';
                  if (type === 'subject') label = 'Fächer';
                  if (type === 'block') label = 'Blöcke';
                  if (type === 'unit') label = 'Units';
                  if (type === 'topic') label = 'Themen';
                  if (type === 'lesson') label = 'Stunden';
                  return (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>{label}</Typography>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {items.map(a => (
                          a.name === 'Ein einfacher Einstieg' ? (
                            <li key={a.type + a.refId}>
                              <a
                                href="/material/3D-Druck-Intro.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                {a.name}
                              </a>
                            </li>
                          ) : (
                            <li key={a.type + a.refId}>{a.name || a.refId}</li>
                          )
                        ))}
                      </ul>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <GradingSchemaManager groupId={id!} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography variant="h6">Schülerliste</Typography>
            {/* Hier könnte eine echte Schülerliste stehen */}
            <Typography variant="body2" color="text.secondary">(Platzhalter für Schülerliste)</Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography variant="h6">Zugeordnete Inhalte</Typography>
            {assignmentDetails.length === 0 && <Typography>Keine Inhalte zugeordnet.</Typography>}
            {assignmentDetails.length > 0 && (
              <Box>
                {['subject', 'block', 'unit', 'topic', 'lesson'].map(type => {
                  const items = assignmentDetails.filter(a => a.type === type);
                  if (items.length === 0) return null;
                  let label = '';
                  if (type === 'subject') label = 'Fächer';
                  if (type === 'block') label = 'Blöcke';
                  if (type === 'unit') label = 'Units';
                  if (type === 'topic') label = 'Themen';
                  if (type === 'lesson') label = 'Stunden';
                  return (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2' }}>{label}</Typography>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {items.map(a => (
                          a.name === 'Ein einfacher Einstieg' ? (
                            <li key={a.type + a.refId}>
                              <a
                                href="/material/3D-Druck-Intro.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                {a.name}
                              </a>
                            </li>
                          ) : (
                            <li key={a.type + a.refId}>{a.name || a.refId}</li>
                          )
                        ))}
                      </ul>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}; 