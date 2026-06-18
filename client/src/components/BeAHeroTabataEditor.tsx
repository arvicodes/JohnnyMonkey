import React from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { heroMinimalFieldSx } from '../lib/beAHeroUi';
import { BeAHeroFeatureBody, type BeAHeroFeatureTheme } from './BeAHeroFeaturePanel';
import {
  DEFAULT_PYRAMID_SETS,
  DEFAULT_TABATA,
  type TabataConfig,
  type TabataMode,
  type TabataPyramidSet,
} from '../lib/tabata';

type Props = {
  value: TabataConfig;
  onChange: (patch: Partial<TabataConfig>) => void;
  theme: BeAHeroFeatureTheme;
};

export function BeAHeroTabataEditor({ value, onChange, theme }: Props) {
  const isPyramid = value.mode === 'pyramid';

  const updatePyramidSet = (index: number, patch: Partial<TabataPyramidSet>) => {
    const next = value.pyramidSets.map((set, i) => (i === index ? { ...set, ...patch } : set));
    onChange({ pyramidSets: next });
  };

  const addPyramidSet = () => {
    const last = value.pyramidSets[value.pyramidSets.length - 1] ?? DEFAULT_PYRAMID_SETS[0];
    onChange({ pyramidSets: [...value.pyramidSets, { ...last }] });
  };

  const removePyramidSet = (index: number) => {
    if (value.pyramidSets.length <= 1) return;
    onChange({ pyramidSets: value.pyramidSets.filter((_, i) => i !== index) });
  };

  return (
    <BeAHeroFeatureBody theme={theme}>
      <FormControl size="small" fullWidth sx={{ ...heroMinimalFieldSx, mb: 0.75 }}>
        <InputLabel id="be-a-hero-tabata-mode">Modus</InputLabel>
        <Select
          labelId="be-a-hero-tabata-mode"
          label="Modus"
          value={value.mode}
          onChange={(e) => onChange({ mode: e.target.value as TabataMode })}
        >
          <MenuItem value="interval">Intervall (gleichbleibend)</MenuItem>
          <MenuItem value="pyramid">Pyramide (Sätze)</MenuItem>
        </Select>
      </FormControl>

      {isPyramid ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 0.6 }}>
            <TextField
              label="Übungen"
              type="number"
              size="small"
              value={value.exercisesPerSet}
              onChange={(e) =>
                onChange({ exercisesPerSet: Number(e.target.value) || DEFAULT_TABATA.exercisesPerSet })
              }
              inputProps={{ min: 1, max: 30 }}
              helperText="pro Runde"
              FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Runden"
              type="number"
              size="small"
              value={value.roundsPerSet}
              onChange={(e) =>
                onChange({ roundsPerSet: Number(e.target.value) || DEFAULT_TABATA.roundsPerSet })
              }
              inputProps={{ min: 1, max: 30 }}
              helperText="pro Satz"
              FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Pause (Runde)"
              type="number"
              size="small"
              value={value.setRoundRestSeconds}
              onChange={(e) => onChange({ setRoundRestSeconds: Number(e.target.value) || 0 })}
              inputProps={{ min: 0, max: 300 }}
              helperText="im Satz"
              FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Pause (Satz)"
              type="number"
              size="small"
              value={value.setRestSeconds}
              onChange={(e) => onChange({ setRestSeconds: Number(e.target.value) || 0 })}
              inputProps={{ min: 0, max: 300 }}
              helperText="zwischen Sätzen"
              FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
              sx={heroMinimalFieldSx}
            />
          </Box>

          <Typography
            variant="caption"
            sx={{ fontWeight: 800, fontSize: '0.66rem', letterSpacing: '0.06em', color: theme.deep }}
          >
            SÄTZE · BELASTUNG & WECHSEL
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {value.pyramidSets.map((set, index) => (
              <Box
                key={index}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr 1fr auto',
                  gap: 0.5,
                  alignItems: 'center',
                  p: 0.65,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: theme.border,
                  bgcolor: 'rgba(255,255,255,0.82)',
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: theme.deep, px: 0.35, minWidth: 42 }}>
                  Satz {index + 1}
                </Typography>
                <TextField
                  label="Belastung"
                  type="number"
                  size="small"
                  value={set.workSeconds}
                  onChange={(e) =>
                    updatePyramidSet(index, { workSeconds: Number(e.target.value) || 5 })
                  }
                  inputProps={{ min: 5, max: 300 }}
                  sx={heroMinimalFieldSx}
                />
                <TextField
                  label="Wechsel"
                  type="number"
                  size="small"
                  value={set.restSeconds}
                  onChange={(e) => updatePyramidSet(index, { restSeconds: Number(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 300 }}
                  sx={heroMinimalFieldSx}
                />
                <IconButton
                  size="small"
                  onClick={() => removePyramidSet(index)}
                  disabled={value.pyramidSets.length <= 1}
                  aria-label={`Satz ${index + 1} entfernen`}
                  sx={{ color: value.pyramidSets.length <= 1 ? 'text.disabled' : theme.main }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={addPyramidSet}
            sx={{
              alignSelf: 'flex-start',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderColor: theme.border,
              color: theme.deep,
            }}
          >
            Satz hinzufügen
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0.6 }}>
          <TextField
            label="Arbeit"
            type="number"
            size="small"
            value={value.workSeconds}
            onChange={(e) =>
              onChange({ workSeconds: Number(e.target.value) || DEFAULT_TABATA.workSeconds })
            }
            inputProps={{ min: 5, max: 300 }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Pause (Übung)"
            type="number"
            size="small"
            value={value.restSeconds}
            onChange={(e) => onChange({ restSeconds: Number(e.target.value) || 0 })}
            inputProps={{ min: 0, max: 300 }}
            helperText="zwischen Übungen"
            FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Pause (Runde)"
            type="number"
            size="small"
            value={value.roundRestSeconds}
            onChange={(e) => onChange({ roundRestSeconds: Number(e.target.value) || 0 })}
            inputProps={{ min: 0, max: 300 }}
            helperText="zwischen Runden"
            FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Übungen"
            type="number"
            size="small"
            value={value.exercisesPerRound}
            onChange={(e) =>
              onChange({
                exercisesPerRound: Number(e.target.value) || DEFAULT_TABATA.exercisesPerRound,
              })
            }
            inputProps={{ min: 1, max: 30 }}
            helperText="pro Runde"
            FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Runden"
            type="number"
            size="small"
            value={value.rounds}
            onChange={(e) => onChange({ rounds: Number(e.target.value) || DEFAULT_TABATA.rounds })}
            inputProps={{ min: 1, max: 50 }}
            sx={heroMinimalFieldSx}
          />
        </Box>
      )}
    </BeAHeroFeatureBody>
  );
}
