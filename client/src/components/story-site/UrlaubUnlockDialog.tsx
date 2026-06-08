import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { LockOpen as LockOpenIcon } from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { unlockUrlaubCategory } from '../../lib/storySiteCategories';

type UrlaubUnlockDialogProps = {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
};

export function UrlaubUnlockDialog({ open, onClose, onUnlocked }: UrlaubUnlockDialogProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleClose = () => {
    setPassword('');
    setError(false);
    onClose();
  };

  const handleUnlock = () => {
    if (unlockUrlaubCategory(password)) {
      setPassword('');
      setError(false);
      onUnlocked();
      onClose();
      return;
    }
    setError(true);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: '#e0f2f1', color: '#00695c' }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: '1rem' }}>
          Urlaub freischalten
        </Typography>
        <DialogCloseIconButton
          onClose={handleClose}
          sx={{ color: '#00695c', '&:hover': { bgcolor: 'rgba(0, 105, 92, 0.1)' } }}
          iconSx={{ color: '#00695c' }}
        />
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#faf7f2' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Urlaubs-Einträge sind geschützt. Gib das Passwort ein, um sie in der Timeline zu sehen.
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Falsches Passwort.
          </Alert>
        ) : null}
        <TextField
          autoFocus
          fullWidth
          type="password"
          label="Passwort"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUnlock();
          }}
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fffef9' } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, bgcolor: '#faf7f2' }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          startIcon={<LockOpenIcon />}
          onClick={handleUnlock}
          disabled={!password.trim()}
          sx={{
            textTransform: 'none',
            bgcolor: '#00897b',
            '&:hover': { bgcolor: '#00695c' },
          }}
        >
          Freischalten
        </Button>
      </DialogActions>
    </Dialog>
  );
}
