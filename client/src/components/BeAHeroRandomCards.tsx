import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Casino as CasinoIcon, Style as StyleIcon } from '@mui/icons-material';
import { heroMinimalFieldSx } from '../lib/beAHeroUi';
import { playingCardImageSrc } from '../lib/beAHeroPlayingCardImages';
import {
  buildPlayingDeck,
  countCardsInDeck,
  describeCardsDeck,
  shuffleDeck,
  SUIT_META,
  type BeAHeroCardsRandomConfig,
  type BeAHeroSuitKey,
  type HeroPlayingCard,
} from '../lib/beAHeroRandom';

const SUITS: BeAHeroSuitKey[] = ['hearts', 'diamonds', 'clubs', 'spades'];

type EditorProps = {
  value: BeAHeroCardsRandomConfig;
  onChange: (patch: Partial<BeAHeroCardsRandomConfig>) => void;
  labelColor: string;
  borderColor: string;
  background: string;
};

export function BeAHeroRandomCardsEditor({ value, onChange, labelColor, borderColor, background }: EditorProps) {
  const deckCount = countCardsInDeck(value);
  const deckSummary = describeCardsDeck(value);

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 2,
        bgcolor: background,
        border: '1px solid',
        borderColor,
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: value.enabled ? 1.25 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CasinoIcon sx={{ fontSize: 15, color: labelColor, opacity: 0.75 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: labelColor, fontSize: '0.72rem' }}>
            Zufall
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={value.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
            />
          }
          label=""
          sx={{ m: 0 }}
        />
      </Box>

      {value.enabled ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <FormControl size="small" fullWidth sx={heroMinimalFieldSx}>
            <InputLabel id="be-a-hero-random-kind">Art</InputLabel>
            <Select
              labelId="be-a-hero-random-kind"
              label="Art"
              value="cards"
              onChange={() => onChange({ kind: 'cards' })}
            >
              <MenuItem value="cards">Karten</MenuItem>
            </Select>
          </FormControl>

          <Box
            sx={{
              px: 1,
              py: 0.75,
              borderRadius: 1.5,
              bgcolor: 'rgba(255,255,255,0.72)',
              border: '1px solid',
              borderColor,
            }}
          >
            <Typography sx={{ fontWeight: 800, color: labelColor, fontSize: '0.95rem' }}>
              {deckCount} Karten
            </Typography>
            <Typography variant="caption" sx={{ color: labelColor, opacity: 0.8, display: 'block', mt: 0.25 }}>
              {deckSummary}
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 700, color: labelColor, fontSize: '0.68rem', letterSpacing: '0.04em' }}>
            KARTENSATZ
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 0.75 }}>
            <TextField
              label="Von"
              type="number"
              size="small"
              value={value.rankMin}
              onChange={(e) => onChange({ rankMin: Number(e.target.value) })}
              inputProps={{ min: 2, max: 10 }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Bis"
              type="number"
              size="small"
              value={value.rankMax}
              onChange={(e) => onChange({ rankMax: Number(e.target.value) })}
              inputProps={{ min: 2, max: 10 }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Joker"
              type="number"
              size="small"
              value={value.jokerCount}
              onChange={(e) => onChange({ jokerCount: Number(e.target.value) })}
              inputProps={{ min: 0, max: 4 }}
              sx={heroMinimalFieldSx}
            />
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={value.includePictureCards}
                  onChange={(e) => onChange({ includePictureCards: e.target.checked })}
                />
              }
              label={<Typography variant="body2">Bildkarten (B, D, K)</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={value.includeAces}
                  onChange={(e) => onChange({ includeAces: e.target.checked })}
                />
              }
              label={<Typography variant="body2">Asse</Typography>}
            />
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 700, color: labelColor, fontSize: '0.68rem', letterSpacing: '0.04em' }}>
            WERTE
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 0.75 }}>
            <TextField
              label="Zahl"
              size="small"
              value="= Zahl"
              disabled
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Bild"
              type="number"
              size="small"
              value={value.pictureValue}
              onChange={(e) => onChange({ pictureValue: Number(e.target.value) })}
              inputProps={{ min: 1, max: 99 }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Ass"
              type="number"
              size="small"
              value={value.aceValue}
              onChange={(e) => onChange({ aceValue: Number(e.target.value) })}
              inputProps={{ min: 1, max: 99 }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Joker"
              type="number"
              size="small"
              value={value.jokerValue}
              onChange={(e) => onChange({ jokerValue: Number(e.target.value) })}
              inputProps={{ min: 1, max: 99 }}
              sx={heroMinimalFieldSx}
            />
          </Box>
          <TextField
            label="Joker-Aktion"
            size="small"
            fullWidth
            value={value.jokerLabel}
            onChange={(e) => onChange({ jokerLabel: e.target.value })}
            placeholder="z. B. Burpees"
            sx={heroMinimalFieldSx}
          />

          <Typography variant="caption" sx={{ fontWeight: 700, color: labelColor, fontSize: '0.68rem', letterSpacing: '0.04em' }}>
            ÜBUNG PRO FARBE
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75 }}>
            {SUITS.map((suit) => (
              <TextField
                key={suit}
                label={`${SUIT_META[suit].emoji} ${SUIT_META[suit].label}`}
                size="small"
                fullWidth
                value={value.suitExercises[suit]}
                onChange={(e) =>
                  onChange({
                    suitExercises: { ...value.suitExercises, [suit]: e.target.value },
                  })
                }
                sx={heroMinimalFieldSx}
              />
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

type PlayProps = {
  config: BeAHeroCardsRandomConfig;
  accentColor: string;
  labelColor: string;
  borderColor: string;
};

export function BeAHeroRandomCardsPlay({ config, accentColor, labelColor, borderColor }: PlayProps) {
  const fullDeck = useMemo(() => buildPlayingDeck(config), [config]);
  const [drawPile, setDrawPile] = useState<HeroPlayingCard[]>(() => shuffleDeck(fullDeck));
  const [current, setCurrent] = useState<HeroPlayingCard | null>(null);
  const [drawnCount, setDrawnCount] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const remaining = drawPile.length;
  const total = fullDeck.length;
  const cardImageSrc = current ? playingCardImageSrc(current) : null;

  const drawNext = useCallback(() => {
    setImageFailed(false);
    setDrawPile((pile) => {
      let nextPile = pile;
      if (nextPile.length === 0) {
        nextPile = shuffleDeck(fullDeck);
        setDrawnCount(0);
      }
      const [card, ...rest] = nextPile;
      if (card) {
        setCurrent(card);
        setDrawnCount((n) => n + 1);
      }
      return rest;
    });
  }, [fullDeck]);

  const resetDeck = useCallback(() => {
    setDrawPile(shuffleDeck(fullDeck));
    setCurrent(null);
    setDrawnCount(0);
    setImageFailed(false);
  }, [fullDeck]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <StyleIcon sx={{ fontSize: 16, color: accentColor }} />
        <Typography variant="caption" sx={{ fontWeight: 800, color: labelColor, fontSize: '0.68rem', letterSpacing: '0.06em' }}>
          ZUFALL · KARTEN
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 168,
          borderRadius: 2.5,
          border: `2px solid ${borderColor}`,
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1.5,
          py: 2,
          textAlign: 'center',
          boxShadow: `0 8px 24px ${accentColor}18`,
        }}
      >
        {current ? (
          <>
            {cardImageSrc && !imageFailed ? (
              <Box
                component="img"
                src={cardImageSrc}
                alt={current.displayLabel}
                onError={() => setImageFailed(true)}
                sx={{
                  width: { xs: 118, sm: 138 },
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 1.5,
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.24)',
                  mb: 1,
                  display: 'block',
                }}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: { xs: '2.6rem', sm: '3.2rem' },
                  fontWeight: 900,
                  lineHeight: 1,
                  color: current.kind === 'joker' ? '#7b1fa2' : labelColor,
                  mb: 0.75,
                }}
              >
                {current.displayLabel}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: accentColor, mb: 0.35 }}>
              {current.kind === 'joker' ? current.repsLabel : `${current.repsLabel}×`}
            </Typography>
            {current.exercise ? (
              <Typography sx={{ fontSize: '0.9rem', color: labelColor, opacity: 0.88, maxWidth: 240, px: 0.5 }}>
                {current.exercise}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography color="text.secondary" sx={{ fontSize: '0.9rem', px: 1 }}>
            Tippe auf „Karte ziehen“, um die erste Karte zu enthüllen.
          </Typography>
        )}
      </Box>

      <Typography variant="caption" sx={{ textAlign: 'center', color: labelColor, opacity: 0.75 }}>
        {remaining} von {total} Karten im Stapel
        {drawnCount > 0 ? ` · ${drawnCount} gezogen` : ''}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.75 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={drawNext}
          sx={{
            py: 1,
            fontWeight: 800,
            borderRadius: 2,
            bgcolor: accentColor,
            '&:hover': { bgcolor: accentColor, filter: 'brightness(0.92)' },
          }}
        >
          Karte ziehen
        </Button>
        <Button variant="outlined" onClick={resetDeck} sx={{ minWidth: 0, px: 1.5, borderRadius: 2 }}>
          Neu mischen
        </Button>
      </Box>
    </Box>
  );
}
