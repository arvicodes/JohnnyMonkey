import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { apiDelete, apiGetSafe, apiPost, apiPut } from '../../lib/api';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  EPO_NOTEN_CATEGORY_COUNT,
  type EpoNotenVariantSheet,
} from '../../lib/epoNotenShared';
import { epoNotenCompactBtnSx, epoNotenPalette } from './epoNotenUi';

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

export function EpoNotenVariantsDialog({ open, onClose, onChanged }: Props) {
  const [variants, setVariants] = useState<EpoNotenVariantSheet[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [studentLines, setStudentLines] = useState<string[]>([]);
  const [teacherLines, setTeacherLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetSafe('/api/epo-noten/variants');
      if (!res?.ok) throw new Error('Varianten konnten nicht geladen werden');
      const data = await res.json();
      const list = Array.isArray(data.variants) ? (data.variants as EpoNotenVariantSheet[]) : [];
      setVariants(list);
      if (!selectedId && list[0]) setSelectedId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    const v = variants.find((x) => x.id === selectedId);
    if (!v) return;
    setName(v.name);
    setStudentLines([...v.studentCategories]);
    setTeacherLines([...v.teacherCategories]);
  }, [selectedId, variants]);

  const saveCurrent = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiPut(`/api/epo-noten/variants/${selectedId}`, {
        name,
        studentCategories: studentLines,
        teacherCategories: teacherLines,
      });
      if (!res?.ok) throw new Error('Speichern fehlgeschlagen');
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const createVariant = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/variants', {
        name: 'Neue Variante',
        copyFromId: selectedId || undefined,
      });
      if (!res?.ok) throw new Error('Erstellen fehlgeschlagen');
      const data = await res.json();
      const id = data.variant?.id as string;
      await load();
      if (id) setSelectedId(id);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = async () => {
    if (!selectedId || selectedId === 'default') return;
    if (!window.confirm('Diese Variante wirklich löschen?')) return;
    setSaving(true);
    try {
      const res = await apiDelete(`/api/epo-noten/variants/${selectedId}`);
      if (!res?.ok) throw new Error('Löschen fehlgeschlagen');
      setSelectedId('default');
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={dialogCloseTitleSx}>
        Variantenzettel
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
          <Stack sx={{ minWidth: 160, maxWidth: 200 }} spacing={0.5}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: epoNotenPalette.textSecondary }}>
              Varianten
            </Typography>
            <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {variants.map((v) => (
                <ListItemButton
                  key={v.id}
                  selected={v.id === selectedId}
                  onClick={() => setSelectedId(v.id)}
                  sx={{ py: 0.35 }}
                >
                  <ListItemText primary={v.name} primaryTypographyProps={{ fontSize: '0.78rem', fontWeight: 600 }} />
                </ListItemButton>
              ))}
            </List>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => void createVariant()}
              disabled={saving || loading}
              sx={epoNotenCompactBtnSx}
            >
              Neue Variante
            </Button>
          </Stack>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <TextField
              size="small"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>SuS-Formulierung (Ich …)</Typography>
            {Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, (_, i) => (
              <TextField
                key={`s-${i}`}
                size="small"
                multiline
                minRows={2}
                label={`Kategorie ${i + 1}`}
                value={studentLines[i] ?? ''}
                onChange={(e) => {
                  const next = [...studentLines];
                  next[i] = e.target.value;
                  setStudentLines(next);
                }}
              />
            ))}
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, mt: 0.5 }}>Lehrkraft (Du …)</Typography>
            {Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, (_, i) => (
              <TextField
                key={`t-${i}`}
                size="small"
                multiline
                minRows={2}
                label={`Kategorie ${i + 1}`}
                value={teacherLines[i] ?? ''}
                onChange={(e) => {
                  const next = [...teacherLines];
                  next[i] = e.target.value;
                  setTeacherLines(next);
                }}
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {selectedId && selectedId !== 'default' && (
          <Button color="error" onClick={() => void deleteVariant()} disabled={saving}>
            Löschen
          </Button>
        )}
        <Button onClick={onClose}>Schließen</Button>
        <Button variant="contained" onClick={() => void saveCurrent()} disabled={saving || !selectedId}>
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
