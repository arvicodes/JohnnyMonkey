import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Avatar
} from '@mui/material';
import { 
  School as SchoolIcon,
  QuestionAnswer as QuizIcon,
  Person as PersonIcon,
  EmojiEvents as TrophyIcon,
  Stars as StarsIcon
} from '@mui/icons-material';

interface Teacher {
  id: string;
  name: string;
}

interface LearningGroup {
  id: string;
  name: string;
  teacher: Teacher;
}

interface StudentDashboardProps {
  userId: string;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ userId, onLogout }) => {
  const [lerngruppen, setLerngruppen] = useState<LearningGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("Anna Schmidt");

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
    const fetchLerngruppen = async () => {
      try {
        const response = await fetch(`http://localhost:3005/api/learning-groups/student/${userId}`);
        if (!response.ok) {
          throw new Error('Lerngruppen konnten nicht geladen werden');
        }
        const data = await response.json();
        setLerngruppen(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    fetchLerngruppen();
  }, [userId]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh" sx={{ bgcolor: colors.background }}>
      <CircularProgress sx={{ color: colors.primary }} />
    </Box>
  );
  
  if (error) return (
    <Box sx={{ width: '100%', bgcolor: colors.background, p: 0 }}>
      <Grid container spacing={0}>
        <Grid item xs={12}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: colors.cardBg 
            }}>
              <CardContent>
                <Typography color="error">{error}</Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', bgcolor: colors.background, p: 0 }}>
      <Grid container spacing={0}>
        {/* Header Section - Full Width */}
        <Grid item xs={12}>
          <Box sx={{ 
            p: 1.05,
            background: '#f8f9fa',
            color: '#222',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar 
                  sx={{ 
                    width: 28, 
                    height: 28, 
                    bgcolor: colors.secondary,
                    boxShadow: '0 1.4px 2.8px rgba(0,0,0,0.12)'
                  }}
                >
                  {studentName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h1" sx={{ fontWeight: 600, fontSize: '0.77rem', mb: 0 }}>
                    Hallo {studentName.split(' ')[0]}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.67rem', opacity: 0.85 }}>
                    Willkommen zurück
                  </Typography>
                </Box>
              </Box>
              <Button 
                variant="contained"
                color="primary"
                size="small"
                sx={{
                  width: '5%',
                  minWidth: 49,
                  ml: 'auto',
                  bgcolor: '#333',
                  color: 'white',
                  fontWeight: 500,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#222' },
                  borderRadius: 1.4,
                  fontSize: '0.7rem',
                  py: 0.35,
                  px: 0.7
                }}
                onClick={onLogout}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Available Quizzes Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.4 }}>
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.14s',
              '&:hover': {
                transform: 'translateY(-2.8px)'
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.1 }}>
                  <StarsIcon sx={{ mr: 1.4, color: colors.secondary, fontSize: 28 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.secondary, fontSize: '1.12rem' }}>
                    Deine Quizze
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 2.1, color: 'text.secondary', fontSize: '0.84rem' }}>
                  Bereit für eine neue Herausforderung? 🎯
                </Typography>
                <Grid container spacing={1.4}>
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ 
                      borderRadius: 2.1,
                      border: 'none',
                      bgcolor: '#f8f9fa',
                      position: 'relative',
                      overflow: 'visible'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.4 }}>
                          <TrophyIcon sx={{ color: colors.accent2, mr: 0.7, fontSize: 21 }} />
                          <Typography variant="h6" sx={{ color: colors.accent2, fontSize: '0.84rem' }}>
                            Mathematik Quiz
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1.4, color: 'text.secondary', fontSize: '0.7rem' }}>
                          Grundlagen der Algebra - Teste dein Wissen! 🧮
                        </Typography>
                        <Button 
                          variant="contained" 
                          sx={{ 
                            bgcolor: colors.accent2,
                            '&:hover': {
                              bgcolor: colors.accent2,
                              filter: 'brightness(1.1)'
                            },
                            borderRadius: 2.1,
                            px: 2.8,
                            fontSize: '0.7rem',
                            py: 0.35
                          }}
                        >
                          Quiz starten 🚀
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Learning Groups Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.4 }}>
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.14s',
              '&:hover': {
                transform: 'translateY(-2.8px)'
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.1 }}>
                  <SchoolIcon sx={{ mr: 1.4, color: colors.primary, fontSize: 28 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.primary, fontSize: '1.12rem' }}>
                    Deine Lerngruppen
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 2.1, color: 'text.secondary', fontSize: '0.84rem' }}>
                  Hier sind deine Klassen und Lehrer 📚
                </Typography>
                <Grid container spacing={1.4}>
                  {lerngruppen.map((gruppe) => (
                    <Grid item xs={12} key={gruppe.id}>
                      <Card variant="outlined" sx={{ 
                        borderRadius: 2.1,
                        border: 'none',
                        bgcolor: '#f8f9fa'
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ color: colors.accent1, fontWeight: 'bold', fontSize: '0.84rem' }}>
                              {gruppe.name} 
                            </Typography>
                            <Chip 
                              label="Aktiv" 
                              size="small" 
                              sx={{ 
                                bgcolor: colors.success,
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.7rem',
                                height: 18
                              }} 
                            />
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.7,
                            mt: 1.4
                          }}>
                            <Avatar sx={{ bgcolor: colors.accent1, width: 22, height: 22 }}>
                              {gruppe.teacher.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                              {gruppe.teacher.name}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDashboard;