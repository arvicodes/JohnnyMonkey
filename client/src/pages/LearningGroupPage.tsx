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
  Link
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`http://localhost:3005/api/learning-groups/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
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
        <Typography>Übersicht der Lerngruppe</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <GradingSchemaManager groupId={id!} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography>Schülerliste</Typography>
      </TabPanel>
    </Box>
  );
}; 