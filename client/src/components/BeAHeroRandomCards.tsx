import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { EmojiEvents as EmojiEventsIcon, Pin as PinIcon, Replay as ReplayIcon, Style as StyleIcon } from '@mui/icons-material';
import { heroMinimalFieldSx } from '../lib/beAHeroUi';
import { type BeAHeroFeatureTheme } from './BeAHeroFeaturePanel';
import { playingCardImageSrc } from '../lib/beAHeroPlayingCardImages';
import {
  buildPlayingDeck,
  countCardsInDeck,
  describeDrawLimit,
  effectiveDrawLimit,
  isNumbersRandomReady,
  rollRandomNumber,
  shuffleDeck,
  SUIT_META,
  type BeAHeroRandomConfig,
  type BeAHeroRandomKind,
  type BeAHeroSuitKey,
  type HeroPlayingCard,
} from '../lib/beAHeroRandom';

const SUITS: BeAHeroSuitKey[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const editorSectionSx = (theme: BeAHeroFeatureTheme) =>
  ({
    borderRadius: 1.75,
    border: '1px solid',
    borderColor: theme.border,
    bgcolor: 'rgba(255,255,255,0.82)',
    p: 1,
  }) as const;

const editorSectionTitleSx = (theme: BeAHeroFeatureTheme) =>
  ({
    fontWeight: 800,
    fontSize: '0.68rem',
    letterSpacing: '0.07em',
    color: theme.deep,
    mb: 0.65,
    display: 'flex',
    alignItems: 'center',
    gap: 0.45,
  }) as const;

type EditorProps = {
  value: BeAHeroRandomConfig;
  onChange: (patch: Partial<BeAHeroRandomConfig>) => void;
  theme: BeAHeroFeatureTheme;
};

export function BeAHeroRandomCardsEditor({ value, onChange, theme }: EditorProps) {
  const isCards = value.kind === 'cards';
  const isNumbers = value.kind === 'numbers';
  const deckCount = countCardsInDeck(value);
  const hasDrawLimit = value.drawLimit > 0;
  const hasNumberCards = value.rankMax >= value.rankMin && value.rankMin >= 2;
  const hasNumberRange = isNumbersRandomReady(value);
  const drawUnit = isNumbers ? 'Zug' : 'Karte';
  const [roundLimited, setRoundLimited] = useState(hasDrawLimit);

  useEffect(() => {
    setRoundLimited(value.drawLimit > 0);
  }, [value.drawLimit]);

  const toggleRoundLimit = (enabled: boolean) => {
    setRoundLimited(enabled);
    if (!enabled) {
      onChange({ drawLimit: 0 });
    }
  };

  const drawLimitInputValue = hasDrawLimit ? String(value.drawLimit) : '';
  const rankMaxInputValue = hasNumberCards ? String(value.rankMax) : '';
  const numberMaxInputValue = hasNumberRange ? String(value.numberMax) : '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FormControl size="small" fullWidth sx={heroMinimalFieldSx}>
        <InputLabel id="be-a-hero-random-kind">Methode</InputLabel>
        <Select
          labelId="be-a-hero-random-kind"
          label="Methode"
          value={value.kind}
          onChange={(e) => onChange({ kind: e.target.value as BeAHeroRandomKind })}
        >
          <MenuItem value="cards">Karten</MenuItem>
          <MenuItem value="numbers">Zufällige Zahlen</MenuItem>
        </Select>
      </FormControl>

      {isCards ? (
        <>
      <Box sx={editorSectionSx(theme)}>
        <Typography component="div" sx={editorSectionTitleSx(theme)}>
          <StyleIcon sx={{ fontSize: 14, color: theme.main }} />
          KARTENSATZ
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0.55, mb: 0.55 }}>
          <TextField
            label="Von"
            type="number"
            size="small"
            placeholder="2"
            value={value.rankMin || ''}
            onChange={(e) => {
              const nextMin = Math.max(2, Math.min(10, Number(e.target.value) || 2));
              onChange({
                rankMin: nextMin,
                rankMax: value.rankMax > 0 && value.rankMax < nextMin ? 0 : value.rankMax,
              });
            }}
            inputProps={{ min: 2, max: 10 }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Bis"
            type="number"
            size="small"
            placeholder="10"
            value={rankMaxInputValue}
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) {
                onChange({ rankMax: 0 });
                return;
              }
              const nextMax = Math.max(2, Math.min(10, Number(raw) || 0));
              onChange({ rankMax: nextMax });
            }}
            inputProps={{ min: 2, max: 10 }}
            helperText={!hasNumberCards ? 'Optional — Zahlenkarten' : undefined}
            FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Joker"
            type="number"
            size="small"
            placeholder="0"
            value={value.jokerCount || ''}
            onChange={(e) => onChange({ jokerCount: Math.max(0, Math.min(4, Number(e.target.value) || 0)) })}
            inputProps={{ min: 0, max: 4 }}
            sx={heroMinimalFieldSx}
          />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.15 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={value.includePictureCards}
                onChange={(e) => onChange({ includePictureCards: e.target.checked })}
                sx={{ color: theme.main, '&.Mui-checked': { color: theme.main } }}
              />
            }
            label={<Typography variant="body2" sx={{ fontSize: '0.78rem' }}>Bildkarten</Typography>}
            sx={{ mr: 0.75, my: 0 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={value.includeAces}
                onChange={(e) => onChange({ includeAces: e.target.checked })}
                sx={{ color: theme.main, '&.Mui-checked': { color: theme.main } }}
              />
            }
            label={<Typography variant="body2" sx={{ fontSize: '0.78rem' }}>Asse</Typography>}
            sx={{ mr: 0, my: 0 }}
          />
        </Box>
      </Box>

      <Box sx={editorSectionSx(theme)}>
        <Typography component="div" sx={editorSectionTitleSx(theme)}>
          WERTE
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 0.55, mb: 0.55 }}>
          <TextField label="Zahl" size="small" value="= Zahl" disabled sx={heroMinimalFieldSx} />
          <TextField
            label="Bild"
            type="number"
            size="small"
            placeholder="10"
            value={value.pictureValue || ''}
            onChange={(e) => onChange({ pictureValue: Number(e.target.value) || 10 })}
            disabled={!value.includePictureCards}
            inputProps={{ min: 1, max: 99 }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Ass"
            type="number"
            size="small"
            placeholder="15"
            value={value.aceValue || ''}
            onChange={(e) => onChange({ aceValue: Number(e.target.value) || 15 })}
            disabled={!value.includeAces}
            inputProps={{ min: 1, max: 99 }}
            sx={heroMinimalFieldSx}
          />
          <TextField
            label="Joker"
            type="number"
            size="small"
            placeholder="20"
            value={value.jokerValue || ''}
            onChange={(e) => onChange({ jokerValue: Number(e.target.value) || 20 })}
            disabled={value.jokerCount <= 0}
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
          disabled={value.jokerCount <= 0}
          placeholder="z. B. Burpees"
          sx={heroMinimalFieldSx}
        />
      </Box>

      <Box sx={editorSectionSx(theme)}>
        <Typography component="div" sx={editorSectionTitleSx(theme)}>
          ÜBUNG PRO FARBE
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.55 }}>
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
              placeholder="Übung eingeben"
              sx={heroMinimalFieldSx}
            />
          ))}
        </Box>
      </Box>
        </>
      ) : null}

      {isNumbers ? (
        <Box sx={editorSectionSx(theme)}>
          <Typography component="div" sx={editorSectionTitleSx(theme)}>
            <PinIcon sx={{ fontSize: 14, color: theme.main }} />
            ZAHLENBEREICH
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.55, mb: 0.55 }}>
            <TextField
              label="Von"
              type="number"
              size="small"
              placeholder="1"
              value={value.numberMin || ''}
              onChange={(e) => {
                const nextMin = Math.max(1, Math.min(999, Number(e.target.value) || 1));
                onChange({
                  numberMin: nextMin,
                  numberMax: value.numberMax > 0 && value.numberMax < nextMin ? 0 : value.numberMax,
                });
              }}
              inputProps={{ min: 1, max: 999 }}
              sx={heroMinimalFieldSx}
            />
            <TextField
              label="Bis"
              type="number"
              size="small"
              placeholder="10"
              value={numberMaxInputValue}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) {
                  onChange({ numberMax: 0 });
                  return;
                }
                const nextMax = Math.max(1, Math.min(999, Number(raw) || 0));
                onChange({ numberMax: nextMax });
              }}
              inputProps={{ min: 1, max: 999 }}
              helperText={!hasNumberRange ? 'Bis- und Von-Wert festlegen' : undefined}
              FormHelperTextProps={{ sx: { fontSize: '0.64rem', mt: 0.35 } }}
              sx={heroMinimalFieldSx}
            />
          </Box>
          <TextField
            label="Bezeichnung (optional)"
            size="small"
            fullWidth
            value={value.numberLabel}
            onChange={(e) => onChange({ numberLabel: e.target.value })}
            placeholder="z. B. Wiederholungen"
            sx={heroMinimalFieldSx}
          />
        </Box>
      ) : null}

      <Box
        sx={{
          ...editorSectionSx(theme),
          background: roundLimited ? `linear-gradient(160deg, ${theme.tint} 0%, #fff 80%)` : 'rgba(255,255,255,0.82)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.75 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={editorSectionTitleSx(theme)}>
              <EmojiEventsIcon sx={{ fontSize: 14, color: theme.main }} />
              RUNDEN-LÄNGE
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: theme.deep, lineHeight: 1.3 }}>
              {hasDrawLimit ? describeDrawLimit(value, drawUnit) : roundLimited ? 'Anzahl noch eingeben' : 'Optional'}
            </Typography>
            {roundLimited ? (
              <Typography variant="caption" sx={{ color: theme.main, opacity: 0.85, fontSize: '0.66rem', display: 'block', mt: 0.25, lineHeight: 1.35 }}>
                {isNumbers
                  ? 'Wie viele Zahlen sollen gezogen werden, bevor die Runde endet?'
                  : 'Wie viele Karten sollen gezogen werden, bevor die Runde endet?'}
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.66rem', display: 'block', mt: 0.25, lineHeight: 1.35 }}>
                Nur aktivieren, wenn die Runde nach einer bestimmten Anzahl enden soll.
              </Typography>
            )}
          </Box>
          <Switch
            size="small"
            checked={roundLimited}
            onChange={(e) => toggleRoundLimit(e.target.checked)}
            sx={{
              mt: 0.15,
              '& .MuiSwitch-switchBase.Mui-checked': { color: theme.main },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: theme.main,
                opacity: 0.55,
              },
            }}
          />
        </Box>

        {roundLimited ? (
          <Box sx={{ mt: 0.85 }}>
            <TextField
              label={isNumbers ? 'Züge bis Ende' : 'Karten bis Ende'}
              type="number"
              size="small"
              fullWidth
              placeholder="z. B. 20"
              value={drawLimitInputValue}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) {
                  onChange({ drawLimit: 0 });
                  return;
                }
                const next = Math.max(1, Math.min(999, Number(raw) || 0));
                onChange({ drawLimit: next });
              }}
              inputProps={{ min: 1, max: 999 }}
              helperText={
                hasDrawLimit
                  ? `Die Runde endet nach ${value.drawLimit} ${value.drawLimit === 1 ? drawUnit : isNumbers ? 'Zügen' : 'Karten'}.`
                  : 'Bitte Anzahl eingeben.'
              }
              FormHelperTextProps={{ sx: { fontSize: '0.66rem', mt: 0.45, color: hasDrawLimit ? theme.main : 'text.secondary' } }}
              sx={heroMinimalFieldSx}
            />
            {isCards && deckCount > 0 ? (
              <Typography
                component="button"
                type="button"
                onClick={() => onChange({ drawLimit: deckCount })}
                sx={{
                  mt: 0.55,
                  border: 0,
                  p: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: theme.main,
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                  '&:hover': { color: theme.deep },
                }}
              >
                Kompletten Stapel nutzen ({deckCount})
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function BeAHeroRandomNumbersPlay({ config, accentColor, labelColor, borderColor }: PlayProps) {
  const normalized = useMemo(() => ({ ...config, kind: 'numbers' as const }), [config]);
  const drawLimit = effectiveDrawLimit(normalized);
  const [current, setCurrent] = useState<number | null>(null);
  const [drawnCount, setDrawnCount] = useState(0);

  const isFinished = drawLimit !== null && drawnCount >= drawLimit;
  const progress = drawLimit ? Math.min(100, (drawnCount / drawLimit) * 100) : 0;
  const numberLabel = normalized.numberLabel.trim();

  const drawNext = useCallback(() => {
    if (!isNumbersRandomReady(normalized)) return;

    setDrawnCount((count) => {
      if (drawLimit !== null && count >= drawLimit) return count;
      setCurrent(rollRandomNumber(normalized.numberMin, normalized.numberMax));
      return count + 1;
    });
  }, [drawLimit, normalized]);

  const reset = useCallback(() => {
    setCurrent(null);
    setDrawnCount(0);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      e.preventDefault();
      drawNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawNext]);

  const drawButtonLabel = isFinished
    ? 'Runde beendet'
    : current !== null
      ? 'Nächste Zahl'
      : 'Erste Zahl ziehen';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <PinIcon sx={{ fontSize: 16, color: accentColor }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: labelColor, fontSize: '0.68rem', letterSpacing: '0.06em' }}>
            ZUFALL · ZAHLEN
          </Typography>
        </Box>
        {drawLimit ? (
          <Box
            sx={{
              px: 0.75,
              py: 0.2,
              borderRadius: 99,
              bgcolor: isFinished ? 'rgba(46, 125, 50, 0.12)' : `${accentColor}14`,
              border: '1px solid',
              borderColor: isFinished ? 'rgba(46, 125, 50, 0.35)' : `${accentColor}33`,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '0.68rem', color: isFinished ? '#2e7d32' : accentColor, lineHeight: 1.2 }}>
              {Math.min(drawnCount, drawLimit)} / {drawLimit}
            </Typography>
          </Box>
        ) : null}
      </Box>

      {drawLimit ? (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 5,
            borderRadius: 99,
            bgcolor: `${accentColor}14`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 99,
              bgcolor: isFinished ? '#43a047' : accentColor,
            },
          }}
        />
      ) : null}

      <Box
        role="button"
        tabIndex={isFinished ? -1 : 0}
        aria-disabled={isFinished}
        onKeyDown={(e) => {
          if (isFinished) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            drawNext();
          }
        }}
        onClick={() => {
          if (!isFinished) drawNext();
        }}
        sx={{
          flex: 1,
          minHeight: 188,
          borderRadius: 2.5,
          border: '2px solid',
          borderColor: isFinished ? 'rgba(46, 125, 50, 0.45)' : borderColor,
          bgcolor: isFinished ? 'linear-gradient(160deg, #f1f8e9 0%, #fff 55%)' : '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1.75,
          py: 2,
          textAlign: 'center',
          boxShadow: isFinished ? '0 8px 24px rgba(46, 125, 50, 0.14)' : `0 8px 24px ${accentColor}18`,
          cursor: isFinished ? 'default' : 'pointer',
          outline: 'none',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
          '&:focus-visible': isFinished
            ? undefined
            : {
                boxShadow: `0 0 0 3px ${accentColor}33, 0 8px 24px ${accentColor}18`,
              },
        }}
      >
        {isFinished ? (
          <>
            <EmojiEventsIcon sx={{ fontSize: 42, color: '#43a047', mb: 0.75 }} />
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#2e7d32', lineHeight: 1.15, mb: 0.35 }}>
              Geschafft!
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.95rem', sm: '1.02rem' }, fontWeight: 600, color: labelColor, opacity: 0.82, maxWidth: 360 }}>
              {drawLimit} Zahl{drawLimit === 1 ? '' : 'en'} gezogen — Runde beendet.
            </Typography>
          </>
        ) : current !== null ? (
          <>
            <Typography
              sx={{
                fontSize: { xs: '3.4rem', sm: '4rem' },
                fontWeight: 900,
                lineHeight: 1,
                color: accentColor,
                mb: numberLabel ? 0.75 : 0,
              }}
            >
              {current}
            </Typography>
            {numberLabel ? (
              <Typography
                sx={{
                  fontSize: { xs: '1.28rem', sm: '1.5rem' },
                  fontWeight: 800,
                  color: labelColor,
                  lineHeight: 1.25,
                  maxWidth: 400,
                  px: 0.5,
                }}
              >
                {numberLabel}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography
            sx={{
              fontSize: { xs: '1.12rem', sm: '1.22rem' },
              fontWeight: 700,
              lineHeight: 1.35,
              px: 1,
              color: labelColor,
              opacity: 0.82,
            }}
          >
            Enter drücken zum Starten
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button
          variant="contained"
          size="small"
          fullWidth
          disabled={isFinished}
          onClick={drawNext}
          sx={{
            py: 0.45,
            minHeight: 30,
            fontSize: '0.76rem',
            fontWeight: 800,
            borderRadius: 1.5,
            bgcolor: accentColor,
            '&:hover': { bgcolor: accentColor, filter: 'brightness(0.92)' },
            '&.Mui-disabled': { bgcolor: 'rgba(15, 23, 42, 0.08)', color: 'text.disabled' },
          }}
        >
          {drawButtonLabel}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={reset}
          startIcon={<ReplayIcon sx={{ fontSize: 14 }} />}
          sx={{
            minWidth: 0,
            px: 1,
            py: 0.45,
            minHeight: 30,
            fontSize: '0.72rem',
            borderRadius: 1.5,
            whiteSpace: 'nowrap',
          }}
        >
          Neu
        </Button>
      </Box>
    </Box>
  );
}

type PlayProps = {
  config: BeAHeroRandomConfig;
  accentColor: string;
  labelColor: string;
  borderColor: string;
};

export function BeAHeroRandomPlay(props: PlayProps) {
  if (props.config.kind === 'numbers') {
    return <BeAHeroRandomNumbersPlay {...props} />;
  }
  return <BeAHeroRandomCardsPlay {...props} />;
}

export function BeAHeroRandomCardsPlay({ config, accentColor, labelColor, borderColor }: PlayProps) {
  const fullDeck = useMemo(() => buildPlayingDeck(config), [config]);
  const drawLimit = effectiveDrawLimit(config);
  const [drawPile, setDrawPile] = useState<HeroPlayingCard[]>(() => shuffleDeck(fullDeck));
  const [current, setCurrent] = useState<HeroPlayingCard | null>(null);
  const [drawnCount, setDrawnCount] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const isFinished = drawLimit !== null && drawnCount >= drawLimit;
  const progress = drawLimit ? Math.min(100, (drawnCount / drawLimit) * 100) : 0;
  const cardImageSrc = current ? playingCardImageSrc(current) : null;

  const drawNext = useCallback(() => {
    if (fullDeck.length === 0) return;

    setDrawnCount((count) => {
      if (drawLimit !== null && count >= drawLimit) return count;

      setImageFailed(false);
      setDrawPile((pile) => {
        let nextPile = pile;
        if (nextPile.length === 0) {
          nextPile = shuffleDeck(fullDeck);
        }
        const [card, ...rest] = nextPile;
        if (card) {
          setCurrent(card);
        }
        return rest;
      });
      return count + 1;
    });
  }, [drawLimit, fullDeck]);

  const resetDeck = useCallback(() => {
    setDrawPile(shuffleDeck(fullDeck));
    setCurrent(null);
    setDrawnCount(0);
    setImageFailed(false);
  }, [fullDeck]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      e.preventDefault();
      drawNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawNext]);

  const drawButtonLabel = isFinished
    ? 'Runde beendet'
    : current
      ? 'Nächste Karte'
      : 'Erste Karte ziehen';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <StyleIcon sx={{ fontSize: 16, color: accentColor }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: labelColor, fontSize: '0.68rem', letterSpacing: '0.06em' }}>
            ZUFALL · KARTEN
          </Typography>
        </Box>
        {drawLimit ? (
          <Box
            sx={{
              px: 0.75,
              py: 0.2,
              borderRadius: 99,
              bgcolor: isFinished ? 'rgba(46, 125, 50, 0.12)' : `${accentColor}14`,
              border: '1px solid',
              borderColor: isFinished ? 'rgba(46, 125, 50, 0.35)' : `${accentColor}33`,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '0.68rem', color: isFinished ? '#2e7d32' : accentColor, lineHeight: 1.2 }}>
              {Math.min(drawnCount, drawLimit)} / {drawLimit}
            </Typography>
          </Box>
        ) : null}
      </Box>

      {drawLimit ? (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 5,
            borderRadius: 99,
            bgcolor: `${accentColor}14`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 99,
              bgcolor: isFinished ? '#43a047' : accentColor,
            },
          }}
        />
      ) : null}

      <Box
        tabIndex={isFinished ? -1 : 0}
        role="button"
        aria-label={isFinished ? 'Runde beendet' : current ? 'Nächste Karte ziehen' : 'Erste Karte ziehen'}
        aria-disabled={isFinished}
        onKeyDown={(e) => {
          if (isFinished) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            drawNext();
          }
        }}
        onClick={() => {
          if (!isFinished) drawNext();
        }}
        sx={{
          flex: 1,
          minHeight: 188,
          borderRadius: 2.5,
          border: '2px solid',
          borderColor: isFinished ? 'rgba(46, 125, 50, 0.45)' : borderColor,
          bgcolor: isFinished ? 'linear-gradient(160deg, #f1f8e9 0%, #fff 55%)' : '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1.75,
          py: 2,
          textAlign: 'center',
          boxShadow: isFinished ? '0 8px 24px rgba(46, 125, 50, 0.14)' : `0 8px 24px ${accentColor}18`,
          cursor: isFinished ? 'default' : 'pointer',
          outline: 'none',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
          '&:focus-visible': isFinished
            ? undefined
            : {
                boxShadow: `0 0 0 3px ${accentColor}33, 0 8px 24px ${accentColor}18`,
              },
        }}
      >
        {isFinished ? (
          <>
            <EmojiEventsIcon sx={{ fontSize: 42, color: '#43a047', mb: 0.75 }} />
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#2e7d32', lineHeight: 1.15, mb: 0.35 }}>
              Geschafft!
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.95rem', sm: '1.02rem' }, fontWeight: 600, color: labelColor, opacity: 0.82, maxWidth: 360 }}>
              {drawLimit} Karte{drawLimit === 1 ? '' : 'n'} gezogen — Runde beendet.
            </Typography>
          </>
        ) : current ? (
          <>
            {cardImageSrc && !imageFailed ? (
              <Box
                component="img"
                src={cardImageSrc}
                alt={current.displayLabel}
                onError={() => setImageFailed(true)}
                sx={{
                  width: { xs: 168, sm: 210 },
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 1.5,
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.24)',
                  mb: 1.15,
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
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: '1.75rem', sm: '2.05rem' },
                lineHeight: 1.1,
                color: accentColor,
                mb: 0.6,
              }}
            >
              {current.kind === 'joker' ? current.repsLabel : `${current.repsLabel}×`}
            </Typography>
            {current.exercise ? (
              <Typography
                sx={{
                  fontSize: { xs: '1.28rem', sm: '1.5rem' },
                  fontWeight: 800,
                  color: labelColor,
                  lineHeight: 1.25,
                  maxWidth: 400,
                  px: 0.5,
                }}
              >
                {current.exercise}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography
            sx={{
              fontSize: { xs: '1.12rem', sm: '1.22rem' },
              fontWeight: 700,
              lineHeight: 1.35,
              px: 1,
              color: labelColor,
              opacity: 0.82,
            }}
          >
            Enter drücken zum Starten
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button
          variant="contained"
          size="small"
          fullWidth
          disabled={isFinished}
          onClick={drawNext}
          sx={{
            py: 0.45,
            minHeight: 30,
            fontSize: '0.76rem',
            fontWeight: 800,
            borderRadius: 1.5,
            bgcolor: accentColor,
            '&:hover': { bgcolor: accentColor, filter: 'brightness(0.92)' },
            '&.Mui-disabled': { bgcolor: 'rgba(15, 23, 42, 0.08)', color: 'text.disabled' },
          }}
        >
          {drawButtonLabel}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={resetDeck}
          startIcon={<ReplayIcon sx={{ fontSize: 14 }} />}
          sx={{
            minWidth: 0,
            px: 1,
            py: 0.45,
            minHeight: 30,
            fontSize: '0.72rem',
            borderRadius: 1.5,
            whiteSpace: 'nowrap',
          }}
        >
          Neu
        </Button>
      </Box>
    </Box>
  );
}
