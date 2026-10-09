import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Volle Höhe der Spalte statt fester 72vh. */
  fillHeight?: boolean;
};

export default function ExamCorrectionLiveReview({
  buildHtml,
  refreshKey,
  onSaveField,
  getFieldCorrection,
  fillHeight = false,
}: ExamCorrectionLiveReviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');
  const buildHtmlRef = useRef(buildHtml);
  buildHtmlRef.current = buildHtml;
  const loadSeqRef = useRef(0);

  const reload = useCallback(() => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setLoadError(null);
    void buildHtmlRef
      .current()
      .then((h) => {
        if (seq !== loadSeqRef.current) return;
        setHtml(h);
      })
      .catch((err: unknown) => {
        if (seq !== loadSeqRef.current) return;
        setHtml(null);
        setLoadError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      })
      .finally(() => {
        if (seq !== loadSeqRef.current) return;
        setLoading(false);
      });
  }, []);

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

  const frameMinH = fillHeight ? '100%' : 'min(72vh, 900px)';
  const frameH = fillHeight ? '100%' : '72vh';

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: fillHeight ? 320 : frameMinH,
        height: fillHeight ? 'min(52vh, 100%)' : undefined,
        flex: fillHeight ? '1 1 auto' : undefined,
        bgcolor: '#f3f3f3',
        borderRadius: 1,
        display: fillHeight ? 'flex' : 'block',
        flexDirection: fillHeight ? 'column' : undefined,
      }}
    >
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
            minHeight: fillHeight ? 280 : 'min(72vh, 900px)',
            height: frameH,
            flex: fillHeight ? '1 1 auto' : undefined,
            border: 0,
            display: 'block',
            borderRadius: 4,
          }}
        />
      ) : null}
      {!loading && !html ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
          Korrekturansicht konnte nicht geladen werden.
          {loadError ? (
            <Box component="span" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: 'error.main' }}>
              {loadError}
            </Box>
          ) : null}
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
