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
import { WaUploadKind, waUploadMeta } from '../../lib/wochenaufgabenWorkflow';
import { indeterminateLinearProgressSx } from '../../lib/muiLinearProgressSx';
import { folderPathBasename } from '../../lib/wochenaufgabenFolder';

const ACCEPT: Record<WaUploadKind, string> = {
  solution: 'application/pdf,.pdf',
  video: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov',
  audio: 'audio/mpeg,audio/wav,audio/webm,audio/ogg,.mp3,.wav,.webm,.ogg,.m4a',
  correction: 'application/pdf,.pdf',
};

const LABELS: Record<WaUploadKind, string> = {
  solution: 'Lösung (PDF)',
  video: 'Erklärvideo',
  audio: 'Audio-Rückmeldung',
  correction: 'Korrigierte Lösung (PDF)',
};

type Props = {
  open: boolean;
  onClose: () => void;
  kind: WaUploadKind;
  lessonPath: string;
  studentId: string;
  teacherId: string;
  onUploadSuccess?: () => void;
};

export default function WochenaufgabeUploadModal({
  open,
  onClose,
  kind,
  lessonPath,
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
  const { fileName, filePath } = waUploadMeta(kind, lessonPath);

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
        {LABELS[kind]} — WA {number}
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
                Bereits hochgeladen. Neuer Upload ersetzt die alte Datei.
              </Alert>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Button variant="outlined" component="label" startIcon={<UploadIcon />} disabled={uploading}>
              Datei auswählen
              <input
                hidden
                type="file"
                accept={ACCEPT[kind]}
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null);
                  setError(null);
                }}
              />
            </Button>
            {selectedFile ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {selectedFile.name}
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
