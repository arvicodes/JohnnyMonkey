import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FileDownload as FileDownloadIcon,
  MusicNote as MusicNoteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { downloadSmartiesStandaloneHtml } from '../lib/downloadSmartiesStandalone';
import { smartieVersion1, smartieVersion2, defaultSmartieCustomMix, normalizeSmartieCards, type SmartieColorCard } from '../lib/smartiesData';
import {
  getSmartieQuestions,
  loadSmartiePresetsState,
  loadSmartieVersion,
  persistSmartieCustomMix,
  persistSmartiePresetsState,
  persistSmartieVersion,
  type SmartieSavedPreset,
  type SmartieVersionId,
} from '../lib/smartiesStorage';

export type { SmartieColorCard };
export { smartieVersion1, smartieVersion2 };

const SMARTIE_BOX_SRC = '/ki-spiele/smarties-box.svg';
const smartieTitleColors = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#EC407A', '#6D4C41'];

function SmartieGem({ size = 32, color = '#E53935' }: { size?: number; color?: string }) {
  const border = Math.max(2, Math.round(size * 0.06));
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color,
        border: `${border}px solid rgba(255,255,255,0.5)`,
        boxShadow: `inset 0 ${-size * 0.12}px ${size * 0.22}px rgba(0,0,0,0.28), 0 3px 8px rgba(0,0,0,0.18)`,
        position: 'relative',
        flexShrink: 0,
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '16%',
          left: '20%',
          width: '38%',
          height: '38%',
          borderRadius: '50%',
          bgcolor: 'white',
          opacity: 0.9,
        },
      }}
    />
  );
}

function SmartieBoxImage({ height = 88 }: { height?: number | { xs: number; sm: number } }) {
  return (
    <Box component="img" src={SMARTIE_BOX_SRC} alt="Smarties Mini Box" sx={{ height, width: 'auto', flexShrink: 0 }} />
  );
}

function SmartieColorTitle() {
  const text = 'Viele viele bunte Smarties';
  let colorIndex = 0;
  return (
    <Typography
      component="h1"
      sx={{
        fontWeight: 900,
        lineHeight: 1.08,
        flex: 1,
        minWidth: 0,
        fontSize: { xs: '1.85rem', sm: '2.35rem', md: '2.7rem' },
      }}
    >
      {text.split('').map((char, index) => {
        if (char === ' ') {
          return (
            <Box component="span" key={`space-${index}`}>
              {' '}
            </Box>
          );
        }
        const color = smartieTitleColors[colorIndex % smartieTitleColors.length];
        colorIndex += 1;
        return (
          <Box component="span" key={`${char}-${index}`} sx={{ color }}>
            {char}
          </Box>
        );
      })}
    </Typography>
  );
}

function SmartieOp({ children }: { children: React.ReactNode }) {
  return (
    <Box component="span" sx={{ fontWeight: 800, color: '#1f2937' }}>
      {children}
    </Box>
  );
}

const smartieInstructionSteps: React.ReactNode[] = [
  <>
    <SmartieOp>Nehmt</SmartieOp> euch eine Smartie Mini Box.
  </>,
  <>
    <SmartieOp>Bewegt</SmartieOp> euch frei im Raum, solange die Musik läuft.
  </>,
  <>
    Stoppt die Musik, <SmartieOp>findet</SmartieOp> eine Partner*in – eine Person pro Paar.
  </>,
  <>
    <SmartieOp>Zieht</SmartieOp> beide jeweils ein Smartie aus der Box. Die Farbe legt die Frage fest.
  </>,
  <>
    <SmartieOp>Beantwortet</SmartieOp> nacheinander die Frage zu eurer jeweiligen Farbe.
  </>,
  <>
    <SmartieOp>Esst</SmartieOp> euren Smartie, weiter gehts.
  </>,
];

function SmartieQuestionColumn({
  cards,
  editable = false,
  onQuestionChange,
}: {
  cards: SmartieColorCard[];
  editable?: boolean;
  onQuestionChange?: (index: number, question: string) => void;
}) {
  return (
    <Box sx={{ bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', p: { xs: 1, sm: 1.25 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: { xs: 0.75, sm: 1 },
          alignItems: 'start',
        }}
      >
        {cards.map((card, index) => (
          <Box
            key={`${card.name}-${index}`}
            sx={{
              display: 'flex',
              gap: 0.75,
              alignItems: 'flex-start',
              p: { xs: 0.85, sm: 1 },
              borderRadius: 1.25,
              borderLeft: `3px solid ${card.hex}`,
              bgcolor: `${card.hex}0c`,
            }}
          >
            <SmartieGem size={26} color={card.hex} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: card.hex,
                  filter: 'brightness(0.72)',
                  display: 'block',
                  mb: 0.35,
                  fontSize: '0.9rem',
                }}
              >
                {card.name}
              </Typography>
              {editable ? (
                <TextField
                  value={card.question}
                  onChange={(event) => onQuestionChange?.(index, event.target.value)}
                  multiline
                  minRows={2}
                  size="small"
                  fullWidth
                  placeholder="Eigene Frage …"
                  sx={{ '& .MuiInputBase-root': { fontSize: '0.96rem', fontWeight: 600, lineHeight: 1.4, bgcolor: 'white' } }}
                />
              ) : (
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, lineHeight: 1.4, color: '#374151', fontSize: { xs: '0.94rem', sm: '1rem' } }}
                >
                  {card.question}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const compactButtonSx = {
  fontSize: '0.72rem',
  py: 0.3,
  px: 0.9,
  minWidth: 0,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  lineHeight: 1.2,
  '& .MuiButton-startIcon': { mr: 0.35 },
  '& .MuiButton-startIcon > *': { fontSize: '0.85rem' },
} as const;

const smartieVersionShortLabels: Record<SmartieVersionId, string> = {
  v1: 'V1',
  v2: 'V2',
  custom: 'Mix',
};

const compactButtonRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.5,
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: '100%',
  '& .MuiFormControl-root, & .MuiTextField-root': { flexShrink: 0 },
} as const;

const actionButtonGroupSx = {
  flexShrink: 0,
  '& .MuiButton-root': {
    fontSize: '0.82rem',
    py: 0.6,
    px: 1.45,
    minWidth: 72,
    fontWeight: 700,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    textTransform: 'none',
    borderColor: 'rgba(0,0,0,0.2)',
  },
} as const;

type SmartieIcebreakerPageProps = {
  embedded?: boolean;
  onBack?: () => void;
};

export default function SmartieIcebreakerPage({ embedded = false, onBack }: SmartieIcebreakerPageProps) {
  const navigate = useNavigate();
  const initialSmartiePresetsState = useMemo(() => loadSmartiePresetsState(), []);

  const [smartieVersion, setSmartieVersion] = useState<SmartieVersionId>(() => loadSmartieVersion());
  const [smartiePresets, setSmartiePresets] = useState<SmartieSavedPreset[]>(initialSmartiePresetsState.presets);
  const [selectedSmartiePresetId, setSelectedSmartiePresetId] = useState(initialSmartiePresetsState.selectedId);
  const [smartiePresetName, setSmartiePresetName] = useState(
    () => initialSmartiePresetsState.presets.find((preset) => preset.id === initialSmartiePresetsState.selectedId)?.name ?? ''
  );
  const [smartieCustomMix, setSmartieCustomMix] = useState<SmartieColorCard[]>(() => {
    const selected = initialSmartiePresetsState.presets.find((preset) => preset.id === initialSmartiePresetsState.selectedId);
    return selected?.cards ?? defaultSmartieCustomMix();
  });
  const [smartieMusicOn, setSmartieMusicOn] = useState(false);
  const skipPresetsPersistRef = useRef(true);
  const skipVersionPersistRef = useRef(true);

  const smartieQuestions = useMemo(
    () => getSmartieQuestions(smartieVersion, smartieCustomMix),
    [smartieVersion, smartieCustomMix]
  );

  const smartieVersionLabels: Record<SmartieVersionId, string> = {
    v1: 'Version 1',
    v2: 'Version 2',
    custom: 'Eigene Mixversion',
  };

  useEffect(() => {
    if (skipPresetsPersistRef.current) {
      skipPresetsPersistRef.current = false;
      return;
    }
    persistSmartiePresetsState(smartiePresets, selectedSmartiePresetId);
    persistSmartieCustomMix(smartieCustomMix);
  }, [smartiePresets, selectedSmartiePresetId, smartieCustomMix]);

  useEffect(() => {
    if (skipVersionPersistRef.current) {
      skipVersionPersistRef.current = false;
      return;
    }
    persistSmartieVersion(smartieVersion);
  }, [smartieVersion]);

  const applySmartieCustomMix = (cards: SmartieColorCard[]) => {
    const normalized = normalizeSmartieCards(cards);
    setSmartieCustomMix(normalized);
    setSmartiePresets((prev) =>
      prev.map((preset) => (preset.id === selectedSmartiePresetId ? { ...preset, cards: normalized } : preset))
    );
  };

  const selectSmartieVersion = (version: SmartieVersionId | null) => {
    if (!version) return;
    setSmartieVersion(version);
  };

  const selectSmartiePreset = (presetId: string) => {
    const preset = smartiePresets.find((entry) => entry.id === presetId);
    if (!preset) return;
    setSelectedSmartiePresetId(preset.id);
    setSmartiePresetName(preset.name);
    setSmartieCustomMix(preset.cards);
  };

  const saveSmartiePreset = () => {
    const cleanName = smartiePresetName.trim() || 'Unbenannte Version';
    const normalized = normalizeSmartieCards(smartieCustomMix);
    const nameTaken = smartiePresets.find((preset) => preset.name === cleanName && preset.id !== selectedSmartiePresetId);
    if (nameTaken) {
      window.alert(`Der Name „${cleanName}“ ist bereits vergeben. Bitte anderen Namen wählen.`);
      return;
    }
    setSmartiePresets((prev) =>
      prev.map((preset) =>
        preset.id === selectedSmartiePresetId ? { ...preset, name: cleanName, cards: normalized } : preset
      )
    );
    setSmartieCustomMix(normalized);
    setSmartiePresetName(cleanName);
  };

  const createNewSmartiePreset = () => {
    const normalized = normalizeSmartieCards(smartieCustomMix);
    const baseName = smartiePresetName.trim() || `Eigene Version ${smartiePresets.length + 1}`;
    let cleanName = baseName;
    let suffix = 2;
    while (smartiePresets.some((preset) => preset.name === cleanName)) {
      cleanName = `${baseName} (${suffix})`;
      suffix += 1;
    }
    const nextPreset: SmartieSavedPreset = {
      id: `smartie-preset-${Date.now()}`,
      name: cleanName,
      cards: normalized.map((card) => ({ ...card })),
    };
    setSmartiePresets((prev) => [...prev, nextPreset]);
    setSelectedSmartiePresetId(nextPreset.id);
    setSmartiePresetName(cleanName);
    setSmartieCustomMix(nextPreset.cards);
  };

  const updateCustomSmartieQuestion = (index: number, question: string) => {
    setSmartieCustomMix((prev) => {
      const next = normalizeSmartieCards(prev.map((card, cardIndex) => (cardIndex === index ? { ...card, question } : card)));
      setSmartiePresets((presets) =>
        presets.map((preset) => (preset.id === selectedSmartiePresetId ? { ...preset, cards: next } : preset))
      );
      return next;
    });
  };

  const copyCustomMixFrom = (source: 'v1' | 'v2') => {
    const sourceCards = source === 'v1' ? smartieVersion1 : smartieVersion2;
    applySmartieCustomMix(sourceCards.map((card) => ({ ...card })));
  };

  const resetSmartieCustomMix = () => {
    applySmartieCustomMix(defaultSmartieCustomMix());
  };

  const deleteSmartiePreset = () => {
    if (smartiePresets.length <= 1) {
      window.alert('Mindestens eine Version muss bleiben.');
      return;
    }
    const preset = smartiePresets.find((entry) => entry.id === selectedSmartiePresetId);
    if (!preset) return;
    if (!window.confirm(`Version „${preset.name}“ wirklich löschen?`)) return;

    const nextPresets = smartiePresets.filter((entry) => entry.id !== selectedSmartiePresetId);
    const nextSelected = nextPresets[0];
    setSmartiePresets(nextPresets);
    setSelectedSmartiePresetId(nextSelected.id);
    setSmartiePresetName(nextSelected.name);
    setSmartieCustomMix(nextSelected.cards);
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/ki-spiele');
  };

  const [exporting, setExporting] = useState(false);

  const exportStandaloneHtml = async () => {
    setExporting(true);
    try {
      await downloadSmartiesStandaloneHtml();
    } catch {
      window.alert('Download fehlgeschlagen. Bitte Seite neu laden und erneut versuchen.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: embedded ? 'none' : 1280, mx: 'auto', px: embedded ? 0 : { xs: 1, sm: 2 }, py: embedded ? 0 : 1.5 }}>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          justifyContent: embedded ? 'flex-end' : 'flex-start',
          mb: embedded ? 0.75 : 1,
        }}
      >
        {!embedded && (
          <IconButton size="small" onClick={handleBack} aria-label="Zurück" sx={{ bgcolor: 'white', border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }}>
            <ArrowBackIcon sx={{ fontSize: '0.95rem' }} />
          </IconButton>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={() => void exportStandaloneHtml()}
          disabled={exporting}
          sx={{ ...compactButtonSx, fontWeight: 800 }}
        >
          {exporting ? 'Wird erstellt …' : 'Als HTML herunterladen'}
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ p: { xs: 0.75, sm: 1.25 }, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 1 },
            mb: smartieVersion === 'custom' ? 0.5 : 1,
            flexWrap: 'nowrap',
          }}
        >
          <SmartieBoxImage height={{ xs: 56, sm: 72 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SmartieColorTitle />
          </Box>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={smartieVersion}
            onChange={(_, value: SmartieVersionId | null) => {
              if (value) selectSmartieVersion(value);
            }}
            sx={{
              flexShrink: 0,
              ml: 'auto',
              '& .MuiToggleButton-root': {
                fontSize: '0.82rem',
                py: 0.55,
                px: 1.25,
                minWidth: 56,
                fontWeight: 700,
                textTransform: 'none',
                lineHeight: 1.25,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              },
            }}
          >
            {(['v1', 'v2', 'custom'] as SmartieVersionId[]).map((versionId) => (
              <ToggleButton key={versionId} value={versionId} title={smartieVersionLabels[versionId]}>
                {smartieVersionShortLabels[versionId]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(240px, 30%) minmax(0, 1fr)' },
            gap: { xs: 1.25, lg: 1.5 },
            alignItems: 'start',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Card elevation={0} sx={{ borderRadius: 2, bgcolor: '#fce4ec', border: '1px solid #f8bbd0' }}>
              <CardContent sx={{ p: { xs: 1, sm: 1.25 }, '&:last-child': { pb: { xs: 1, sm: 1.25 } } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.75, color: '#880e4f', fontSize: '1.05rem' }}>
                  Ablauf
                </Typography>
                <Stack spacing={0.55} component="ol" sx={{ m: 0, pl: 2 }}>
                  {smartieInstructionSteps.map((step, index) => (
                    <Typography
                      key={`smartie-step-${index}`}
                      component="li"
                      variant="body2"
                      sx={{ lineHeight: 1.5, color: '#4b5563', fontSize: '0.98rem', pl: 0.15 }}
                    >
                      {step}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Stack direction="row" sx={compactButtonRowSx}>
              <Button
                size="small"
                variant={smartieMusicOn ? 'contained' : 'outlined'}
                color="secondary"
                startIcon={<MusicNoteIcon />}
                onClick={() => setSmartieMusicOn((prev) => !prev)}
                sx={compactButtonSx}
              >
                {smartieMusicOn ? 'Musik läuft' : 'Musik stoppt'}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <SmartieQuestionColumn
              cards={smartieQuestions}
              editable={smartieVersion === 'custom'}
              onQuestionChange={updateCustomSmartieQuestion}
            />

            {smartieVersion === 'custom' && (
              <Box
                sx={{
                  mt: 1,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: '#f3e5f5',
                  border: '1px solid #e1bee7',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 0.5,
                  rowGap: 0.4,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 900, color: '#6a1b9a', whiteSpace: 'nowrap', fontSize: '0.72rem', mr: 0.25 }}
                >
                  Eigene Version
                </Typography>
                <FormControl size="small" sx={{ minWidth: 130, flex: '1 1 130px', maxWidth: 200 }}>
                  <InputLabel id="smartie-preset-label">Wählen</InputLabel>
                  <Select
                    labelId="smartie-preset-label"
                    label="Wählen"
                    value={selectedSmartiePresetId}
                    onChange={(event) => selectSmartiePreset(String(event.target.value))}
                  >
                    {smartiePresets.map((preset) => (
                      <MenuItem key={preset.id} value={preset.id} sx={{ fontSize: '0.78rem' }}>
                        {preset.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Name"
                  value={smartiePresetName}
                  onChange={(event) => setSmartiePresetName(event.target.value)}
                  sx={{
                    width: 120,
                    flex: '0 1 120px',
                  }}
                />
                <ButtonGroup size="small" variant="outlined" sx={actionButtonGroupSx}>
                  <Button variant="contained" onClick={saveSmartiePreset}>
                    Speichern
                  </Button>
                  <Button onClick={createNewSmartiePreset}>Neu</Button>
                  <Button color="error" onClick={deleteSmartiePreset} disabled={smartiePresets.length <= 1}>
                    Löschen
                  </Button>
                </ButtonGroup>
                <ButtonGroup size="small" variant="outlined" sx={actionButtonGroupSx}>
                  <Button onClick={() => copyCustomMixFrom('v1')}>V1</Button>
                  <Button onClick={() => copyCustomMixFrom('v2')}>V2</Button>
                  <Button onClick={resetSmartieCustomMix}>Standard</Button>
                </ButtonGroup>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
