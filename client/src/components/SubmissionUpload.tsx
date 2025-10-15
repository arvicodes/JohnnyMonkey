import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Paper
} from '@mui/material';
import {
  Upload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import ImageEditor from './ImageEditor';

interface SubmissionUploadProps {
  fileName: string;
  filePath: string;
  teacherId: string;
  studentId: string;
  onViewFile: (item: any) => void;
  onClose: () => void;
}

const SubmissionUpload: React.FC<SubmissionUploadProps> = ({
  fileName,
  filePath,
  teacherId,
  studentId,
  onViewFile,
  onClose
}) => {
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadAssignmentAndSubmission();
  }, []);

  const loadAssignmentAndSubmission = async () => {
    try {
      setLoading(true);
      
      // Erstelle oder hole Assignment
      const assignmentResponse = await fetch('/api/submissions/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, filePath, teacherId })
      });

      if (!assignmentResponse.ok) {
        const errorData = await assignmentResponse.json();
        throw new Error(errorData.error || 'Fehler beim Laden des Assignments');
      }
      
      const assignmentData = await assignmentResponse.json();
      setAssignment(assignmentData);

      // Prüfe ob bereits eine Abgabe existiert
      const checkResponse = await fetch(
        `/api/submissions/check?filePath=${encodeURIComponent(filePath)}&studentId=${studentId}`
      );
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.hasSubmission) {
          setSubmission(checkData.submission);
        }
      }
    } catch (err: any) {
      console.error('Fehler beim Laden:', err);
      setError(err.message || 'Fehler beim Laden der Abgabeinformationen');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Wenn es ein Bild ist, zeige den Editor
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setCapturedImage(event.target.result as string);
            setShowImageEditor(true);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Andere Dateitypen direkt auswählen
        setSelectedFile(file);
        setError(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !assignment) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assignmentId', assignment.id);
      formData.append('studentId', studentId);

      const response = await fetch('/api/submissions/submit', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload fehlgeschlagen');
      }

      const submissionData = await response.json();
      setSubmission(submissionData);
      setSelectedFile(null);
      
      alert('✅ Abgabe erfolgreich hochgeladen!');
    } catch (err: any) {
      console.error('Fehler beim Upload:', err);
      setError(err.message || 'Fehler beim Hochladen der Datei');
    } finally {
      setUploading(false);
    }
  };

  const handleViewAssignment = () => {
    // Nutze die vorhandene handleFileClick Funktion aus StudentDashboard
    onViewFile({ name: fileName, path: filePath, type: 'file' });
  };

  const handleViewMySubmission = async () => {
    if (!submission) return;
    
    try {
      const fileExtension = submission.originalFileName.split('.').pop()?.toLowerCase();
      
      // Hole die Datei vom Server
      const response = await fetch(`/api/submissions/download/${submission.id}`);
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Datei');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Für PDFs und Bilder: im neuen Tab anzeigen
      if (fileExtension === 'pdf' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '')) {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        // Für Word, Excel, PowerPoint: Download
        const link = document.createElement('a');
        link.href = url;
        link.download = submission.originalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error('Fehler beim Anzeigen der Abgabe:', err);
      alert('Fehler beim Öffnen deiner Abgabe');
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submission) return;
    
    if (!window.confirm('Möchtest du deine Abgabe wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/submissions/submission/${submission.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });

      if (!response.ok) throw new Error('Löschen fehlgeschlagen');

      setSubmission(null);
      alert('Abgabe gelöscht');
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      alert('Fehler beim Löschen der Abgabe');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Rückkamera bevorzugen
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Warte kurz und starte dann den Video-Stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Fehler beim Zugriff auf Kamera:', err);
      setError('Kamera-Zugriff verweigert. Bitte erlaube den Kamera-Zugriff in deinen Browser-Einstellungen.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageDataUrl);
      setShowImageEditor(true);
      stopCamera();
    }
  };

  const handleSaveEditedImage = (blob: Blob, filename: string) => {
    const file = new File([blob], filename, { type: 'image/jpeg' });
    setSelectedFile(file);
    setShowImageEditor(false);
    setCapturedImage(null);
  };

  const handleCancelImageEditor = () => {
    setShowImageEditor(false);
    setCapturedImage(null);
  };

  // Cleanup: Stoppe Kamera beim Schließen
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#f5f5f5',
        color: '#333',
        py: 1,
        px: 2,
        borderBottom: '1px solid #e0e0e0',
        position: 'relative'
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem', pr: 3 }}>
          Abgabe
        </Typography>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            padding: 0,
            color: '#666',
            '&:hover': {
              bgcolor: '#e0e0e0',
              color: '#333'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 1.5, px: 2 }}>
        {loading && (
          <Box sx={{ py: 2 }}>
            <LinearProgress />
            <Typography sx={{ textAlign: 'center', mt: 1.5, color: 'text.secondary', fontSize: '0.85rem' }}>
              Lade...
            </Typography>
          </Box>
        )}

        {!loading && (
          <>
            {/* Aufgabentext oben anzeigen */}
            <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, mt: 1, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.3, fontSize: '0.8rem' }}>
                📄 Aufgabe:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', mb: 0.8 }}>
                {fileName}
              </Typography>
              <Button
                variant="text"
                size="small"
                startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                onClick={handleViewAssignment}
                sx={{ fontSize: '0.7rem', py: 0.3, px: 1 }}
              >
                Aufgabenstellung anzeigen
              </Button>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                {error}
              </Alert>
            )}

            {/* Bereits hochgeladene Abgabe */}
            {submission && (
              <>
                <Paper elevation={1} sx={{ p: 1.5, mb: 1.5, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ color: '#2e7d32', fontWeight: 600, fontSize: '0.85rem' }}>
                      ✅ Abgabe eingereicht
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 0.2, fontSize: '0.8rem' }}>
                    <strong>Datei:</strong> {submission.originalFileName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.2, fontSize: '0.8rem' }}>
                    <strong>Größe:</strong> {formatFileSize(submission.fileSize)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: '0.8rem' }}>
                    <strong>Eingereicht:</strong> {formatDate(submission.submittedAt)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                      onClick={handleViewMySubmission}
                      size="small"
                      sx={{ flex: 1, fontSize: '0.75rem', py: 0.5 }}
                    >
                      Meine Abgabe
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                      onClick={handleDeleteSubmission}
                      size="small"
                      sx={{ flex: 1, fontSize: '0.75rem', py: 0.5 }}
                    >
                      Löschen
                    </Button>
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.8, color: 'text.secondary', fontStyle: 'italic', fontSize: '0.7rem' }}>
                    💡 Du kannst eine neue Datei hochladen, um deine Abgabe zu ersetzen.
                  </Typography>
                </Paper>

                {/* Lehrer-Kommentar anzeigen */}
                {submission.teacherComment && (
                  <Paper elevation={1} sx={{ p: 1.5, mb: 1.5, bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
                    <Typography variant="subtitle2" sx={{ color: '#e65100', fontWeight: 600, fontSize: '0.85rem', mb: 0.8 }}>
                      💬 Kommentar deiner Lehrkraft:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                      {submission.teacherComment}
                    </Typography>
                    {submission.commentedAt && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.8, fontSize: '0.65rem', fontStyle: 'italic' }}>
                        Kommentiert am: {formatDate(submission.commentedAt)}
                      </Typography>
                    )}
                  </Paper>
                )}
              </>
            )}

            {/* Upload-Bereich */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                border: '2px dashed #bdbdbd',
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: '#fafafa',
                '&:hover': {
                  borderColor: '#1976d2',
                  bgcolor: '#f5f5f5'
                }
              }}
            >
              {selectedFile ? (
                <Box>
                  <Paper elevation={1} sx={{ p: 1.5, mb: 1.5, bgcolor: '#e3f2fd' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                      <FileIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {selectedFile.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          {formatFileSize(selectedFile.size)}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<UploadIcon sx={{ fontSize: 16 }} />}
                      onClick={handleUpload}
                      disabled={uploading}
                      sx={{ flex: 1, fontSize: '0.75rem', py: 0.5 }}
                    >
                      {uploading ? 'Lädt...' : (submission ? 'Ersetzen' : 'Hochladen')}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedFile(null)}
                      disabled={uploading}
                      sx={{ flex: 1, fontSize: '0.75rem', py: 0.5 }}
                    >
                      Abbrechen
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <UploadIcon sx={{ fontSize: 40, color: '#1976d2', mb: 0.8 }} />
                  <Typography variant="body2" sx={{ mb: 0.3, fontWeight: 600, fontSize: '0.85rem' }}>
                    {submission ? 'Neue Datei hochladen' : 'Datei auswählen'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.7rem' }}>
                    Word, Excel, PowerPoint, PDF, Bilder (max. 50 MB)
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 1 }}>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                      style={{ display: 'none' }}
                      id="file-upload-input"
                      disabled={uploading}
                    />
                    <label htmlFor="file-upload-input">
                      <Button
                        variant="contained"
                        component="span"
                        startIcon={<FileIcon sx={{ fontSize: 16 }} />}
                        disabled={uploading}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Datei auswählen
                      </Button>
                    </label>
                    
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<CameraIcon sx={{ fontSize: 16 }} />}
                      onClick={startCamera}
                      disabled={uploading}
                      size="small"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      📸 Foto aufnehmen
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </>
        )}
      </DialogContent>

      {/* Kamera-Modal */}
      {showCamera && (
        <Dialog
          open={true}
          onClose={stopCamera}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#1976d2',
            color: 'white',
            py: 1.5,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              📸 Foto aufnehmen
            </Typography>
            <IconButton 
              onClick={stopCamera} 
              sx={{ 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0, bgcolor: '#000' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 2, justifyContent: 'center', bgcolor: '#f5f5f5' }}>
            <Button
              variant="contained"
              color="success"
              onClick={capturePhoto}
              size="large"
              startIcon={<CameraIcon />}
              sx={{ 
                fontSize: '1rem',
                py: 1.5,
                px: 4,
                borderRadius: 10
              }}
            >
              📸 Foto aufnehmen
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Bildbearbeitungs-Modal */}
      {showImageEditor && capturedImage && (
        <ImageEditor
          imageData={capturedImage}
          onSave={handleSaveEditedImage}
          onCancel={handleCancelImageEditor}
        />
      )}
    </Dialog>
  );
};

export default SubmissionUpload;
