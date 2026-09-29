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
import { EPO_VARIANT2_WEIGHTED_PRESET } from '../../lib/epoNotenVariantPresets';
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
  const [titleLines, setTitleLines] = useState<string[]>([]);
  const [weightLines, setWeightLines] = useState<string[]>([]);
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
    setTitleLines([...(v.categoryTitles ?? [])]);
    setWeightLines(
      v.categoryWeightsPercent
        ? v.categoryWeightsPercent.map((w) => String(w))
        : Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, () => ''),
    );
    setStudentLines([...v.studentCategories]);
    setTeacherLines([...v.teacherCategories]);
  }, [selectedId, variants]);

  const saveCurrent = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const weights = weightLines.map((w) => Math.round(Number(w)));
      const weightsPayload =
        weights.length === EPO_NOTEN_CATEGORY_COUNT && weights.every((n) => Number.isFinite(n) && n > 0)
          ? weights
          : undefined;

      const res = await apiPut(`/api/epo-noten/variants/${selectedId}`, {
        name,
        categoryTitles: titleLines,
        categoryWeightsPercent: weightsPayload,
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

  const applyVariant2Preset = () => {
    setName(EPO_VARIANT2_WEIGHTED_PRESET.name);
    setTitleLines([...EPO_VARIANT2_WEIGHTED_PRESET.categoryTitles]);
    setWeightLines(EPO_VARIANT2_WEIGHTED_PRESET.categoryWeightsPercent.map(String));
    setStudentLines([...EPO_VARIANT2_WEIGHTED_PRESET.studentCategories]);
    setTeacherLines([...EPO_VARIANT2_WEIGHTED_PRESET.teacherCategories]);
  };

  const createVariant2 = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/variants', { template: 'variant2' });
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
            <Button
              size="small"
              variant="outlined"
              onClick={() => void createVariant2()}
              disabled={saving || loading}
              sx={epoNotenCompactBtnSx}
            >
              Variante 2 anlegen
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
            <Button size="small" onClick={applyVariant2Preset} disabled={loading} sx={{ alignSelf: 'flex-start' }}>
              Vorlage „Variante 2“ in Formular laden
            </Button>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Bereiche (Titel &amp; Gewichtung %)</Typography>
            {Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, (_, i) => (
              <Stack key={`row-${i}`} direction="row" spacing={0.75} alignItems="flex-start">
                <TextField
                  size="small"
                  label={`Bereich ${i + 1}`}
                  value={titleLines[i] ?? ''}
                  onChange={(e) => {
                    const next = [...titleLines];
                    next[i] = e.target.value;
                    setTitleLines(next);
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="%"
                  type="number"
                  inputProps={{ min: 1, max: 100, step: 1 }}
                  value={weightLines[i] ?? ''}
                  onChange={(e) => {
                    const next = [...weightLines];
                    next[i] = e.target.value;
                    setWeightLines(next);
                  }}
                  sx={{ width: 72 }}
                />
              </Stack>
            ))}
            <Typography variant="caption" color="text.secondary">
              Gewichtungen müssen zusammen 100 % ergeben (sonst zählt die einfache Summe 0–15).
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>SuS-Formulierung (Ich …)</Typography>
            {Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, (_, i) => (
              <TextField
                key={`s-${i}`}
                size="small"
                multiline
                minRows={2}
                label={titleLines[i] ? titleLines[i] : `Kategorie ${i + 1}`}
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
                label={titleLines[i] ? titleLines[i] : `Kategorie ${i + 1}`}
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
