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
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ userId }) => {
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
        const response = await fetch(`http://localhost:3002/api/learning-groups/student/${userId}`);
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
                {studentName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                  Hallo {studentName.split(' ')[0]}! 👋
                </Typography>
                <Typography variant="subtitle1">
                  Willkommen zurück in deinem Lernbereich
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Available Quizzes Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)'
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <StarsIcon sx={{ mr: 2, color: colors.secondary, fontSize: 40 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.secondary }}>
                    Deine Quizze
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                  Bereit für eine neue Herausforderung? 🎯
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ 
                      borderRadius: 3,
                      border: 'none',
                      bgcolor: '#f8f9fa',
                      position: 'relative',
                      overflow: 'visible'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <TrophyIcon sx={{ color: colors.accent2, mr: 1 }} />
                          <Typography variant="h6" sx={{ color: colors.accent2 }}>
                            Mathematik Quiz
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
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
                            borderRadius: 3,
                            px: 4
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
          <Box sx={{ p: 2 }}>
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)'
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SchoolIcon sx={{ mr: 2, color: colors.primary, fontSize: 40 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.primary }}>
                    Deine Lerngruppen
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                  Hier sind deine Klassen und Lehrer 📚
                </Typography>
                <Grid container spacing={2}>
                  {lerngruppen.map((gruppe) => (
                    <Grid item xs={12} key={gruppe.id}>
                      <Card variant="outlined" sx={{ 
                        borderRadius: 3,
                        border: 'none',
                        bgcolor: '#f8f9fa'
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ color: colors.accent1, fontWeight: 'bold' }}>
                              {gruppe.name} 
                            </Typography>
                            <Chip 
                              label="Aktiv" 
                              size="small" 
                              sx={{ 
                                bgcolor: colors.success,
                                color: 'white',
                                fontWeight: 'bold'
                              }} 
                            />
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            mt: 2
                          }}>
                            <Avatar sx={{ bgcolor: colors.accent1, width: 32, height: 32 }}>
                              {gruppe.teacher.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">
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