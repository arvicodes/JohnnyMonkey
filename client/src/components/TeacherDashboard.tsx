import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Avatar
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  Create as CreateIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

interface TeacherDashboardProps {
  userId: string;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userId }) => {
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

        {/* Quiz Management Section */}
        <Grid item xs={12}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CreateIcon sx={{ mr: 2, color: colors.secondary, fontSize: 40 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.secondary }}>
                    Quiz-Verwaltung
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
                  Erstellen und verwalten Sie Quizze für Ihre Lerngruppen 📚
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Gestalten Sie interaktive Quizze und beobachten Sie den Lernfortschritt! 🎯
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    sx={{ 
                      bgcolor: colors.secondary,
                      '&:hover': {
                        bgcolor: colors.secondary,
                        filter: 'brightness(1.1)'
                      },
                      borderRadius: 3,
                      px: 4
                    }}
                    startIcon={<CreateIcon />}
                  >
                    Neues Quiz erstellen
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{ 
                      color: colors.secondary,
                      borderColor: colors.secondary,
                      '&:hover': {
                        borderColor: colors.secondary,
                        bgcolor: `${colors.secondary}10`
                      },
                      borderRadius: 3,
                      px: 4
                    }}
                    startIcon={<AssessmentIcon />}
                  >
                    Ergebnisse ansehen
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Students Section */}
        <Grid item xs={12}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: colors.cardBg
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SchoolIcon sx={{ mr: 2, color: colors.primary, fontSize: 40 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.primary }}>
                    Meine Schüler
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                  Übersicht aller Schüler in Ihren Klassen 🎓
                </Typography>

                {/* Learning Group 6a */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    p: 2,
                    bgcolor: `${colors.primary}10`,
                    borderRadius: 2
                  }}>
                    <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 'bold' }}>
                      Lerngruppe: 6a
                    </Typography>
                    <Chip 
                      label="2 Schüler" 
                      size="small" 
                      sx={{ 
                        ml: 2, 
                        bgcolor: colors.primary,
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4} lg={3}>
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
                            <Avatar sx={{ bgcolor: colors.accent1, mr: 2 }}>TM</Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                Tim Müller
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                tim.mueller@schule.de
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
                              sx={{ 
                                color: colors.accent1,
                                '&:hover': {
                                  bgcolor: `${colors.accent1}10`
                                }
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={3}>
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
                            <Avatar sx={{ bgcolor: colors.accent2, mr: 2 }}>AS</Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                Anna Schmidt
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                anna.schmidt@schule.de
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
                              sx={{ 
                                color: colors.accent1,
                                '&:hover': {
                                  bgcolor: `${colors.accent1}10`
                                }
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                {/* Learning Group GK11 */}
                <Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    p: 2,
                    bgcolor: `${colors.primary}10`,
                    borderRadius: 2
                  }}>
                    <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 'bold' }}>
                      Lerngruppe: GK11
                    </Typography>
                    <Chip 
                      label="1 Schüler" 
                      size="small" 
                      sx={{ 
                        ml: 2, 
                        bgcolor: colors.primary,
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4} lg={3}>
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
                            <Avatar sx={{ bgcolor: colors.secondary, mr: 2 }}>LW</Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                Laura Weber
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                laura.weber@schule.de
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
                              sx={{ 
                                color: colors.accent1,
                                '&:hover': {
                                  bgcolor: `${colors.accent1}10`
                                }
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherDashboard; 