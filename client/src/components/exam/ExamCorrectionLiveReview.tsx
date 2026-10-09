import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Typography,
} from '@mui/material';

type ExamCorrectionLiveReviewProps = {
  buildHtml: () => Promise<string>;
  refreshKey: string;
  onSaveField: (taskId: string, points: number | undefined, comment: string) => void;
  getFieldCorrection: (taskId: string) => { points?: number; comment?: string };
};

export default function ExamCorrectionLiveReview({
  buildHtml,
  refreshKey,
  onSaveField,
  getFieldCorrection,
}: ExamCorrectionLiveReviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    void buildHtml()
      .then((h) => setHtml(h))
      .catch(() => setHtml(null))
      .finally(() => setLoading(false));
  }, [buildHtml]);

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string; taskId?: string };
      if (data?.type !== 'jm-exam-correction-field' || !data.taskId) return;
      const taskId = String(data.taskId);
      const cur = getFieldCorrection(taskId);
      setEditTaskId(taskId);
      setEditPoints(cur.points != null ? String(cur.points) : '');
      setEditComment(cur.comment || '');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [getFieldCorrection]);

  const saveEdit = () => {
    if (!editTaskId) return;
    const ptsRaw = editPoints.trim();
    const pts = ptsRaw === '' ? undefined : Number(ptsRaw);
    onSaveField(editTaskId, Number.isFinite(pts as number) ? pts : undefined, editComment);
    setEditTaskId(null);
    reload();
  };

  return (
    <Box sx={{ position: 'relative', minHeight: 'min(72vh, 900px)', bgcolor: '#f3f3f3', borderRadius: 1 }}>
      {loading && !html ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <CircularProgress size={32} />
        </Box>
      ) : null}
      {html ? (
        <iframe
          title="Korrekturansicht"
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: '100%',
            minHeight: 'min(72vh, 900px)',
            height: '72vh',
            border: 0,
            display: 'block',
            borderRadius: 4,
          }}
        />
      ) : null}
      {!loading && !html ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
          Korrekturansicht konnte nicht geladen werden.
        </Typography>
      ) : null}

      <Dialog open={Boolean(editTaskId)} onClose={() => setEditTaskId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem', py: 1.5 }}>
          Bewertung: {editTaskId}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Punkte (manuell)"
            type="number"
            size="small"
            fullWidth
            value={editPoints}
            onChange={(e) => setEditPoints(e.target.value)}
            inputProps={{ step: 0.25, min: 0 }}
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="Kommentar zur Aufgabe"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTaskId(null)}>Abbrechen</Button>
          <Button variant="contained" onClick={saveEdit}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
