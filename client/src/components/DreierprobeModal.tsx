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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import {
  Close,
  EmojiEvents,
  TrendingDown,
  TrendingUp,
  BarChart,
  PersonOff,
  Email
} from '@mui/icons-material';

interface KASubmission {
  id: string;
  student: {
    id: string;
    name: string;
    loginCode: string;
  };
  totalPoints: number;
  status: string;
}

interface LearningGroupStudent {
  id: string;
  name: string;
  loginCode: string;
}

interface DreierprobeModalProps {
  open: boolean;
  onClose: () => void;
  kaFilePath: string;
  submissions: KASubmission[];
}

// Hilfsfunktion: Extrahiere Vornamen (alles vor dem ersten Leerzeichen)
const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

// Notenberechnung (wie in KACorrectionMode)
const calculateGrade = (achieved: number, total: number): { numeric: number; string: string } => {
  if (total === 0) return { numeric: 0, string: '-' };
  
  const percentage = (achieved / total) * 100;
  let grade: number;
  let gradeString: string;
  
  if (percentage >= 92) {
    if (percentage >= 97) {
      grade = 1.0; // 1+
      gradeString = '1+';
    } else if (percentage < 95) {
      grade = 1.3; // 1-
      gradeString = '1-';
    } else {
      grade = 1.2; // 1
      gradeString = '1';
    }
  } else if (percentage >= 81) {
    if (percentage >= 86) {
      grade = 2.0; // 2+
      gradeString = '2+';
    } else if (percentage < 84) {
      grade = 2.3; // 2-
      gradeString = '2-';
    } else {
      grade = 2.2; // 2
      gradeString = '2';
    }
  } else if (percentage >= 67) {
    if (percentage >= 72) {
      grade = 3.0; // 3+
      gradeString = '3+';
    } else if (percentage < 70) {
      grade = 3.3; // 3-
      gradeString = '3-';
    } else {
      grade = 3.2; // 3
      gradeString = '3';
    }
  } else if (percentage >= 50) {
    if (percentage >= 55) {
      grade = 4.0; // 4+
      gradeString = '4+';
    } else if (percentage < 53) {
      grade = 4.3; // 4-
      gradeString = '4-';
    } else {
      grade = 4.2; // 4
      gradeString = '4';
    }
  } else if (percentage >= 30) {
    if (percentage >= 35) {
      grade = 5.0; // 5+
      gradeString = '5+';
    } else if (percentage < 33) {
      grade = 5.3; // 5-
      gradeString = '5-';
    } else {
      grade = 5.2; // 5
      gradeString = '5';
    }
  } else {
    grade = 6.0;
    gradeString = '6';
  }
  
  return { numeric: grade, string: gradeString };
};

const DreierprobeModal: React.FC<DreierprobeModalProps> = ({
  open,
  onClose,
  kaFilePath,
  submissions
}) => {
  const [learningGroupStudents, setLearningGroupStudents] = useState<LearningGroupStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailTab, setEmailTab] = useState(0);
  const [messagesSent, setMessagesSent] = useState(false);
  const [sentMessagesInfo, setSentMessagesInfo] = useState<{ date: string; hour: string; count: number } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentHour, setAppointmentHour] = useState('');
  const [emailTemplate, setEmailTemplate] = useState(`Liebe/r XYZ,

ich hoffe es geht dir nicht allzu schlecht und wünsche dir auf jeden Fall schon einmal gute Besserung und dass du dich gut und schnell erholst.

Ich möchte dir hiermit den Termin zum Nachschreiben der heutigen Arbeit mitteilen: [TERMIN] in Raum EDV-A2.
Deine Lehrkräfte für diese Stunde informiere ich entsprechend.

Gute Besserung,
Viele Grüße
Vera Christ`);

  useEffect(() => {
    if (open && submissions.length > 0) {
      loadLearningGroup();
    }
  }, [open, submissions]);

  useEffect(() => {
    if (open && learningGroupStudents.length > 0 && submissions.length > 0) {
      checkSentMessages();
    }
  }, [open, learningGroupStudents, submissions]);

  const checkSentMessages = async () => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/messages/teacher', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        
        // Prüfe ob Nachrichten an fehlende Schüler gesendet wurden
        const submittedStudentIds = new Set(submissions.map(sub => sub.student.id));
        const missingStudentIds = learningGroupStudents
          .filter(s => !submittedStudentIds.has(s.id))
          .map(s => s.id);
        
        // Finde Nachrichten mit Betreff "Nachschreibtermin" an fehlende Schüler
        const relevantMessages = messages.filter((msg: any) => 
          msg.subject === 'Nachschreibtermin' && 
          missingStudentIds.includes(msg.studentId)
        );

        if (relevantMessages.length > 0) {
          // Extrahiere Termin aus der ersten Nachricht
          const firstMessage = relevantMessages[0];
          const content = firstMessage.content || '';
          
          // Versuche Termin zu extrahieren (z.B. "XX der x.x.x in der xx Stunde")
          const dateMatch = content.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          const hourMatch = content.match(/der (\d{1,2})\. Stunde/);
          
          if (dateMatch || hourMatch) {
            setSentMessagesInfo({
              date: dateMatch ? `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}` : '',
              hour: hourMatch ? hourMatch[1] : '',
              count: relevantMessages.length
            });
            setMessagesSent(true);
          } else {
            setSentMessagesInfo({
              date: '',
              hour: '',
              count: relevantMessages.length
            });
            setMessagesSent(true);
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Nachrichten:', error);
    }
  };

  const loadLearningGroup = async () => {
    try {
      setLoading(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Finde die Lerngruppe basierend auf dem ersten Schüler
      const firstStudentId = submissions[0]?.student?.id;
      if (!firstStudentId) {
        setLoading(false);
        return;
      }

      // Lade alle Lerngruppen des Lehrers
      const response = await fetch('/api/learning-groups', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const groups = await response.json();
        // Finde die Gruppe, die den ersten Schüler enthält
        const group = groups.find((g: any) => 
          g.students?.some((s: any) => s.id === firstStudentId)
        );
        
        if (group && group.students) {
          setLearningGroupStudents(group.students);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Lerngruppe:', error);
    } finally {
      setLoading(false);
    }
  };

  // Berechne Noten für alle Submissions
  const submissionsWithGrades = submissions.map(sub => {
    const gradeData = calculateGrade(sub.totalPoints, 38);
    return {
      ...sub,
      grade: gradeData.numeric,
      gradeString: gradeData.string
    };
  }).sort((a, b) => a.grade - b.grade);

  // Beste, schlechteste und mittlere Note
  const bestSubmission = submissionsWithGrades[0];
  const worstSubmission = submissionsWithGrades[submissionsWithGrades.length - 1];
  const middleIndex = Math.floor(submissionsWithGrades.length / 2);
  const middleSubmission = submissionsWithGrades[middleIndex];

  // Notenschnitt (basierend auf Durchschnittspunkten)
  const averagePoints = submissionsWithGrades.length > 0
    ? submissionsWithGrades.reduce((sum, sub) => sum + sub.totalPoints, 0) / submissionsWithGrades.length
    : 0;
  const averageGradeData = calculateGrade(averagePoints, 38);

  // Notenverteilung
  const gradeDistribution: Record<string, number> = {};
  submissionsWithGrades.forEach(sub => {
    const gradeStr = sub.gradeString;
    gradeDistribution[gradeStr] = (gradeDistribution[gradeStr] || 0) + 1;
  });

  // Drittelregelung
  const totalSubmissions = submissionsWithGrades.length;
  const thirdSize = Math.ceil(totalSubmissions / 3);
  const upperThird = submissionsWithGrades.slice(0, thirdSize);
  const middleThird = submissionsWithGrades.slice(thirdSize, thirdSize * 2);
  const lowerThird = submissionsWithGrades.slice(thirdSize * 2);

  const upperThirdPercentage = totalSubmissions > 0 ? (upperThird.length / totalSubmissions) * 100 : 0;
  const middleThirdPercentage = totalSubmissions > 0 ? (middleThird.length / totalSubmissions) * 100 : 0;
  const lowerThirdPercentage = totalSubmissions > 0 ? (lowerThird.length / totalSubmissions) * 100 : 0;

  // Fehlende Schüler
  const submittedStudentIds = new Set(submissions.map(sub => sub.student.id));
  const missingStudents = learningGroupStudents.filter(
    student => !submittedStudentIds.has(student.id)
  );

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ 
        bgcolor: '#1976d2', 
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <BarChart />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Dreierprobe-Statistik
          </Typography>
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
      
      <DialogContent sx={{ p: 2, bgcolor: '#f5f7fa' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          {kaFilePath}
        </Typography>

        {/* Tabs - nur anzeigen wenn fehlende Schüler vorhanden */}
        {missingStudents.length > 0 && (
          <Tabs value={emailTab} onChange={(_, v) => setEmailTab(v)} sx={{ mb: 2 }}>
            <Tab label="Statistik" />
            <Tab label="Fehlende anschreiben" />
          </Tabs>
        )}
        
        {emailTab === 0 && (
          <>
            {/* Kompakte Liste für beste/schlechteste/mittlere Note */}
            <Box sx={{ mb: 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0', p: 1 }}>
              <Box display="flex" flexDirection="column" gap={0.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    🥇 Beste:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {bestSubmission?.gradeString || '-'} ({bestSubmission?.student.name || '-'})
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    📊 Mittlere:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {middleSubmission?.gradeString || '-'} ({middleSubmission?.student.name || '-'})
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    🥉 Schlechteste:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {worstSubmission?.gradeString || '-'} ({worstSubmission?.student.name || '-'})
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    ⌀ Schnitt:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#1976d2' }}>
                    {averageGradeData.string} ({submissions.length}/{learningGroupStudents.length || submissions.length})
                  </Typography>
                </Box>
              </Box>
            </Box>

        {/* Kompakte Tabellen */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Notenverteilung
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 600, py: 0.5, fontSize: '0.75rem' }}>Note</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, py: 0.5, fontSize: '0.75rem' }}>Anzahl</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, py: 0.5, fontSize: '0.75rem' }}>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(gradeDistribution)
                        .sort(([a], [b]) => {
                          const numA = parseFloat(a.replace(/[+-]/g, ''));
                          const numB = parseFloat(b.replace(/[+-]/g, ''));
                          if (numA !== numB) return numA - numB;
                          const orderA = a.endsWith('+') ? 0 : (a.endsWith('-') ? 2 : 1);
                          const orderB = b.endsWith('+') ? 0 : (b.endsWith('-') ? 2 : 1);
                          return orderA - orderB;
                        })
                        .map(([grade, count]) => (
                          <TableRow key={grade}>
                            <TableCell sx={{ py: 0.5, fontSize: '0.8rem' }}>{grade}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontSize: '0.8rem' }}>{count}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontSize: '0.8rem' }}>
                              {((count / totalSubmissions) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Drittelregelung
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                      Oberes: {upperThird.length} ({upperThirdPercentage.toFixed(1)}%)
                    </Typography>
                    {upperThird.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: '0.7rem' }}>
                        {upperThird[upperThird.length - 1]?.gradeString} - {upperThird[0]?.gradeString}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#1976d2' }}>
                      Mitte: {middleThird.length} ({middleThirdPercentage.toFixed(1)}%)
                    </Typography>
                    {middleThird.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: '0.7rem' }}>
                        {middleThird[middleThird.length - 1]?.gradeString} - {middleThird[0]?.gradeString}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#c62828' }}>
                      Unteres: {lowerThird.length} ({lowerThirdPercentage.toFixed(1)}%)
                    </Typography>
                    {lowerThird.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: '0.7rem' }}>
                        {lowerThird[lowerThird.length - 1]?.gradeString} - {lowerThird[0]?.gradeString}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Fehlende Schüler */}
        {missingStudents.length > 0 && (
          <Card variant="outlined">
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonOff sx={{ color: '#f57c00', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Fehlende Schüler ({missingStudents.length})
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  {messagesSent && sentMessagesInfo && (
                    <Chip
                      label={`✅ ${sentMessagesInfo.count} gesendet${sentMessagesInfo.date && sentMessagesInfo.hour ? ` • ${sentMessagesInfo.date}, ${sentMessagesInfo.hour}. Stunde` : ''}`}
                      size="small"
                      sx={{
                        bgcolor: '#e8f5e9',
                        color: '#2e7d32',
                        fontSize: '0.7rem',
                        height: 24
                      }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Email />}
                    onClick={() => setEmailTab(1)}
                    sx={{ 
                      bgcolor: '#1976d2',
                      '&:hover': { bgcolor: '#1565c0' }
                    }}
                  >
                    Anschreiben
                  </Button>
                </Box>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {missingStudents.map(student => (
                  <Chip
                    key={student.id}
                    label={student.name}
                    size="small"
                    sx={{
                      bgcolor: '#fff3e0',
                      color: '#f57c00',
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

            {missingStudents.length === 0 && learningGroupStudents.length > 0 && (
              <Alert severity="success" sx={{ mt: 1 }}>
                ✅ Alle Schüler haben abgegeben
              </Alert>
            )}
            {messagesSent && missingStudents.length === 0 && (
              <Alert severity="success" sx={{ mt: 1 }}>
                ✅ Alle Nachschreiber wurden erfolgreich angeschrieben
              </Alert>
            )}
          </>
        )}

        {/* Email-Editor Tab */}
        {emailTab === 1 && missingStudents.length > 0 && (
          <Box>
              <Card variant="outlined">
                <CardContent>
                  {/* Status-Anzeige */}
                  {messagesSent && sentMessagesInfo && (
                    <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                      ✅ Bereits {sentMessagesInfo.count} Nachricht(en) gesendet
                      {sentMessagesInfo.date && sentMessagesInfo.hour && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                          Termin: {sentMessagesInfo.date} in der {sentMessagesInfo.hour}. Stunde
                        </Typography>
                      )}
                    </Alert>
                  )}
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    E-Mail-Vorlage (anpassbar)
                  </Typography>
                  
                  {/* Termin-Eingabe */}
                  <Grid container spacing={1} sx={{ mb: 1.5 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="Datum (z.B. 15.01.2025)"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        placeholder="DD.MM.YYYY"
                        size="small"
                        fullWidth
                        sx={{ fontSize: '0.8rem' }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Stunde"
                        value={appointmentHour}
                        onChange={(e) => setAppointmentHour(e.target.value)}
                        placeholder="z.B. 3"
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, max: 10 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <TextField
                    multiline
                    rows={6}
                    fullWidth
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value)}
                    placeholder="E-Mail-Vorlage..."
                    size="small"
                    sx={{ mb: 1.5, fontSize: '0.8rem' }}
                  />
                  <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75, fontSize: '0.7rem' }}>
                      Vorschau (erste 3):
                    </Typography>
                    {missingStudents.slice(0, 3).map((student, idx) => {
                      const firstName = getFirstName(student.name);
                      const term = appointmentDate && appointmentHour 
                        ? `${appointmentDate} in der ${appointmentHour}. Stunde`
                        : '[TERMIN]';
                      let preview = emailTemplate.replace(/XYZ/g, firstName);
                      preview = preview.replace(/\[TERMIN\]/g, term);
                      return (
                        <Box key={student.id} sx={{ mb: 1, p: 1, bgcolor: '#fff', borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block', mb: 0.25, fontSize: '0.7rem' }}>
                            An: {firstName}
                          </Typography>
                          <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.7rem' }}>
                            {preview}
                          </Typography>
                        </Box>
                      );
                    })}
                    {missingStudents.length > 3 && (
                      <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic', fontSize: '0.7rem' }}>
                        ... und {missingStudents.length - 3} weitere
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={async () => {
                      try {
                        if (!appointmentDate || !appointmentHour) {
                          alert('Bitte geben Sie Datum und Stunde für den Termin ein.');
                          return;
                        }
                        
                        const loginCode = localStorage.getItem('loginCode') || '';
                        const term = `${appointmentDate} in der ${appointmentHour}. Stunde`;
                        const messages = missingStudents.map(student => {
                          const firstName = getFirstName(student.name);
                          let content = emailTemplate.replace(/XYZ/g, firstName);
                          content = content.replace(/\[TERMIN\]/g, term);
                          return {
                            studentId: student.id,
                            subject: 'Nachschreibtermin',
                            content: content
                          };
                        });

                        const response = await fetch('/api/messages/send-bulk', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-login-code': loginCode
                          },
                          body: JSON.stringify({ messages })
                        });

                        if (response.ok) {
                          const data = await response.json();
                          setMessagesSent(true);
                          setSentMessagesInfo({
                            date: appointmentDate,
                            hour: appointmentHour,
                            count: data.count || missingStudents.length
                          });
                          // Zeige Bestätigung und wechsle zurück zur Statistik
                          setEmailTab(0);
                        } else {
                          const errorText = await response.text();
                          let errorMessage = 'Unbekannter Fehler';
                          try {
                            const error = JSON.parse(errorText);
                            errorMessage = error.error || errorMessage;
                          } catch {
                            errorMessage = errorText || errorMessage;
                          }
                          console.error('Fehler beim Senden:', errorMessage);
                          alert(`❌ Fehler: ${errorMessage}`);
                        }
                      } catch (error) {
                        console.error('Fehler beim Senden:', error);
                        alert(`❌ Fehler beim Senden der Nachrichten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
                      }
                    }}
                    sx={{ bgcolor: '#1976d2' }}
                  >
                    📧 Alle {missingStudents.length} Schüler anschreiben
                  </Button>
                </CardContent>
              </Card>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#fff' }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DreierprobeModal;

