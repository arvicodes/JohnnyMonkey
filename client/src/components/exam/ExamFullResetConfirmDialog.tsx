import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

const CONFIRM_PHRASE = 'ZURÜCKSETZEN';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  /** Kurzbeschreibung der Prüfung (Pfad oder Titel). */
  examLabel?: string;
};

export default function ExamFullResetConfirmDialog({
  open,
  onClose,
  onConfirm,
  busy = false,
  examLabel,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(1);
      setConfirmText('');
    }
  }, [open]);

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleConfirm = () => {
    void Promise.resolve(onConfirm());
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      {step === 1 ? (
        <>
          <DialogTitle sx={{ pb: 1 }}>Alles zurücksetzen?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
              Für diese Prüfung (alle Versionen A/B …){examLabel ? ` „${examLabel}"` : ''}:
            </Typography>
            <Typography component="ul" variant="body2" sx={{ pl: 2.5, mb: 1.5, color: 'text.secondary' }}>
              <li>alle Abgaben und Korrekturen werden gelöscht</li>
              <li>laufende Prüfung in betroffenen Lerngruppen wird neu gestartet</li>
              <li>Schüler mit offenem Fenster bekommen den Timer neu (60 Min.)</li>
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={busy}>Abbrechen</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => setStep(2)}
              disabled={busy}
            >
              Weiter zur Bestätigung
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ pb: 1 }}>Zweite Bestätigung</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Geben Sie <strong>{CONFIRM_PHRASE}</strong> ein, um das Zurücksetzen auszuführen:
            </Typography>
            <TextField
              fullWidth
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              variant="outlined"
              disabled={busy}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStep(1)} disabled={busy}>Zurück</Button>
            <Button onClick={handleClose} disabled={busy}>Abbrechen</Button>
            <Button
              variant="contained"
              color="error"
              disabled={busy || confirmText !== CONFIRM_PHRASE}
              onClick={handleConfirm}
            >
              {busy ? 'Wird zurückgesetzt…' : 'Alles zurücksetzen'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
