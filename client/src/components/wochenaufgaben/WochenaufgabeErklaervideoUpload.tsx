import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { wochenaufgabeVideoAssignmentKey } from '../../lib/wochenaufgabenAssignments';
import { indeterminateLinearProgressSx } from '../../lib/muiLinearProgressSx';
import { folderPathBasename } from '../../lib/wochenaufgabenFolder';

type Props = {
  open: boolean;
  onClose: () => void;
  lessonPath: string;
  slot: number;
  studentId: string;
  teacherId: string;
  onUploadSuccess?: () => void;
};

export default function WochenaufgabeErklaervideoUpload({
  open,
  onClose,
  lessonPath,
  slot,
  studentId,
  teacherId,
  onUploadSuccess,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [hasSubmission, setHasSubmission] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const number = folderPathBasename(lessonPath);
  const { fileName, filePath } = wochenaufgabeVideoAssignmentKey(lessonPath, slot);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoading(true);
      setError(null);
      setSelectedFile(null);
      try {
        const assignmentRes = await fetch('/api/submissions/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, filePath, teacherId }),
        });
        if (!assignmentRes.ok) throw new Error('Abgabe konnte nicht vorbereitet werden');
        const assignment = await assignmentRes.json();
        setAssignmentId(assignment.id);

        const checkRes = await fetch(
          `/api/submissions/check?filePath=${encodeURIComponent(filePath)}&studentId=${encodeURIComponent(studentId)}`,
        );
        if (checkRes.ok) {
          const check = await checkRes.json();
          setHasSubmission(Boolean(check.hasSubmission));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, fileName, filePath, studentId, teacherId]);

  const handleUpload = async () => {
    if (!selectedFile || !assignmentId) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('assignmentId', assignmentId);
      form.append('studentId', studentId);
      form.append('displayName', selectedFile.name);
      form.append('allowMultiple', 'false');

      const res = await fetch('/api/submissions/submit', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }
      setHasSubmission(true);
      onUploadSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={dialogCloseTitleSx}>
        Erklärvideo — Wochenaufgabe {number}{slot > 1 ? ` (Platz ${slot})` : ''}
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            {hasSubmission ? (
              <Alert severity="success" sx={{ py: 0.25 }}>
                Erklärvideo wurde bereits hochgeladen. Neues Video ersetzt die alte Abgabe.
              </Alert>
            ) : (
              <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
                Bitte lade ein kurzes Erklärvideo zu dieser Wochenaufgabe hoch (MP4, WebM oder MOV).
              </Typography>
            )}
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Button variant="outlined" component="label" startIcon={<UploadIcon />} disabled={uploading}>
              Video auswählen
              <input
                hidden
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null);
                  setError(null);
                }}
              />
            </Button>
            {selectedFile ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {selectedFile.name} ({Math.round(selectedFile.size / 1024 / 1024)} MB)
              </Typography>
            ) : null}
            {uploading ? <LinearProgress sx={indeterminateLinearProgressSx} /> : null}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Abbrechen
        </Button>
        <Button variant="contained" onClick={() => void handleUpload()} disabled={!selectedFile || uploading || loading}>
          Hochladen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
