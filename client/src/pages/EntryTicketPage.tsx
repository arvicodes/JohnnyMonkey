import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Bookmark as BookmarkIcon,
  BookmarkAdd as BookmarkAddIcon,
  Check as CheckIcon,
  History as HistoryIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Print as PrintIcon,
  RestartAlt as RestartAltIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
} from '@mui/icons-material';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { entryTicketHeroSrc } from '../lib/ticketHeroImages';
import { presentationLessonBackUrl } from '../lib/presentationEditorUi';
import {
  type EntryTicketCustomSet,
  type EntryTicketCustomTask,
  copyTasksToLaterSection,
  countCustomSetTasks,
  createEmptyCustomSet,
  createLessonSection,
  cumulativeTasksBeforeLesson,
  ensureSpecialLessonSections,
  findLessonSectionIndex,
  isCustomEntryTicketSetId,
  laterSectionContainsTask,
  fetchAndCacheCustomEntryTicketSets,
  loadCustomEntryTicketSets,
  saveCustomEntryTicketSets,
  sortLessonsChronologically,
} from '../lib/entryTicketCustomSets';
import { discoverLessonsForReiheName } from '../lib/entryTicketReiheLessons';
import { resolveEntryTicketBandForLessonPath } from '../lib/entryTicketGrade';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../components/ui/dialog-close-icon-button';
import { EntryTicketFragensetEditor } from '../components/entry-ticket/EntryTicketFragensetEditor';
import { EntryTicketHistoryDialog } from '../components/entry-ticket/EntryTicketHistoryDialog';
import { openEntryTicketFlashcardPrint } from '../lib/entryTicketFlashcardPrint';
import {
  entryTicketHasImage,
  entryTicketHasRichFormatting,
  entryTicketLooksLikeHtml,
  entryTicketPlainText,
  entryTicketShowCountStyle,
  readEntryTicketCardLayout,
  decorateEntryTicketDisplayHtml,
  formatEntryTicketPromptStructure,
  splitEntryTicketMediaAndText,
} from '../lib/entryTicketRichText';

type EntryTicketTask = {
  category: string;
  prompt: string;
  solution: string;
  /** Stabile ID für „wie oft gezeigt“ (Pool-Index / Custom-Task-Id). */
  sourceKey?: string;
};

const richTextSx = {
  '& p': { m: 0 },
  '& div': { m: 0 },
  '& b, & strong': { fontWeight: 800 },
  '& i, & em': { fontStyle: 'italic' },
  '& u': { textDecoration: 'underline' },
  '& .et-op': { fontWeight: '800 !important', color: '#ef6c00' },
  '& .et-q': { fontWeight: '800 !important', color: '#d32f2f' },
  '& .et-task-op': { fontWeight: '800 !important', color: 'inherit' },
  '&::after': {
    content: '""',
    display: 'table',
    clear: 'both',
  },
  '& img': {
    // Breite kommt aus Inline-Style (data-et-width) — hier nicht überschreiben
    maxWidth: '100%',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: 1,
  },
  '& img[data-et-place="block"]': {
    my: 0.75,
  },
} as const;

function EntryTicketRichHtml({
  value,
  sx,
}: {
  value: string;
  sx?: Record<string, unknown>;
}) {
  if (!value) return null;
  const decorated = decorateEntryTicketDisplayHtml(value);
  if (!decorated) return null;

  if (!entryTicketLooksLikeHtml(value) && !entryTicketHasImage(value)) {
    return (
      <Box
        component="div"
        sx={{ display: 'block', whiteSpace: 'pre-line', ...richTextSx, ...sx }}
        dangerouslySetInnerHTML={{ __html: decorated }}
      />
    );
  }

  const layout = readEntryTicketCardLayout(value);
  if (layout === 'split-left' || layout === 'split-right') {
    const { mediaHtml, textHtml } = splitEntryTicketMediaAndText(value);
    const mediaFirst = layout === 'split-left';
    const mediaCol = mediaHtml ? (
      <Box
        key="media"
        sx={{
          minWidth: 0,
          width: '100%',
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& img': {
            width: '100% !important',
            maxWidth: '100% !important',
            height: 'auto !important',
            maxHeight: 'min(78vh, 640px)',
            objectFit: 'contain',
            borderRadius: 1,
            margin: '0 !important',
            float: 'none !important',
            display: 'block',
          },
        }}
        dangerouslySetInnerHTML={{ __html: mediaHtml }}
      />
    ) : null;
    const textCol = textHtml ? (
      <Box
        key="text"
        component="div"
        sx={{ display: 'block', minWidth: 0, textAlign: 'left', whiteSpace: 'pre-line', ...richTextSx, ...sx }}
        dangerouslySetInnerHTML={{ __html: decorateEntryTicketDisplayHtml(textHtml) }}
      />
    ) : null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm:
              mediaHtml && textHtml
                ? mediaFirst
                  ? 'minmax(0, 1.15fr) minmax(0, 0.85fr)'
                  : 'minmax(0, 0.85fr) minmax(0, 1.15fr)'
                : '1fr',
          },
          gap: { xs: 1.25, sm: 2.5 },
          alignItems: 'center',
          width: '100%',
          textAlign: 'left',
        }}
      >
        {mediaFirst ? (
          <>
            {mediaCol}
            {textCol}
          </>
        ) : (
          <>
            {textCol}
            {mediaCol}
          </>
        )}
      </Box>
    );
  }

  return (
    <Box
      component="div"
      sx={{ display: 'block', whiteSpace: 'pre-line', ...richTextSx, ...sx }}
      dangerouslySetInnerHTML={{ __html: decorated }}
    />
  );
}

/** Kompakte MultiButton-Gruppen — Breite immer mindestens so groß, dass der Text vollständig lesbar ist. */
const etBtnGroupBase = {
  flexShrink: 0,
  boxShadow: 'none',
  overflow: 'visible',
  '& .MuiButtonGroup-grouped': {
    minWidth: 'auto',
    flexShrink: 0,
  },
  '& .MuiButton-root': {
    textTransform: 'none' as const,
    fontWeight: 700,
    fontSize: '0.62rem',
    lineHeight: 1.15,
    minHeight: 28,
    minWidth: 'auto',
    width: 'auto',
    py: 0.4,
    px: 0.85,
    borderRadius: '0 !important',
    boxShadow: 'none',
    whiteSpace: 'nowrap' as const,
    overflow: 'visible',
    textOverflow: 'clip',
    flexShrink: 0,
    '&:hover': { boxShadow: 'none' },
  },
  '& .MuiButtonGroup-firstButton': {
    borderTopLeftRadius: '5px !important',
    borderBottomLeftRadius: '5px !important',
  },
  '& .MuiButtonGroup-lastButton': {
    borderTopRightRadius: '5px !important',
    borderBottomRightRadius: '5px !important',
  },
} as const;

const etActionGroupSx = {
  ...etBtnGroupBase,
  '& .MuiButton-root': {
    ...etBtnGroupBase['& .MuiButton-root'],
    px: 1,
    py: 0.45,
    fontSize: '0.62rem',
  },
  '& .MuiButton-root .MuiButton-startIcon': {
    mr: 0.35,
    '& > svg': { fontSize: 14 },
  },
} as const;

const etMiniPairGroupSx = {
  ...etBtnGroupBase,
  '& .MuiButton-root': {
    ...etBtnGroupBase['& .MuiButton-root'],
    minWidth: 26,
    width: 26,
    height: 26,
    minHeight: 26,
    p: 0.25,
    px: 0.25,
    fontSize: '0.7rem',
    lineHeight: 1,
  },
} as const;

const etOkAbGroupSx = {
  ...etBtnGroupBase,
  '& .MuiButton-root': {
    ...etBtnGroupBase['& .MuiButton-root'],
    px: 0.75,
    py: 0.3,
    height: 26,
    minHeight: 26,
    fontSize: '0.65rem',
  },
} as const;

/** Einzelne Session-Buttons — kein ButtonGroup (vermeidet Rand-Überlappung). */
const etSessionBtnSx = {
  minWidth: 30,
  width: 30,
  height: 30,
  p: 0.35,
  borderRadius: '6px',
  border: '1px solid #c5cae9',
  color: '#546e7a',
  bgcolor: '#fff',
  flexShrink: 0,
  '&:hover': {
    bgcolor: '#eef1fb',
    borderColor: '#9fa8da',
  },
  '&.Mui-disabled': {
    borderColor: '#e0e4f5',
    color: '#b0bec5',
  },
} as const;

const DEFAULT_SLIDE_DURATION_SEC = 20;
const SLIDE_DURATION_STORAGE_KEY = 'entry-ticket-slide-duration-sec';
const SHOW_COUNT_STORAGE_KEY = 'entry-ticket-card-show-counts-v1';
const MIN_SLIDE_DURATION_SEC = 5;
const MAX_SLIDE_DURATION_SEC = 120;
const DEFAULT_SOLUTION_DURATION_SEC = 120;
const SOLUTION_DURATION_STORAGE_KEY = 'entry-ticket-solution-duration-sec';
const MIN_SOLUTION_DURATION_SEC = 30;
const MAX_SOLUTION_DURATION_SEC = 15 * 60;

function simpleTaskHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function builtInTaskSourceKey(band: string, task: EntryTicketTask, index: number): string {
  const body = `${task.category}\n${task.prompt}\n${task.solution}`;
  return `g:${band}:${simpleTaskHash(body)}:${index}`;
}

function loadCardShowCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SHOW_COUNT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (k && Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

function persistCardShowCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(SHOW_COUNT_STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore
  }
}

function loadSlideDurationSec(): number {
  try {
    const raw = localStorage.getItem(SLIDE_DURATION_STORAGE_KEY);
    const n = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= MIN_SLIDE_DURATION_SEC && n <= MAX_SLIDE_DURATION_SEC) {
      return Math.round(n);
    }
  } catch {
    // ignore
  }
  return DEFAULT_SLIDE_DURATION_SEC;
}

function clampSlideDurationSec(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SLIDE_DURATION_SEC;
  return Math.min(MAX_SLIDE_DURATION_SEC, Math.max(MIN_SLIDE_DURATION_SEC, Math.round(value)));
}

function loadSolutionDurationSec(): number {
  try {
    const raw = localStorage.getItem(SOLUTION_DURATION_STORAGE_KEY);
    const n = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= MIN_SOLUTION_DURATION_SEC && n <= MAX_SOLUTION_DURATION_SEC) {
      return Math.round(n);
    }
  } catch {
    // ignore
  }
  return DEFAULT_SOLUTION_DURATION_SEC;
}

function clampSolutionDurationSec(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SOLUTION_DURATION_SEC;
  return Math.min(MAX_SOLUTION_DURATION_SEC, Math.max(MIN_SOLUTION_DURATION_SEC, Math.round(value)));
}

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function SolutionSlideClock({
  secondsLeft,
  totalSec,
  running,
  onToggle,
}: {
  secondsLeft: number;
  totalSec: number;
  running: boolean;
  onToggle?: () => void;
}) {
  const frac = Math.max(0, Math.min(1, secondsLeft / Math.max(totalSec, 1)));
  const done = secondsLeft <= 0;
  const urgent = secondsLeft > 0 && secondsLeft <= 15;
  const diskColor = done ? '#e53935' : urgent ? '#ff8a65' : '#43a047';

  return (
    <Box
      component={onToggle ? 'button' : 'div'}
      type={onToggle ? 'button' : undefined}
      onClick={onToggle}
      aria-label={
        onToggle
          ? running
            ? 'Lösungsuhr pausieren'
            : secondsLeft <= 0
              ? 'Lösungsuhr neu starten'
              : 'Lösungsuhr starten'
          : 'Lösungsuhr'
      }
      sx={{
        position: 'relative',
        width: 92,
        height: 92,
        flexShrink: 0,
        p: 0,
        border: 'none',
        borderRadius: '50%',
        cursor: onToggle ? 'pointer' : 'default',
        background: `conic-gradient(${diskColor} 0deg ${frac * 360}deg, #eceff1 ${frac * 360}deg 360deg)`,
        boxShadow: '0 2px 10px rgba(55, 71, 79, 0.18)',
        appearance: 'none',
        WebkitAppearance: 'none',
        '&:hover': onToggle ? { filter: 'brightness(0.97)' } : undefined,
      }}
    >
      {[0, 90, 180, 270].map((deg) => (
        <Box
          key={deg}
          sx={{
            position: 'absolute',
            left: '50%',
            top: 4,
            width: 2,
            height: 7,
            bgcolor: 'rgba(69,90,100,0.45)',
            transformOrigin: `1px 42px`,
            transform: `translateX(-50%) rotate(${deg}deg)`,
            pointerEvents: 'none',
          }}
        />
      ))}
      <Box
        sx={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 0 1px rgba(176,190,197,0.35)',
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            fontSize: '1.2rem',
            lineHeight: 1,
            color: diskColor,
            letterSpacing: 0.2,
          }}
        >
          {formatMmSs(secondsLeft)}
        </Typography>
        {!running && !done ? (
          <Typography sx={{ mt: 0.15, fontSize: '0.55rem', fontWeight: 700, color: '#90a4ae', letterSpacing: 0.4 }}>
            PAUSE
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

/** Zufällige Auswahl aus dem klassenspezifischen Fragenset */
const TARGET_TASK_COUNT = 10;
const DONE_CELEBRATE_MS = 2000;
const DISPLAY_BOX_WIDTH = 1320;
const DISPLAY_BOX_MIN_HEIGHT = 312;
const OPERATOR_COLOR = '#ef6c00';
const QUESTION_COLOR = '#d32f2f';

type GradeNum = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
/** Zusätzliche Kurs-Bänder (eigene Fragensätze, Start wie Klassenstufe 11/12/13). */
type InfBand = 'inf11' | 'inf12' | 'inf13';
type EntryBand = GradeNum | InfBand;
type GradeQuestionSets = Record<EntryBand, EntryTicketTask[]>;

function fragensetHeadingLabel(band: EntryBand, customName?: string | null): string {
  if (customName) return customName;
  if (band === 'inf11') return 'Inf 11';
  if (band === 'inf12') return 'Inf 12';
  if (band === 'inf13') return 'Inf 13';
  return `Klasse ${band}`;
}

/** Eigene Sets nach Fach trennen (Reihenpfad / Name). Mathe = rechts, Informatik = links. */
function customSetIsInformatik(set: EntryTicketCustomSet): boolean {
  const path = (set.reihePath || '').replace(/\\/g, '/').toLowerCase();
  const name = (set.name || '').toLowerCase();
  // Mathe-Reihen klar als Mathe (auch wenn Name zufällig „KI“ enthält)
  if (path.includes('/mathe/') || /(^|\/)mathe(\/|$)/i.test(path)) return false;
  if (path.includes('/informatik/') || /(^|\/)informatik(\/|$)/i.test(path)) return true;
  if (/(^|[/\s_-])inf(ormatik)?([/\s_-]|$)/i.test(path)) return true;
  if (/informatik|\binf\s*1[123]\b|^inf\b|\bki\b/i.test(name)) return true;
  return false;
}

function reorderCustomSetsInGroup(
  sets: EntryTicketCustomSet[],
  groupIds: string[],
  activeId: string,
  overId: string,
): EntryTicketCustomSet[] {
  const from = groupIds.indexOf(activeId);
  const to = groupIds.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return sets;
  const nextGroupIds = arrayMove(groupIds, from, to);
  const byId = new Map(sets.map((s) => [s.id, s] as const));
  let gi = 0;
  return sets.map((s) => {
    if (!groupIds.includes(s.id)) return s;
    const id = nextGroupIds[gi++];
    return (id ? byId.get(id as EntryTicketCustomSet['id']) : undefined) ?? s;
  });
}

function SortableCustomSetChip({
  set,
  selected,
  accent,
  onSelect,
}: {
  set: EntryTicketCustomSet;
  selected: boolean;
  accent: 'mathe' | 'inf';
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: set.id,
  });
  const active =
    accent === 'inf'
      ? {
          bgcolor: '#2e7d32',
          color: '#fff',
          borderColor: '#2e7d32',
          '&:hover': { bgcolor: '#27692b' },
        }
      : {
          bgcolor: '#455a64',
          color: '#fff',
          borderColor: '#455a64',
          '&:hover': { bgcolor: '#37474f' },
        };
  const idle =
    accent === 'inf'
      ? {
          color: '#2e7d32',
          borderColor: '#81c784',
          bgcolor: '#fff',
          '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)', borderColor: '#2e7d32' },
        }
      : {
          color: '#455a64',
          borderColor: '#b0bec5',
          bgcolor: '#fff',
          '&:hover': { bgcolor: 'rgba(69, 90, 100, 0.08)', borderColor: '#78909c' },
        };

  return (
    <Button
      ref={setNodeRef}
      size="small"
      variant="outlined"
      onClick={onSelect}
      title={`${set.name} · ${set.lessons.length} Stunden · ${countCustomSetTasks(set)} Fragen — ziehen zum Sortieren`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      sx={{
        ...etBtnGroupBase['& .MuiButton-root'],
        borderRadius: '5px !important',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 2 : 0,
        touchAction: 'none',
        ...(selected ? active : idle),
      }}
    >
      {set.name}
    </Button>
  );
}

function CustomSetChipRow({
  set,
  selected,
  accent,
  onSelect,
  onHistory,
}: {
  set: EntryTicketCustomSet;
  selected: boolean;
  accent: 'mathe' | 'inf';
  onSelect: () => void;
  onHistory: () => void;
}) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.05 }}>
      <SortableCustomSetChip set={set} selected={selected} accent={accent} onSelect={onSelect} />
      <Tooltip title={`Historie: ${set.name}`}>
        <IconButton
          size="small"
          aria-label={`Historie ${set.name}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onHistory();
          }}
          sx={{
            width: 22,
            height: 22,
            p: 0,
            color: accent === 'inf' ? '#2e7d32' : '#607d8b',
            '&:hover': { bgcolor: accent === 'inf' ? 'rgba(46,125,50,0.1)' : 'rgba(69,90,100,0.1)' },
          }}
        >
          <HistoryIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

type CoarseCategory =
  | 'Grundrechenarten'
  | 'Bruch/Dezimal/Prozent'
  | 'Geometrie/Einheiten'
  | 'Zeit/Geld/Alltag'
  | 'Logik/Muster'
  | 'Wahr/Falsch'
  | 'Eigen';

const ENTRY_TICKET_TASK_POOL: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '375 + 489 - 126 = ?', solution: '738' },
  { category: 'Negativzahlen', prompt: '-12 + 35 - 9 = ?', solution: '14' },
  { category: 'Multiplikation', prompt: '24 · 16 = ?', solution: '384' },
  { category: 'Proportional', prompt: '3 Hefte kosten 4,50 €. 7 Hefte kosten ?', solution: '10,50 €' },
  { category: 'Division', prompt: '840 : 24 = ?', solution: '35' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 3/4 ist kleiner als 2/3.', solution: 'Falsch' },
  { category: 'Überschlag', prompt: '49,80 € + 19,90 € grob gerundet = ?', solution: 'ca. 70 €' },
  { category: 'Geld', prompt: '50 € - 18,70 € - 9,95 € = ?', solution: '21,35 €' },
  { category: 'Einheiten', prompt: '3,75 m = ? cm', solution: '375' },
  { category: 'Einheiten', prompt: '2,4 l = ? ml', solution: '2400' },
  { category: 'Umfang', prompt: 'Rechteck 8 cm und 5 cm: Umfang = ?', solution: '26 cm' },
  { category: 'Zeit', prompt: 'Start 09:35 Uhr, Dauer 2 h 25 min. Ende um ? Uhr.', solution: '12:00' },
  { category: 'Zeit', prompt: 'Von 08:50 Uhr bis 11:35 Uhr = ? min', solution: '165' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 2,5 l sind 250 ml.', solution: 'Falsch' },
  { category: 'Bruch', prompt: '3/4 + 2/3 = ?', solution: '17/12 (1 5/12)' },
  { category: 'Bruch', prompt: '5/8 von 64 = ?', solution: '40' },
  { category: 'Dezimal', prompt: '4,75 + 2,9 - 1,35 = ?', solution: '6,30' },
  { category: 'Dezimal', prompt: '0,25 · 48 = ?', solution: '12' },
  { category: 'Prozent', prompt: '15% von 240 = ?', solution: '36' },
  { category: 'Prozent', prompt: '240 € + 12% = ?', solution: '268,80 €' },
  { category: 'Prozent', prompt: '320 € - 17,5% = ?', solution: '264 €' },
  { category: 'Supermarkt', prompt: '6 · 1,79 € + 3 · 2,49 € = ?', solution: '18,21 €' },
  { category: 'Schätzen', prompt: '1,98 m ist näher an 1,5 m oder 2,0 m?', solution: '2,0 m' },
  { category: 'Regalmaße', prompt: '2 Bretter 118 cm + 3 Bretter 74 cm = ?', solution: '458 cm' },
  { category: 'Regalmaße', prompt: 'Wand 2,60 m - Regal 2,15 m = ? cm', solution: '45' },
  { category: 'Kopfrechnen', prompt: '48 · 25 = ?', solution: '1200' },
  { category: 'Kopfrechnen', prompt: '1331 : 11 = ?', solution: '121' },
  { category: 'Muster', prompt: 'Zahlenmuster: 3, 6, 12, 24, ... nächste Zahl = ?', solution: '48' },
  { category: 'Einheiten', prompt: '2,75 km + 850 m = ? m', solution: '3600' },
  { category: 'Zeit', prompt: 'Film 1 h 58 min, Start 20:17 Uhr. Ende um ? Uhr.', solution: '22:15' },
  { category: 'Bruch/Dezimal', prompt: '7/8 als Dezimalzahl = ?', solution: '0,875' },
  { category: 'Prozent', prompt: '3,5% von 800 = ?', solution: '28' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 15% von 200 sind 25.', solution: 'Falsch' },
  { category: 'Alltag', prompt: '36 km bei 90 km/h = ? min', solution: '24' },
  { category: 'Logik', prompt: '3 Kisten mit je 12 Flaschen, 5 Flaschen kaputt. Wie viele ganz?', solution: '31' },
  { category: 'Mittelwert', prompt: 'Noten 2, 3, 2, 1. Durchschnitt = ?', solution: '2,0' },
  { category: 'Fläche', prompt: 'Rechteck 12 cm · 7 cm: Fläche = ?', solution: '84 cm²' },
  { category: 'Skalierung', prompt: 'Rezept für 4 Personen, du kochst für 6: Faktor = ?', solution: '1,5' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 0,4 entspricht 40%.', solution: 'Wahr' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Geometrie', prompt: 'Quadrat mit Seitenlänge 9 cm: Fläche = ?', solution: '81 cm²' },
  { category: 'Kombi', prompt: '2 T-Shirts à 14,90 € und 1 Hose 39,90 €: Gesamt = ?', solution: '69,70 €' },
];

const TASK_POOL_5: EntryTicketTask[] = [
  { category: 'Addition', prompt: '48 + 27 = ?', solution: '75' },
  { category: 'Addition', prompt: '125 + 340 = ?', solution: '465' },
  { category: 'Subtraktion', prompt: '130 - 58 = ?', solution: '72' },
  { category: 'Subtraktion', prompt: '400 - 175 = ?', solution: '225' },
  { category: 'Multiplikation', prompt: '6 · 7 = ?', solution: '42' },
  { category: 'Multiplikation', prompt: '9 · 8 = ?', solution: '72' },
  { category: 'Division', prompt: '96 : 8 = ?', solution: '12' },
  { category: 'Division', prompt: '84 : 7 = ?', solution: '12' },
  { category: 'Kombiniert', prompt: '25 + 18 - 9 = ?', solution: '34' },
  { category: 'Kombiniert', prompt: '7 · 6 + 5 = ?', solution: '47' },
  { category: 'Kombiniert', prompt: '40 - 4 · 5 = ?', solution: '20' },
  { category: 'Kombiniert', prompt: '(18 + 12) : 3 = ?', solution: '10' },
  { category: 'Umfang', prompt: 'Rechteck: 6 cm und 4 cm. Umfang = ?', solution: '20 cm' },
  { category: 'Umfang', prompt: 'Quadrat mit Seite 7 cm. Umfang = ?', solution: '28 cm' },
  { category: 'Flächeninhalt', prompt: 'Rechteck: 5 cm · 3 cm. Fläche = ?', solution: '15 cm²' },
  { category: 'Flächeninhalt', prompt: 'Rechteck: 8 cm · 2 cm. Fläche = ?', solution: '16 cm²' },
  { category: 'Einheiten', prompt: '2 m = ? cm', solution: '200' },
  { category: 'Einheiten', prompt: '350 cm = ? m', solution: '3,5' },
  { category: 'Einheiten', prompt: '1 l = ? ml', solution: '1000' },
  { category: 'Einheiten', prompt: '90 min = ? h', solution: '1,5' },
  { category: 'Zeit', prompt: 'Start 08:45 Uhr, Dauer 55 min. Ende um ? Uhr.', solution: '09:40' },
  { category: 'Zeit', prompt: 'Von 10:20 Uhr bis 11:05 Uhr = ? min', solution: '45' },
  { category: 'Geld', prompt: '3,40 € + 2,80 € + 1,20 € = ?', solution: '7,40 €' },
  { category: 'Geld', prompt: 'Du gibst 20 €. Rechnung 13,70 €. Rückgeld = ?', solution: '6,30 €' },
  { category: 'Alltag', prompt: 'Bus fährt 6 km in 15 min. 18 km dauern ? min', solution: '45' },
  { category: 'Alltag', prompt: 'Regal: 2 Bretter à 40 cm und 1 Brett à 30 cm. Gesamt = ? cm', solution: '110' },
  { category: 'Alltag', prompt: 'Einkauf: 2 Brötchen à 0,45 € und 1 Saft 1,20 €. Gesamt = ?', solution: '2,10 €' },
  { category: 'Alltag', prompt: 'Schulweg hin 1,5 km und zurück 1,5 km. Zusammen = ? km', solution: '3' },
];

const TASK_POOL_6: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '67 + 28 = ?', solution: '95' },
  { category: 'Kopfrechnen', prompt: '200 - 79 = ?', solution: '121' },
  { category: 'Multiplikation', prompt: '12 · 7 = ?', solution: '84' },
  { category: 'Division', prompt: '144 : 9 = ?', solution: '16' },
  { category: 'Einheiten', prompt: '1,6 km = ? m', solution: '1600' },
  { category: 'Einheiten', prompt: '900 ml = ? l', solution: '0,9' },
  { category: 'Zeit', prompt: 'Start 13:25 Uhr, Dauer 45 min. Ende um ? Uhr.', solution: '14:10' },
  { category: 'Zeit', prompt: 'Von 09:10 Uhr bis 10:00 Uhr = ? min', solution: '50' },
  { category: 'Geld', prompt: '5 · 1,25 € = ?', solution: '6,25 €' },
  { category: 'Geld', prompt: 'Du gibst 10 €. Rechnung 7,85 €. Rückgeld = ?', solution: '2,15 €' },
  { category: 'Bruch', prompt: '2/3 von 30 = ?', solution: '20' },
  { category: 'Prozent', prompt: '25% von 80 = ?', solution: '20' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 1/4 entspricht 0,25.', solution: 'Wahr' },
  { category: 'Alltag', prompt: '3 Brote à 2,40 € = ?', solution: '7,20 €' },
  { category: 'Alltag', prompt: 'Regalhöhe: 3 Böden à 28 cm + 2 Abstände à 4 cm = ? cm', solution: '92' },
  { category: 'Alltag', prompt: 'Supermarkt: 4 Joghurts à 0,65 € + 1 Milch 1,25 € = ?', solution: '3,85 €' },
  { category: 'Alltag', prompt: 'Fahrradweg: 12 km bei 6 km in 20 min. Dauer = ? min', solution: '40' },
  { category: 'Alltag', prompt: 'Umweg: 850 m + 1,2 km = ? m', solution: '2050' },
];

const TASK_POOL_9: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '920 - 347 + 88 = ?', solution: '661' },
  { category: 'Multiplikation', prompt: '35 · 18 = ?', solution: '630' },
  { category: 'Division', prompt: '144 : 12 = ?', solution: '12' },
  { category: 'Bruch', prompt: '3/5 von 20 = ?', solution: '12' },
  { category: 'Bruch/Dezimal', prompt: '3/4 als Dezimalzahl = ?', solution: '0,75' },
  { category: 'Dezimal', prompt: '2,5 - 0,75 = ?', solution: '1,75' },
  { category: 'Prozent', prompt: '25% von 60 = ?', solution: '15' },
  { category: 'Prozent', prompt: '120 € um 20% reduziert = ?', solution: '96 €' },
  { category: 'Einheiten', prompt: '1,2 km = ? m', solution: '1200' },
  { category: 'Zeit', prompt: 'Start 19:30 Uhr, Dauer 1 h 50 min. Ende um ? Uhr.', solution: '21:20' },
  { category: 'Alltag', prompt: '4 Joghurts je 0,65 € = ?', solution: '2,60 €' },
  { category: 'Regalmaße', prompt: 'Regalbrett: 120 cm - 2 · 3 cm Seitenteil = ? cm', solution: '114' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 15% von 200 sind 25.', solution: 'Falsch' },
  { category: 'Alltag', prompt: 'Ikea: 3 Bretter à 119 cm + 2 Seiten à 201 cm = ? cm', solution: '759' },
  { category: 'Alltag', prompt: 'Rabatt: Schuhpreis 89,90 € mit 15% Rabatt = ?', solution: '76,42 €' },
  { category: 'Alltag', prompt: 'Fahrt: 42 km bei 70 km/h. Zeit = ? min', solution: '36' },
  { category: 'Alltag', prompt: 'Einkauf: 2,5 kg Äpfel à 2,80 €/kg + 1,2 kg Bananen à 2,10 €/kg = ?', solution: '9,52 €' },
];

const TASK_POOL_10: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '540 - 275 + 63 = ?', solution: '328' },
  { category: 'Multiplikation', prompt: '48 · 25 = ?', solution: '1200' },
  { category: 'Division', prompt: '1331 : 11 = ?', solution: '121' },
  { category: 'Bruch', prompt: '5/8 von 64 = ?', solution: '40' },
  { category: 'Dezimal', prompt: '4,75 + 2,9 - 1,35 = ?', solution: '6,30' },
  { category: 'Prozent', prompt: '15% von 240 = ?', solution: '36' },
  { category: 'Prozent', prompt: '120 € um 20% reduziert = ?', solution: '96 €' },
  { category: 'Einheiten', prompt: '2,75 km + 850 m = ? m', solution: '3600' },
  { category: 'Zeit', prompt: 'Film 1 h 58 min, Start 20:17 Uhr. Ende um ? Uhr.', solution: '22:15' },
  { category: 'Alltag', prompt: '36 km bei 90 km/h = ? min', solution: '24' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 3/4 ist kleiner als 2/3.', solution: 'Falsch' },
  { category: 'Alltag', prompt: 'Regalwand: 2,80 m breit, Regal 2,35 m. Rest = ? cm', solution: '45' },
  { category: 'Alltag', prompt: 'Tank: 38 l à 1,79 €/l = ?', solution: '68,02 €' },
  { category: 'Alltag', prompt: 'Lieferweg 54 km bei 90 km/h. Dauer = ? min', solution: '36' },
  { category: 'Alltag', prompt: 'Einkauf: 3 Artikel à 14,90 € und 2 Artikel à 7,50 € = ?', solution: '59,70 €' },
];

const TASK_POOL_11: EntryTicketTask[] = [
  { category: 'Prozent', prompt: '3,5% von 800 = ?', solution: '28' },
  { category: 'Prozent', prompt: '240 € + 12% = ?', solution: '268,80 €' },
  { category: 'Prozent', prompt: '320 € - 17,5% = ?', solution: '264 €' },
  { category: 'Bruch', prompt: '3/4 + 2/3 = ?', solution: '17/12 (1 5/12)' },
  { category: 'Mittelwert', prompt: 'Noten 2, 3, 2, 1. Durchschnitt = ?', solution: '2,0' },
  { category: 'Logik', prompt: '3 Kisten mit je 12 Flaschen, 5 Flaschen kaputt. Wie viele ganz?', solution: '31' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Fläche', prompt: 'Rechteck 12 cm · 7 cm: Fläche = ?', solution: '84 cm²' },
  { category: 'Geometrie', prompt: 'Quadrat mit Seitenlänge 9 cm: Fläche = ?', solution: '81 cm²' },
  { category: 'Skalierung', prompt: 'Rezept für 4 Personen, du kochst für 6: Faktor = ?', solution: '1,5' },
  { category: 'Kombi', prompt: '6 · 1,79 € + 3 · 2,49 € = ?', solution: '18,21 €' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 0,4 entspricht 40%.', solution: 'Wahr' },
  { category: 'Alltag', prompt: 'Möbelprojekt: 6 Bretter à 0,85 m und 4 Bretter à 0,42 m = ? m', solution: '6,78' },
  { category: 'Alltag', prompt: 'Anfahrt: 84 km bei 70 km/h plus 18 min Pause. Gesamtzeit = ? min', solution: '90' },
  { category: 'Alltag', prompt: 'Wocheneinkauf: 12% Rabatt auf 186,50 € = neuer Preis ?', solution: '164,12 €' },
  { category: 'Alltag', prompt: 'Strecke: 2,4 km zu Fuß + 18 km Bus + 450 m zu Fuß = ? km', solution: '20,85' },
];

const TASK_POOL_12: EntryTicketTask[] = [
  { category: 'Prozent', prompt: '240 € + 12% = ?', solution: '268,80 €' },
  { category: 'Prozent', prompt: '320 € - 17,5% = ?', solution: '264 €' },
  { category: 'Bruch', prompt: '3/4 + 2/3 = ?', solution: '17/12 (1 5/12)' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Fläche', prompt: 'Rechteck 12 cm · 7 cm: Fläche = ?', solution: '84 cm²' },
  { category: 'Kombi', prompt: '2 T-Shirts à 14,90 € und 1 Hose 39,90 €: Gesamt = ?', solution: '69,70 €' },
  { category: 'Mittelwert', prompt: 'Noten 1, 2, 2, 3. Durchschnitt = ?', solution: '2,0' },
  { category: 'Alltag', prompt: 'Küchenplanung: 5 Schränke à 60 cm + 2 Blenden à 2 cm = ? cm', solution: '304' },
  { category: 'Alltag', prompt: 'Einkauf: 3,4 kg Obst à 2,90 €/kg + 2 Brote à 3,20 € = ?', solution: '16,26 €' },
  { category: 'Alltag', prompt: 'Fahrt: 126 km bei 84 km/h. Dauer = ? min', solution: '90' },
  { category: 'Alltag', prompt: 'Preissteigerung: 249 € um 8% erhöht = ?', solution: '268,92 €' },
];

const TASK_POOL_13: EntryTicketTask[] = [
  { category: 'Logik', prompt: '3 Kisten mit je 12 Flaschen, 5 Flaschen kaputt. Wie viele ganz?', solution: '31' },
  { category: 'Skalierung', prompt: 'Rezept für 4 Personen, du kochst für 6: Faktor = ?', solution: '1,5' },
  { category: 'Geometrie', prompt: 'Quadrat mit Seitenlänge 9 cm: Fläche = ?', solution: '81 cm²' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 0,4 entspricht 40%.', solution: 'Wahr' },
  { category: 'Alltag', prompt: 'Projektkalkulation: 14 Bretter à 1,35 m + Verschnitt 8% = ? m', solution: '20,41' },
  { category: 'Alltag', prompt: 'Pendeln: 32 km je Strecke, 5 Tage/Woche, 38 Wochen = ? km', solution: '12160' },
  { category: 'Alltag', prompt: 'Mengenrabatt: 12% auf 1.480 € und danach 3% Skonto = ?', solution: '1263,89 €' },
  { category: 'Alltag', prompt: 'Reisezeit: 210 km bei 105 km/h + 25 min Stopp = ? min', solution: '145' },
];

/** Grundlagen Informatik – Inf 11: Kategorien Allgemein, Java, OO, Technische Informatik, Digitaltechnik, KI (je 10 Fragen) */
const TASK_POOL_INF_11: EntryTicketTask[] = [
  // Allgemein
  { category: 'Allgemein', prompt: 'Was ist die zentrale Aufgabe eines Betriebssystems in einem Satz?', solution: 'Hardware verwalten und Programmausführung ermöglichen' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: „Open Source“ bedeutet immer, die Software sei kostenlos.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Was beschreibt ein Algorithmus?', solution: 'Eine endliche, eindeutige Vorschrift zur Problemlösung' },
  { category: 'Allgemein', prompt: 'IDE vs. reiner Texteditor: Nenne zwei typische Zusatzfunktionen einer IDE.', solution: 'z. B. Debugger, Syntaxhervorhebung, Build, Projektverwaltung (zwei)' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: JSON ist eine Programmiersprache.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Wofür wird ein Versionskontrollsystem wie Git in der Praxis genutzt?', solution: 'Änderungen nachverfolgen, zusammenarbeiten, Historie' },
  { category: 'Allgemein', prompt: 'Im Client-Server-Modell: Wer startet typischerweise die Anfrage?', solution: 'Client' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: Jede Dateiendung ist weltweit eindeutig einem Format zugeordnet.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Was ist eine API in einem Satz?', solution: 'Schnittstelle, über die Programme miteinander sprechen' },
  { category: 'Allgemein', prompt: 'Backup-Strategie „3-2-1“: Was bedeuten die drei Zahlen grob?', solution: '3 Kopien, 2 Medien/Orte, 1 extern/offsite' },
  // Java
  { category: 'Java', prompt: 'Welche Dateiendung hat eine typische Java-Quelldatei?', solution: '.java' },
  { category: 'Java', prompt: 'Wahr oder falsch: Java-Quellcode wird in Bytecode übersetzt und auf der JVM ausgeführt.', solution: 'Wahr' },
  { category: 'Java', prompt: 'Wofür steht die Abkürzung JVM?', solution: 'Java Virtual Machine' },
  { category: 'Java', prompt: 'Vollständige Signatur der Einstiegsmethode main in Java?', solution: 'public static void main(String[] args)' },
  { category: 'Java', prompt: 'Wahr oder falsch: Der Typ int ist ein primitiver Datentyp in Java.', solution: 'Wahr' },
  { category: 'Java', prompt: 'Wahr oder falsch: Eine Klasse kann in Java von mehreren Klassen gleichzeitig erben (extends).', solution: 'Falsch' },
  { category: 'Java', prompt: 'Welches Schlüsselwort leitet eine Paketdeklaration ein?', solution: 'package' },
  { category: 'Java', prompt: 'Sind String-Objekte in Java nach Erzeugung veränderbar (mutable)? (ja/nein)', solution: 'nein' },
  { category: 'Java', prompt: 'Welche zwei Schlüsselwörter nutzt man typischerweise zum Abfangen von Ausnahmen?', solution: 'try und catch' },
  { category: 'Java', prompt: 'Nenne ein typisches Interface für eine geordnete, indexierbare Liste in Java.', solution: 'List (z. B. ArrayList)' },
  // OO
  { category: 'OO', prompt: 'Was kapselt eine Klasse in der Objektorientierung typischerweise?', solution: 'Zustand (Attribute) und Verhalten (Methoden)' },
  { category: 'OO', prompt: 'Wahr oder falsch: Vererbung modelliert oft eine „ist-ein“-Beziehung.', solution: 'Wahr' },
  { category: 'OO', prompt: 'Was ermöglicht Polymorphismus grob?', solution: 'Gleiche Schnittstelle, verschiedene Implementierungen' },
  { category: 'OO', prompt: 'Wann wird ein Konstruktor einer Klasse aufgerufen?', solution: 'Beim Erzeugen eines Objekts (new …)' },
  { category: 'OO', prompt: 'Wer darf auf als private deklarierte Attribute zugreifen?', solution: 'Nur die eigene Klasse' },
  { category: 'OO', prompt: 'Wahr oder falsch: Ein Interface in Java kann direkt mit new instanziiert werden.', solution: 'Falsch' },
  { category: 'OO', prompt: 'Gehört eine statische Methode zur Instanz oder zur Klasse?', solution: 'Zur Klasse' },
  { category: 'OO', prompt: 'Darf man von einer abstrakten Klasse direkt ein Objekt erzeugen? (ja/nein)', solution: 'nein' },
  { category: 'OO', prompt: '„Hund ist ein Tier“ – modelliert man das eher mit Vererbung oder mit Assoziation?', solution: 'Vererbung' },
  { category: 'OO', prompt: 'Wozu dienen Getter- und Setter-Methoden typischerweise?', solution: 'Kontrollierter Zugriff auf Attribute / Kapselung' },
  // Technische Informatik (Hardware, Von-Neumann, Johnny / Mikrobefehle)
  { category: 'Technische Informatik', prompt: 'Von-Neumann-Rechner: Wo liegen Programme und Daten typischerweise?', solution: 'Im gleichen Hauptspeicher (gemeinsam)' },
  { category: 'Technische Informatik', prompt: 'Nenne die beiden zentralen funktionalen Teile der CPU (Von-Neumann): Rechenwerk und …?', solution: 'Leitwerk (Steuerwerk)' },
  { category: 'Technische Informatik', prompt: 'Wozu dient der Akkumulator beim Johnny-Rechner typischerweise?', solution: 'Zwischenergebnisse / Operanden (ein zentraler Wert)' },
  { category: 'Technische Informatik', prompt: 'Was macht der Mikrobefehl LDA (Load) beim Johnny grob?', solution: 'Wert aus dem Speicher in den Akkumulator laden' },
  { category: 'Technische Informatik', prompt: 'Was macht STA (Store) beim Johnny grob?', solution: 'Akkumulatorwert an eine Speicheradresse schreiben' },
  { category: 'Technische Informatik', prompt: 'Was macht ADD beim Johnny in einem Satz?', solution: 'Speicherwert zum Akkumulator addieren' },
  { category: 'Technische Informatik', prompt: 'Wahr oder falsch: Systembusse verbinden CPU, Arbeitsspeicher und Schnittstellen zu E/A.', solution: 'Wahr' },
  { category: 'Technische Informatik', prompt: 'RAM vs. ROM: Welcher Speicher ist typischerweise flüchtig?', solution: 'RAM (Arbeitsspeicher)' },
  { category: 'Technische Informatik', prompt: 'Wahr oder falsch: Die CPU holt Befehle aus dem Speicher und dekodiert sie im Leitwerk.', solution: 'Wahr' },
  { category: 'Technische Informatik', prompt: 'Was steuert der Befehlszähler (Program Counter) beim Ablauf grob?', solution: 'Adresse des nächsten Befehls' },
  // Digitaltechnik
  { category: 'Digitaltechnik', prompt: 'Wozu dient das Zweierkomplement bei Festkomma-Darstellung typischerweise?', solution: 'Darstellung negativer Zahlen' },
  { category: 'Digitaltechnik', prompt: 'Wahr oder falsch: Ein Halbaddierer berücksichtigt den Übertrag einer niedrigeren Stelle.', solution: 'Falsch' },
  { category: 'Digitaltechnik', prompt: 'Was macht ein Multiplexer grob?', solution: 'Wählt eine von vielen Eingangsleitungen auf eine Ausgangsleitung' },
  { category: 'Digitaltechnik', prompt: 'Schaltalgebra: A AND 1 = ? (in Abhängigkeit von A)', solution: 'A' },
  { category: 'Digitaltechnik', prompt: 'Was speichert ein Flipflop typischerweise?', solution: 'Ein Bit' },
  { category: 'Digitaltechnik', prompt: 'Wahr oder falsch: Mit NAND-Gattern lässt sich jede boolesche Funktion aufbauen (funktionale Vollständigkeit).', solution: 'Wahr' },
  { category: 'Digitaltechnik', prompt: 'Was transportiert ein Bus in einem Rechner?', solution: 'Daten/Adressen/Steuersignale zwischen Bausteinen' },
  { category: 'Digitaltechnik', prompt: 'Sind SRAM und DRAM flüchtig oder nicht flüchtig?', solution: 'flüchtig' },
  { category: 'Digitaltechnik', prompt: 'Was macht ein Encoder typischerweise?', solution: 'Viele Eingänge auf weniger Ausgabebits abbilden' },
  { category: 'Digitaltechnik', prompt: 'Höhere Taktfrequenz der CPU bedeutet oft auch was für die Leistungsaufnahme?', solution: 'höher (meist)' },
  // KI
  { category: 'KI', prompt: 'Was ist der Unterschied zwischen überwachtem und unüberwachtem Lernen in einem Satz?', solution: 'Überwacht: mit Labels; unüberwacht: ohne Zielvorgaben/Muster suchen' },
  { category: 'KI', prompt: 'Wahr oder falsch: Neuronale Netze brauchen immer beschriftete Trainingsdaten.', solution: 'Falsch' },
  { category: 'KI', prompt: 'Was ist Overfitting?', solution: 'Modell lernt Trainingsdaten zu genau auswendig, generalisiert schlecht' },
  { category: 'KI', prompt: 'Wozu dient ein Validierungsdatensatz typischerweise?', solution: 'Modell/Hyperparameter wählen ohne den Testdatensatz zu verfälschen' },
  { category: 'KI', prompt: 'Warum können verzerrte Trainingsdaten (Bias) problematisch sein?', solution: 'Modell diskriminiert oder trifft unfaire Vorhersagen' },
  { category: 'KI', prompt: 'Wahr oder falsch: „Starke KI“ (AGI) ist in der Schule als gelöstes Standardthema behandelt.', solution: 'Falsch' },
  { category: 'KI', prompt: 'Was ist ein „Feature“ beim maschinellen Lernen?', solution: 'Eingabegröße / gemessenes Attribut' },
  { category: 'KI', prompt: 'Warum gelten manche KI-Modelle als „Black Box“?', solution: 'Entscheidungen sind schwer nachvollziehbar / wenig transparent' },
  { category: 'KI', prompt: 'Welche Architektur/Technik steckt oft hinter großen Sprachmodellen (z. B. ChatGPT-ähnlich)?', solution: 'Transformer / LLM (große neuronale Netze)' },
  { category: 'KI', prompt: 'Nenne ein ethisches Prinzip neben Transparenz bei KI-Systemen.', solution: 'z. B. Fairness, Datenschutz, Rechenschaftspflicht, Menschliche Aufsicht' },
];

/** Grundlagen Informatik – Inf 12: genau acht Kategorien, je mindestens 20 Fragen im Standardpool */
const TASK_POOL_INF_12: EntryTicketTask[] = [
  // Allgemein
  { category: 'Allgemein', prompt: 'Was ist die zentrale Aufgabe eines Betriebssystems in einem Satz?', solution: 'Hardware verwalten und Programmausführung ermöglichen' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: „Open Source“ bedeutet immer, die Software sei kostenlos.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Was beschreibt ein Algorithmus?', solution: 'Eine endliche, eindeutige Vorschrift zur Problemlösung' },
  { category: 'Allgemein', prompt: 'Wofür wird ein Versionskontrollsystem wie Git in der Praxis genutzt?', solution: 'Änderungen nachverfolgen, zusammenarbeiten, Historie' },
  { category: 'Allgemein', prompt: 'Im Client-Server-Modell: Wer startet typischerweise die Anfrage?', solution: 'Client' },
  { category: 'Allgemein', prompt: 'Was ist eine API in einem Satz?', solution: 'Schnittstelle, über die Programme miteinander sprechen' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: JSON ist eine Programmiersprache.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Backup-Strategie „3-2-1“: Was bedeuten die drei Zahlen grob?', solution: '3 Kopien, 2 Medien/Orte, 1 extern/offsite' },
  { category: 'Allgemein', prompt: 'IDE vs. reiner Texteditor: Nenne zwei typische Zusatzfunktionen einer IDE.', solution: 'z. B. Debugger, Syntaxhervorhebung, Build, Projektverwaltung (zwei)' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: IPv4- und IPv6-Adressen haben dieselbe übliche Bitlänge.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: Jede E-Mail mit Firmenlogo ist automatisch vertrauenswürdig.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Phishing versucht typischerweise, was von Nutzer:innen zu erlangen?', solution: 'Zugangsdaten oder sensible Daten (durch Täuschung)' },
  { category: 'Allgemein', prompt: 'Malware: Was ist das in einem Satz?', solution: 'Software mit schädlicher oder unerwünschter Wirkung' },
  { category: 'Allgemein', prompt: 'DSGVO betrifft typischerweise Daten von ?', solution: 'identifizierbaren natürlichen Personen' },
  { category: 'Allgemein', prompt: 'Cloud Computing grob: Rechenleistung oder Speicher oft ?', solution: 'bei einem Dienstleister/extern (On-Demand)' },
  { category: 'Allgemein', prompt: 'GUI vs. CLI in einem Satz?', solution: 'GUI grafisch bedienbar; CLI zeilenorientierte Eingabe' },
  { category: 'Allgemein', prompt: 'Unicode erlaubt gegenüber ASCII typischerweise ?', solution: 'deutlich mehr verschiedene Zeichen/Schriften' },
  { category: 'Allgemein', prompt: 'Wozu dienen Software-Updates/Patches grob?', solution: 'Fehler beheben, Sicherheit verbessern, Funktionen erweitern' },
  { category: 'Allgemein', prompt: 'Wahr oder falsch: Kommentare im Quellcode ändern das Laufzeitverhalten des Programms.', solution: 'Falsch' },
  { category: 'Allgemein', prompt: 'Digitale Kompetenz umfasst grob neben Technik auch ?', solution: 'Reflexion, Rechtliches/Ethik, Medienkritik (Auswahl)' },
  // Python
  { category: 'Python', prompt: 'Welche Dateiendung hat eine typische Python-Quelldatei?', solution: '.py' },
  { category: 'Python', prompt: 'Wahr oder falsch: Python wird typischerweise interpretiert (nicht vorab in Maschinencode übersetzt).', solution: 'Wahr' },
  { category: 'Python', prompt: 'Wie heißt der Datentyp für Wahrheitswerte in Python?', solution: 'bool' },
  { category: 'Python', prompt: 'Sind Python-Listen nach der Erzeugung veränderbar (mutable)? (ja/nein)', solution: 'ja' },
  { category: 'Python', prompt: 'Was liefert list(range(3)) in typischen Python-Versionen als Elemente?', solution: '0, 1, 2' },
  { category: 'Python', prompt: 'Wozu dient die Einrückung in Python syntaktisch?', solution: 'Struktur von Blöcken (z. B. nach if, for, def)' },
  { category: 'Python', prompt: 'Welches Schlüsselwort leitet eine Funktionsdefinition ein?', solution: 'def' },
  { category: 'Python', prompt: 'Womit kennzeichnet Python „kein Wert“ statt null?', solution: 'None' },
  { category: 'Python', prompt: 'Standardwerkzeug zum Installieren von Python-Paketen von PyPI?', solution: 'pip' },
  { category: 'Python', prompt: 'Listen-Abstraktion (list comprehension): was beschreibt sie in einem Satz?', solution: 'Neue Liste aus einer Ausdrucksregel über eine Iterable (kompakt)' },
  { category: 'Python', prompt: 'Sind Tupel in Python veränderbar (mutable)? (ja/nein)', solution: 'nein' },
  { category: 'Python', prompt: 'Wozu dient typischerweise `with open(...) as f:`?', solution: 'Datei zuverlässig schließen (auch bei Fehlern)' },
  { category: 'Python', prompt: 'Welches Schlüsselwort löst eine Ausnahme (Exception) aus?', solution: 'raise' },
  { category: 'Python', prompt: 'Welches Schlüsselwort ist ein Platzhalter für einen leeren Codeblock?', solution: 'pass' },
  { category: 'Python', prompt: 'Was liefert `len([])` typischerweise?', solution: '0' },
  { category: 'Python', prompt: 'Wofür dient `enumerate(iterable)` grob?', solution: 'Zähler (Index) und Elemente zusammen durchlaufen' },
  { category: 'Python', prompt: 'Wahr oder falsch: Python erlaubt Mehrfachvererbung bei Klassen.', solution: 'Wahr' },
  { category: 'Python', prompt: 'Strings mit einfachen oder doppelten Anführungszeichen: gleicher Typ (str) in Python?', solution: 'ja' },
  { category: 'Python', prompt: 'Wozu dient `if __name__ == "__main__":` oft?', solution: 'Code nur beim direkten Start des Skripts ausführen' },
  { category: 'Python', prompt: 'Liste vs. Set: Was erlaubt typischerweise keine Duplikate?', solution: 'set' },
  // Programmiergrundlagen
  { category: 'Programmiergrundlagen', prompt: 'Variable vs. Literal: Was ist ein Literal?', solution: 'Fester Wert direkt im Code (z. B. 42, "Hallo")' },
  { category: 'Programmiergrundlagen', prompt: 'int vs. float: Welcher Typ ist für ganze Zahlen gedacht?', solution: 'int' },
  { category: 'Programmiergrundlagen', prompt: 'for vs. while: Wann eignet sich while oft besser?', solution: 'Wenn die Wiederholungsanzahl vorher unbekannt ist' },
  { category: 'Programmiergrundlagen', prompt: 'Wahr oder falsch: Jede Programmiersprache erzwingt exakt denselben Programmierstil.', solution: 'Falsch' },
  { category: 'Programmiergrundlagen', prompt: 'Was ist ein Haltepunkt (Breakpoint) beim Debugging grob?', solution: 'Stelle, an der das Programm anhält zur Inspektion' },
  { category: 'Programmiergrundlagen', prompt: 'Interpreter vs. Compiler in einem Satz?', solution: 'Interpreter arbeitet oft zeilenweise zur Laufzeit; Compiler übersetzt vorab' },
  { category: 'Programmiergrundlagen', prompt: 'Syntax vs. Semantik: Syntax beschreibt ?', solution: 'formale Regeln der Schreibweise' },
  { category: 'Programmiergrundlagen', prompt: 'Wozu teilt man Code in Funktionen/Module ein?', solution: 'Wiederverwendbarkeit, Übersicht, Testbarkeit' },
  { category: 'Programmiergrundlagen', prompt: 'Syntaxfehler vs. Laufzeitfehler: Wann tritt ein Syntaxfehler auf?', solution: 'beim Übersetzen/Parsen (vor der Ausführung)' },
  { category: 'Programmiergrundlagen', prompt: 'Was beschreibt eine API grob?', solution: 'Schnittstelle, über die Programme zusammenarbeiten' },
  { category: 'Programmiergrundlagen', prompt: 'Unit-Test: Was wird typischerweise klein und isoliert geprüft?', solution: 'einzelne Funktionen/Module' },
  { category: 'Programmiergrundlagen', prompt: 'Refactoring: Ziel ohne das beobachtbare Verhalten zu ändern?', solution: 'Code lesbarer/wartbarer machen' },
  { category: 'Programmiergrundlagen', prompt: 'Code Review: wozu dient es grob?', solution: 'Qualität sichern, Fehler finden, Wissen teilen' },
  { category: 'Programmiergrundlagen', prompt: 'Branch in Git: wofür nutzt man ihn typischerweise?', solution: 'parallele Entwicklung ohne Hauptstand zu zerstören' },
  { category: 'Programmiergrundlagen', prompt: 'Pair Programming grob: wie arbeiten zwei Personen?', solution: 'gemeinsam an einem Rechner/Code (Rollenwechsel möglich)' },
  { category: 'Programmiergrundlagen', prompt: 'Abstraktion: was wird typischerweise verborgen?', solution: 'Implementierungsdetails hinter einer klaren Schnittstelle' },
  { category: 'Programmiergrundlagen', prompt: 'Wahr oder falsch: Rekursion ist immer effizienter als eine iterative Schleife.', solution: 'Falsch' },
  { category: 'Programmiergrundlagen', prompt: 'Kontrollfluss: Was steuert if/else und Schleifen grob?', solution: 'welche Anweisungen in welcher Reihenfolge ausgeführt werden' },
  { category: 'Programmiergrundlagen', prompt: 'Wahr oder falsch: Ein guter Variablenname kann die Lesbarkeit verbessern.', solution: 'Wahr' },
  { category: 'Programmiergrundlagen', prompt: 'Fehlerbehandlung: try/catch (bzw. try/except) fängt typischerweise ? ab.', solution: 'Ausnahmen zur Laufzeit' },
  // Algorithmen (allgemein, Suchen, Sortieren, Wege)
  { category: 'Algorithmen', prompt: 'O-Notation: Was wird typischerweise abgeschätzt?', solution: 'Wachstum von Zeit- oder Speicherbedarf in n' },
  { category: 'Algorithmen', prompt: 'Lineare Suche in n Elementen: Worst-Case oft ?', solution: 'O(n)' },
  { category: 'Algorithmen', prompt: 'Binäre Suche: welche Voraussetzung an die Daten?', solution: 'sortiert / geordnet' },
  { category: 'Algorithmen', prompt: 'Mergesort: typische Worst-Case-Laufzeit?', solution: 'O(n log n)' },
  { category: 'Algorithmen', prompt: 'Bubblesort: typische Laufzeitordnung?', solution: 'O(n²)' },
  { category: 'Algorithmen', prompt: 'Dijkstra-Algorithmus: welches Problem löst er typischerweise?', solution: 'Kürzeste Wege (mit nicht-negativen Kantengewichten)' },
  { category: 'Algorithmen', prompt: 'Greedy: lokal optimale Wahl ist immer global optimal? (ja/nein)', solution: 'nein' },
  { category: 'Algorithmen', prompt: 'Dynamische Programmierung: wozu speichert man Teilprobleme?', solution: 'mehrfaches Berechnen vermeiden (überlappende Teilprobleme)' },
  { category: 'Algorithmen', prompt: 'Breitensuche (BFS) in Graphen: welche Datenstruktur typisch für die Frontier?', solution: 'Warteschlange (Queue)' },
  { category: 'Algorithmen', prompt: 'Tiefensuche (DFS) vs. BFS: welche nutzt typischerweise einen Stack bzw. Rekursion?', solution: 'DFS' },
  { category: 'Algorithmen', prompt: 'Quicksort: durchschnittliche Zeit oft ? (Landau)', solution: 'O(n log n)' },
  { category: 'Algorithmen', prompt: 'Quicksort: Worst-Case ohne gute Pivot-Wahl oft ?', solution: 'O(n²)' },
  { category: 'Algorithmen', prompt: 'Heapsort nutzt typischerweise welche Datenstruktur?', solution: 'Heap (Prioritäts-/Heap-Struktur)' },
  { category: 'Algorithmen', prompt: 'Selectionsort: was wird pro Durchlauf typisch gesucht?', solution: 'Minimum (oder Maximum) im unsortierten Rest' },
  { category: 'Algorithmen', prompt: 'Stabiles Sortieren: gleiche Schlüssel behalten ihre ?', solution: 'relative Reihenfolge zueinander' },
  { category: 'Algorithmen', prompt: 'A* (A-Stern): nutzt typischerweise zusätzlich zu Dijkstra eine ?', solution: 'Heuristik (geschätzte Restkosten)' },
  { category: 'Algorithmen', prompt: 'Floyd-Warshall: berechnet kürzeste Wege zwischen ?', solution: 'allen Paaren von Knoten' },
  { category: 'Algorithmen', prompt: 'Hashing mit guter Streuung: erwartete Suchzeit in einer Hash-Tabelle oft ?', solution: 'O(1) amortisiert (idealisiert)' },
  { category: 'Algorithmen', prompt: 'Minimum Spanning Tree (MST): was wird über alle Knoten minimiert?', solution: 'Summe der Kantengewichte (spanning, minimal)' },
  { category: 'Algorithmen', prompt: 'Bellman-Ford vs. Dijkstra: Bellman-Ford kann typischerweise mit ? Kantengewichten umgehen (unter Voraussetzungen).', solution: 'negativen' },
  // Darstellung von Algorithmen
  { category: 'Darstellung von Algorithmen', prompt: 'Wozu dient Pseudocode?', solution: 'Algorithmus sprachunabhängig und knapp zu beschreiben' },
  { category: 'Darstellung von Algorithmen', prompt: 'Struktogramm (Nassi-Shneiderman): womit werden Abläufe dargestellt?', solution: 'rechteckige Strukturblöcke (Sequenz, Verzweigung, Schleife)' },
  { category: 'Darstellung von Algorithmen', prompt: 'Flussdiagramm: welches Symbol für Verzweigung oft?', solution: 'Raute' },
  { category: 'Darstellung von Algorithmen', prompt: 'Flussdiagramm: Start und Ende werden oft mit welcher Form dargestellt?', solution: 'abgerundetes Rechteck oder Ellipse' },
  { category: 'Darstellung von Algorithmen', prompt: 'Kommentare im Quellcode: wozu dienen sie vor allem?', solution: 'Erklärungen für Menschen (Absicht, Annahmen)' },
  { category: 'Darstellung von Algorithmen', prompt: 'Schleifeninvariante: was beschreibt sie grob?', solution: 'Eigenschaft, die vor/nach jedem Schleifendurchlauf gilt' },
  { category: 'Darstellung von Algorithmen', prompt: 'Vor- und Nachbedingung: was ist eine Nachbedingung?', solution: 'Zustand/Ergebnis, das nach Ausführung gelten soll' },
  { category: 'Darstellung von Algorithmen', prompt: 'UML-Aktivitätsdiagramm: wofür wird es oft genutzt?', solution: 'Abläufe/Workflows modellieren' },
  { category: 'Darstellung von Algorithmen', prompt: 'Ablaufplan vs. Programm: der Plan ist typischerweise ? maschinennah.', solution: 'weniger / abstrakter' },
  { category: 'Darstellung von Algorithmen', prompt: 'Warum strukturierte Blöcke im Struktogramm oft klarer als Sprunglinien?', solution: 'keine unübersichtlichen Sprünge / bessere Lesbarkeit' },
  { category: 'Darstellung von Algorithmen', prompt: 'Strukturierte Programmierung: unbeschränkte Sprünge (goto) werden typischerweise ?', solution: 'vermieden / durch klare Kontrollstrukturen ersetzt' },
  { category: 'Darstellung von Algorithmen', prompt: 'Sequenz im Struktogramm: wie werden Schritte angeordnet?', solution: 'nacheinander von oben nach unten' },
  { category: 'Darstellung von Algorithmen', prompt: 'Flussdiagramm: einfache Anweisung/Prozess oft in welcher Form?', solution: 'Rechteck' },
  { category: 'Darstellung von Algorithmen', prompt: 'Datenfluss vs. Kontrollfluss: Datenfluss beschreibt grob ?', solution: 'wie Daten zwischen Schritten fließen' },
  { category: 'Darstellung von Algorithmen', prompt: 'Warum schreibt man Algorithmen oft zuerst in Pseudocode statt sofort in Python?', solution: 'sprachneutral, Fokus auf Logik, leichter zu diskutieren' },
  { category: 'Darstellung von Algorithmen', prompt: 'Testfall: was beschreibt er mindestens?', solution: 'Eingabe(n) und erwartetes Ergebnis / Verhalten' },
  { category: 'Darstellung von Algorithmen', prompt: 'Vorbedingung (Precondition): gilt typischerweise ? dem betrachteten Schritt.', solution: 'vor' },
  { category: 'Darstellung von Algorithmen', prompt: 'Aktivitätsdiagramm (UML): modelliert typischerweise ?', solution: 'Abläufe mit Verzweigungen, Schleifen, Parallelität' },
  { category: 'Darstellung von Algorithmen', prompt: 'Welche Verzweigung hat im Struktogramm oft zwei Zweige (ja/nein)?', solution: 'Auswahl/IF (zwei Alternativen)' },
  { category: 'Darstellung von Algorithmen', prompt: 'Dokumentation neben Code: wann ist sie besonders wichtig?', solution: 'bei komplexer Logik, Schnittstellen, Annahmen für andere Teammitglieder' },
  // Netzwerke
  { category: 'Netzwerke', prompt: 'OSI-Modell: wie viele Schichten werden oft genannt?', solution: '7' },
  { category: 'Netzwerke', prompt: 'MAC-Adresse: typische OSI-Schicht?', solution: 'Schicht 2 (Sicherung/Data Link)' },
  { category: 'Netzwerke', prompt: 'IPv4-Adresse: typische OSI-Schicht?', solution: 'Schicht 3 (Vermittlung/Network)' },
  { category: 'Netzwerke', prompt: 'Switch vs. Router grob: wer arbeitet typischerweise auf Schicht 2 vs. 3?', solution: 'Switch eher L2, Router eher L3' },
  { category: 'Netzwerke', prompt: 'Paket vs. Frame: was ist typisch auf der Sicherungsschicht benannt?', solution: 'Frame' },
  { category: 'Netzwerke', prompt: 'Wofür steht DNS grob?', solution: 'Namen (Domain) in IP-Adressen auflösen' },
  { category: 'Netzwerke', prompt: 'Wofür steht DHCP grob?', solution: 'automatische Vergabe von IP-Konfiguration' },
  { category: 'Netzwerke', prompt: 'Latenz vs. Bandbreite: was misst die Bandbreite grob?', solution: 'übertragbare Datenmenge pro Zeit' },
  { category: 'Netzwerke', prompt: 'Subnetz / Präfix (z. B. /24): wozu dient es grob?', solution: 'Adressbereich eines Netzes segmentieren' },
  { category: 'Netzwerke', prompt: 'VLAN: wozu dient es grob?', solution: 'logische Trennung von Netzen auf gemeinsamer Infrastruktur' },
  { category: 'Netzwerke', prompt: 'ARP: welche Zuordnung löst es typischerweise auf?', solution: 'IP-Adresse zu MAC-Adresse (im lokalen Segment)' },
  { category: 'Netzwerke', prompt: 'NAT: wozu dient es typischerweise in Heim-/Firmennetzen?', solution: 'mehrere private IPs teilen eine öffentliche Adresse' },
  { category: 'Netzwerke', prompt: 'ICMP: wofür wird es oft genutzt (Beispiel)?', solution: 'Ping / Fehlermeldungen der Schicht 3' },
  { category: 'Netzwerke', prompt: 'UDP: verbindungsorientiert wie TCP? (ja/nein)', solution: 'nein' },
  { category: 'Netzwerke', prompt: 'Ethernet-Broadcast auf Schicht 2: Empfänger grob?', solution: 'alle Stationen im Broadcast-Segment' },
  { category: 'Netzwerke', prompt: 'Topologie Stern: zentrales Element oft?', solution: 'Switch oder Access Point' },
  { category: 'Netzwerke', prompt: 'PoE (Power over Ethernet): was wird zusätzlich über das Kabel geführt?', solution: 'elektrische Versorgung (Strom)' },
  { category: 'Netzwerke', prompt: 'Jumbo Frames: typisch größer als ? Bytes Nutzlast (Richtung, kein exakter Wert nötig).', solution: 'klassische 1500 (MTU-Erhöhung)' },
  { category: 'Netzwerke', prompt: 'Was misst „Latenz“ grob?', solution: 'Verzögerung bis ein Signal/Antwort ankommt' },
  { category: 'Netzwerke', prompt: 'Was misst „Durchsatz“ grob?', solution: 'übertragene Datenmenge pro Zeit' },
  // Internet und Kommunikation
  { category: 'Internet und Kommunikation', prompt: 'HTTP nutzt typischerweise welches Transportprotokoll?', solution: 'TCP' },
  { category: 'Internet und Kommunikation', prompt: 'HTTPS: HTTP plus typischerweise ?', solution: 'TLS-Verschlüsselung' },
  { category: 'Internet und Kommunikation', prompt: 'REST grob: Ressourcen werden oft mit welchen HTTP-Methoden angesprochen?', solution: 'GET, POST, PUT/PATCH, DELETE (Auswahl)' },
  { category: 'Internet und Kommunikation', prompt: 'URL: welche Teile gehören oft dazu (mindestens zwei nennen)?', solution: 'Schema (https), Host, Pfad (zwei reichen)' },
  { category: 'Internet und Kommunikation', prompt: 'HTTP-Statuscode 404 bedeutet grob?', solution: 'nicht gefunden' },
  { category: 'Internet und Kommunikation', prompt: 'Cookie im Web: wozu typisch?', solution: 'Zustand/Session speichern (clientseitig vom Server gesetzt)' },
  { category: 'Internet und Kommunikation', prompt: 'SMTP vs. IMAP grob: welches ist eher zum Versand, welches zum Abruf von Postfächern?', solution: 'SMTP Versand, IMAP Abruf/Sync' },
  { category: 'Internet und Kommunikation', prompt: 'Welcher Port ist typisch für HTTPS?', solution: '443' },
  { category: 'Internet und Kommunikation', prompt: 'Client-Server vs. Peer-to-Peer: bei P2P sind viele Knoten gleichzeitig ?', solution: 'Client und Server / gleichberechtigt' },
  { category: 'Internet und Kommunikation', prompt: 'CDN grob: welches Ziel verfolgt es oft?', solution: 'Inhalte geografisch näher ausliefern (Latenz senken)' },
  { category: 'Internet und Kommunikation', prompt: 'HTTP 301 vs. 302 grob: welche Umleitung ist oft „dauerhaft“?', solution: '301 (Moved Permanently)' },
  { category: 'Internet und Kommunikation', prompt: 'MIME-Type im HTTP-Header: wozu dient er dem Client?', solution: 'Art des Inhalts anzugegen (z. B. text/html, image/png)' },
  { category: 'Internet und Kommunikation', prompt: 'CORS schränkt im Browser typischerweise ? ein.', solution: 'Zugriffe von anderen Origins (Domains/Ports/Schemes)' },
  { category: 'Internet und Kommunikation', prompt: 'WebSocket vs. klassisches HTTP-Request/Response: WebSocket ist typischerweise ?', solution: 'persistente, beidseitige Verbindung' },
  { category: 'Internet und Kommunikation', prompt: 'HSTS: was erzwingt es für eine Domain typischerweise?', solution: 'nur noch HTTPS-Verbindungen (vom Browser)' },
  { category: 'Internet und Kommunikation', prompt: 'SameSite-Cookie-Attribut: schützt teilweise vor ?', solution: 'CSRF (Cross-Site Request Forgery)' },
  { category: 'Internet und Kommunikation', prompt: 'OAuth2 grob: wofür wird es oft genutzt?', solution: 'delegierter Zugriff ohne Passwortweitergabe an Dritte' },
  { category: 'Internet und Kommunikation', prompt: 'Webhook: wie wird ein Ereignis typischerweise gemeldet?', solution: 'HTTP-Callback an eine registrierte URL' },
  { category: 'Internet und Kommunikation', prompt: 'IMAP vs. POP3: IMAP lässt Mails typischerweise ?', solution: 'auf dem Server (Synchronisation mehrerer Geräte)' },
  { category: 'Internet und Kommunikation', prompt: 'HTTP-Status 500 steht grob für ?', solution: 'Serverfehler (Internal Server Error)' },
  // Datenbanken
  { category: 'Datenbanken', prompt: 'Primärschlüssel: wozu dient er?', solution: 'Zeilen eindeutig identifizieren' },
  { category: 'Datenbanken', prompt: 'Fremdschlüssel referenziert typischerweise einen ? einer anderen Tabelle.', solution: 'Primärschlüssel' },
  { category: 'Datenbanken', prompt: '1. Normalform (1NF): Attributwerte sollen typischerweise ? sein.', solution: 'atomar' },
  { category: 'Datenbanken', prompt: 'SQL: welches Schlüsselwort liest Daten aus Tabellen?', solution: 'SELECT' },
  { category: 'Datenbanken', prompt: 'SQL: welches Schlüsselwort fügt neue Zeilen ein?', solution: 'INSERT' },
  { category: 'Datenbanken', prompt: 'JOIN: wozu dient er?', solution: 'Zeilen aus mehreren Tabellen verknüpfen' },
  { category: 'Datenbanken', prompt: 'Transaktion ACID: wofür steht „A“ oft?', solution: 'Atomicity / Atomarität' },
  { category: 'Datenbanken', prompt: 'Index in einer Datenbank: wozu dient er grob?', solution: 'schnelleres Suchen/Filtern (auf Kosten von Pflege/Speicher)' },
  { category: 'Datenbanken', prompt: 'SQL vs. NoSQL in einem Satz?', solution: 'SQL relational/tabellarisch; NoSQL oft flexiblere Modelle (Dokument, Key-Value, …)' },
  { category: 'Datenbanken', prompt: 'VIEW in SQL: was ist es grob?', solution: 'gespeicherte Abfrage / virtuelle Tabelle' },
  { category: 'Datenbanken', prompt: 'DELETE vs. DROP TABLE: was entfernt die ganze Tabelle?', solution: 'DROP TABLE' },
  { category: 'Datenbanken', prompt: 'PRIMARY KEY: darf NULL sein? (ja/nein)', solution: 'nein' },
  { category: 'Datenbanken', prompt: 'GROUP BY wird typischerweise mit ? Funktionen kombiniert.', solution: 'Aggregat- (COUNT, SUM, AVG, …)' },
  { category: 'Datenbanken', prompt: 'HAVING filtert auf ? WHERE filtert auf Zeilen.', solution: 'Gruppen-Ergebnisse (nach GROUP BY)' },
  { category: 'Datenbanken', prompt: '2NF verbietet partielle Abhängigkeit von ?', solution: 'einem zusammengesetzten Schlüssel / Nicht-Schlüsselattributen vom Teil des Schlüssels' },
  { category: 'Datenbanken', prompt: 'ER-Modell: Rechteck steht oft für ?', solution: 'Entitätstyp / Entity' },
  { category: 'Datenbanken', prompt: 'Redundanz in Tabellen: typischer Nachteil?', solution: 'Update-/Insert-/Delete-Anomalien' },
  { category: 'Datenbanken', prompt: 'Stored Procedure: wo wird sie ausgeführt?', solution: 'auf dem Datenbankserver' },
  { category: 'Datenbanken', prompt: 'SQLite typischerweise: eingebettete Datei oder separater Server-Prozess?', solution: 'eingebettete Bibliothek/Datei (kein eigener Server nötig)' },
  { category: 'Datenbanken', prompt: 'UPDATE-SQL: was macht es?', solution: 'ändert Werte bestehender Zeilen' },
];

/** Inf 13: genau vier Fachbänder (Computergrafik, Bildverarbeitung, 3D Modellierung, 3D Druck), je mindestens 20 Fragen; zusätzlich „Eigen“ im Editor möglich. */
const TASK_POOL_INF_13: EntryTicketTask[] = [
  // Computergrafik
  { category: 'Computergrafik', prompt: 'Pixel vs. Vektor: Welche Darstellung skaliert typischerweise verlustfrei bei Linien und Text?', solution: 'Vektorgrafik' },
  { category: 'Computergrafik', prompt: 'RGB-Farbraum: aus welchen drei Grundfarben setzt sich additive Mischung grob zusammen?', solution: 'Rot, Grün, Blau' },
  { category: 'Computergrafik', prompt: 'Auflösung 1920×1080: was bedeutet die erste Zahl grob?', solution: 'Breite in Pixeln (volle HD quer)' },
  { category: 'Computergrafik', prompt: 'Aliasing bei schrägen Kanten: welcher Effekt entsteht oft stufenförmig?', solution: 'Treppchen / Treppenartifact (Jaggies)' },
  { category: 'Computergrafik', prompt: 'Anti-Aliasing: welches Ziel verfolgt es typischerweise?', solution: 'Kanten weicher/ glatter darstellen, Stufen reduzieren' },
  { category: 'Computergrafik', prompt: 'GPU vs. CPU in der Echtzeitgrafik: wofür wird die GPU typischerweise genutzt?', solution: 'parallelisierte Geometrie- und Pixelberechnung (Rendern)' },
  { category: 'Computergrafik', prompt: 'Framebuffer: was enthält er grob?', solution: 'Farbwerte der darzustellenden Pixel (Bildpuffer)' },
  { category: 'Computergrafik', prompt: 'Doppel-Pufferung (Double Buffering): wozu dient sie grob?', solution: 'Flackern vermeiden; ein Puffer wird gefüllt, der andere angezeigt' },
  { category: 'Computergrafik', prompt: 'Rasterisierung vs. Raytracing (vereinfacht): Was berechnet typischerweise Strahl-Schnitte mit Objekten?', solution: 'Raytracing' },
  { category: 'Computergrafik', prompt: 'Z-Buffer (Tiefenpuffer): welche Information speichert er pro Pixel oft?', solution: 'Tiefenwert / Distanz zur Kamera' },
  { category: 'Computergrafik', prompt: 'Textur-Mapping: was wird typischerweise auf eine 3D-Oberfläche gelegt?', solution: 'ein 2D-Bild (Textur) auf UV-Koordinaten' },
  { category: 'Computergrafik', prompt: 'Beleuchtungsmodell (z. B. Phong): „Specular“ beschreibt grob welchen Anteil?', solution: 'Glanzlicht / spiegelnde Reflexion' },
  { category: 'Computergrafik', prompt: 'Bezier-Kurve: wofür werden Kontrollpunkte genutzt?', solution: 'Kurvenform steuern, ohne alle Punkte auf der Kurve zu legen' },
  { category: 'Computergrafik', prompt: 'SVG ist typischerweise welcher Grafiktyp?', solution: 'Vektorgrafik (XML-basiert)' },
  { category: 'Computergrafik', prompt: 'Alpha-Kanal in RGBA: wofür steht er grob?', solution: 'Transparenz / Deckkraft' },
  { category: 'Computergrafik', prompt: 'Viewport-Transformation: welche Aufgabe hat sie grob?', solution: '3D/NDC in Bildschirm-/Pixelkoordinaten überführen' },
  { category: 'Computergrafik', prompt: 'Clipping in der Grafikpipeline: was wird typischerweise abgeschnitten?', solution: 'Geometrie außerhalb des sichtbaren Bereichs (Frustum)' },
  { category: 'Computergrafik', prompt: 'LOD (Level of Detail): welches Ziel verfolgt man mit vereinfachten Meshes?', solution: 'Rechenzeit sparen bei kleiner Darstellung / Entfernung' },
  { category: 'Computergrafik', prompt: 'Normalenvektor auf einer Oberfläche: wofür wird er typischerweise genutzt?', solution: 'Beleuchtung, Orientierung der Fläche' },
  { category: 'Computergrafik', prompt: 'Gamma-Korrektur: welches Problem adressiert sie grob?', solution: 'lichtlinear vs. wahrgenommene Helligkeit (nichtlineare Kodierung)' },
  // Bildverarbeitung
  { category: 'Bildverarbeitung', prompt: 'Histogramm eines Grauwertbildes: was wird auf der x-Achse typischerweise abgetragen?', solution: 'Intensitätswert / Grauwert' },
  { category: 'Bildverarbeitung', prompt: 'Faltung (Convolution): wozu dient eine Kernel-Matrix grob?', solution: 'Nachbarschaft gewichten (Filter: Glätten, Kanten, …)' },
  { category: 'Bildverarbeitung', prompt: 'Gauss-Filter: typischer Effekt auf Rauschen und Kanten?', solution: 'Glättung / Weichzeichnen' },
  { category: 'Bildverarbeitung', prompt: 'Median-Filter: womit geht er typischerweise besser um als der Mittelwert bei „Salt-and-Pepper“-Rauschen?', solution: 'Ausreißer / isolierte Pixel' },
  { category: 'Bildverarbeitung', prompt: 'Sobel-Operator: welche Bildstruktur hebt er typischerweise hervor?', solution: 'Kanten / Intensitätsgradienten' },
  { category: 'Bildverarbeitung', prompt: 'Schwellwertverfahren (Thresholding): Segmentierung in Vorder- und Hintergrund nach ?', solution: 'Grauwert über/unter Grenzwert' },
  { category: 'Bildverarbeitung', prompt: 'Morphologische Operation „Erosion“ auf Binärbildern: typischer Effekt?', solution: 'helle Objekte schrumpfen / Grenzen nach innen' },
  { category: 'Bildverarbeitung', prompt: 'Morphologische „Dilation“: typischer Effekt auf helle Bereiche?', solution: 'Regionen wachsen / werden breiter' },
  { category: 'Bildverarbeitung', prompt: 'JPEG: verlustbehaftet oder verlustfrei typischerweise?', solution: 'verlustbehaftet (für Fotos üblich)' },
  { category: 'Bildverarbeitung', prompt: 'PNG vs. JPEG für Screenshots mit scharfen Kanten: welches Format oft besser?', solution: 'PNG (verlustfrei, harte Kanten)' },
  { category: 'Bildverarbeitung', prompt: 'Abtasttheorem (Nyquist): Sampling muss typischerweise mindestens wie hoch zur höchsten Frequenz sein?', solution: 'mindestens doppelt so hoch (über der Nyquist-Rate)' },
  { category: 'Bildverarbeitung', prompt: 'Aliasing beim Herunterskalieren: welche Vorverarbeitung reduziert es oft?', solution: 'Tiefpass / Prefiltering vor Unterabtastung' },
  { category: 'Bildverarbeitung', prompt: 'Bilineare Interpolation: wofür wird sie bei Bildern oft genutzt?', solution: 'Zwischenwerte zwischen vier Nachbarpixeln (Skalierung/Rotation)' },
  { category: 'Bildverarbeitung', prompt: 'Farbraum HSV: wofür steht „S“ grob?', solution: 'Sättigung (Saturation)' },
  { category: 'Bildverarbeitung', prompt: 'Segmentierung: was ist das Ziel in einem Satz?', solution: 'Bild in sinnvolle Regionen/Objekte zerlegen' },
  { category: 'Bildverarbeitung', prompt: 'Integrales Bild (Summed-area table): wofür nutzt man es oft?', solution: 'schnelle Rechteck-Summen / Box-Filter' },
  { category: 'Bildverarbeitung', prompt: 'Kontrastspreizung über Histogramm: was wird typischerweise genutzt?', solution: 'Grauwerte linear/nichtlinear auf größeren Wertebereich strecken' },
  { category: 'Bildverarbeitung', prompt: 'Rauschmodell „additivem Gauß-Rauschen“: wie wirkt es auf das Pixel grob?', solution: 'Zufälliger Offset zum Intensitätswert' },
  { category: 'Bildverarbeitung', prompt: 'Canny-Kantendetektor (grob): welche Schritte gehören typisch dazu?', solution: 'Glätten, Gradient, Non-Maximum-Suppression, Schwellwerte' },
  { category: 'Bildverarbeitung', prompt: 'Superresolution (KI-basiert): welches Ziel verfolgt sie grob?', solution: 'höhere Auflösung / feinere Details aus mehreren oder einem Bild schätzen' },
  // 3D Modellierung
  { category: '3D Modellierung', prompt: 'Mesh (Polygonnetz): aus welchen Elementen besteht es typischerweise?', solution: 'Vertices, Kanten, meist Dreiecke oder Vierecke (Faces)' },
  { category: '3D Modellierung', prompt: 'Normalen pro Vertex vs. pro Face: wozu dienen glatte Normalen oft?', solution: 'weichere Schattierung ohne mehr Geometrie' },
  { category: '3D Modellierung', prompt: 'UV-Unwrapping: was wird „ausgebreitet“?', solution: 'Oberfläche in 2D-Koordinaten für Texturen (UV-Karte)' },
  { category: '3D Modellierung', prompt: 'Subdivision Surface: was passiert typischerweise iterativ?', solution: 'Mesh wird verfeinert, Form wird geglättet (Kanten zu runden Flächen)' },
  { category: '3D Modellierung', prompt: 'NURBS vs. Polygon-Mesh (grob): womit arbeitet NURBS oft?', solution: 'parametrische Kurven/Flächen (mathematisch glatt)' },
  { category: '3D Modellierung', prompt: 'Boolean Operation (Union/Differenz) im Modellieren: wozu dient sie?', solution: 'Objekte kombinieren oder aus einander ausstanzen' },
  { category: '3D Modellierung', prompt: 'Extrusion eines 2D-Profils: welchen Effekt erzeugt man typischerweise?', solution: 'Profil entlang einer Richtung zu 3D-Volumen ausziehen' },
  { category: '3D Modellierung', prompt: 'Low-Poly vs. High-Poly: welches Mesh ist typischerweise für Echtzeit-Spiele oft präferiert?', solution: 'Low-Poly (weniger Polygone, schneller)' },
  { category: '3D Modellierung', prompt: 'Retopology: wozu baut man ein neues Mesh typischerweise mit sauberer Kantenschleife?', solution: 'Topologie für Animation/Spiele optimieren nach High-Poly-Sculpt' },
  { category: '3D Modellierung', prompt: 'Rigging: was bereitet man am Modell typischerweise vor?', solution: 'Knochen/Skelett und Gewichte für Animation' },
  { category: '3D Modellierung', prompt: 'Keyframe-Animation: was speichert ein Keyframe grob?', solution: 'Pose/Zustand zu einem bestimmten Zeitpunkt' },
  { category: '3D Modellierung', prompt: 'Material vs. Textur (grob): was beschreibt das Material zusätzlich zur Farbtex oft?', solution: 'Glänzendkeit, Metall, Beleuchtungsmodell-Parameter' },
  { category: '3D Modellierung', prompt: 'Displacement vs. Normal Mapping: welches verändert typischerweise echte Geometrie?', solution: 'Displacement (verschiebt Vertices); Normal Map täuscht nur Licht' },
  { category: '3D Modellierung', prompt: 'Scene Graph: wozu dient er grob?', solution: 'Hierarchie von Objekten (Transformationen, Gruppen)' },
  { category: '3D Modellierung', prompt: 'Kollisions-Mesh oft einfacher als Render-Mesh: warum?', solution: 'Physik schneller/ stabiler; sichtbare Details unnötig' },
  { category: '3D Modellierung', prompt: 'Quad-Topologie bei Charakteren: welchen Vorteil haben Vierecke oft für Deformation?', solution: 'gleichmäßigere Verzerrung beim Biegen als Dreiecks-Wildwuchs' },
  { category: '3D Modellierung', prompt: 'Sculpting vs. klassisches Box-Modeling (grob): Sculpting betont typischerweise ?', solution: 'organische Formen durch „kneten“ mit vielen Polygonen' },
  { category: '3D Modellierung', prompt: 'Instancing: mehrere identische Objekte in der Szene: was spart man typischerweise?', solution: 'Speicher und Verwaltung (eine Geometrie, viele Transformationen)' },
  { category: '3D Modellierung', prompt: 'Einheiten in der 3D-Szene (m/cm): warum sind konsistente Maße wichtig für Druck/Export?', solution: 'Export und physische Größe (z. B. STL) müssen passen' },
  { category: '3D Modellierung', prompt: 'Non-manifold Geometrie: warum problematisch für 3D-Druck oft?', solution: 'kein eindeutiges Volumen / Löcher oder mehrfache Flächen an Kanten' },
  // 3D Druck
  { category: '3D Druck', prompt: 'FDM (Fused Deposition Modeling): wie entsteht das Teil typischerweise?', solution: 'Kunststofffilament schichtweise extrudiert und abgekühlt' },
  { category: '3D Druck', prompt: 'SLA (Stereolithografie): womit wird typischerweise gehärtet?', solution: 'lichtempfindliches Harz (UV-Laser oder Display)' },
  { category: '3D Druck', prompt: 'Slicer: welche Aufgabe hat er?', solution: '3D-Modell in Schichten und Druckerbefehle (z. B. G-Code) zerlegen' },
  { category: '3D Druck', prompt: 'Layer Height (Schichthöhe): kleinere Werte bedeuten typischerweise?', solution: 'feinere Oberfläche, aber längere Druckzeit' },
  { category: '3D Druck', prompt: 'Infill (Füllstruktur): wozu dient er grob?', solution: 'Innere Stabilität bei weniger Material und Gewicht' },
  { category: '3D Druck', prompt: 'Support-Strukturen: wann werden sie typischerweise benötigt?', solution: 'bei Überhängen größer als ~45° oder fehlendem Auflagepunkt' },
  { category: '3D Druck', prompt: 'STL-Datei: was beschreibt sie grob?', solution: 'Oberfläche als Dreiecksnetz (ohne Farb/Material pro Standard)' },
  { category: '3D Druck', prompt: 'G-Code: was steuert er?', solution: 'Druckerbewegungen, Temperaturen, Extrusion Zeile für Zeile' },
  { category: '3D Druck', prompt: 'Warping bei ABS: typische Ursache grob?', solution: 'Schwindung durch Abkühlung / Haftung am Bett' },
  { category: '3D Druck', prompt: 'PLA vs. ABS (grob): welches Material oft einfacher für Einsteiger und geringere Verzug-Neigung?', solution: 'PLA (oft), ABS schwerer wegen Temperatur/Verzug' },
  { category: '3D Druck', prompt: 'Betreibtemperatur der Druckplatte: wozu dient sie oft?', solution: 'Haftung verbessern, Verzug reduzieren' },
  { category: '3D Druck', prompt: 'Brim vs. Raft: welches ist typischerweise eine dünne Randfläche um die erste Schicht?', solution: 'Brim' },
  { category: '3D Druck', prompt: 'Nozzle-Durchmesser (z. B. 0,4 mm): welchen Einfluss hat größerer Durchmesser grob?', solution: 'dickere Wände/Schneller, weniger feine Details' },
  { category: '3D Druck', prompt: 'Overhang ohne Support: bis zu welchem Winkel wird oft als „noch druckbar“ grob genannt?', solution: 'ca. 45° (druckerabhängig)' },
  { category: '3D Druck', prompt: 'Post-Processing bei SLA: was ist typischerweise nötig?', solution: 'Harzreste entfernen, UV-Nachhärten, ggf. stützen entfernen' },
  { category: '3D Druck', prompt: 'Wandstärke (Shell) zu dünn: typisches Problem?', solution: 'Bruch / undichte Teile (nicht druckbar oder fragil)' },
  { category: '3D Druck', prompt: 'Maßhaltigkeit/Toleranz: warum sind Spielpassungen im CAD oft größer als nominell?', solution: 'Materialexpansion und Druckerungenauigkeit ausgleichen' },
  { category: '3D Druck', prompt: 'Mehrfarbig-FDM mit einem Extruder (grob): wie erreicht man Farbwechsel oft?', solution: 'Filamentwechsel / Pause oder spezieller Mischer (Standard: ein Extruder = oft einfarbig pro Layer)' },
  { category: '3D Druck', prompt: 'Orientierung auf dem Bett: warum kann eine andere Drehung Stärke und Stützbedarf ändern?', solution: 'Last entlang der Schichten vs. dagegen; Überhänge ändern sich' },
  { category: '3D Druck', prompt: 'Hohlkörper mit einer Öffnung: was muss typischerweise erfüllt sein beim FDM?', solution: 'kein eingeschlossenes Hohlraum ohne Entlüftung / Zugriff (sonst Überdruck)' },
];

/** v2: Inf 11/12/13 behalten Fachkategorien beim Auffüllen (inflateInf11/12/13PerBand) */
const QUESTION_SET_STORAGE_KEY = 'entry-ticket-question-sets-v2';

function randomTaskSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] ?? Date.now()) >>> 0;
  }
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

function parseEntryTicketSearch(search: string): {
  grade: EntryBand;
  customSetId: string | null;
  lessonPath: string | null;
  autostart: boolean;
  /** Fragenset-Editor direkt öffnen (Bearbeitung, kein Play). */
  openEditor: boolean;
  /** SuS: abgeschlossenes Ticket inkl. Lösungen ansehen */
  review: boolean;
  groupId: string | null;
  heroImageIndex: number | null;
  taskSeed: number | null;
  /** true, wenn grade/set in der URL gesetzt ist (nicht nur Default 7). */
  hasExplicitBand: boolean;
} {
  const params = new URLSearchParams(search);
  const rawG = params.get('grade') || params.get('set');
  let grade: EntryBand = 7;
  let customSetId: string | null = null;
  const hasExplicitBand = Boolean(rawG && String(rawG).trim());
  if (isCustomEntryTicketSetId(rawG)) {
    customSetId = rawG;
  } else if (rawG === 'inf11' || rawG === 'inf12' || rawG === 'inf13') {
    grade = rawG;
  } else {
    const gradeParam = Number(rawG);
    grade =
      Number.isFinite(gradeParam) && gradeParam >= 5 && gradeParam <= 13
        ? (gradeParam as GradeNum)
        : 7;
  }
  const rawLesson = params.get('lessonPath') || params.get('lesson');
  const lessonPath = rawLesson && rawLesson.trim() ? rawLesson.trim().replace(/\\/g, '/') : null;
  const autostart =
    params.get('autostart') === '1' ||
    params.get('autostart') === 'true' ||
    params.get('start') === '1';
  const openEditor =
    params.get('edit') === '1' ||
    params.get('edit') === 'true' ||
    params.get('editor') === '1';
  const review =
    params.get('review') === '1' ||
    params.get('review') === 'true' ||
    params.get('solutions') === '1';
  const rawGid = params.get('groupId') || params.get('learningGroupId');
  const groupId = rawGid && rawGid.trim() ? rawGid.trim() : null;
  const heroRaw = Number(params.get('hero') ?? params.get('heroImageIndex'));
  const heroImageIndex =
    Number.isFinite(heroRaw) && heroRaw >= 0 && heroRaw <= 9 ? Math.floor(heroRaw) : null;
  const seedRaw = Number(params.get('seed') ?? params.get('taskSeed'));
  const taskSeed = Number.isFinite(seedRaw) ? (Math.floor(seedRaw) >>> 0) : null;
  return {
    grade,
    customSetId,
    lessonPath,
    autostart,
    openEditor,
    review,
    groupId,
    heroImageIndex,
    taskSeed,
    hasExplicitBand,
  };
}

const PRESENTATION_RETURN_PLAN_MODES = new Set(['create', 'run', 'background']);

function sanitizePresentationReturnSearch(url: URL, lessonPath: string): string {
  const safe = new URLSearchParams();
  safe.set('lessonPath', lessonPath);
  const gid = url.searchParams.get('groupId');
  if (gid?.trim()) safe.set('groupId', gid.trim());
  const planMode = url.searchParams.get('planMode');
  if (planMode && PRESENTATION_RETURN_PLAN_MODES.has(planMode)) {
    safe.set('planMode', planMode);
  }
  const variant = url.searchParams.get('variant');
  if (variant === 'original' || variant === 'edited') safe.set('variant', variant);
  const named = url.searchParams.get('named');
  if (named?.trim()) safe.set('named', named.trim());
  return safe.toString();
}

/** Gleiche Origin + sichere Rückwege (Stunde, Present-Play oder Präsentations-Editor). */
function parseSafeStundeReturnTo(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('returnTo');
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const lp = url.searchParams.get('lessonPath');
    if (!lp?.trim()) return null;

    if (url.pathname === '/teacher/stunde') {
      const gid = url.searchParams.get('groupId');
      if (!gid?.trim()) return null;
      const pm = url.searchParams.get('planMode');
      if (pm !== null && pm !== 'create' && pm !== 'run' && pm !== 'background') {
        url.searchParams.delete('planMode');
      }
      return `${url.pathname}${url.search}`;
    }

    if (url.pathname === '/presentation/present') {
      return `/presentation/present?${sanitizePresentationReturnSearch(url, lp.trim())}`;
    }

    if (url.pathname === '/presentation/edit') {
      const pm = url.searchParams.get('planMode');
      if (pm !== null && pm !== 'create' && pm !== 'run' && pm !== 'background') {
        url.searchParams.delete('planMode');
      }
      // Nur erlaubte Query-Keys behalten
      const safe = new URLSearchParams();
      safe.set('lessonPath', lp.trim());
      const gid = url.searchParams.get('groupId');
      if (gid?.trim()) safe.set('groupId', gid.trim());
      const planMode = url.searchParams.get('planMode');
      if (planMode === 'create' || planMode === 'run' || planMode === 'background') {
        safe.set('planMode', planMode);
      }
      return `/presentation/edit?${safe.toString()}`;
    }

    return null;
  } catch {
    return null;
  }
}

/** Snapshot fürs Server-Signal — ohne Lehrer-Notizen (die gehören nicht in den Play-Modus). */
function snapshotCustomSetForSignal(set: EntryTicketCustomSet | null | undefined) {
  if (!set) return undefined;
  return {
    id: set.id,
    name: set.name,
    lessons: set.lessons.map((l) => ({
      id: l.id,
      lessonName: l.lessonName,
      ...(l.lessonKey ? { lessonKey: l.lessonKey } : {}),
      ...(l.topicName ? { topicName: l.topicName } : {}),
      tasks: l.tasks.map((t) => ({
        category: t.category,
        prompt: t.prompt,
        solution: t.solution,
      })),
    })),
  };
}

function hydrateCustomSetFromSignal(raw: unknown): EntryTicketCustomSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  if (!isCustomEntryTicketSetId(id)) return null;
  const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Fragenset';
  const lessonsRaw = Array.isArray(row.lessons) ? row.lessons : [];
  const lessons = lessonsRaw
    .map((lessonRaw, idx) => {
      if (!lessonRaw || typeof lessonRaw !== 'object') return null;
      const lesson = lessonRaw as Record<string, unknown>;
      const lessonName =
        typeof lesson.lessonName === 'string' && lesson.lessonName.trim()
          ? lesson.lessonName.trim()
          : '';
      if (!lessonName) return null;
      const tasksRaw = Array.isArray(lesson.tasks) ? lesson.tasks : [];
      const tasks = tasksRaw
        .map((taskRaw, tIdx) => {
          if (!taskRaw || typeof taskRaw !== 'object') return null;
          const t = taskRaw as Record<string, unknown>;
          const prompt = typeof t.prompt === 'string' ? t.prompt : '';
          const solution = typeof t.solution === 'string' ? t.solution : '';
          if (!prompt || !solution) return null;
          return {
            id: `shared_q_${idx}_${tIdx}`,
            category: typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Eigen',
            prompt,
            solution,
          };
        })
        .filter(Boolean) as EntryTicketCustomSet['lessons'][number]['tasks'];
      return {
        id: typeof lesson.id === 'string' && lesson.id ? lesson.id : `shared_ls_${idx}`,
        lessonName,
        lessonKey: typeof lesson.lessonKey === 'string' ? lesson.lessonKey : undefined,
        topicName: typeof lesson.topicName === 'string' ? lesson.topicName : undefined,
        tasks,
      };
    })
    .filter(Boolean) as EntryTicketCustomSet['lessons'];
  if (lessons.length === 0) return null;
  const notes =
    typeof row.notes === 'string' && row.notes.trim()
      ? row.notes.replace(/\r\n/g, '\n').slice(0, 4000)
      : undefined;
  const reihePath =
    typeof row.reihePath === 'string' && row.reihePath.trim()
      ? row.reihePath.trim().replace(/\\/g, '/')
      : undefined;
  return {
    id,
    name,
    lessons,
    ...(reihePath ? { reihePath } : {}),
    ...(notes ? { notes } : {}),
  };
}

function mergeHydratedCustomSet(
  prev: EntryTicketCustomSet[],
  hydrated: EntryTicketCustomSet,
): EntryTicketCustomSet[] {
  const existing = prev.find((s) => s.id === hydrated.id);
  const merged: EntryTicketCustomSet = {
    ...hydrated,
    reihePath: hydrated.reihePath || existing?.reihePath,
    notes: hydrated.notes ?? existing?.notes,
  };
  return [...prev.filter((s) => s.id !== hydrated.id), merged];
}

const DEFAULT_QUESTION_SETS: GradeQuestionSets = {
  5: TASK_POOL_5,
  6: TASK_POOL_6,
  7: ENTRY_TICKET_TASK_POOL,
  8: ENTRY_TICKET_TASK_POOL,
  9: TASK_POOL_9,
  10: TASK_POOL_10,
  11: TASK_POOL_11,
  12: TASK_POOL_12,
  13: TASK_POOL_13,
  inf11: TASK_POOL_INF_11,
  inf12: TASK_POOL_INF_12,
  inf13: TASK_POOL_INF_13,
};

const INF11_CATEGORY_MARKERS = new Set([
  'Allgemein',
  'Java',
  'OO',
  'Technische Informatik',
  'Digitaltechnik',
  'KI',
]);

/**
 * Ersetzt alte Inf-11-Speicherstände durch den aktuellen Standard.
 * Früher war inf11 = Mathe-11-Pool (Prozent, Bruch, …) oder „Inf · …“ – ohne die neuen Band-Kategorien.
 * Kategorien „Inf · …“ gehören nicht zu Inf 11 (sechs Fachbänder) und werden aus dem gespeicherten Satz entfernt.
 * Nur wenn danach noch Marker-Kategorien oder „Eigen“-Fragen übrig sind, bleibt der Rest erhalten.
 */
function mergeInf11FromStorage(stored: EntryTicketTask[] | undefined): EntryTicketTask[] {
  if (stored === undefined || stored.length === 0) return DEFAULT_QUESTION_SETS.inf11;
  const migrated = stored.map((q) =>
    q.category === 'Theoretische Informatik' ? { ...q, category: 'Technische Informatik' } : q,
  );
  const cleaned = migrated.filter((q) => !q.category.startsWith('Inf ·'));
  const usesNewInf11Curriculum = cleaned.some(
    (q) => INF11_CATEGORY_MARKERS.has(q.category) || coarseCategoryForTask(q.category) === 'Eigen',
  );
  if (usesNewInf11Curriculum) return cleaned;
  return DEFAULT_QUESTION_SETS.inf11;
}

const coarseCategoryForTask = (category: string): CoarseCategory => {
  const c = category.toLowerCase();
  if (c.includes('eigen')) return 'Eigen';
  if (c.includes('wahr')) return 'Wahr/Falsch';
  if (c.includes('bruch') || c.includes('dezimal') || c.includes('prozent')) return 'Bruch/Dezimal/Prozent';
  if (c.includes('umfang') || c.includes('fläche') || c.includes('einheit') || c.includes('geometr')) return 'Geometrie/Einheiten';
  if (c.includes('alltag') || c.includes('geld') || c.includes('zeit') || c.includes('regal') || c.includes('supermarkt') || c.includes('kombi')) return 'Zeit/Geld/Alltag';
  if (c.includes('logik') || c.includes('muster') || c.includes('reihenfolge')) return 'Logik/Muster';
  return 'Grundrechenarten';
};

const inflateSetToFiftyPerCategory = (list: EntryTicketTask[]): EntryTicketTask[] => {
  const next = [...list];
  const categories: CoarseCategory[] = [
    'Grundrechenarten',
    'Bruch/Dezimal/Prozent',
    'Geometrie/Einheiten',
    'Zeit/Geld/Alltag',
    'Logik/Muster',
    'Wahr/Falsch',
  ];
  for (const cat of categories) {
    const inCat = next.filter((q) => coarseCategoryForTask(q.category) === cat);
    if (inCat.length === 0) continue;
    let i = 0;
    while (next.filter((q) => coarseCategoryForTask(q.category) === cat).length < 50) {
      const template = inCat[i % inCat.length];
      next.push({ ...template, category: cat });
      i += 1;
    }
  }
  return next;
};

/** Inf 11: Kategorien Allgemein … KI beibehalten, pro Band auf 50 Aufgaben auffüllen (nicht Mathe-Grobkategorien). */
const INF11_BAND_ORDER: readonly string[] = [
  'Allgemein',
  'Java',
  'OO',
  'Technische Informatik',
  'Digitaltechnik',
  'KI',
];

function inflateInf11PerBand(list: EntryTicketTask[]): EntryTicketTask[] {
  const next = [...list];
  for (const band of INF11_BAND_ORDER) {
    const inBand = next.filter((q) => q.category === band);
    if (inBand.length === 0) continue;
    let i = 0;
    while (next.filter((q) => q.category === band).length < 50) {
      const template = inBand[i % inBand.length];
      next.push({ ...template, category: band });
      i += 1;
    }
  }
  return next;
}

/** Inf 12: Allgemein + sieben Fachbänder, pro Band auf 50 auffüllen (nicht Mathe-Grobkategorien). */
const INF12_BAND_ORDER: readonly string[] = [
  'Allgemein',
  'Python',
  'Programmiergrundlagen',
  'Algorithmen',
  'Darstellung von Algorithmen',
  'Netzwerke',
  'Internet und Kommunikation',
  'Datenbanken',
];

const INF12_CATEGORY_MARKERS = new Set<string>(INF12_BAND_ORDER);

function mergeInf12FromStorage(stored: EntryTicketTask[] | undefined): EntryTicketTask[] {
  if (stored === undefined || stored.length === 0) return DEFAULT_QUESTION_SETS.inf12;
  const allowedInf12Category = (cat: string) =>
    INF12_CATEGORY_MARKERS.has(cat) || coarseCategoryForTask(cat) === 'Eigen';
  const cleaned = stored.filter((q) => allowedInf12Category(q.category));
  if (cleaned.length === 0) return DEFAULT_QUESTION_SETS.inf12;
  const markerQs = cleaned.filter((q) => INF12_CATEGORY_MARKERS.has(q.category));
  const eigenQs = cleaned.filter((q) => coarseCategoryForTask(q.category) === 'Eigen');
  /** Wenn nach Migration/Editor-Bug keine Marker-Fragen mehr übrig sind, Standardpool wiederherstellen („Eigen“ behalten). */
  const baseMarkers = markerQs.length > 0 ? markerQs : DEFAULT_QUESTION_SETS.inf12;
  return [...baseMarkers, ...eigenQs];
}

function inflateInf12PerBand(list: EntryTicketTask[]): EntryTicketTask[] {
  const next = [...list];
  for (const band of INF12_BAND_ORDER) {
    const inBand = next.filter((q) => q.category === band);
    if (inBand.length === 0) continue;
    let i = 0;
    while (next.filter((q) => q.category === band).length < 50) {
      const template = inBand[i % inBand.length];
      next.push({ ...template, category: band });
      i += 1;
    }
  }
  return next;
}

/** Inf 13: vier Fachbänder, pro Band auf 50 auffüllen (wie Inf 12, ohne Mathe-Grobkategorien). */
const INF13_BAND_ORDER: readonly string[] = [
  'Computergrafik',
  'Bildverarbeitung',
  '3D Modellierung',
  '3D Druck',
];

const INF13_CATEGORY_MARKERS = new Set<string>(INF13_BAND_ORDER);

function mergeInf13FromStorage(stored: EntryTicketTask[] | undefined): EntryTicketTask[] {
  if (stored === undefined || stored.length === 0) return DEFAULT_QUESTION_SETS.inf13;
  const allowedInf13Category = (cat: string) =>
    INF13_CATEGORY_MARKERS.has(cat) || coarseCategoryForTask(cat) === 'Eigen';
  const cleaned = stored.filter((q) => allowedInf13Category(q.category));
  if (cleaned.length === 0) return DEFAULT_QUESTION_SETS.inf13;
  const markerQs = cleaned.filter((q) => INF13_CATEGORY_MARKERS.has(q.category));
  const eigenQs = cleaned.filter((q) => coarseCategoryForTask(q.category) === 'Eigen');
  const baseMarkers = markerQs.length > 0 ? markerQs : DEFAULT_QUESTION_SETS.inf13;
  return [...baseMarkers, ...eigenQs];
}

function inflateInf13PerBand(list: EntryTicketTask[]): EntryTicketTask[] {
  const next = [...list];
  for (const band of INF13_BAND_ORDER) {
    const inBand = next.filter((q) => q.category === band);
    if (inBand.length === 0) continue;
    let i = 0;
    while (next.filter((q) => q.category === band).length < 50) {
      const template = inBand[i % inBand.length];
      next.push({ ...template, category: band });
      i += 1;
    }
  }
  return next;
}

const INF12_EDITOR_VISUALS: Record<string, { icon: string; bg: string; fg: string; border: string }> = {
  Allgemein: { icon: '📋', bg: '#e3f2fd', fg: '#0d47a1', border: '#90caf9' },
  Python: { icon: '🐍', bg: '#e8f5e9', fg: '#1b5e20', border: '#66bb6a' },
  Programmiergrundlagen: { icon: '⚙️', bg: '#eceff1', fg: '#37474f', border: '#90a4ae' },
  Algorithmen: { icon: '📶', bg: '#fff8e1', fg: '#f57f17', border: '#ffca28' },
  'Darstellung von Algorithmen': { icon: '📐', bg: '#f3e5f5', fg: '#6a1b9a', border: '#ba68c8' },
  Netzwerke: { icon: '🔌', bg: '#e1f5fe', fg: '#01579b', border: '#4fc3f7' },
  'Internet und Kommunikation': { icon: '🌐', bg: '#e8eaf6', fg: '#283593', border: '#7986cb' },
  Datenbanken: { icon: '🗄️', bg: '#fce4ec', fg: '#880e4f', border: '#f06292' },
};

const INF13_EDITOR_VISUALS: Record<string, { icon: string; bg: string; fg: string; border: string }> = {
  Computergrafik: { icon: '🖼️', bg: '#e8eaf6', fg: '#311b92', border: '#7986cb' },
  Bildverarbeitung: { icon: '🔍', bg: '#e0f2f1', fg: '#004d40', border: '#4db6ac' },
  '3D Modellierung': { icon: '🧊', bg: '#fff3e0', fg: '#e65100', border: '#ffb74d' },
  '3D Druck': { icon: '🖨️', bg: '#fce4ec', fg: '#880e4f', border: '#f06292' },
};

function categoryForFragensetSave(grade: EntryBand, rawCat: string, isCustomSet = false): string {
  const t = rawCat.trim() || 'Zeit/Geld/Alltag';
  if (isCustomSet) {
    return t || 'Eigen';
  }
  if (grade === 'inf11') {
    return INF11_CATEGORY_MARKERS.has(t) || coarseCategoryForTask(t) === 'Eigen' ? t : coarseCategoryForTask(t);
  }
  if (grade === 'inf12') {
    return INF12_CATEGORY_MARKERS.has(t) || coarseCategoryForTask(t) === 'Eigen' ? t : coarseCategoryForTask(t);
  }
  if (grade === 'inf13') {
    return INF13_CATEGORY_MARKERS.has(t) || coarseCategoryForTask(t) === 'Eigen' ? t : coarseCategoryForTask(t);
  }
  return coarseCategoryForTask(t);
}

/** Farben für Fragenset-Gruppen unter Inf 11 (Fachkategorien) */
const INF11_EDITOR_VISUALS: Record<string, { icon: string; bg: string; fg: string; border: string }> = {
  Allgemein: { icon: '📋', bg: '#e3f2fd', fg: '#0d47a1', border: '#90caf9' },
  Java: { icon: '☕', bg: '#fff3e0', fg: '#e65100', border: '#ffcc80' },
  OO: { icon: '🔷', bg: '#e8f5e9', fg: '#2e7d32', border: '#a5d6a7' },
  'Technische Informatik': { icon: '🖥️', bg: '#e8eaf6', fg: '#283593', border: '#9fa8da' },
  Digitaltechnik: { icon: '⚡', bg: '#eceff1', fg: '#37474f', border: '#90a4ae' },
  KI: { icon: '🤖', bg: '#e0f7fa', fg: '#006064', border: '#4dd0e1' },
};

/** Fragenset-Editor: feste Band-Reihenfolge, „Eigen“-Kategorien oben (Inf 11/12/13 je eigen). */
function groupPoolTasksByBandOrder(
  poolForBand: EntryTicketTask[],
  bandOrder: readonly string[],
): Array<{
  category: string;
  items: Array<{ q: EntryTicketTask; idx: number; displayNumber: number }>;
}> {
  const indexed = poolForBand.map((q, idx) => ({ q, idx }));
  const rankInf = (cat: string) => {
    if (coarseCategoryForTask(cat) === 'Eigen') return -1;
    const i = bandOrder.indexOf(cat);
    return i === -1 ? 999 : i;
  };
  indexed.sort((a, b) => {
    const ra = rankInf(a.q.category);
    const rb = rankInf(b.q.category);
    if (ra !== rb) return ra - rb;
    return a.idx - b.idx;
  });
  let displayCounter = 1;
  const withDisplay = indexed.map((item) => {
    const displayNumber = displayCounter;
    displayCounter += 1;
    return { ...item, displayNumber };
  });
  const groups: Array<{
    category: string;
    items: Array<{ q: EntryTicketTask; idx: number; displayNumber: number }>;
  }> = [];
  for (const item of withDisplay) {
    const band = item.q.category;
    const last = groups[groups.length - 1];
    if (!last || last.category !== band) {
      groups.push({ category: band, items: [item] });
    } else {
      last.items.push(item);
    }
  }
  return groups;
}

const dedupeEigenQuestions = (list: EntryTicketTask[]): EntryTicketTask[] => {
  const seen = new Set<string>();
  return list.filter((q) => {
    if (coarseCategoryForTask(q.category) !== 'Eigen') return true;
    const key = q.prompt.trim().toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export type EntryTicketEmbeddedPlay = {
  lessonPath: string;
  groupId?: string;
  onExit: () => void;
};

function embeddedPlaySearch(play: EntryTicketEmbeddedPlay): string {
  const qs = new URLSearchParams();
  const band = resolveEntryTicketBandForLessonPath(play.lessonPath, 7);
  qs.set('grade', String(band));
  qs.set('autostart', '1');
  qs.set('lessonPath', play.lessonPath);
  if (play.groupId) qs.set('groupId', play.groupId);
  return `?${qs.toString()}`;
}

export default function EntryTicketPage({
  embeddedPlay,
}: {
  embeddedPlay?: EntryTicketEmbeddedPlay;
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeSearch = embeddedPlay ? embeddedPlaySearch(embeddedPlay) : location.search;
  const safeStundeReturnTo = useMemo(
    () => (embeddedPlay ? null : parseSafeStundeReturnTo(location.search)),
    [embeddedPlay, location.search],
  );
  const initialRoute =
    typeof window !== 'undefined' || embeddedPlay
      ? parseEntryTicketSearch(routeSearch || (typeof window !== 'undefined' ? window.location.search : '') || '')
      : {
          grade: 7 as EntryBand,
          customSetId: null as string | null,
          lessonPath: null as string | null,
          autostart: false,
          openEditor: false,
          review: false,
          groupId: null as string | null,
          heroImageIndex: null as number | null,
          taskSeed: null as number | null,
          hasExplicitBand: false,
        };
  const [sessionStarted, setSessionStarted] = useState(() => Boolean(initialRoute.review));
  const [grade, setGrade] = useState<EntryBand>(() => initialRoute.grade);
  const [customSetId, setCustomSetId] = useState<string | null>(() => initialRoute.customSetId);
  /** Inhalte (Karten / Editor) erst nach Klick auf ein Set — außer URL/Autostart. */
  const [bandChosen, setBandChosen] = useState(
    () =>
      Boolean(
        initialRoute.hasExplicitBand ||
          initialRoute.customSetId ||
          initialRoute.autostart ||
          initialRoute.review,
      ),
  );
  const [entryLessonPath, setEntryLessonPath] = useState<string | null>(() => initialRoute.lessonPath);
  const [customSets, setCustomSets] = useState<EntryTicketCustomSet[]>(() =>
    typeof window !== 'undefined' ? loadCustomEntryTicketSets() : [],
  );
  const [createSetOpen, setCreateSetOpen] = useState(false);
  const [printFlashcardsOpen, setPrintFlashcardsOpen] = useState(false);
  const [printSource, setPrintSource] = useState<'session' | 'lessons'>('lessons');
  const [printLessonIds, setPrintLessonIds] = useState<string[]>([]);
  const [createSetName, setCreateSetName] = useState('');
  const [createSetBusy, setCreateSetBusy] = useState(false);
  const [createSetError, setCreateSetError] = useState<string | null>(null);
  const [taskSeed, setTaskSeed] = useState(() => initialRoute.taskSeed ?? randomTaskSeed());
  const [showSetEditor, setShowSetEditor] = useState(() => Boolean(initialRoute.openEditor));
  const [questionSets, setQuestionSets] = useState<GradeQuestionSets>(() => {
    try {
      const raw = localStorage.getItem(QUESTION_SET_STORAGE_KEY);
      if (!raw) {
        return {
          5: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[5])),
          6: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[6])),
          7: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[7])),
          8: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[8])),
          9: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[9])),
          10: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[10])),
          11: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[11])),
          12: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[12])),
          13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[13])),
          inf11: dedupeEigenQuestions(inflateInf11PerBand(DEFAULT_QUESTION_SETS.inf11)),
          inf12: dedupeEigenQuestions(inflateInf12PerBand(DEFAULT_QUESTION_SETS.inf12)),
          inf13: dedupeEigenQuestions(inflateInf13PerBand(DEFAULT_QUESTION_SETS.inf13)),
        };
      }
      const parsed = JSON.parse(raw) as Partial<GradeQuestionSets>;
      return {
        5: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[5] ?? DEFAULT_QUESTION_SETS[5])),
        6: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[6] ?? DEFAULT_QUESTION_SETS[6])),
        7: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[7] ?? DEFAULT_QUESTION_SETS[7])),
        8: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[8] ?? DEFAULT_QUESTION_SETS[8])),
        9: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[9] ?? DEFAULT_QUESTION_SETS[9])),
        10: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[10] ?? DEFAULT_QUESTION_SETS[10])),
        11: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[11] ?? DEFAULT_QUESTION_SETS[11])),
        12: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[12] ?? DEFAULT_QUESTION_SETS[12])),
        13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(parsed[13] ?? DEFAULT_QUESTION_SETS[13])),
        inf11: dedupeEigenQuestions(inflateInf11PerBand(mergeInf11FromStorage(parsed.inf11))),
        inf12: dedupeEigenQuestions(inflateInf12PerBand(mergeInf12FromStorage(parsed.inf12))),
        inf13: dedupeEigenQuestions(inflateInf13PerBand(mergeInf13FromStorage(parsed.inf13))),
      };
    } catch {
      return {
        5: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[5])),
        6: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[6])),
        7: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[7])),
        8: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[8])),
        9: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[9])),
        10: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[10])),
        11: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[11])),
        12: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[12])),
        13: dedupeEigenQuestions(inflateSetToFiftyPerCategory(DEFAULT_QUESTION_SETS[13])),
        inf11: dedupeEigenQuestions(inflateInf11PerBand(DEFAULT_QUESTION_SETS.inf11)),
        inf12: dedupeEigenQuestions(inflateInf12PerBand(DEFAULT_QUESTION_SETS.inf12)),
        inf13: dedupeEigenQuestions(inflateInf13PerBand(DEFAULT_QUESTION_SETS.inf13)),
      };
    }
  });
  const [selectedTasks, setSelectedTasks] = useState<EntryTicketTask[]>(
    [],
  );
  const [cardShowCounts, setCardShowCounts] = useState<Record<string, number>>(() =>
    typeof window !== 'undefined' ? loadCardShowCounts() : {},
  );
  const shownInSessionRef = useRef<Set<string>>(new Set());
  const [pickedListIndices, setPickedListIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardSlideDir, setCardSlideDir] = useState<1 | -1>(1);
  const [slideDurationSec, setSlideDurationSec] = useState(() =>
    typeof window !== 'undefined' ? loadSlideDurationSec() : DEFAULT_SLIDE_DURATION_SEC,
  );
  const [durationDraft, setDurationDraft] = useState(() => String(
    typeof window !== 'undefined' ? loadSlideDurationSec() : DEFAULT_SLIDE_DURATION_SEC,
  ));
  const slideDurationSecRef = useRef(slideDurationSec);
  slideDurationSecRef.current = slideDurationSec;
  const [secondsLeft, setSecondsLeft] = useState(() =>
    typeof window !== 'undefined' ? loadSlideDurationSec() : DEFAULT_SLIDE_DURATION_SEC,
  );
  const [solutionDurationSec, setSolutionDurationSec] = useState(() =>
    typeof window !== 'undefined' ? loadSolutionDurationSec() : DEFAULT_SOLUTION_DURATION_SEC,
  );
  const [solutionDurationMinDraft, setSolutionDurationMinDraft] = useState(() =>
    String(Math.max(1, Math.round((typeof window !== 'undefined' ? loadSolutionDurationSec() : DEFAULT_SOLUTION_DURATION_SEC) / 60))),
  );
  const solutionDurationSecRef = useRef(solutionDurationSec);
  solutionDurationSecRef.current = solutionDurationSec;
  const [solutionSecondsLeft, setSolutionSecondsLeft] = useState(() =>
    typeof window !== 'undefined' ? loadSolutionDurationSec() : DEFAULT_SOLUTION_DURATION_SEC,
  );
  const [solutionRunning, setSolutionRunning] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showSolutions, setShowSolutions] = useState(() => Boolean(initialRoute.review));
  const [teacherNotes, setTeacherNotes] = useState('');
  const [sessionDone, setSessionDone] = useState(() => Boolean(initialRoute.review));
  const [completeBusy, setCompleteBusy] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);
  const [doneCelebrate, setDoneCelebrate] = useState(false);
  const doneCelebrateTimerRef = useRef<number | null>(null);
  const [studentReviewMode, setStudentReviewMode] = useState(() => Boolean(initialRoute.review));
  const [studentReviewReady, setStudentReviewReady] = useState(false);
  const [studentReviewError, setStudentReviewError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingSolution, setEditingSolution] = useState('');
  const [setEditIndex, setSetEditIndex] = useState<number | null>(null);
  const [setEditPrompt, setSetEditPrompt] = useState('');
  const [setEditSolution, setSetEditSolution] = useState('');
  const [setEditCategory, setSetEditCategory] = useState('Alltag');
  const [newPrompt, setNewPrompt] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [autoStartPending, setAutoStartPending] = useState(() => initialRoute.autostart);
  const [entryTicketGroupId, setEntryTicketGroupId] = useState<string | null>(() => initialRoute.groupId);
  /** Motiv 0..9 — kommt vom Server (pro neuem Signal / neuer Stunden-Klick neu gewürfelt) */
  const [entryHeroImageIndex, setEntryHeroImageIndex] = useState(
    () => initialRoute.heroImageIndex ?? 0,
  );
  /** Autostart signalisiert sofort in useLayoutEffect; kein zweites Signal beim ersten startSession */
  const skipDuplicateEntrySignalRef = useRef(false);
  /** Schüler-Moderator darf die volle Ticket-Session sehen */
  const [isClassModerator, setIsClassModerator] = useState(false);
  const [moderatorGateChecked, setModeratorGateChecked] = useState(
    () =>
      Boolean(
        (typeof window !== 'undefined' && localStorage.getItem('teacherId')) ||
          initialRoute.review,
      ),
  );
  /** Moderator: Karten kommen vom Lehrer-Signal (nicht aus lokalem Fragenset) */
  const [sharedTasksLocked, setSharedTasksLocked] = useState(false);
  const tasksSyncedRef = useRef('');
  /** Erst nach Server-Sync Fragensets zurückschreiben (leeres localStorage nicht überschreiben). */
  const customSetsServerSyncedRef = useRef(false);

  /** Klassenstufe / eigenes Set aus URL; neuer Zufallssatz bei jedem Aufruf (inkl. &r=… vom Klick auf das Dashboard-Icon). */
  useLayoutEffect(() => {
    if (embeddedPlay) return;
    const {
      grade: g,
      customSetId: cId,
      lessonPath,
      autostart,
      openEditor,
      review,
      groupId,
      heroImageIndex,
      taskSeed: urlSeed,
      hasExplicitBand,
    } = parseEntryTicketSearch(location.search);
    setGrade(g);
    setCustomSetId(cId);
    setBandChosen(Boolean(hasExplicitBand || cId || autostart || openEditor || review));
    setEntryLessonPath(lessonPath);
    setAutoStartPending(review ? false : autostart);
    setEntryTicketGroupId(groupId);
    if (heroImageIndex != null) setEntryHeroImageIndex(heroImageIndex);
    const seedToUse = urlSeed != null ? urlSeed : randomTaskSeed();
    setTaskSeed(seedToUse);
    setSessionStarted(Boolean(review));
    setSessionDone(Boolean(review));
    setCurrentIndex(0);
    setSecondsLeft(slideDurationSecRef.current);
    setIsRunning(false);
    setSolutionRunning(false);
    setSolutionSecondsLeft(solutionDurationSecRef.current);
    setShowSolutions(Boolean(review));
    setShowSetEditor(Boolean(openEditor && !autostart && !review));
    setSharedTasksLocked(Boolean(review));
    setStudentReviewMode(Boolean(review));
    if (!review) {
      setStudentReviewReady(false);
      setStudentReviewError(null);
    }
    tasksSyncedRef.current = '';

    const teacher = Boolean(typeof window !== 'undefined' && localStorage.getItem('teacherId'));
    if (autostart && teacher) {
      skipDuplicateEntrySignalRef.current = true;
      void (async () => {
        try {
          const gradeParam = cId || String(g);
          const localSets = loadCustomEntryTicketSets();
          const activeSet = cId ? localSets.find((s) => s.id === cId) ?? null : null;
          const res = await apiPost('/api/entry-ticket/signal', {
            ...(groupId ? { learningGroupId: groupId } : {}),
            grade: gradeParam,
            taskSeed: seedToUse,
            lessonPath: lessonPath || undefined,
            ...(activeSet ? { customSet: snapshotCustomSetForSignal(activeSet) } : {}),
          });
          if (res.ok) {
            const data = await res.json();
            if (typeof data.heroImageIndex === 'number') setEntryHeroImageIndex(data.heroImageIndex);
          }
        } catch {
          // ignore
        }
      })();
    } else {
      skipDuplicateEntrySignalRef.current = false;
    }
  }, [location.search, embeddedPlay]);

  const isTeacher = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('teacherId')) return true;
    const role = (localStorage.getItem('userRole') || '').toUpperCase();
    return role === 'TEACHER';
  }, []);

  const applyGradeParam = useCallback((raw: string | null | undefined) => {
    if (!raw) return;
    if (isCustomEntryTicketSetId(raw)) {
      setCustomSetId(raw);
      setBandChosen(true);
      return;
    }
    if (raw === 'inf11' || raw === 'inf12' || raw === 'inf13') {
      setCustomSetId(null);
      setGrade(raw);
      setBandChosen(true);
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 5 && n <= 13) {
      setCustomSetId(null);
      setGrade(n as GradeNum);
      setBandChosen(true);
    }
  }, []);

  /** SuS-Review: abgeschlossenes Ticket inkl. Lösungen laden */
  useEffect(() => {
    const route = parseEntryTicketSearch(location.search);
    if (!route.review) {
      setStudentReviewMode(false);
      return;
    }
    if (!route.lessonPath || !route.groupId) {
      setStudentReviewMode(true);
      setStudentReviewError('Entry Ticket nicht gefunden (Stunde/Gruppe fehlt).');
      setStudentReviewReady(true);
      setModeratorGateChecked(true);
      return;
    }
    let cancelled = false;
    setStudentReviewMode(true);
    setStudentReviewError(null);
    setStudentReviewReady(false);
    setModeratorGateChecked(true);
    void (async () => {
      try {
        const qs = new URLSearchParams({
          lessonPath: route.lessonPath!,
          groupId: route.groupId!,
        });
        const res = await apiGet(`/api/entry-ticket/completed?${qs.toString()}`);
        if (!res.ok || cancelled) {
          if (!cancelled) {
            setStudentReviewError('Entry Ticket konnte nicht geladen werden.');
            setStudentReviewReady(true);
          }
          return;
        }
        const data = (await res.json()) as {
          completed?: boolean;
          heroImageIndex?: number | null;
          grade?: string | null;
          taskSeed?: number | null;
          materialLessonPath?: string | null;
          learningGroupId?: string | null;
          tasks?: Array<{ category?: string; prompt?: string; solution?: string }> | null;
          customSet?: unknown;
        };
        if (cancelled) return;
        if (!data.completed || !Array.isArray(data.tasks) || data.tasks.length === 0) {
          setStudentReviewError('Für diese Stunde liegt noch kein erledigtes Entry Ticket vor.');
          setStudentReviewReady(true);
          return;
        }
        const tasks = data.tasks
          .map((t) => ({
            category: typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Eigen',
            prompt: typeof t.prompt === 'string' ? t.prompt : '',
            solution: typeof t.solution === 'string' ? t.solution : '',
          }))
          .filter((t) => t.prompt && t.solution);
        if (tasks.length === 0) {
          setStudentReviewError('Für diese Stunde liegt noch kein erledigtes Entry Ticket vor.');
          setStudentReviewReady(true);
          return;
        }
        const hydrated = hydrateCustomSetFromSignal(data.customSet);
        if (hydrated) {
          setCustomSets((prev) => mergeHydratedCustomSet(prev, hydrated));
          setCustomSetId(hydrated.id);
        } else if (typeof data.grade === 'string' && data.grade) {
          applyGradeParam(data.grade);
        }
        if (typeof data.heroImageIndex === 'number') {
          setEntryHeroImageIndex(data.heroImageIndex);
        }
        if (typeof data.taskSeed === 'number' && Number.isFinite(data.taskSeed)) {
          setTaskSeed(Math.floor(data.taskSeed) >>> 0);
        }
        if (typeof data.materialLessonPath === 'string' && data.materialLessonPath.trim()) {
          setEntryLessonPath(data.materialLessonPath.trim().replace(/\\/g, '/'));
        } else if (route.lessonPath) {
          setEntryLessonPath(route.lessonPath);
        }
        if (typeof data.learningGroupId === 'string' && data.learningGroupId.trim()) {
          setEntryTicketGroupId(data.learningGroupId.trim());
        } else if (route.groupId) {
          setEntryTicketGroupId(route.groupId);
        }
        setSelectedTasks(tasks);
        setSharedTasksLocked(true);
        setBandChosen(true);
        setSessionStarted(true);
        setSessionDone(true);
        setShowSolutions(true);
        setIsRunning(false);
        setStudentReviewReady(true);
      } catch {
        if (!cancelled) {
          setStudentReviewError('Entry Ticket konnte nicht geladen werden.');
          setStudentReviewReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.search, applyGradeParam]);

  /** Nicht-Lehrkräfte: nur Klassen-Moderator darf die volle Ticket-Seite nutzen (außer Review) */
  useEffect(() => {
    if (parseEntryTicketSearch(location.search).review) return;
    if (isTeacher) {
      setModeratorGateChecked(true);
      setIsClassModerator(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet('/api/entry-ticket/current');
        if (!res.ok || cancelled) {
          if (!cancelled) {
            setIsClassModerator(false);
            setModeratorGateChecked(true);
          }
          return;
        }
        const data = (await res.json()) as {
          isModerator?: boolean;
          startedAt?: string | null;
          heroImageIndex?: number | null;
          grade?: string | null;
          taskSeed?: number | null;
          materialLessonPath?: string | null;
          learningGroupId?: string | null;
          tasks?: Array<{ category?: string; prompt?: string; solution?: string; sourceKey?: string }> | null;
          customSet?: unknown;
        };
        if (cancelled) return;
        const mod = data.isModerator === true;
        setIsClassModerator(mod);
        if (typeof data.heroImageIndex === 'number' && data.startedAt) {
          setEntryHeroImageIndex(data.heroImageIndex);
        }
        const hydrated = hydrateCustomSetFromSignal(data.customSet);
        if (hydrated) {
          setCustomSets((prev) => mergeHydratedCustomSet(prev, hydrated));
          setCustomSetId(hydrated.id);
        } else if (typeof data.grade === 'string' && data.grade) {
          applyGradeParam(data.grade);
        }
        if (typeof data.taskSeed === 'number' && Number.isFinite(data.taskSeed)) {
          setTaskSeed(Math.floor(data.taskSeed) >>> 0);
        }
        if (typeof data.materialLessonPath === 'string' && data.materialLessonPath.trim()) {
          setEntryLessonPath(data.materialLessonPath.trim().replace(/\\/g, '/'));
        }
        if (typeof data.learningGroupId === 'string' && data.learningGroupId.trim()) {
          setEntryTicketGroupId(data.learningGroupId.trim());
        }
        const shared = Array.isArray(data.tasks)
          ? data.tasks
              .map((t) => ({
                category: typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Eigen',
                prompt: typeof t.prompt === 'string' ? t.prompt : '',
                solution: typeof t.solution === 'string' ? t.solution : '',
                sourceKey: typeof t.sourceKey === 'string' && t.sourceKey ? t.sourceKey : undefined,
              }))
              .filter((t) => t.prompt && t.solution)
          : [];
        if (shared.length > 0) {
          setSelectedTasks(shared);
          setSharedTasksLocked(true);
          setBandChosen(true);
        } else if (hydrated) {
          // KI-/Reihen-Set vom Server → lokale Auswahl mit gleichem Seed
          setSharedTasksLocked(false);
        }
        if (!mod) {
          navigate('/dashboard', { replace: true });
        }
      } catch {
        if (!cancelled) {
          setIsClassModerator(false);
          navigate('/dashboard', { replace: true });
        }
      } finally {
        if (!cancelled) setModeratorGateChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, navigate, location.search, applyGradeParam]);

  /** Moderator: ggf. nachziehen, falls die Lehrer-Karten erst kurz nach dem Öffnen synchronisiert werden */
  useEffect(() => {
    if (isTeacher || !isClassModerator || sharedTasksLocked) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await apiGet('/api/entry-ticket/current');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          grade?: string | null;
          taskSeed?: number | null;
          materialLessonPath?: string | null;
          tasks?: Array<{ category?: string; prompt?: string; solution?: string; sourceKey?: string }> | null;
          customSet?: unknown;
        };
        const hydrated = hydrateCustomSetFromSignal(data.customSet);
        if (hydrated) {
          setCustomSets((prev) => mergeHydratedCustomSet(prev, hydrated));
          setCustomSetId(hydrated.id);
        } else if (typeof data.grade === 'string' && data.grade) {
          applyGradeParam(data.grade);
        }
        if (typeof data.taskSeed === 'number' && Number.isFinite(data.taskSeed)) {
          setTaskSeed(Math.floor(data.taskSeed) >>> 0);
        }
        if (typeof data.materialLessonPath === 'string' && data.materialLessonPath.trim()) {
          setEntryLessonPath(data.materialLessonPath.trim().replace(/\\/g, '/'));
        }
        const shared = Array.isArray(data.tasks)
          ? data.tasks
              .map((t) => ({
                category: typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Eigen',
                prompt: typeof t.prompt === 'string' ? t.prompt : '',
                solution: typeof t.solution === 'string' ? t.solution : '',
                sourceKey: typeof t.sourceKey === 'string' && t.sourceKey ? t.sourceKey : undefined,
              }))
              .filter((t) => t.prompt && t.solution)
          : [];
        if (shared.length > 0) {
          setSelectedTasks(shared);
          setSharedTasksLocked(true);
          setBandChosen(true);
        } else if (hydrated) {
          setSharedTasksLocked(false);
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = window.setInterval(() => {
      if (attempts >= 12) {
        window.clearInterval(id);
        return;
      }
      void tick();
    }, 800);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isTeacher, isClassModerator, sharedTasksLocked, applyGradeParam]);

  useEffect(() => {
    if (embeddedPlay) return;
    if (!isTeacher) return;
    const { autostart } = parseEntryTicketSearch(location.search);
    if (autostart) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiGet('/api/entry-ticket/current');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { startedAt?: string | null; heroImageIndex?: number | null };
        if (typeof data.heroImageIndex === 'number' && data.startedAt) {
          setEntryHeroImageIndex(data.heroImageIndex);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [embeddedPlay, isTeacher, location.search]);
  const activeTasks = selectedTasks;
  const currentTask = activeTasks[currentIndex] ?? activeTasks[0];

  const toCoarseCategory = (category: string): CoarseCategory => {
    return coarseCategoryForTask(category);
  };

  const activeCustomSet = useMemo(
    () => (customSetId ? customSets.find((s) => s.id === customSetId) ?? null : null),
    [customSetId, customSets],
  );
  const isCustomSetActive = Boolean(customSetId && activeCustomSet);
  const infCustomSets = useMemo(() => customSets.filter(customSetIsInformatik), [customSets]);
  const matheCustomSets = useMemo(
    () => customSets.filter((s) => !customSetIsInformatik(s)),
    [customSets],
  );
  const matheCustomSetIds = useMemo(() => matheCustomSets.map((s) => s.id), [matheCustomSets]);
  const infCustomSetIds = useMemo(() => infCustomSets.map((s) => s.id), [infCustomSets]);
  const setSortSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleMatheSetDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCustomSets((prev) =>
      reorderCustomSetsInGroup(
        prev,
        prev.filter((s) => !customSetIsInformatik(s)).map((s) => s.id),
        String(active.id),
        String(over.id),
      ),
    );
  }, []);

  const handleInfSetDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCustomSets((prev) =>
      reorderCustomSetsInGroup(
        prev,
        prev.filter((s) => customSetIsInformatik(s)).map((s) => s.id),
        String(active.id),
        String(over.id),
      ),
    );
  }, []);

  const poolForBand = useMemo(() => {
    if (customSetId && activeCustomSet) {
      // Play: bis zu 10 zufällig aus allen Stunden *vor* der aktuellen (nie aktuelle)
      return cumulativeTasksBeforeLesson(activeCustomSet, entryLessonPath).map((t) => ({
        category: t.category,
        prompt: t.prompt,
        solution: t.solution,
        sourceKey: `c:${activeCustomSet.id}:${t.id}`,
      }));
    }
    // Generierte Klassen-/Inf-Pools werden nicht mehr genutzt
    return [];
  }, [customSetId, activeCustomSet, entryLessonPath]);

  const activeSetLabel = isCustomSetActive
    ? activeCustomSet!.name
    : fragensetHeadingLabel(grade);

  const customPlaySourceLabel = useMemo(() => {
    if (!isCustomSetActive || !activeCustomSet) return null;
    const total = countCustomSetTasks(activeCustomSet);
    const prevCount = poolForBand.length;
    const pickN = Math.min(TARGET_TASK_COUNT, prevCount);
    if (!entryLessonPath) {
      return `${prevCount} Fragen im Set · Spiel: ${pickN} (max. ${TARGET_TASK_COUNT})`;
    }
    const wantName = entryLessonPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
    const priorParts: string[] = [];
    let currentCount = 0;
    for (const lesson of sortLessonsChronologically(activeCustomSet.lessons)) {
      const n = lesson.tasks.length;
      if (!n) continue;
      const leaf = (lesson.lessonKey || lesson.lessonName).replace(/\\/g, '/').split('/').pop() || '';
      const isCurrent =
        leaf === wantName || lesson.lessonName.trim() === wantName;
      if (isCurrent) {
        currentCount = n;
        continue;
      }
      if (leaf.localeCompare(wantName, 'de', { numeric: true }) < 0) {
        priorParts.push(`${n}× ${leaf}`);
      }
    }
    const priorLabel = priorParts.length > 0 ? priorParts.join(', ') : 'keine';
    const currentHint =
      currentCount > 0
        ? ` · ${currentCount} in der aktuellen Stunde zählen nicht`
        : '';
    return `Pool: ${prevCount} aus früheren (${priorLabel}) · Spiel: ${pickN}/${TARGET_TASK_COUNT}${currentHint} · Set gesamt ${total}`;
  }, [isCustomSetActive, activeCustomSet, poolForBand.length, entryLessonPath]);

  const groupedSetQuestions = useMemo(() => {
    if (!isCustomSetActive && grade === 'inf11') {
      return groupPoolTasksByBandOrder(poolForBand, INF11_BAND_ORDER);
    }
    if (!isCustomSetActive && grade === 'inf12') {
      return groupPoolTasksByBandOrder(poolForBand, INF12_BAND_ORDER);
    }
    if (!isCustomSetActive && grade === 'inf13') {
      return groupPoolTasksByBandOrder(poolForBand, INF13_BAND_ORDER);
    }

    const indexed = poolForBand.map((q, idx) => ({ q, idx }));
    const categoryOrder: CoarseCategory[] = [
      'Eigen',
      'Grundrechenarten',
      'Bruch/Dezimal/Prozent',
      'Geometrie/Einheiten',
      'Zeit/Geld/Alltag',
      'Logik/Muster',
      'Wahr/Falsch',
    ];
    const rank = (cat: CoarseCategory) => {
      const i = categoryOrder.indexOf(cat);
      return i === -1 ? 999 : i;
    };
    indexed.sort((a, b) => {
      const ca = toCoarseCategory(a.q.category);
      const cb = toCoarseCategory(b.q.category);
      const byCategory = rank(ca) - rank(cb);
      if (byCategory !== 0) return byCategory;
      return a.idx - b.idx;
    });
    // Anzeige-Nummerierung soll so wirken wie die Reihenfolge im Editor (nach Sortierung).
    let displayCounter = 1;
    const withDisplay = indexed.map((item) => {
      const displayNumber = displayCounter;
      displayCounter += 1;
      return { ...item, displayNumber };
    });
    const groups: Array<{ category: string; items: Array<{ q: EntryTicketTask; idx: number; displayNumber: number }> }> = [];
    for (const item of withDisplay) {
      const coarse = isCustomSetActive ? item.q.category : toCoarseCategory(item.q.category);
      const last = groups[groups.length - 1];
      if (!last || last.category !== coarse) {
        groups.push({ category: coarse, items: [item] });
      } else {
        last.items.push(item);
      }
    }
    return groups;
  }, [poolForBand, grade, isCustomSetActive]);

  const displayNumberByPoolIndex = useMemo(() => {
    const map = new Map<number, number>();
    for (const group of groupedSetQuestions) {
      for (const item of group.items) {
        map.set(item.idx, item.displayNumber);
      }
    }
    return map;
  }, [groupedSetQuestions]);

  const categoryVisuals: Record<CoarseCategory, { icon: string; bg: string; fg: string; border: string }> = {
    Grundrechenarten: { icon: '🧮', bg: '#fff3e0', fg: '#e65100', border: '#ffcc80' },
    'Bruch/Dezimal/Prozent': { icon: '📊', bg: '#e8f5e9', fg: '#1b5e20', border: '#a5d6a7' },
    'Geometrie/Einheiten': { icon: '📐', bg: '#e3f2fd', fg: '#0d47a1', border: '#90caf9' },
    'Zeit/Geld/Alltag': { icon: '🕒', bg: '#f3e5f5', fg: '#6a1b9a', border: '#ce93d8' },
    'Logik/Muster': { icon: '🧩', bg: '#ede7f6', fg: '#4527a0', border: '#b39ddb' },
    'Wahr/Falsch': { icon: '✅', bg: '#e0f2f1', fg: '#004d40', border: '#80cbc4' },
    Eigen: { icon: '🧾', bg: '#e8f5ff', fg: '#0b3a91', border: '#90caf9' },
  };

  const visualForFragensetGroup = (groupCategory: string) => {
    if (!isCustomSetActive && grade === 'inf11' && INF11_EDITOR_VISUALS[groupCategory]) {
      return INF11_EDITOR_VISUALS[groupCategory];
    }
    if (!isCustomSetActive && grade === 'inf12' && INF12_EDITOR_VISUALS[groupCategory]) {
      return INF12_EDITOR_VISUALS[groupCategory];
    }
    if (!isCustomSetActive && grade === 'inf13' && INF13_EDITOR_VISUALS[groupCategory]) {
      return INF13_EDITOR_VISUALS[groupCategory];
    }
    return categoryVisuals[groupCategory as CoarseCategory] ?? {
      icon: '📝',
      bg: '#f5f5f5',
      fg: '#424242',
      border: '#bdbdbd',
    };
  };

  const skipInfNumberVary = (category: string) =>
    category.startsWith('Inf ·') ||
    category.startsWith('Eigen · Inf') ||
    category === 'Allgemein' ||
    category === 'Java' ||
    category === 'OO' ||
    category === 'Technische Informatik' ||
    category === 'Digitaltechnik' ||
    category === 'KI' ||
    INF12_BAND_ORDER.includes(category) ||
    INF13_BAND_ORDER.includes(category);

  const varyNumbersOnly = (prompt: string, seed: number): string => {
    // HTML/Bilder/Formatierung nicht anfassen
    if (
      entryTicketLooksLikeHtml(prompt) ||
      entryTicketHasImage(prompt) ||
      entryTicketHasRichFormatting(prompt)
    ) {
      return prompt;
    }
    if (/wahr\s*oder\s*falsch/i.test(prompt)) return prompt;
    let localSeed = seed;
    const rnd = () => {
      localSeed = (localSeed * 1103515245 + 12345) % 2147483648;
      return localSeed / 2147483648;
    };
    return prompt.replace(/(?<![:\d])\d+(?:[.,]\d+)?(?!:\d)/g, (raw) => {
      const hasComma = raw.includes(',');
      const base = Number(raw.replace(',', '.'));
      if (!Number.isFinite(base)) return raw;
      const factor = hasComma ? (0.8 + rnd() * 0.4) : (0.7 + rnd() * 0.6);
      let v = base * factor;
      if (!hasComma) v = Math.max(1, Math.round(v));
      const decimals = hasComma ? ((raw.split(',')[1] || '').length || 1) : 0;
      const str = decimals > 0 ? v.toFixed(decimals) : String(v);
      return str.replace('.', ',');
    });
  };

  const pickRandomTasks = (
    pool: EntryTicketTask[],
    count: number,
    seed: number,
  ): { tasks: EntryTicketTask[]; indices: number[] } => {
    const indexedPool = pool.map((task, i) => ({ task, i }));
    const arr = [...indexedPool];
    let s = seed;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const sliced = arr.slice(0, Math.min(count, arr.length));
    return {
      tasks: sliced.map(({ task }, idx) => ({
        ...task,
        // Eigene Fragensets: Zahlen NICHT variieren — sonst passt die gespeicherte Lösung nicht mehr.
        prompt:
          isCustomSetActive || skipInfNumberVary(task.category)
            ? task.prompt
            : varyNumbersOnly(task.prompt, seed + idx * 31),
      })),
      indices: sliced.map(({ i }) => i),
    };
  };

  useEffect(() => {
    if (sessionStarted) return;
    if (sharedTasksLocked) return;
    if (!bandChosen) {
      setSelectedTasks([]);
      setPickedListIndices([]);
      return;
    }
    const picked = pickRandomTasks(poolForBand, TARGET_TASK_COUNT, taskSeed);
    setSelectedTasks(picked.tasks);
    setPickedListIndices(picked.indices.map((i) => displayNumberByPoolIndex.get(i) ?? i + 1));
  }, [poolForBand, taskSeed, sessionStarted, displayNumberByPoolIndex, sharedTasksLocked, bandChosen]);

  useEffect(() => {
    try {
      localStorage.setItem(QUESTION_SET_STORAGE_KEY, JSON.stringify(questionSets));
    } catch {
      // ignore storage errors
    }
  }, [questionSets]);

  useEffect(() => {
    saveCustomEntryTicketSets(customSets);
    if (!isTeacher || !customSetsServerSyncedRef.current) return;
    void apiPut('/api/entry-ticket/custom-sets', { sets: customSets }).catch(() => {});
  }, [customSets, isTeacher]);

  /** Lehrer: Fragensets vom Server laden — Notizen/reihePath bleiben erhalten. */
  useEffect(() => {
    if (!isTeacher) {
      customSetsServerSyncedRef.current = true;
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const merged = await fetchAndCacheCustomEntryTicketSets();
        if (cancelled) return;
        setCustomSets((local) => {
          if (merged.length === 0) return local;
          const byId = new Map(local.map((s) => [s.id, s] as const));
          for (const s of merged) {
            const prev = byId.get(s.id);
            byId.set(s.id, {
              ...s,
              reihePath: s.reihePath || prev?.reihePath,
              notes: s.notes ?? prev?.notes,
            });
          }
          return Array.from(byId.values());
        });
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) customSetsServerSyncedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTeacher]);

  /** Gelöschtes Custom-Set (nur Lehrer): zurück auf Klassenband. Moderator behält URL/Server-Grade. */
  useEffect(() => {
    if (!isTeacher) return;
    if (!customSetId) return;
    if (customSets.length === 0) return;
    if (!customSets.some((s) => s.id === customSetId)) {
      setCustomSetId(null);
    }
  }, [customSetId, customSets, isTeacher]);

  /** Autostart aus der Präsentation: passendes Fragenset zur Stunde wählen, dann Play. */
  useEffect(() => {
    if (!autoStartPending) return;
    if (customSetId) return;
    if (!entryLessonPath) return;
    const band = resolveEntryTicketBandForLessonPath(entryLessonPath, grade, customSets);
    if (!isCustomEntryTicketSetId(band)) return;
    setCustomSetId(band);
    setBandChosen(true);
  }, [autoStartPending, customSetId, customSets, entryLessonPath, grade]);

  /** Lehrer: konkrete Karten in das Signal schreiben, damit der Moderator dasselbe Ticket sieht. */
  useEffect(() => {
    if (!isTeacher) return;
    if (!sessionStarted && !autoStartPending) return;
    if (selectedTasks.length === 0) return;
    const gradeParam = customSetId || String(grade);
    const activeSet = customSetId ? customSets.find((s) => s.id === customSetId) ?? null : null;
    const sig = JSON.stringify({
      grade: gradeParam,
      taskSeed,
      lessonPath: entryLessonPath || '',
      groupId: entryTicketGroupId || '',
      tasks: selectedTasks,
      customSetId: activeSet?.id || '',
    });
    if (tasksSyncedRef.current === sig) return;
    tasksSyncedRef.current = sig;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          await apiPost('/api/entry-ticket/signal', {
            ...(entryTicketGroupId ? { learningGroupId: entryTicketGroupId } : {}),
            grade: gradeParam,
            taskSeed,
            lessonPath: entryLessonPath || undefined,
            tasks: selectedTasks,
            ...(activeSet ? { customSet: snapshotCustomSetForSignal(activeSet) } : {}),
            syncTasks: true,
          });
        } catch {
          /* ignore */
        }
      })();
    }, 120);
    return () => window.clearTimeout(t);
  }, [
    isTeacher,
    sessionStarted,
    autoStartPending,
    selectedTasks,
    customSetId,
    customSets,
    grade,
    taskSeed,
    entryLessonPath,
    entryTicketGroupId,
  ]);

  const updateActivePool = (updater: (list: EntryTicketTask[]) => EntryTicketTask[]) => {
    if (customSetId) return;
    setQuestionSets((prev) => {
      const list = [...(prev[grade] ?? [])];
      return { ...prev, [grade]: updater(list) };
    });
  };

  const selectCustomSet = (id: string) => {
    setCustomSetId(id);
    setBandChosen(true);
    setShowSetEditor(true);
    setSetEditIndex(null);
    setSetEditCategory('Alltag');
    setSetEditPrompt('');
    setSetEditSolution('');
    setTaskSeed(randomTaskSeed());
  };

  const openCreateSetDialog = () => {
    setCreateSetName('');
    setCreateSetError(null);
    setCreateSetOpen(true);
  };

  const createCustomSet = async () => {
    const name = createSetName.trim() || 'Neue Reihe';
    if (createSetBusy) return;
    setCreateSetBusy(true);
    setCreateSetError(null);
    try {
      let next = createEmptyCustomSet(name);
      const discovered = await discoverLessonsForReiheName(name);
      if (discovered.reihePath) {
        next.reihePath = discovered.reihePath;
      }
      if (discovered.lessons.length > 0) {
        next.lessons = discovered.lessons.map((l) =>
          createLessonSection(l.lessonName, l.lessonKey, l.topicName),
        );
      } else if (entryLessonPath) {
        const folder = entryLessonPath.split('/').pop() || entryLessonPath;
        next.lessons = [createLessonSection(folder, entryLessonPath)];
      }
      next = ensureSpecialLessonSections(next);
      setCustomSets((prev) => [...prev, next]);
      setCreateSetOpen(false);
      setCreateSetName('');
      setCustomSetId(next.id);
      setBandChosen(true);
      setShowSetEditor(true);
      setTaskSeed((s) => s + 1);
      if (discovered.lessons.length === 0) {
        setCreateSetError(null);
      }
    } catch {
      setCreateSetError('Stunden der Reihe konnten nicht geladen werden.');
    } finally {
      setCreateSetBusy(false);
    }
  };

  const patchActiveCustomSet = (next: EntryTicketCustomSet) => {
    setCustomSets((prev) => prev.map((s) => (s.id === next.id ? next : s)));
    setTaskSeed((s) => s + 1);
  };

  const resolveCustomTaskFromPlay = (task: EntryTicketTask): EntryTicketCustomTask | null => {
    if (!activeCustomSet) return null;
    const prefix = `c:${activeCustomSet.id}:`;
    const id = task.sourceKey?.startsWith(prefix) ? task.sourceKey.slice(prefix.length) : '';
    if (id) {
      for (const lesson of activeCustomSet.lessons) {
        const found = lesson.tasks.find((t) => t.id === id);
        if (found) return found;
      }
    }
    if (!task.prompt || !task.solution) return null;
    return {
      id: task.sourceKey || 'play',
      category: task.category || 'Für später',
      prompt: task.prompt,
      solution: task.solution,
    };
  };

  const copyPlayTaskToLater = (task: EntryTicketTask) => {
    if (!activeCustomSet || !isTeacher) return;
    const original = resolveCustomTaskFromPlay(task);
    if (!original) return;
    const next = copyTasksToLaterSection(activeCustomSet, [original]);
    setCustomSets((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  };

  const playTaskIsSavedForLater = (task: EntryTicketTask) => {
    if (!activeCustomSet) return false;
    const original = resolveCustomTaskFromPlay(task);
    return laterSectionContainsTask(activeCustomSet, original ?? task);
  };

  const renameActiveCustomSet = (name: string) => {
    if (!customSetId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomSets((prev) => prev.map((s) => (s.id === customSetId ? { ...s, name: trimmed } : s)));
  };

  const deleteActiveCustomSet = () => {
    if (!customSetId) return;
    if (!window.confirm(`Fragenset „${activeCustomSet?.name ?? ''}“ wirklich löschen?`)) return;
    setCustomSets((prev) => prev.filter((s) => s.id !== customSetId));
    setCustomSetId(null);
    setSetEditIndex(null);
    setSetEditCategory('Alltag');
    setSetEditPrompt('');
    setSetEditSolution('');
    setTaskSeed((s) => s + 1);
  };

  useEffect(() => {
    if (!sessionStarted || !isRunning || sessionDone || activeTasks.length === 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setCardSlideDir(1);
        setCurrentIndex((prevIndex) => {
          const next = prevIndex + 1;
          if (next >= activeTasks.length) {
            setSessionDone(true);
            setShowSolutions(true);
            setIsRunning(false);
            return prevIndex;
          }
          return next;
        });
        return slideDurationSecRef.current;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeTasks.length, isRunning, sessionDone, sessionStarted]);

  /** Pro Session einmal zählen, wenn eine Karte tatsächlich gezeigt wird. */
  useEffect(() => {
    if (!sessionStarted || sessionDone) return;
    const task = activeTasks[currentIndex];
    const key = task?.sourceKey;
    if (!key) return;
    if (shownInSessionRef.current.has(key)) return;
    shownInSessionRef.current.add(key);
    setCardShowCounts((prev) => {
      const next = { ...prev, [key]: (prev[key] || 0) + 1 };
      persistCardShowCounts(next);
      return next;
    });
  }, [sessionStarted, sessionDone, currentIndex, activeTasks]);

  const applySlideDurationSec = useCallback((raw: number) => {
    const next = clampSlideDurationSec(raw);
    setSlideDurationSec(next);
    setDurationDraft(String(next));
    slideDurationSecRef.current = next;
    setSecondsLeft((prev) => Math.min(prev, next));
    try {
      localStorage.setItem(SLIDE_DURATION_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  }, []);

  const commitDurationDraft = useCallback(() => {
    const n = Number(String(durationDraft).replace(',', '.'));
    if (!Number.isFinite(n)) {
      setDurationDraft(String(slideDurationSec));
      return;
    }
    applySlideDurationSec(n);
  }, [applySlideDurationSec, durationDraft, slideDurationSec]);

  const startSession = () => {
    // Jeder Start neu mischen (außer Moderator mit gesperrten Lehrer-Karten)
    let seedForStart = taskSeed;
    let tasksForStart = selectedTasks;
    if (!sharedTasksLocked && poolForBand.length > 0) {
      seedForStart = randomTaskSeed();
      const picked = pickRandomTasks(poolForBand, TARGET_TASK_COUNT, seedForStart);
      tasksForStart = picked.tasks;
      setTaskSeed(seedForStart);
      setSelectedTasks(picked.tasks);
      setPickedListIndices([]);
    } else {
      setPickedListIndices([]);
    }
    shownInSessionRef.current = new Set();
    setSessionStarted(true);
    setSessionDone(false);
    setCurrentIndex(0);
    setSecondsLeft(slideDurationSecRef.current);
    setShowSolutions(false);
    setTeacherNotes('');
    setIsRunning(true);
    if (isTeacher) {
      if (skipDuplicateEntrySignalRef.current) {
        skipDuplicateEntrySignalRef.current = false;
      } else {
        const gid = entryTicketGroupId;
        const gradeParam = customSetId || String(grade);
        const activeSet = customSetId ? customSets.find((s) => s.id === customSetId) ?? null : null;
        void (async () => {
          try {
            const res = await apiPost('/api/entry-ticket/signal', {
              ...(gid ? { learningGroupId: gid } : {}),
              grade: gradeParam,
              taskSeed: seedForStart,
              lessonPath: entryLessonPath || undefined,
              tasks: tasksForStart,
              ...(activeSet ? { customSet: snapshotCustomSetForSignal(activeSet) } : {}),
            });
            if (res.ok) {
              const data = await res.json();
              if (typeof data.heroImageIndex === 'number') setEntryHeroImageIndex(data.heroImageIndex);
            }
          } catch {
            // ignore
          }
        })();
      }
    }
  };

  const startSessionRef = useRef(startSession);
  startSessionRef.current = startSession;

  const startOrResume = () => {
    if (sessionDone) {
      shownInSessionRef.current = new Set();
      setSessionDone(false);
      setCurrentIndex(0);
      setSecondsLeft(slideDurationSecRef.current);
    }
    setIsRunning(true);
  };

  const printLessonsAvailable = useMemo(() => {
    if (!activeCustomSet) return [];
    return sortLessonsChronologically(activeCustomSet.lessons).filter((l) => l.tasks.length > 0);
  }, [activeCustomSet]);

  const printSelectedLessonTaskCount = useMemo(() => {
    if (!activeCustomSet || printSource !== 'lessons') return 0;
    const idSet = new Set(printLessonIds);
    return activeCustomSet.lessons
      .filter((l) => idSet.has(l.id))
      .reduce((n, l) => n + l.tasks.length, 0);
  }, [activeCustomSet, printLessonIds, printSource]);

  const openPrintFlashcardsDialog = useCallback(() => {
    if (activeCustomSet && printLessonsAvailable.length > 0) {
      const idx = findLessonSectionIndex(activeCustomSet, entryLessonPath);
      const currentId =
        idx >= 0 && activeCustomSet.lessons[idx]?.tasks.length > 0
          ? activeCustomSet.lessons[idx].id
          : null;
      setPrintLessonIds(currentId ? [currentId] : printLessonsAvailable.map((l) => l.id));
      setPrintSource('lessons');
      setPrintFlashcardsOpen(true);
      return;
    }
    if (activeTasks.length === 0) return;
    openEntryTicketFlashcardPrint(activeTasks, {
      title: 'Entry Ticket – Karteikarten',
    });
  }, [activeCustomSet, activeTasks, entryLessonPath, printLessonsAvailable]);

  const confirmPrintFlashcards = useCallback(() => {
    if (printSource === 'session') {
      if (activeTasks.length === 0) return;
      setPrintFlashcardsOpen(false);
      openEntryTicketFlashcardPrint(activeTasks, {
        title: 'Entry Ticket – Karteikarten',
      });
      return;
    }
    if (!activeCustomSet) return;
    const idSet = new Set(printLessonIds);
    const selected = sortLessonsChronologically(activeCustomSet.lessons).filter((l) => idSet.has(l.id));
    const tasks = selected.flatMap((lesson) =>
      lesson.tasks.map((t) => ({
        category: lesson.lessonName || t.category,
        prompt: t.prompt,
        solution: t.solution,
      })),
    );
    if (tasks.length === 0) return;
    const lessonLabel =
      selected.length === 1
        ? selected[0].lessonName
        : `${selected.length} Stunden`;
    setPrintFlashcardsOpen(false);
    openEntryTicketFlashcardPrint(tasks, {
      title: `Entry Ticket – ${lessonLabel}`,
    });
  }, [activeCustomSet, activeTasks, printLessonIds, printSource]);

  const printFlashcards = useCallback(() => {
    openPrintFlashcardsDialog();
  }, [openPrintFlashcardsDialog]);

  /** Ticket beenden: archivieren + Signal löschen → SuS-Popup zu; Lehrer zurück */
  const leaveAfterComplete = useCallback(() => {
    if (embeddedPlay) {
      embeddedPlay.onExit();
      return;
    }
    if (safeStundeReturnTo) {
      navigate(safeStundeReturnTo, { replace: true });
      return;
    }
    if (isTeacher && entryTicketGroupId && entryLessonPath) {
      navigate(presentationLessonBackUrl(entryLessonPath, entryTicketGroupId), { replace: true });
      return;
    }
    if (isTeacher && entryTicketGroupId) {
      navigate(`/teacher/stunde?groupId=${encodeURIComponent(entryTicketGroupId)}`, { replace: true });
      return;
    }
    navigate('/dashboard', { replace: true });
  }, [embeddedPlay, entryLessonPath, entryTicketGroupId, isTeacher, navigate, safeStundeReturnTo]);

  const markEntryTicketDone = useCallback(async () => {
    if (completeBusy || studentReviewMode || doneCelebrate) return;
    setCompleteBusy(true);
    try {
      const activeSet = customSetId ? customSets.find((s) => s.id === customSetId) ?? null : null;
      const res = await apiPost('/api/entry-ticket/complete', {
        ...(entryTicketGroupId ? { learningGroupId: entryTicketGroupId } : {}),
        ...(entryLessonPath ? { materialLessonPath: entryLessonPath } : {}),
        ...(selectedTasks.length > 0
          ? {
              tasks: selectedTasks.map((t) => ({
                category: t.category,
                prompt: t.prompt,
                solution: t.solution,
              })),
            }
          : {}),
        ...(activeSet ? { customSet: snapshotCustomSetForSignal(activeSet) } : {}),
        grade: customSetId || String(grade),
        taskSeed,
        heroImageIndex: entryHeroImageIndex,
      });
      if (!res.ok) {
        setCompleteBusy(false);
        return;
      }
      setDoneCelebrate(true);
      if (doneCelebrateTimerRef.current != null) {
        window.clearTimeout(doneCelebrateTimerRef.current);
      }
      doneCelebrateTimerRef.current = window.setTimeout(() => {
        doneCelebrateTimerRef.current = null;
        leaveAfterComplete();
      }, DONE_CELEBRATE_MS);
    } catch {
      setCompleteBusy(false);
    }
  }, [
    completeBusy,
    customSetId,
    customSets,
    doneCelebrate,
    entryHeroImageIndex,
    entryLessonPath,
    entryTicketGroupId,
    grade,
    leaveAfterComplete,
    selectedTasks,
    studentReviewMode,
    taskSeed,
  ]);

  useEffect(() => {
    return () => {
      if (doneCelebrateTimerRef.current != null) {
        window.clearTimeout(doneCelebrateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoStartPending || sessionStarted) return;
    if (!isTeacher && (!moderatorGateChecked || !isClassModerator)) return;

    if (!customSetId && entryLessonPath) {
      if (customSets.length === 0) return;
      const band = resolveEntryTicketBandForLessonPath(entryLessonPath, grade, customSets);
      if (isCustomEntryTicketSetId(band)) return;
      setAutoStartPending(false);
      return;
    }

    startSessionRef.current();
    setAutoStartPending(false);
  }, [
    autoStartPending,
    sessionStarted,
    customSetId,
    customSets,
    entryLessonPath,
    grade,
    poolForBand.length,
    isTeacher,
    moderatorGateChecked,
    isClassModerator,
  ]);

  const pause = () => {
    setIsRunning(false);
  };

  const replaceTaskAtIndex = (index: number) => {
    setSelectedTasks((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      if (poolForBand.length === 0) return prev;
      const pickBase = poolForBand[Math.floor(Math.random() * poolForBand.length)];
      const baseIndex = poolForBand.indexOf(pickBase);
      const replacement = {
        ...pickBase,
        prompt:
          isCustomSetActive || skipInfNumberVary(pickBase.category)
            ? pickBase.prompt
            : varyNumbersOnly(pickBase.prompt, Date.now() + index),
      };
      const next = [...prev];
      next[index] = replacement;
      setPickedListIndices((prevIndices) => {
        const nextIndices = [...prevIndices];
        nextIndices[index] = displayNumberByPoolIndex.get(baseIndex) ?? baseIndex + 1;
        return nextIndices;
      });
      return next;
    });
  };

  const startSetEditing = (index: number) => {
    const task = poolForBand[index];
    if (!task) return;
    setSetEditIndex(index);
    setSetEditCategory(task.category);
    setSetEditPrompt(task.prompt);
    setSetEditSolution(task.solution);
  };

  const cancelSetEditing = () => {
    setSetEditIndex(null);
    setSetEditCategory('Alltag');
    setSetEditPrompt('');
    setSetEditSolution('');
  };

  const saveSetEditing = () => {
    if (setEditIndex === null) return;
    const prompt = setEditPrompt.trim();
    const solution = setEditSolution.trim();
    const rawCat = setEditCategory.trim() || 'Zeit/Geld/Alltag';
    const category = categoryForFragensetSave(grade, rawCat, isCustomSetActive);
    if (!prompt || !solution) return;
    updateActivePool((list) => {
      if (setEditIndex < 0 || setEditIndex >= list.length) return list;
      const next = [...list];
      next[setEditIndex] = { ...next[setEditIndex], category, prompt, solution };
      return next;
    });
    cancelSetEditing();
    setTaskSeed((s) => s + 1);
  };

  const deleteSetQuestion = (index: number) => {
    updateActivePool((list) => {
      if (index < 0 || index >= list.length) return list;
      const next = [...list];
      next.splice(index, 1);
      return next;
    });
    setTaskSeed((s) => s + 1);
  };

  const addSetQuestion = () => {
    const prompt = newPrompt.trim();
    const solution = newSolution.trim();
    if (!prompt || !solution) return;
    updateActivePool((list) => [
      ...list,
      {
        category: 'Eigen',
        prompt,
        solution,
      },
    ]);
    setNewPrompt('');
    setNewSolution('');
    setTaskSeed((s) => s + 1);
  };

  const handleAddQuestionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addSetQuestion();
  };

  const fillToFiftyPerCategory = () => {
    setQuestionSets((prev) => {
      const base = [...(prev[grade] ?? [])];
      if (grade === 'inf11') {
        return { ...prev, [grade]: inflateInf11PerBand(base) };
      }
      if (grade === 'inf12') {
        return { ...prev, [grade]: inflateInf12PerBand(base) };
      }
      if (grade === 'inf13') {
        return { ...prev, [grade]: inflateInf13PerBand(base) };
      }
      const categories: CoarseCategory[] = [
        'Grundrechenarten',
        'Bruch/Dezimal/Prozent',
        'Geometrie/Einheiten',
        'Zeit/Geld/Alltag',
        'Logik/Muster',
        'Wahr/Falsch',
        'Eigen',
      ];
      const next = [...base];
      for (const cat of categories) {
        const inCat = next.filter((q) => toCoarseCategory(q.category) === cat);
        if (inCat.length === 0) continue;
        let i = 0;
        while (next.filter((q) => toCoarseCategory(q.category) === cat).length < 50) {
          const template = inCat[i % inCat.length];
          next.push({ ...template, category: cat });
          i += 1;
        }
      }
      return { ...prev, [grade]: next };
    });
    setTaskSeed((s) => s + 1);
  };

  const startEditingTask = (index: number) => {
    const task = activeTasks[index];
    if (!task) return;
    setEditingIndex(index);
    setEditingPrompt(task.prompt);
    setEditingSolution(task.solution);
  };

  const cancelEditingTask = () => {
    setEditingIndex(null);
    setEditingPrompt('');
    setEditingSolution('');
  };

  const saveEditingTask = () => {
    if (editingIndex === null) return;
    const prompt = editingPrompt.trim();
    const solution = calculateAutoSolution(prompt).trim();
    if (!prompt || !solution) return;
    setSelectedTasks((prev) => {
      if (editingIndex < 0 || editingIndex >= prev.length) return prev;
      const next = [...prev];
      next[editingIndex] = { ...next[editingIndex], prompt, solution };
      return next;
    });
    cancelEditingTask();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    saveEditingTask();
  };

  const handleEditingPromptChange = (value: string) => {
    setEditingPrompt(value);
  };

  const getLiveAutoSolution = (prompt: string): string =>
    calculateAutoSolution(prompt);

  const handleBack = () => {
    if (embeddedPlay) {
      embeddedPlay.onExit();
      return;
    }
    // SuS-Review: nur ansehen — X/Zurück führt zurück, nie in die Ticket-Steuerung
    if (studentReviewMode) {
      if (safeStundeReturnTo) {
        navigate(safeStundeReturnTo);
        return;
      }
      navigate('/dashboard');
      return;
    }
    if (sessionStarted) {
      setSessionStarted(false);
      setIsRunning(false);
      setSessionDone(false);
      setCurrentIndex(0);
      setSecondsLeft(slideDurationSecRef.current);
      setShowSolutions(false);
      if (!sharedTasksLocked) setTaskSeed(randomTaskSeed());
      if (customSetId) setShowSetEditor(true);
      return;
    }
    if (showSetEditor || bandChosen) {
      setShowSetEditor(false);
      setBandChosen(false);
      setCustomSetId(null);
      setSelectedTasks([]);
      setPickedListIndices([]);
      return;
    }
    if (safeStundeReturnTo) {
      navigate(safeStundeReturnTo);
      return;
    }
    navigate(-1);
  };

  const restart = () => {
    setIsRunning(false);
    setSessionDone(false);
    setCurrentIndex(0);
    setSecondsLeft(slideDurationSecRef.current);
    setShowSolutions(false);
    setTeacherNotes('');
  };

  const goNext = () => {
    if (sessionDone) return;
    setCardSlideDir(1);
    if (currentIndex >= activeTasks.length - 1) {
      setSessionDone(true);
      setShowSolutions(true);
      setIsRunning(false);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSecondsLeft(slideDurationSecRef.current);
  };

  const goPrevious = () => {
    setCardSlideDir(-1);
    if (sessionDone) {
      setSessionDone(false);
      setCurrentIndex(activeTasks.length - 1);
      setSecondsLeft(slideDurationSecRef.current);
      return;
    }
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setSecondsLeft(slideDurationSecRef.current);
  };

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target instanceof HTMLElement ? target : null;
      if (!el) return false;
      if (el.isContentEditable) return true;
      const field = el.closest<HTMLElement>(
        'textarea, select, [contenteditable="true"], input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])'
      );
      return !!field;
    };

    const typingOrInField = (e: KeyboardEvent) =>
      isTypingTarget(e.target) || isTypingTarget(document.activeElement);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
        return;
      }

      // SuS-Review: nur Überblick ansehen — keine Session-Steuerung per Tastatur
      if (studentReviewMode) return;

      if (typingOrInField(e)) return;

      if (e.key === 'ArrowLeft') {
        if (!sessionStarted) return;
        e.preventDefault();
        goPrevious();
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!sessionStarted) return;
        e.preventDefault();
        goNext();
        return;
      }

      if (e.key === 'Enter') {
        if (!sessionStarted) return;
        e.preventDefault();
        // Abschlussfolie: Enter = Erledigt (wie der Button)
        if (sessionDone && (isTeacher || isClassModerator) && !studentReviewMode) {
          void markEntryTicketDone();
          return;
        }
        if (isRunning) {
          pause();
        } else {
          startOrResume();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    goNext,
    goPrevious,
    handleBack,
    isClassModerator,
    isRunning,
    isTeacher,
    markEntryTicketDone,
    sessionDone,
    sessionStarted,
    startOrResume,
    studentReviewMode,
  ]);

  const formatPromptForDisplay = (prompt: string): string => formatEntryTicketPromptStructure(prompt);

  const cleanPrompt = (prompt: string): string =>
    entryTicketPlainText(prompt).replace(/\s{2,}/g, ' ').trim();

  const toNumber = (value: string): number => Number(value.replace(',', '.'));

  const formatDeNumber = (value: number, maxDecimals = 2): string => {
    if (!Number.isFinite(value)) return '';
    const rounded = Number(value.toFixed(maxDecimals));
    return rounded.toString().replace('.', ',');
  };

  const parseTimeToMinutes = (hh: string, mm: string): number => Number(hh) * 60 + Number(mm);
  const formatMinutesToTime = (totalMinutes: number): string => {
    const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hh = Math.floor(normalized / 60).toString().padStart(2, '0');
    const mm = (normalized % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const evaluateSimpleExpression = (expr: string): number | null => {
    const normalized = expr
      .replace(/€/g, '')
      .replace(/,/g, '.')
      .replace(/·/g, '*')
      .replace(/÷/g, '/')
      .replace(/:/g, '/')
      .replace(/\s+/g, '');
    if (!/^[0-9+\-*/().]+$/.test(normalized)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${normalized});`)();
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };

  const normalizeMathExpression = (expr: string): string => {
    return expr
      .replace(/€/g, '')
      .replace(/,/g, '.')
      .replace(/·/g, '*')
      .replace(/÷/g, '/')
      .replace(/:/g, '/')
      .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
      .replace(/\s+/g, '');
  };

  const evaluateExpressionWithVariable = (expr: string, x: number): number | null => {
    const normalized = normalizeMathExpression(expr).replace(/\?/g, `(${x})`);
    if (!/^[0-9+\-*/().]+$/.test(normalized)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict"; return (${normalized});`)();
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };

  const solveQuestionMarkEquation = (prompt: string): number | null => {
    const text = cleanPrompt(prompt);
    const eqIndex = text.indexOf('=');
    if (eqIndex < 0 || !text.includes('?')) return null;

    const lhsRaw = text.slice(0, eqIndex);
    const rhsRaw = text.slice(eqIndex + 1);

    // Begrenze auf mathematische Tokens, damit Sätze außenrum nicht stören.
    const stripToMath = (s: string) => (s.match(/[0-9+\-*/().,·:÷?%\s€]+/g) || []).join('');
    const lhs = stripToMath(lhsRaw);
    const rhs = stripToMath(rhsRaw);
    if (!lhs || !rhs) return null;

    const h0Left = evaluateExpressionWithVariable(lhs, 0);
    const h0Right = evaluateExpressionWithVariable(rhs, 0);
    const h1Left = evaluateExpressionWithVariable(lhs, 1);
    const h1Right = evaluateExpressionWithVariable(rhs, 1);
    if (h0Left === null || h0Right === null || h1Left === null || h1Right === null) return null;

    // h(x) = lhs(x) - rhs(x) = a*x + b
    const b = h0Left - h0Right;
    const a = (h1Left - h1Right) - b;
    if (Math.abs(a) < 1e-9) return null;
    return -b / a;
  };

  const extractExpectedSuffix = (prompt: string): string => {
    const match = prompt.match(/\?\s*([A-Za-zÄÖÜäöü€%²³/]+)\.?/);
    return match?.[1]?.trim() ?? '';
  };

  const convertUnit = (value: number, from: string, to: string): number | null => {
    const factors: Record<string, number> = {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      mg: 0.000001,
      g: 0.001,
      kg: 1,
      ml: 0.001,
      l: 1,
      s: 1,
      min: 60,
      h: 3600,
    };
    if (!(from in factors) || !(to in factors)) return null;
    return (value * factors[from]) / factors[to];
  };

  const calculateAutoSolution = (prompt: string): string => {
    const text = cleanPrompt(prompt);

    if (/^wahr\s*oder\s*falsch:/i.test(text)) {
      const statement = text.replace(/^wahr\s*oder\s*falsch:\s*/i, '').replace(/\?$/, '').trim();
      if (/0,4\s*entspricht\s*40%/i.test(statement)) return 'Wahr';
      if (/15%\s*von\s*200\s*sind\s*25/i.test(statement)) return 'Falsch';
      if (/2,5\s*l\s*sind\s*250\s*ml/i.test(statement)) return 'Falsch';
      if (/3\/4\s*ist\s*kleiner\s*als\s*2\/3/i.test(statement)) return 'Falsch';
      return 'Wahr/Falsch prüfen';
    }

    const solvedQuestion = solveQuestionMarkEquation(text);
    if (solvedQuestion !== null) {
      const formatted = formatDeNumber(solvedQuestion, 4);
      // Wichtig: die Einheit steht im Prompt hinter dem '?', daher nur den Zahlenwert zurückgeben.
      return formatted;
    }

    let m = text.match(/(\d+(?:[.,]\d+)?)%\s*von\s*(\d+(?:[.,]\d+)?)/i);
    if (m) {
      const value = (toNumber(m[1]) / 100) * toNumber(m[2]);
      return formatDeNumber(value);
    }

    m = text.match(/(\d+(?:[.,]\d+)?)\s*€\s*([+-])\s*(\d+(?:[.,]\d+)?)%/i);
    if (m) {
      const base = toNumber(m[1]);
      const pct = toNumber(m[3]) / 100;
      const value = m[2] === '+' ? base * (1 + pct) : base * (1 - pct);
      return `${formatDeNumber(value)} €`;
    }

    m = text.match(/von\s*(\d{1,2}):(\d{2})\s*uhr\s*bis\s*(\d{1,2}):(\d{2})\s*uhr/i);
    if (m) {
      const start = parseTimeToMinutes(m[1], m[2]);
      const end = parseTimeToMinutes(m[3], m[4]);
      const diff = end >= start ? end - start : end + 24 * 60 - start;
      return `${diff}`;
    }

    m = text.match(/start\s*(\d{1,2}):(\d{2})\s*uhr.*dauer\s*(\d+)\s*h\s*(\d+)\s*min.*ende\s*um\s*\?\s*uhr/i);
    if (m) {
      const start = parseTimeToMinutes(m[1], m[2]);
      const end = start + Number(m[3]) * 60 + Number(m[4]);
      return `${formatMinutesToTime(end)}`;
    }

    m = text.match(/(\d+(?:[.,]\d+)?)\s*(m|km|l)\s*=\s*\?\s*(cm|m|ml)\b/i);
    if (m) {
      const value = toNumber(m[1]);
      const from = m[2].toLowerCase();
      const to = m[3].toLowerCase();
      const converted = convertUnit(value, from, to);
      if (converted !== null) return `${formatDeNumber(converted)}`;
    }

    // Generische Zieleinheitserkennung (wenn komplett umformuliert wurde)
    m = text.match(/(\d+(?:[.,]\d+)?)\s*([A-Za-zÄÖÜäöü]+)\s*=\s*\?\s*([A-Za-zÄÖÜäöü]+)\b/i);
    if (m) {
      const value = toNumber(m[1]);
      const from = m[2].toLowerCase();
      const to = m[3].toLowerCase();
      const converted = convertUnit(value, from, to);
      if (converted !== null) return `${formatDeNumber(converted)}`;
    }

    m = text.match(/(\d+(?:[.,]\d+)?)\s*km\s*bei\s*(\d+(?:[.,]\d+)?)\s*km\/h.*\?\s*min/i);
    if (m) {
      const distance = toNumber(m[1]);
      const speed = toNumber(m[2]);
      if (speed > 0) return `${formatDeNumber((distance / speed) * 60)}`;
    }

    const eqIndex = text.indexOf('=');
    if (eqIndex > 0) {
      const expr = text.slice(0, eqIndex);
      const value = evaluateSimpleExpression(expr);
      if (value !== null) {
        // Einheit steht hinter dem '?', daher nur Zahlenwert zurückgeben.
        return formatDeNumber(value);
      }
    }

    return 'Nicht berechenbar';
  };

  const colorizeOperators = (text: string, keyPrefix: string, large = false) => {
    const formattedText = text.replace(/(\d+)\s*\/\s*(\d+)/g, '$1⁄$2');
    const parts = formattedText.split(/([+\-−·×∗*÷:/=<>%?])/g);
    return parts.map((part, index) => {
      if (!part) return null;
      if (part === '\n' || part.includes('\n')) {
        return (
          <Box component="span" key={`${keyPrefix}-n-${index}`} sx={{ whiteSpace: 'pre-line' }}>
            {part}
          </Box>
        );
      }
      const isOperator = /^[+\-−·×∗*÷:/=<>%]$/.test(part);
      const isQuestionMark = part === '?';
      if (!isOperator && !isQuestionMark) {
        return (
          <Box component="span" key={`${keyPrefix}-t-${index}`}>
            {part}
          </Box>
        );
      }
      if (isQuestionMark) {
        return (
          <Box
            component="span"
            key={`${keyPrefix}-q-${index}`}
            sx={{ color: QUESTION_COLOR, fontWeight: 800, fontSize: '1.02em' }}
          >
            ?
          </Box>
        );
      }
      return (
        <Box
          component="span"
          key={`${keyPrefix}-o-${index}`}
          sx={{
            color: OPERATOR_COLOR,
            fontWeight: 800,
            mx: large ? 0.1 : 0.04,
            px: 0,
          }}
        >
          {part}
        </Box>
      );
    });
  };

  const renderPrompt = (prompt: string, keyPrefix: string, large = false, singleLine = false) => {
    const text = formatPromptForDisplay(cleanPrompt(prompt));
    const normalized = text.toLowerCase();
    const wfPrefix = 'wahr oder falsch:';

    if (normalized.startsWith(wfPrefix) || normalized.startsWith('wahr oder falsch:\n')) {
      const statement = text.replace(/^wahr oder falsch:\s*/i, '').trim();
      if (singleLine) {
        return (
          <>
            <Box component="span" sx={{ fontWeight: 800, color: '#546e7a' }}>
              Wahr oder falsch?
            </Box>{' '}
            {colorizeOperators(statement, `${keyPrefix}-wf-inline`, large)}
          </>
        );
      }
      return (
        <>
          <Box component="span" sx={{ fontWeight: 800, color: '#546e7a' }}>
            Wahr oder falsch?
          </Box>
          <Box component="br" />
          {colorizeOperators(statement, `${keyPrefix}-wf`, large)}
        </>
      );
    }

    return <>{colorizeOperators(text, `${keyPrefix}-std`, large)}</>;
  };

  const renderPromptWithInlineGreenSolution = (
    prompt: string,
    solution: string,
    keyPrefix: string,
    rightAlignedSolution = false,
  ) => {
    const cleaned = cleanPrompt(prompt);
    const normalized = cleaned.toLowerCase();
    const wfPrefix = 'wahr oder falsch:';
    if (normalized.startsWith(wfPrefix)) {
      const statement = cleaned.slice(wfPrefix.length).trim().replace(/[.]\s*$/, '');
      const statementNode = colorizeOperators(statement, `${keyPrefix}-wf`, false);
      if (rightAlignedSolution) {
        return (
          <Box
            component="span"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              width: '100%',
              alignItems: 'baseline',
              columnGap: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            <Box
              component="div"
              sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
                Wahr oder falsch?{' '}
              </Box>
              {statementNode}
            </Box>
            <Box component="span" sx={{ color: 'success.dark', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {solution}
            </Box>
          </Box>
        );
      }

      return (
        <>
          <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
            Wahr oder falsch?{' '}
          </Box>
          {statementNode}{' '}
          <Box component="span" sx={{ color: OPERATOR_COLOR, fontWeight: 900 }}>
            {solution}
          </Box>
        </>
      );
    }

    const questionIndex = cleaned.indexOf('?');
    if (questionIndex < 0) {
      // Kein „?“ im Prompt: Frage + Lösung trotzdem nebeneinander zeigen
      if (rightAlignedSolution) {
        return (
          <Box
            component="span"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              width: '100%',
              alignItems: 'baseline',
              columnGap: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            <Box component="div" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {renderPrompt(cleaned, keyPrefix, false, true)}
            </Box>
            <Box component="span" sx={{ color: 'success.dark', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {solution}
            </Box>
          </Box>
        );
      }
      return (
        <>
          {renderPrompt(cleaned, keyPrefix, false, true)}{' '}
          <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
            {solution}
          </Box>
        </>
      );
    }

    const before = cleaned.slice(0, questionIndex);
    const after = cleaned.slice(questionIndex + 1);
    const beforeTrimmedRight = before.replace(/\s+$/, '');
    const needsSpaceBefore = before.length > 0 && !before.endsWith(' ');
    const needsSpaceAfter = after.length > 0 && !after.startsWith(' ');
    const forceSpaceAfterEquals = beforeTrimmedRight.endsWith('=');
    const afterTrimStart = after.trimStart();

    if (rightAlignedSolution) {
      return (
        <Box
          component="span"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            width: '100%',
            alignItems: 'baseline',
            columnGap: 1.5,
            whiteSpace: 'nowrap',
          }}
        >
          <Box component="div" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {renderPrompt(before, `${keyPrefix}-before`, false, true)}
          </Box>
          <Box component="span" sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
              {solution}
            </Box>
            {afterTrimStart ? (
              <>
                {' '}
                <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
                  {afterTrimStart}
                </Box>
              </>
            ) : needsSpaceAfter ? ' ' : null}
          </Box>
        </Box>
      );
    }

    return (
      <>
        {renderPrompt(before, `${keyPrefix}-before`, false, true)}
        {(needsSpaceBefore || forceSpaceAfterEquals) ? ' ' : ''}
        <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
          {solution}
        </Box>
        {afterTrimStart ? (
          <>
            {' '}
            <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
              {afterTrimStart}
            </Box>
          </>
        ) : needsSpaceAfter ? ' ' : null}
      </>
    );
  };

  const finalSlideRows = Math.ceil(activeTasks.length / 2);
  const overviewCompact = activeTasks.length >= 8 || showSolutions;

  if (studentReviewMode && !studentReviewReady) {
    return (
      <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Entry Ticket wird geladen…
        </Typography>
      </Box>
    );
  }

  if (studentReviewMode && studentReviewError) {
    return (
      <Box
        sx={{
          minHeight: '40vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          px: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {studentReviewError}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => navigate('/dashboard')} sx={{ textTransform: 'none' }}>
          Zurück
        </Button>
      </Box>
    );
  }

  if (!isTeacher && !studentReviewMode && !moderatorGateChecked) {
    return (
      <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Entry Ticket wird geladen…
        </Typography>
      </Box>
    );
  }

  if (!isTeacher && !studentReviewMode && !isClassModerator) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: embeddedPlay ? '100%' : '100vh',
        height: embeddedPlay ? '100%' : undefined,
        width: '100%',
        bgcolor: '#f4f6fb',
        py: { xs: 0.5, sm: 0.75 },
        px: { xs: 0.4, sm: 0.6 },
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '100%', mx: 0, minWidth: 0, boxSizing: 'border-box' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.45, gap: 0.5 }}>
          <Tooltip title="Zurück">
            <IconButton
              onClick={handleBack}
              size="small"
              aria-label="Zurück"
              sx={{
                p: 0,
                minWidth: 24,
                width: 24,
                height: 24,
                bgcolor: 'white',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              title="Aktuelles Motiv (wie bei den Schüler:innen)"
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                borderRadius: 0.75,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'rgba(30, 136, 229, 0.28)',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
                bgcolor: 'grey.200',
              }}
            >
              <Box
                component="img"
                src={entryTicketHeroSrc(entryHeroImageIndex)}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: '#37474f',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  fontSize: { xs: '0.85rem', sm: '0.92rem' },
                }}
              >
                EntryTicket
              </Typography>
              {sessionStarted && (
                <Typography
                  title={activeSetLabel}
                  sx={{
                    mt: 0.15,
                    maxWidth: { xs: '52vw', sm: '40vw' },
                    fontSize: { xs: '0.68rem', sm: '0.72rem' },
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: '#546e7a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeSetLabel}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0, minWidth: 24 }}>
            {isTeacher && !studentReviewMode && sessionStarted && customSetId ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
                onClick={() => setHistoryTarget({ id: customSetId, name: activeSetLabel })}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  py: 0.15,
                  px: 0.85,
                  minHeight: 26,
                  borderColor: '#90a4ae',
                  color: '#455a64',
                  bgcolor: 'white',
                  '&:hover': { borderColor: '#607d8b', bgcolor: '#eceff1' },
                }}
              >
                Historie
              </Button>
            ) : null}
          </Box>
        </Box>

        <Box sx={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            {!sessionStarted && !studentReviewMode && autoStartPending ? (
              <Box
                sx={{
                  width: '100%',
                  minHeight: '52vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ color: '#78909c', fontWeight: 700, fontSize: '0.95rem' }}>
                  Entry Ticket startet…
                </Typography>
              </Box>
            ) : !sessionStarted && !studentReviewMode ? (
              <Box sx={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                <Box
                  sx={{
                    mb: 1.25,
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) auto minmax(0,1fr)' },
                    gap: { xs: 1.5, md: 2.5 },
                    alignItems: 'start',
                    pb: 1.35,
                    borderBottom: '3px solid #455a64',
                  }}
                >
                  {/* Links: Informatik-Sets */}
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 0.55,
                      minWidth: 0,
                      p: 0.85,
                      borderRadius: 1.1,
                      bgcolor: '#e8f5e9',
                      border: '2px solid #43a047',
                      boxSizing: 'border-box',
                    }}
                  >
                    <DndContext sensors={setSortSensors} collisionDetection={closestCenter} onDragEnd={handleInfSetDragEnd}>
                      <SortableContext items={infCustomSetIds} strategy={horizontalListSortingStrategy}>
                        <Box
                          role="toolbar"
                          aria-label="Informatik-Fragensets"
                          sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, minHeight: 28 }}
                        >
                          {infCustomSets.length === 0 ? (
                            <Typography sx={{ color: '#81c784', fontSize: '0.7rem', fontWeight: 600 }}>
                              Noch keine Sets
                            </Typography>
                          ) : (
                            infCustomSets.map((set) => (
                              <CustomSetChipRow
                                key={set.id}
                                set={set}
                                selected={bandChosen && customSetId === set.id}
                                accent="inf"
                                onSelect={() => selectCustomSet(set.id)}
                                onHistory={() => setHistoryTarget({ id: set.id, name: set.name })}
                              />
                            ))
                          )}
                        </Box>
                      </SortableContext>
                    </DndContext>
                  </Box>

                  {/* Mitte: Arbeitsbuttons */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 0.15 }}>
                    <ButtonGroup size="small" variant="outlined" sx={etActionGroupSx}>
                      <Button
                        onClick={openCreateSetDialog}
                        aria-label="Neues Fragenset anlegen"
                        title="Neues Fragenset anlegen"
                        sx={{ minWidth: 28, px: 0.45 }}
                      >
                        <AddIcon sx={{ fontSize: 15 }} />
                      </Button>
                      <Button
                        onClick={printFlashcards}
                        disabled={printLessonsAvailable.length === 0 && activeTasks.length === 0}
                        aria-label="Als Karteikarten drucken"
                        title="Als Karteikarten drucken"
                        sx={{ minWidth: 28, px: 0.45 }}
                      >
                        <PrintIcon sx={{ fontSize: 15 }} />
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<PlayArrowIcon />}
                        onClick={startSession}
                        disabled={activeTasks.length === 0}
                        sx={{
                          bgcolor: '#455a64',
                          borderColor: '#455a64',
                          color: '#fff',
                          '&:hover': { bgcolor: '#37474f' },
                          '&.Mui-disabled': { bgcolor: '#cfd8dc', borderColor: '#cfd8dc', color: '#fff' },
                        }}
                      >
                        Start
                      </Button>
                    </ButtonGroup>
                  </Box>

                  {/* Rechts: Mathe-Sets */}
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 0.55,
                      justifyItems: { xs: 'start', md: 'end' },
                      minWidth: 0,
                      p: 0.85,
                      borderRadius: 1.1,
                      bgcolor: '#eceff1',
                      border: '2px solid #78909c',
                      boxSizing: 'border-box',
                    }}
                  >
                    <DndContext sensors={setSortSensors} collisionDetection={closestCenter} onDragEnd={handleMatheSetDragEnd}>
                      <SortableContext items={matheCustomSetIds} strategy={horizontalListSortingStrategy}>
                        <Box
                          role="toolbar"
                          aria-label="Mathe-Fragensets"
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: { xs: 'flex-start', md: 'flex-end' },
                            gap: 0.5,
                            minHeight: 28,
                          }}
                        >
                          {matheCustomSets.length === 0 ? (
                            <Typography sx={{ color: '#90a4ae', fontSize: '0.7rem', fontWeight: 600 }}>
                              Noch keine Sets
                            </Typography>
                          ) : (
                            matheCustomSets.map((set) => (
                              <CustomSetChipRow
                                key={set.id}
                                set={set}
                                selected={bandChosen && customSetId === set.id}
                                accent="mathe"
                                onSelect={() => selectCustomSet(set.id)}
                                onHistory={() => setHistoryTarget({ id: set.id, name: set.name })}
                              />
                            ))
                          )}
                        </Box>
                      </SortableContext>
                    </DndContext>
                  </Box>
                </Box>

                {bandChosen ? (
                  <>
                {isCustomSetActive && customPlaySourceLabel ? (
                  <Typography
                    sx={{
                      width: '100%',
                      mb: 0.6,
                      color: '#546e7a',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {customPlaySourceLabel}
                  </Typography>
                ) : null}
                {isCustomSetActive && activeCustomSet ? (
                  <>
                    {poolForBand.length === 0 ? (
                      <Box
                        sx={{
                          width: '100%',
                          mb: 1,
                          py: 1.25,
                          px: 1,
                          borderRadius: 1.1,
                          border: '1px dashed #b0bec5',
                          bgcolor: 'rgba(255,255,255,0.7)',
                          textAlign: 'center',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Typography sx={{ color: '#78909c', fontSize: '0.8rem', fontWeight: 600 }}>
                          {countCustomSetTasks(activeCustomSet) === 0
                            ? 'Keine Fragen in diesem Fragenset — unten Karten anlegen.'
                            : 'Noch keine Karten aus früheren Stunden — Entry Ticket nutzt nur vorausgegangene Stunden (Ziel: 10 Fragen).'}
                        </Typography>
                      </Box>
                    ) : null}
                    <Box sx={{ width: '100%', minWidth: 0, mt: poolForBand.length === 0 ? 0 : 0.5 }}>
                      <EntryTicketFragensetEditor
                        set={activeCustomSet}
                        activeLessonPath={entryLessonPath}
                        onChange={patchActiveCustomSet}
                        onRename={renameActiveCustomSet}
                        onDeleteSet={deleteActiveCustomSet}
                        showCounts={cardShowCounts}
                      />
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      py: 1.25,
                      px: 1,
                      borderRadius: 1.1,
                      border: '1px dashed #b0bec5',
                      bgcolor: 'rgba(255,255,255,0.7)',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Typography sx={{ color: '#78909c', fontSize: '0.8rem', fontWeight: 600 }}>
                      Bitte ein Fragenset links oder rechts wählen.
                    </Typography>
                  </Box>
                )}
                  </>
                ) : null}

              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.5, width: '100%', minWidth: 0 }}>
                {/* Kartennummer immer sichtbar (auch SuS-Review); Steuerung nur Lehrer/Moderator */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexWrap: 'wrap',
                    px: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: studentReviewMode ? '1.15rem' : '0.88rem',
                      fontWeight: 600,
                      color: '#78909c',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <Box component="span" sx={{ color: '#455a64', fontWeight: 800 }}>
                      {sessionDone ? activeTasks.length : currentIndex + 1}
                    </Box>
                    /{activeTasks.length}
                  </Typography>

                  {!studentReviewMode && (

                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.65, flexShrink: 0 }}>
                    <TextField
                      size="small"
                      type="text"
                      inputMode="numeric"
                      value={durationDraft}
                      onChange={(e) => setDurationDraft(e.target.value.replace(/[^\d]/g, ''))}
                      onBlur={commitDurationDraft}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitDurationDraft();
                          (e.target as HTMLInputElement).blur();
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          applySlideDurationSec(slideDurationSec + 1);
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          applySlideDurationSec(slideDurationSec - 1);
                        }
                      }}
                      inputProps={{
                        'aria-label': 'Sekunden pro Karte',
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                      }}
                      sx={{
                        width: 48,
                        '& .MuiInputBase-input': {
                          py: 0.45,
                          px: 0.5,
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          fontVariantNumeric: 'tabular-nums',
                          color: '#546e7a',
                        },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: '#fff',
                        },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                      }}
                    />
                    <Tooltip title="Vorherige">
                      <span>
                        <IconButton
                          size="small"
                          onClick={goPrevious}
                          aria-label="Vorherige Karte"
                          disabled={currentIndex === 0 && !sessionDone}
                          sx={{
                            ...etSessionBtnSx,
                            border: 'none',
                            bgcolor: 'transparent',
                            '&:hover': { bgcolor: 'rgba(69,90,100,0.08)' },
                          }}
                        >
                          <SkipPreviousIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {!isRunning ? (
                      <Tooltip title={sessionDone ? 'Neu starten' : 'Weiter'}>
                        <IconButton
                          size="small"
                          onClick={startOrResume}
                          aria-label={sessionDone ? 'Neu starten' : 'Weiter'}
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: '#546e7a',
                            color: '#fff',
                            '&:hover': { bgcolor: '#455a64' },
                          }}
                        >
                          <PlayArrowIcon sx={{ fontSize: 22 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Pause">
                        <IconButton
                          size="small"
                          onClick={pause}
                          aria-label="Pause"
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: '#eceff1',
                            color: '#546e7a',
                            '&:hover': { bgcolor: '#cfd8dc' },
                          }}
                        >
                          <PauseIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Nächste">
                      <span>
                        <IconButton
                          size="small"
                          onClick={goNext}
                          aria-label="Nächste Karte"
                          disabled={sessionDone}
                          sx={{
                            ...etSessionBtnSx,
                            border: 'none',
                            bgcolor: 'transparent',
                            '&:hover': { bgcolor: 'rgba(69,90,100,0.08)' },
                          }}
                        >
                          <SkipNextIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Zurücksetzen">
                      <IconButton
                        size="small"
                        onClick={restart}
                        aria-label="Zurücksetzen"
                        sx={{
                          ...etSessionBtnSx,
                          border: 'none',
                          bgcolor: 'transparent',
                          color: '#90a4ae',
                          '&:hover': { bgcolor: 'rgba(69,90,100,0.08)' },
                        }}
                      >
                        <RestartAltIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  )}
                </Box>

                {!sessionDone ? (
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 864,
                      mx: 'auto',
                      boxSizing: 'border-box',
                    }}
                  >
                    <AnimatePresence mode="wait" custom={cardSlideDir} initial={false}>
                      <Box
                        component={motion.div}
                        key={currentIndex}
                        custom={cardSlideDir}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        variants={{
                          enter: (dir: number) => ({
                            x: dir > 0 ? 36 : -36,
                            opacity: 0,
                          }),
                          center: { x: 0, opacity: 1 },
                          exit: (dir: number) => ({
                            x: dir > 0 ? -28 : 28,
                            opacity: 0,
                          }),
                        }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        sx={{
                          position: 'relative',
                          width: '100%',
                          borderRadius: 3,
                          bgcolor: '#ffffff',
                          boxShadow: '0 8px 28px rgba(55, 71, 79, 0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'visible',
                          minHeight: DISPLAY_BOX_MIN_HEIGHT,
                        }}
                      >
                        <Box
                          sx={{
                            height: 3,
                            width: '100%',
                            bgcolor: 'rgba(120,144,156,0.12)',
                            flexShrink: 0,
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${(secondsLeft / Math.max(slideDurationSec, 1)) * 100}%`,
                              bgcolor: secondsLeft <= 5 ? '#ff8a65' : '#90a4ae',
                              transition: 'width 0.95s linear, background-color 0.25s ease',
                            }}
                          />
                        </Box>

                        {isTeacher && isCustomSetActive && currentTask ? (
                          <Tooltip
                            title={
                              playTaskIsSavedForLater(currentTask)
                                ? 'Bereits in „Für später“'
                                : 'Nach „Für später“ kopieren'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => copyPlayTaskToLater(currentTask)}
                                disabled={playTaskIsSavedForLater(currentTask)}
                                aria-label="Nach Für später kopieren"
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 4,
                                  p: 0,
                                  minWidth: 28,
                                  width: 28,
                                  height: 28,
                                  zIndex: 1,
                                  color: playTaskIsSavedForLater(currentTask) ? '#fb8c00' : '#90a4ae',
                                  '&:hover': { color: '#e65100', bgcolor: 'rgba(251,140,0,0.12)' },
                                  '&.Mui-disabled': { color: '#fb8c00', opacity: 1 },
                                }}
                              >
                                {playTaskIsSavedForLater(currentTask) ? (
                                  <BookmarkIcon sx={{ fontSize: 20 }} />
                                ) : (
                                  <BookmarkAddIcon sx={{ fontSize: 20 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : null}

                          <Box
                            sx={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign:
                                currentTask &&
                                (entryTicketHasImage(currentTask.prompt) ||
                                  readEntryTicketCardLayout(currentTask.prompt) !== 'flow')
                                  ? 'left'
                                  : 'center',
                              px: { xs: 2.7, sm: 4.2 },
                              pr:
                                isTeacher && isCustomSetActive
                                  ? { xs: 4.5, sm: 5.5 }
                                  : { xs: 2.7, sm: 4.2 },
                              py: 2.7,
                              overflow: 'visible',
                            }}
                          >
                          <Box
                            sx={{
                              width: '100%',
                              fontSize: { xs: '1.56rem', sm: '1.92rem', md: '2.1rem' },
                              lineHeight: 1.35,
                              fontWeight: 500,
                              color: '#37474f',
                              whiteSpace: 'pre-line',
                              letterSpacing: -0.01,
                              ...richTextSx,
                            }}
                          >
                            {currentTask ? (
                              <EntryTicketRichHtml
                                value={currentTask.prompt}
                                sx={{
                                  fontSize: 'inherit',
                                  lineHeight: 'inherit',
                                  color: 'inherit',
                                  whiteSpace: 'pre-line',
                                }}
                              />
                            ) : null}
                          </Box>
                        </Box>

                        <Typography
                          sx={{
                            pb: 1.1,
                            pt: 0.25,
                            textAlign: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: secondsLeft <= 5 ? '#ff8a65' : '#b0bec5',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {secondsLeft}
                        </Typography>
                      </Box>
                    </AnimatePresence>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      minWidth: 0,
                      height: { xs: 'calc(100vh - 150px)', sm: 'calc(100vh - 130px)' },
                      maxHeight: { xs: 'calc(100vh - 150px)', sm: 'calc(100vh - 130px)' },
                      borderRadius: 2,
                      px: { xs: 0.5, sm: 0.75 },
                      py: 0.5,
                      bgcolor: 'transparent',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.75,
                        flexWrap: 'wrap',
                        flexShrink: 0,
                        px: 0.15,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={showSolutions}
                            onChange={(e) => setShowSolutions(e.target.checked)}
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#90a4ae' }}>
                            Lösungen
                          </Typography>
                        }
                        sx={{ mr: 0, '& .MuiFormControlLabel-label': { ml: 0.2 } }}
                      />
                      <Tooltip title="Als Karteikarten drucken">
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PrintIcon sx={{ fontSize: '0.85rem !important' }} />}
                            disabled={printLessonsAvailable.length === 0 && activeTasks.length === 0}
                            onClick={printFlashcards}
                            sx={{
                              ...etActionGroupSx['& .MuiButton-root'],
                              borderRadius: '999px',
                              borderColor: '#90a4ae',
                              color: '#546e7a',
                              px: 1.25,
                              '&:hover': { borderColor: '#607d8b', bgcolor: 'rgba(96,125,139,0.08)' },
                            }}
                          >
                            Karteikarten
                          </Button>
                        </span>
                      </Tooltip>
                      {(isTeacher || isClassModerator) && !studentReviewMode && (
                        <Tooltip title="Erledigt (Enter)">
                          <span>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckIcon sx={{ fontSize: '0.85rem !important' }} />}
                              disabled={completeBusy || doneCelebrate}
                              onClick={() => void markEntryTicketDone()}
                              sx={{
                                ...etActionGroupSx['& .MuiButton-root'],
                                borderRadius: '999px',
                                bgcolor: '#66bb6a',
                                borderColor: '#66bb6a',
                                color: '#fff',
                                boxShadow: 'none',
                                px: 1.25,
                                '&:hover': { bgcolor: '#43a047', boxShadow: 'none' },
                              }}
                            >
                              {completeBusy ? '…' : 'Erledigt'}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gridTemplateRows: {
                          xs: `repeat(${activeTasks.length}, minmax(0, 1fr))`,
                          sm: `repeat(${finalSlideRows}, minmax(0, 1fr))`,
                        },
                        gridAutoFlow: { xs: 'row', sm: 'column' },
                        gap: overviewCompact ? '4px 10px' : '6px 12px',
                        overflow: 'hidden',
                      }}
                    >
                      {activeTasks.map((task, index) => (
                        <Box
                          key={`${index}-${task.prompt}`}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns:
                              isTeacher && isCustomSetActive
                                ? '19px minmax(0, 1fr) 22px'
                                : '19px minmax(0, 1fr)',
                            columnGap: 0.55,
                            alignItems: 'center',
                            px: 0.66,
                            py: 0.2,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.72)',
                            minWidth: 0,
                            minHeight: 0,
                            overflow: 'hidden',
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: overviewCompact ? '0.82rem' : '0.9rem',
                              fontWeight: 800,
                              color: '#b0bec5',
                              fontVariantNumeric: 'tabular-nums',
                              lineHeight: 1,
                            }}
                          >
                            {index + 1}
                          </Typography>
                          <Box
                            sx={{
                              minWidth: 0,
                              minHeight: 0,
                              overflow: 'hidden',
                              display: 'grid',
                              gap: 0.05,
                              alignContent: 'center',
                            }}
                          >
                            <Box
                              sx={{
                                fontSize: showSolutions
                                  ? { xs: '0.82rem', sm: '0.9rem' }
                                  : overviewCompact
                                    ? { xs: '0.86rem', sm: '0.96rem' }
                                    : { xs: '0.98rem', sm: '1.1rem' },
                                lineHeight: 1.15,
                                fontWeight: 500,
                                color: '#455a64',
                                minWidth: 0,
                                overflow: 'hidden',
                                whiteSpace: 'pre-line',
                                ...richTextSx,
                                '& img': {
                                  display: 'block',
                                  maxWidth: '100%',
                                  height: 'auto',
                                  maxHeight: showSolutions ? 38 : overviewCompact ? 48 : 67,
                                  width: 'auto',
                                  my: 0.15,
                                  borderRadius: 0.5,
                                },
                              }}
                            >
                              <EntryTicketRichHtml value={task.prompt} />
                            </Box>
                            {showSolutions && (
                              <Box
                                sx={{
                                  fontSize: { xs: '1.26rem', sm: '1.5rem' },
                                  lineHeight: 1.2,
                                  fontWeight: 800,
                                  color: '#1b5e20',
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  mt: 0.2,
                                  px: 0.55,
                                  py: 0.3,
                                  borderRadius: 1,
                                  border: '2px solid #66bb6a',
                                  bgcolor: '#e8f5e9',
                                  boxSizing: 'border-box',
                                  ...richTextSx,
                                  '& img': {
                                    display: 'inline-block',
                                    maxHeight: 43,
                                    maxWidth: 96,
                                    width: 'auto',
                                    height: 'auto',
                                    verticalAlign: 'middle',
                                    my: 0,
                                    borderRadius: 0.5,
                                  },
                                }}
                              >
                                <EntryTicketRichHtml value={task.solution || '—'} />
                              </Box>
                            )}
                          </Box>
                          {isTeacher && isCustomSetActive ? (
                            <Tooltip
                              title={
                                playTaskIsSavedForLater(task)
                                  ? 'Bereits in „Für später“'
                                  : 'Nach „Für später“ kopieren'
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => copyPlayTaskToLater(task)}
                                  disabled={playTaskIsSavedForLater(task)}
                                  aria-label="Nach Für später kopieren"
                                  sx={{
                                    p: 0,
                                    minWidth: 22,
                                    width: 22,
                                    height: 22,
                                    color: playTaskIsSavedForLater(task) ? '#fb8c00' : '#90a4ae',
                                    '&:hover': { color: '#e65100', bgcolor: 'rgba(251,140,0,0.12)' },
                                    '&.Mui-disabled': { color: '#fb8c00', opacity: 1 },
                                  }}
                                >
                                  {playTaskIsSavedForLater(task) ? (
                                    <BookmarkIcon sx={{ fontSize: 16 }} />
                                  ) : (
                                    <BookmarkAddIcon sx={{ fontSize: 16 }} />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

        </Box>
      </Box>

      <EntryTicketHistoryDialog
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        groupId={entryTicketGroupId}
        customSetId={historyTarget?.id}
        setName={historyTarget?.name}
      />

      <Dialog
        open={printFlashcardsOpen}
        onClose={() => setPrintFlashcardsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: '#455a64', color: '#fff', py: 1.25 }}>
          Karteikarten drucken
          <DialogCloseIconButton
            onClose={() => setPrintFlashcardsOpen(false)}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            iconSx={{ color: '#fff' }}
          />
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 1.5, fontSize: '0.82rem' }}>
            Wähle das aktuelle Ticket oder eine bzw. mehrere Stunden aus dem Fragenset.
          </Typography>

          <RadioGroup
            value={printSource}
            onChange={(_, v) => setPrintSource(v as 'session' | 'lessons')}
            sx={{ mb: 1.25 }}
          >
            <FormControlLabel
              value="session"
              disabled={activeTasks.length === 0}
              control={<Radio size="small" />}
              label={
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  Aktuelles Ticket ({activeTasks.length} Karten)
                </Typography>
              }
            />
            <FormControlLabel
              value="lessons"
              control={<Radio size="small" />}
              label={
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  Stunden aus „{activeCustomSet?.name || 'Fragenset'}“
                </Typography>
              }
            />
          </RadioGroup>

          <Box
            sx={{
              opacity: printSource === 'lessons' ? 1 : 0.45,
              pointerEvents: printSource === 'lessons' ? 'auto' : 'none',
              border: '1px solid #cfd8dc',
              borderRadius: 1.5,
              bgcolor: '#fafafa',
              maxHeight: 320,
              overflow: 'auto',
              px: 1,
              py: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', gap: 0.75, py: 0.5, position: 'sticky', top: 0, bgcolor: '#fafafa', zIndex: 1 }}>
              <Button
                size="small"
                onClick={() => setPrintLessonIds(printLessonsAvailable.map((l) => l.id))}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Alle
              </Button>
              <Button
                size="small"
                onClick={() => setPrintLessonIds([])}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Keine
              </Button>
            </Box>
            {printLessonsAvailable.map((lesson) => {
              const checked = printLessonIds.includes(lesson.id);
              return (
                <FormControlLabel
                  key={lesson.id}
                  sx={{
                    display: 'flex',
                    mx: 0,
                    py: 0.15,
                    alignItems: 'flex-start',
                    '& .MuiFormControlLabel-label': { width: '100%' },
                  }}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setPrintLessonIds((prev) =>
                          on ? [...prev, lesson.id] : prev.filter((id) => id !== lesson.id),
                        );
                        setPrintSource('lessons');
                      }}
                    />
                  }
                  label={
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 1,
                        width: '100%',
                        pr: 0.5,
                        pt: 0.35,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.84rem', lineHeight: 1.3 }}>
                        {lesson.lessonName}
                        {lesson.topicName ? (
                          <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                            {' '}
                            · {lesson.topicName}
                          </Typography>
                        ) : null}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#78909c',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lesson.tasks.length}
                      </Typography>
                    </Box>
                  }
                />
              );
            })}
          </Box>

          <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'text.secondary' }}>
            {printSource === 'session'
              ? `${activeTasks.length} Karten aus dem aktuellen Ticket`
              : `${printSelectedLessonTaskCount} Karten aus ${printLessonIds.length} Stunde${
                  printLessonIds.length === 1 ? '' : 'n'
                }`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 1.5, pb: 1.25, gap: 0 }}>
          <ButtonGroup size="small" variant="outlined" sx={etActionGroupSx}>
            <Button onClick={() => setPrintFlashcardsOpen(false)}>Abbrechen</Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={confirmPrintFlashcards}
              disabled={
                printSource === 'session'
                  ? activeTasks.length === 0
                  : printSelectedLessonTaskCount === 0
              }
              sx={{
                bgcolor: '#455a64',
                borderColor: '#455a64',
                color: '#fff',
                '&:hover': { bgcolor: '#37474f' },
              }}
            >
              Drucken
            </Button>
          </ButtonGroup>
        </DialogActions>
      </Dialog>

      <Dialog open={createSetOpen} onClose={() => !createSetBusy && setCreateSetOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: '#3949ab', color: '#fff', py: 1.25 }}>
          Fragenset für eine Reihe
          <DialogCloseIconButton
            onClose={() => setCreateSetOpen(false)}
            disabled={createSetBusy}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            iconSx={{ color: '#fff' }}
          />
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.25, mt: 1, fontSize: '0.82rem' }}>
            Name wie im Ordner (z.&nbsp;B. <strong>11-04 KI</strong>). Alle Stunden werden automatisch als Unterüberschriften angelegt — Karten trägst du danach manuell ein.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name der Reihe"
            placeholder="z. B. 11-04 KI"
            value={createSetName}
            disabled={createSetBusy}
            onChange={(e) => setCreateSetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void createCustomSet();
              }
            }}
          />
          {createSetError && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              {createSetError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 1.5, pb: 1.25, gap: 0 }}>
          <ButtonGroup size="small" variant="outlined" sx={etActionGroupSx}>
            <Button onClick={() => setCreateSetOpen(false)} disabled={createSetBusy}>
              Abbrechen
            </Button>
            <Button
              variant="contained"
              onClick={() => void createCustomSet()}
              disabled={createSetBusy || !createSetName.trim()}
              sx={{ bgcolor: '#3949ab', borderColor: '#3949ab', color: '#fff', '&:hover': { bgcolor: '#303f9f' } }}
            >
              {createSetBusy ? '…' : 'Anlegen'}
            </Button>
          </ButtonGroup>
        </DialogActions>
      </Dialog>

      {doneCelebrate ? (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 20000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2.5,
            bgcolor: 'rgba(232, 245, 233, 0.94)',
            backdropFilter: 'blur(10px)',
            '@keyframes etDoneFade': {
              '0%': { opacity: 0 },
              '18%': { opacity: 1 },
              '100%': { opacity: 1 },
            },
            animation: 'etDoneFade 2s ease-out both',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: 168,
              height: 168,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 168,
                height: 168,
                borderRadius: '50%',
                border: '3px solid rgba(102, 187, 106, 0.55)',
                '@keyframes etDoneRing': {
                  '0%': { transform: 'scale(0.55)', opacity: 0.85 },
                  '100%': { transform: 'scale(1.7)', opacity: 0 },
                },
                animation: 'etDoneRing 1.65s ease-out both',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 168,
                height: 168,
                borderRadius: '50%',
                border: '2px solid rgba(67, 160, 71, 0.35)',
                '@keyframes etDoneRing2': {
                  '0%': { transform: 'scale(0.55)', opacity: 0 },
                  '25%': { opacity: 0.7 },
                  '100%': { transform: 'scale(2.05)', opacity: 0 },
                },
                animation: 'etDoneRing2 1.85s 0.12s ease-out both',
              }}
            />
            <Box
              sx={{
                width: 118,
                height: 118,
                borderRadius: '50%',
                bgcolor: '#66bb6a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 16px 48px rgba(67, 160, 71, 0.42)',
                '@keyframes etDonePop': {
                  '0%': { transform: 'scale(0.15)', opacity: 0 },
                  '42%': { transform: 'scale(1.12)', opacity: 1 },
                  '68%': { transform: 'scale(0.96)' },
                  '100%': { transform: 'scale(1)' },
                },
                animation: 'etDonePop 0.72s cubic-bezier(0.22, 1.15, 0.36, 1) both',
              }}
            >
              <CheckIcon
                sx={{
                  fontSize: 68,
                  color: '#fff',
                  '@keyframes etDoneCheck': {
                    '0%': { transform: 'scale(0) rotate(-28deg)', opacity: 0 },
                    '55%': { transform: 'scale(1.12) rotate(0deg)', opacity: 1 },
                    '100%': { transform: 'scale(1) rotate(0deg)', opacity: 1 },
                  },
                  animation: 'etDoneCheck 0.55s 0.16s cubic-bezier(0.22, 1.2, 0.36, 1) both',
                }}
              />
            </Box>
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.45rem',
              letterSpacing: 0.6,
              color: '#2e7d32',
              '@keyframes etDoneLabel': {
                '0%': { opacity: 0, transform: 'translateY(12px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
              animation: 'etDoneLabel 0.45s 0.32s ease-out both',
            }}
          >
            Erledigt
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
