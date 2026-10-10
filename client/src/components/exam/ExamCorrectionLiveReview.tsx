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
  onSaveGeneralComment?: (comment: string) => void;
  getFieldCorrection: (taskId: string) => { points?: number; comment?: string };
};

export default function ExamCorrectionLiveReview({
  buildHtml,
  refreshKey,
  onSaveField,
  onSaveGeneralComment,
  getFieldCorrection,
}: ExamCorrectionLiveReviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState(400);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState('');
  const [editComment, setEditComment] = useState('');
  const buildHtmlRef = useRef(buildHtml);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  buildHtmlRef.current = buildHtml;
  const loadSeqRef = useRef(0);

  const measureFrame = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(
      doc.documentElement?.scrollHeight || 0,
      doc.body?.scrollHeight || 0,
    );
    if (h > 0) setFrameHeight(h + 12);
  }, []);

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
      const frameWin = iframeRef.current?.contentWindow;
      if (frameWin && ev.source && ev.source !== frameWin) return;
      const data = ev.data as {
        type?: string;
        taskId?: string;
        value?: string;
        height?: number;
      };
      if (data?.type === 'jm-exam-correction-resize' && typeof data.height === 'number') {
        if (data.height > 0) setFrameHeight(data.height + 12);
        return;
      }
      if (data?.type === 'jm-exam-correction-general') {
        onSaveGeneralComment?.(String(data.value ?? ''));
        return;
      }
      if (data?.type === 'jm-exam-correction-essay-comment' && data.taskId) {
        const taskId = String(data.taskId);
        const cur = getFieldCorrection(taskId);
        onSaveField(taskId, cur.points, String(data.value ?? ''));
        return;
      }
      if (data?.type === 'jm-exam-correction-inline-points' && data.taskId) {
        const taskId = String(data.taskId);
        const cur = getFieldCorrection(taskId);
        const raw = String(data.value ?? '').trim();
        const pts = raw === '' ? undefined : Number(raw);
        onSaveField(
          taskId,
          pts !== undefined && Number.isFinite(pts) ? pts : undefined,
          cur.comment || '',
        );
        return;
      }
      if (data?.type !== 'jm-exam-correction-field' || !data.taskId) return;
      const taskId = String(data.taskId);
      const cur = getFieldCorrection(taskId);
      setEditTaskId(taskId);
      setEditPoints(cur.points != null ? String(cur.points) : '');
      setEditComment(cur.comment || '');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [getFieldCorrection, onSaveGeneralComment, onSaveField]);

  useEffect(() => {
    if (!html) return;
    const t = window.setTimeout(() => measureFrame(), 80);
    return () => window.clearTimeout(t);
  }, [html, measureFrame]);

  const saveEdit = () => {
    if (!editTaskId) return;
    const ptsRaw = editPoints.trim();
    const pts = ptsRaw === '' ? undefined : Number(ptsRaw);
    onSaveField(editTaskId, Number.isFinite(pts as number) ? pts : undefined, editComment);
    setEditTaskId(null);
    reload();
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {loading && !html ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
          <CircularProgress size={32} />
        </Box>
      ) : null}
      {html ? (
        <iframe
          ref={iframeRef}
          title="Korrekturansicht"
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin"
          onLoad={measureFrame}
          style={{
            width: '100%',
            height: frameHeight,
            border: 0,
            display: 'block',
            overflow: 'hidden',
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

      <Dialog
        open={Boolean(editTaskId)}
        onClose={() => setEditTaskId(null)}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
        sx={{ zIndex: (t) => t.zIndex.modal + 28 }}
      >
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
