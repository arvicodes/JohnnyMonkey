import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Checkbox,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GradingIcon from '@mui/icons-material/Grading';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import {
  examOpenUrl,
  exerciseEditorUrl,
  exercisePresentUrl,
  scanLibraryExams,
  invalidateExamLibraryScanCache,
  scanLibraryInteractiveExercises,
  type LibraryExamItem,
  type LibraryExerciseItem,
} from '../../lib/dashboardMaterialLibrary';
import {
  EXAM_TYPE_LABELS,
  examMaterialRowStyle,
  examTypeFromFileName,
  examTitleFromFileName,
  type ExamLibraryType,
} from '../../lib/examLibraryUi';
import {
  fetchLessonExamBeacon,
  startLessonExam,
  stopLessonExam,
  teacherIdFromStorage,
} from '../../lib/lessonExamBeacon';
import { buildExamStartPayload } from '../../lib/examStartConfig';
import {
  ExamStartAdvancedSection,
  useExamStartAdvancedState,
} from './ExamStartDialogContent';
import { sortLearningGroups } from '../../lib/learningGroupSort';
import {
  fetchExamSessionHistory,
  formatExamSessionDateTime,
  formatExamSessionDuration,
  type ExamSessionHistoryRow,
} from '../../lib/examSessionHistory';
import {
  fetchExamLibraryIconsFromServer,
  getExamLibraryIcon,
  saveExamLibraryIconToServer,
  saveExamLibraryIconTemplateToServer,
  uploadExamLibraryIconImageToServer,
  upsertExamLibraryCustomIconChoice,
  examLibraryIconImageSrc,
  isExamLibraryImageIcon,
  type ExamLibraryCustomIconChoice,
  type ExamLibraryIconTemplate,
} from '../../lib/examLibraryIcons';
import EmojiSelector from '../EmojiSelector';
import {
  folderPathCovers,
  folderPathsEquivalent,
  toPortableWorkingReihePath,
} from '../../lib/dashboardWorkingReihen';
import {
  INFORMATIK_FOLDER_BG,
  INFORMATIK_FOLDER_BORDER,
  isInformatikFolderPath,
  resolveLearningGroupDisplayStyle,
} from '../../lib/learningGroupAppearance';

/** Farben wie in der Präsentation: P rot, Ü gelb, E blau. */
const COLOR_PRUEFUNG = '#c62828';
const COLOR_PRUEFUNG_HOVER = '#b71c1c';
const COLOR_UEBUNG = '#FBC02D';
const COLOR_UEBUNG_TEXT = '#F57F17';
const COLOR_UEBUNG_HOVER = '#F9A825';
const COLOR_ENTRY = '#1e88e5';
const COLOR_ENTRY_DEEP = '#3949ab';

/** Farben wie im Reihen-Baum (Stufe / Thema). */
const REIHE_STUFE = '#6a1b9a';
const REIHE_THEMA = '#1565c0';
const BTN_EDIT = '#ef6c00';
const BTN_EDIT_HOVER = '#e65100';
const BTN_PLAY = '#2e7d32';
const BTN_PLAY_HOVER = '#1b5e20';
const BTN_OPEN = '#1976d2';
const BTN_OPEN_HOVER = '#1565c0';
const BTN_CORRECT = '#7b1fa2';
const BTN_CORRECT_HOVER = '#6a1b9a';
const BTN_DELETE = '#c62828';
const BTN_DELETE_HOVER = '#b71c1c';

type Colors = {
  cardBg: string;
  primary: string;
  secondary?: string;
  accent1?: string;
  accent2?: string;
  border: string;
  textPrimary?: string;
  textSecondary?: string;
  warning?: string;
};

type GroupLite = {
  id: string;
  name: string;
  color?: string | null;
  iconEmoji?: string | null;
  displayOrder?: number | null;
  isArchived?: boolean;
};

type LibraryGroupMeta = {
  groups: GroupLite[];
  assignedFolders: Record<string, string[]>;
};

function pathMatchesAssigned(itemPath: string, assignedPath: string): boolean {
  const a = toPortableWorkingReihePath(assignedPath) || assignedPath;
  const b = toPortableWorkingReihePath(itemPath) || itemPath;
  return folderPathsEquivalent(a, b) || folderPathCovers(a, b) || folderPathCovers(b, a);
}

function normalizeExamBeaconPath(raw: string): string {
  let p = (raw || '').replace(/\\/g, '/').trim();
  if (p.startsWith('J-M-Reihen/')) p = `git-intern/${p.slice('J-M-Reihen/'.length)}`;
  return p.toLowerCase();
}

function examBeaconPathsEqual(a: string, b: string): boolean {
  return normalizeExamBeaconPath(a) === normalizeExamBeaconPath(b);
}

function groupsForMaterialPath(
  itemPath: string,
  meta?: LibraryGroupMeta,
): GroupLite[] {
  if (!meta?.groups?.length) return [];
  const out: GroupLite[] = [];
  for (const g of meta.groups) {
    const folders = meta.assignedFolders[g.id] || [];
    if (folders.some((fp) => pathMatchesAssigned(itemPath, fp))) {
      out.push(g);
    }
  }
  return out;
}

type StufeBucket<T> = {
  stufe: string;
  subject: string;
  reihen: Array<{ reihe: string; items: T[] }>;
};

function groupByStufeReihe<T extends { stufe: string; reihe: string; subject: string; name?: string; modifiedAt?: number }>(
  items: T[],
): StufeBucket<T>[] {
  const stufeMap = new Map<string, Map<string, T[]>>();
  const subjectByStufe = new Map<string, string>();
  for (const item of items) {
    const stufe = item.stufe || 'Sonstiges';
    const reihe = item.reihe || stufe;
    if (!stufeMap.has(stufe)) stufeMap.set(stufe, new Map());
    const reihen = stufeMap.get(stufe)!;
    if (!reihen.has(reihe)) reihen.set(reihe, []);
    reihen.get(reihe)!.push(item);
    if (!subjectByStufe.has(stufe) && item.subject) subjectByStufe.set(stufe, item.subject);
  }
  return [...stufeMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'de', { numeric: true }))
    .map(([stufe, reihenMap]) => ({
      stufe,
      subject: subjectByStufe.get(stufe) || '',
      reihen: [...reihenMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'de', { numeric: true }))
        .map(([reihe, list]) => ({
          reihe,
          items: [...list].sort(
            (a, b) =>
              (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0) ||
              (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' }),
          ),
        })),
    }));
}

const tinyBtnBase = {
  p: 0,
  minWidth: 22,
  width: 22,
  height: 22,
  borderRadius: '50%',
  color: '#fff',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
} as const;

function TinyAction({
  title,
  onClick,
  bgcolor,
  hover,
  children,
}: {
  title: string;
  onClick: () => void;
  bgcolor: string;
  hover: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        aria-label={title}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        sx={{ ...tinyBtnBase, bgcolor, '&:hover': { bgcolor: hover } }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

function LibraryShell({
  colors,
  title,
  titleColor,
  icon,
  loading,
  empty,
  emptyHint,
  children,
  onReload,
  onCreateNew,
  onCreateNewAlt,
  onSaveIconTemplate,
  iconTemplateSaving,
  createLabel = 'Neu',
  createAltLabel = 'Variante 2',
  createColor = BTN_EDIT,
  createHover = BTN_EDIT_HOVER,
  createAltColor = BTN_EDIT,
  createAltHover = BTN_EDIT_HOVER,
}: {
  colors: Colors;
  title: string;
  titleColor?: string;
  icon: React.ReactNode;
  loading: boolean;
  empty: boolean;
  emptyHint: string;
  children: React.ReactNode;
  onReload: () => void;
  onCreateNew?: () => void;
  onCreateNewAlt?: () => void;
  onSaveIconTemplate?: () => void;
  iconTemplateSaving?: boolean;
  createLabel?: string;
  createAltLabel?: string;
  createColor?: string;
  createHover?: string;
  createAltColor?: string;
  createAltHover?: string;
}) {
  const createBtnCount = (onCreateNew ? 1 : 0) + (onCreateNewAlt ? 1 : 0);
  return (
    <Box sx={{ p: 1.4, position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 0.4,
        }}
      >
        {onCreateNew ? (
          <Tooltip title={createLabel}>
            <IconButton
              size="small"
              aria-label={createLabel}
              onClick={onCreateNew}
              sx={{
                color: '#fff',
                bgcolor: createColor,
                width: 28,
                height: 28,
                '&:hover': { bgcolor: createHover },
              }}
            >
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        {onCreateNewAlt ? (
          <Tooltip title={createAltLabel}>
            <IconButton
              size="small"
              aria-label={createAltLabel}
              onClick={onCreateNewAlt}
              sx={{
                color: '#fff',
                bgcolor: createAltColor,
                width: 28,
                height: 28,
                '&:hover': { bgcolor: createAltHover },
              }}
            >
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        {onSaveIconTemplate ? (
          <Tooltip title="Aktuelle Prüfungs-Icons als Vorlage speichern">
            <span>
              <IconButton
                size="small"
                aria-label="Icon-Vorlage speichern"
                onClick={onSaveIconTemplate}
                disabled={Boolean(iconTemplateSaving)}
                sx={{
                  color: '#fff',
                  bgcolor: '#6a1b9a',
                  width: 28,
                  height: 28,
                  '&:hover': { bgcolor: '#4a148c' },
                }}
              >
                {iconTemplateSaving ? (
                  <CircularProgress size={14} sx={{ color: '#fff' }} />
                ) : (
                  <BookmarkIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip title="Aktualisieren">
          <span>
            <IconButton
              size="small"
              aria-label="Aktualisieren"
              onClick={onReload}
              disabled={loading}
              sx={{
                color: titleColor || colors.primary,
                bgcolor: 'rgba(255,255,255,0.95)',
                border: `1px solid ${colors.border}`,
                width: 28,
                height: 28,
                '&:hover': { bgcolor: '#fff' },
              }}
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.45,
          mb: 1.1,
          pr: createBtnCount > 1 ? 10.5 : createBtnCount === 1 ? 7.5 : 4.5,
        }}
      >
        <Box sx={{ color: titleColor || colors.primary, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 650, color: titleColor || colors.primary }}>
          {title}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3.5 }}>
          <CircularProgress size={26} sx={{ color: titleColor || colors.primary }} />
        </Box>
      ) : empty ? (
        <Box sx={{ px: 0.5 }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontStyle: 'italic', mb: onCreateNew ? 1 : 0 }}>
            {emptyHint}
          </Typography>
          {(onCreateNew || onCreateNewAlt) ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
              {onCreateNew ? (
                <Box
                  component="button"
                  onClick={onCreateNew}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                    border: `1px solid ${createColor}66`,
                    bgcolor: `${createColor}14`,
                    color: createColor,
                    borderRadius: 1.2,
                    px: 1,
                    py: 0.45,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    '&:hover': { bgcolor: `${createColor}24` },
                  }}
                >
                  <AddIcon sx={{ fontSize: 15 }} />
                  {createLabel}
                </Box>
              ) : null}
              {onCreateNewAlt ? (
                <Box
                  component="button"
                  onClick={onCreateNewAlt}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                    border: `1px solid ${createAltColor}66`,
                    bgcolor: `${createAltColor}14`,
                    color: createAltColor,
                    borderRadius: 1.2,
                    px: 1,
                    py: 0.45,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    '&:hover': { bgcolor: `${createAltColor}24` },
                  }}
                >
                  <AddIcon sx={{ fontSize: 15 }} />
                  {createAltLabel}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      ) : (
        children
      )}
    </Box>
  );
}

function GroupChips({ groups, fallbackPrimary }: { groups: GroupLite[]; fallbackPrimary: string }) {
  if (!groups.length) {
    return (
      <Typography sx={{ fontSize: '0.58rem', color: '#9e9e9e', fontStyle: 'italic' }}>
        keine Lerngruppe
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, alignItems: 'center' }}>
      {groups.map((g) => {
        const style = resolveLearningGroupDisplayStyle(g, fallbackPrimary);
        return (
          <Chip
            key={g.id}
            size="small"
            label={`${g.iconEmoji ? `${g.iconEmoji} ` : ''}${g.name}`}
            sx={{
              height: 18,
              fontSize: '0.58rem',
              fontWeight: 700,
              bgcolor: style.boxBg,
              color: style.groupColor,
              border: style.boxBorder,
              '& .MuiChip-label': { px: 0.7, py: 0 },
            }}
          />
        );
      })}
    </Box>
  );
}

function MaterialRow({
  title,
  subtitle,
  accent,
  accentWidth = 3,
  rowBg = '#FFFFFF',
  icon,
  onIconClick,
  actions,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  accentWidth?: number;
  rowBg?: string;
  icon?: string;
  onIconClick?: () => void;
  actions: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.6,
        px: 0.75,
        py: 0.45,
        borderRadius: 1.1,
        bgcolor: rowBg,
        border: '1px solid #e0e0e0',
        minHeight: 30,
        '&:hover': { bgcolor: rowBg, filter: 'brightness(0.98)' },
      }}
    >
      <Box
        sx={{
          width: accentWidth,
          alignSelf: 'stretch',
          borderRadius: 0.5,
          bgcolor: accent,
          flexShrink: 0,
          minHeight: 16,
        }}
      />
      {icon ? (
        <Tooltip title="Icon ändern">
          <Box
            component="button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIconClick?.();
            }}
            sx={{
              flexShrink: 0,
              border: 'none',
              bgcolor: 'transparent',
              cursor: onIconClick ? 'pointer' : 'default',
              p: 0,
              m: 0,
              lineHeight: 1,
              fontSize: '1.05rem',
              width: 26,
              height: 26,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
              '&:hover': onIconClick ? { bgcolor: 'rgba(0,0,0,0.05)' } : undefined,
            }}
            aria-label="Prüfungs-Icon ändern"
          >
            {isExamLibraryImageIcon(icon) ? (
              <Box
                component="img"
                src={examLibraryIconImageSrc(icon, 96)}
                alt=""
                sx={{ width: 22, height: 22, objectFit: 'contain', display: 'block' }}
              />
            ) : (
              icon
            )}
          </Box>
        </Tooltip>
      ) : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.74rem',
            fontWeight: 650,
            color: '#37474f',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
          title={title}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              fontSize: '0.58rem',
              color: '#90a4ae',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}>{actions}</Box>
    </Box>
  );
}

function StufeReiheSections<T extends { stufe: string; reihe: string; subject: string }>({
  buckets,
  colors,
  meta,
  itemPath,
  renderItem,
  itemAccent,
  onCreateInFolder,
  createAccent = COLOR_PRUEFUNG,
}: {
  buckets: StufeBucket<T>[];
  colors: Colors;
  meta?: LibraryGroupMeta;
  itemPath: (item: T) => string;
  renderItem: (item: T, accent: string) => React.ReactNode;
  itemAccent: string;
  onCreateInFolder?: (folderPath: string) => void;
  createAccent?: string;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
      {buckets.map((bucket) => {
        const isInf =
          isInformatikFolderPath(bucket.stufe) ||
          isInformatikFolderPath(bucket.subject) ||
          /informatik/i.test(bucket.subject);
        return (
          <Box
            key={`${bucket.subject}:${bucket.stufe}`}
            sx={{
              p: 1.15,
              borderRadius: 2.2,
              bgcolor: isInf ? INFORMATIK_FOLDER_BG : '#fff',
              border: isInf ? INFORMATIK_FOLDER_BORDER : '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6, mb: 0.7, flexWrap: 'wrap' }}>
              <Typography
                sx={{ fontSize: '0.78rem', fontWeight: 750, color: REIHE_STUFE, lineHeight: 1.2 }}
              >
                {bucket.stufe}
              </Typography>
              {bucket.subject ? (
                <Typography sx={{ fontSize: '0.62rem', color: '#9c27b0', fontWeight: 600 }}>
                  {bucket.subject}
                </Typography>
              ) : null}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
              {bucket.reihen.map(({ reihe, items }) => {
                const linkedGroups = groupsForMaterialPath(itemPath(items[0]), meta);
                const createPath = itemPath(items[0]);
                return (
                  <Box
                    key={reihe}
                    sx={{
                      p: 0.85,
                      borderRadius: 1.5,
                      bgcolor: '#fafbfc',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 0.75,
                        mb: 0.55,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: REIHE_THEMA,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                        title={reihe}
                      >
                        {reihe}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45, flexWrap: 'wrap' }}>
                        <GroupChips groups={linkedGroups} fallbackPrimary={colors.primary} />
                        {onCreateInFolder && createPath ? (
                          <Tooltip title="Neu in dieser Reihe">
                            <IconButton
                              size="small"
                              aria-label="Neu in dieser Reihe"
                              onClick={() => onCreateInFolder(createPath)}
                              sx={{
                                p: 0,
                                width: 20,
                                height: 20,
                                bgcolor: `${createAccent}18`,
                                color: createAccent,
                                border: `1px solid ${createAccent}55`,
                                borderRadius: '50%',
                                '&:hover': { bgcolor: `${createAccent}28` },
                              }}
                            >
                              <AddIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                      {items.map((item) => renderItem(item, itemAccent))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export const DashboardExamsPanel: React.FC<{
  rootPaths: string[];
  colors: Colors;
  onCorrectExam?: (item: LibraryExamItem) => void;
  onDeleteExam?: (item: LibraryExamItem) => void;
  onDuplicateExam?: (item: LibraryExamItem) => void | Promise<void>;
  onCreateExam?: (folderPath?: string) => void;
  /** Variante 2: nach Erstellen Standard-Prüfungsvorschau (Chrome links) in neuem Tab. */
  onCreateExamStandardTab?: (folderPath?: string) => void;
  groups?: GroupLite[];
  assignedFolders?: Record<string, string[]>;
  /** Nach Löschen im Dashboard erhöhen, damit die Liste neu lädt. */
  refreshKey?: number;
  onNotify?: (message: string, severity?: 'success' | 'error' | 'warning') => void;
}> = ({
  rootPaths,
  colors,
  onCorrectExam,
  onDeleteExam,
  onDuplicateExam,
  onCreateExam,
  onCreateExamStandardTab,
  groups = [],
  assignedFolders = {},
  refreshKey = 0,
  onNotify,
}) => {
  const [items, setItems] = useState<LibraryExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeDialogItem, setTypeDialogItem] = useState<LibraryExamItem | null>(null);
  const [typeChoice, setTypeChoice] = useState<ExamLibraryType>('QZ');
  const [typeName, setTypeName] = useState('');
  const [typeSaving, setTypeSaving] = useState(false);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const [iconTemplate, setIconTemplate] = useState<ExamLibraryIconTemplate | null>(null);
  const [customIconChoices, setCustomIconChoices] = useState<ExamLibraryCustomIconChoice[]>([]);
  const [iconTemplateSaving, setIconTemplateSaving] = useState(false);
  const [iconPickerItem, setIconPickerItem] = useState<LibraryExamItem | null>(null);
  const [duplicatingPath, setDuplicatingPath] = useState<string | null>(null);
  const [activeExamBeacons, setActiveExamBeacons] = useState<
    Record<string, { filePath: string; beaconId: string }>
  >({});
  const [examStartDialogItem, setExamStartDialogItem] = useState<LibraryExamItem | null>(null);
  const [examStartGroupIds, setExamStartGroupIds] = useState<string[]>([]);
  const examStartAdvanced = useExamStartAdvancedState(examStartGroupIds);
  const examStartGroupsOrdered = useMemo(() => {
    const active = sortLearningGroups(groups.filter((g) => !g.isArchived));
    const archived = sortLearningGroups(groups.filter((g) => g.isArchived));
    return [...active, ...archived];
  }, [groups]);
  const examStartSelectedGroupIdsOrdered = useMemo(
    () =>
      examStartGroupsOrdered
        .filter((g) => examStartGroupIds.includes(g.id))
        .map((g) => g.id),
    [examStartGroupsOrdered, examStartGroupIds],
  );
  const [examRunBusyPath, setExamRunBusyPath] = useState<string | null>(null);
  const [lastStartGroupIdsByExam, setLastStartGroupIdsByExam] = useState<Record<string, string[]>>(
    {},
  );
  const [examHistoryItem, setExamHistoryItem] = useState<LibraryExamItem | null>(null);
  const [examHistoryRows, setExamHistoryRows] = useState<ExamSessionHistoryRow[]>([]);
  const [examHistoryLoading, setExamHistoryLoading] = useState(false);
  const [examHistoryError, setExamHistoryError] = useState<string | null>(null);

  const loadExamIcons = useCallback(async () => {
    const loaded = await fetchExamLibraryIconsFromServer();
    setIconMap(loaded.icons);
    setIconTemplate(loaded.template);
    setCustomIconChoices(loaded.customIconChoices);
  }, []);

  const meta = useMemo(() => ({ groups, assignedFolders }), [groups, assignedFolders]);

  const rootsKey = useMemo(
    () => [...rootPaths].map((p) => p.replace(/\\/g, '/').replace(/\/+$/, '').trim()).sort().join('|'),
    [rootPaths],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const iconsPromise = loadExamIcons();
      let firstProgress = false;
      await scanLibraryExams(rootPaths, {
        skipDeckSlideExams: true,
        onProgress: (partial) => {
          setItems(partial);
          if (!firstProgress) {
            firstProgress = true;
            setLoading(false);
          }
        },
      });
      await iconsPromise;
      void scanLibraryExams(rootPaths, {
        onProgress: (partial) => {
          setItems(partial);
        },
      });
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rootsKey, rootPaths, loadExamIcons]);

  const reloadExams = useCallback(async () => {
    const { invalidateFsDirectoryCache } = await import('../../lib/fsTreeCache');
    invalidateFsDirectoryCache();
    invalidateExamLibraryScanCache();
    await load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const teacherGroupIdsKey = useMemo(
    () =>
      [...groups]
        .map((g) => g.id)
        .filter(Boolean)
        .sort()
        .join('|'),
    [groups],
  );

  useEffect(() => {
    if (!teacherGroupIdsKey) {
      setActiveExamBeacons({});
      return undefined;
    }
    const ids = teacherGroupIdsKey.split('|').filter(Boolean);
    let cancelled = false;
    const refresh = async () => {
      const next: Record<string, { filePath: string; beaconId: string }> = {};
      await Promise.all(
        ids.map(async (gid) => {
          try {
            const status = await fetchLessonExamBeacon(gid);
            if (status.active && status.filePath && status.beaconId) {
              next[gid] = {
                filePath: status.filePath.replace(/\\/g, '/'),
                beaconId: status.beaconId,
              };
            }
          } catch {
            /* ignore */
          }
        }),
      );
      if (!cancelled) setActiveExamBeacons(next);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [teacherGroupIdsKey, refreshKey]);

  const runningGroupIdsForExam = useCallback(
    (examPath: string) =>
      groups
        .map((g) => g.id)
        .filter((gid) => {
          const row = activeExamBeacons[gid];
          return row && examBeaconPathsEqual(row.filePath, examPath);
        }),
    [groups, activeExamBeacons],
  );

  const openExamStartDialog = useCallback(
    (item: LibraryExamItem) => {
      const examKey = normalizeExamBeaconPath(item.path);
      const suggested = groupsForMaterialPath(item.lessonFolder, meta).map((g) => g.id);
      const fromLast = lastStartGroupIdsByExam[examKey];
      let preselect = fromLast?.length ? fromLast : suggested;
      if (!preselect.length && groups.length === 1) preselect = [groups[0].id];
      setExamStartGroupIds(preselect);
      setExamStartDialogItem(item);

      const teacherId = teacherIdFromStorage();
      const lesson = (item.lessonFolder || '').replace(/\\/g, '/').trim();
      if (!teacherId || !lesson) return;
      void fetch(
        `/api/learning-groups/groups-for-path?path=${encodeURIComponent(lesson)}&teacherId=${encodeURIComponent(teacherId)}`,
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { groupIds?: string[] } | null) => {
          const ids = (data?.groupIds || []).filter(Boolean);
          if (ids.length) setExamStartGroupIds(ids);
        })
        .catch(() => {});
    },
    [groups, lastStartGroupIdsByExam, meta],
  );

  const stopExamForGroups = useCallback(
    async (item: LibraryExamItem, groupIds: string[]) => {
      const useIds = [...new Set(groupIds.map((id) => id.trim()).filter(Boolean))];
      if (!useIds.length) return;
      setExamRunBusyPath(item.path);
      try {
        const teacherId = teacherIdFromStorage();
        if (!teacherId) throw new Error('Bitte zuerst anmelden.');
        await stopLessonExam({ teacherId, groupIds: useIds });
        setActiveExamBeacons((prev) => {
          const next = { ...prev };
          for (const gid of useIds) delete next[gid];
          return next;
        });
        onNotify?.('Prüfung beendet', 'success');
      } catch (e) {
        onNotify?.(e instanceof Error ? e.message : 'Prüfung konnte nicht beendet werden', 'error');
      } finally {
        setExamRunBusyPath(null);
      }
    },
    [onNotify],
  );

  const confirmExamStart = useCallback(async () => {
    const item = examStartDialogItem;
    if (!item) return;
    const useIds = [...new Set(examStartGroupIds.map((id) => id.trim()).filter(Boolean))];
    if (!useIds.length) {
      onNotify?.('Bitte mindestens eine Lerngruppe wählen.', 'warning');
      return;
    }
    setExamStartDialogItem(null);
    setExamRunBusyPath(item.path);
    try {
      const teacherId = teacherIdFromStorage();
      if (!teacherId) throw new Error('Bitte zuerst anmelden.');
      const examConfig = buildExamStartPayload(useIds, examStartAdvanced.buildConfigForStart());
      const started = await startLessonExam({
        teacherId,
        groupIds: useIds,
        filePath: item.path,
        lessonPath: item.lessonFolder,
        examConfig,
      });
      const filePath = (started.filePath || item.path).replace(/\\/g, '/');
      const examKey = normalizeExamBeaconPath(item.path);
      setLastStartGroupIdsByExam((prev) => ({ ...prev, [examKey]: started.groupIds || useIds }));
      setActiveExamBeacons((prev) => {
        const next = { ...prev };
        for (const gid of started.groupIds || useIds) {
          next[gid] = { filePath, beaconId: started.beaconId };
        }
        return next;
      });
      onNotify?.(
        (started.groupIds || useIds).length > 1
          ? `Prüfung gestartet — ${(started.groupIds || useIds).length} Lerngruppen sehen Vollbild`
          : 'Prüfung gestartet — SuS sehen Vollbild',
        'success',
      );
    } catch (e) {
      onNotify?.(e instanceof Error ? e.message : 'Prüfung konnte nicht gestartet werden', 'error');
    } finally {
      setExamRunBusyPath(null);
    }
  }, [examStartDialogItem, examStartGroupIds, examStartAdvanced, onNotify]);

  const openExamHistoryDialog = useCallback((item: LibraryExamItem) => {
    setExamHistoryItem(item);
    setExamHistoryRows([]);
    setExamHistoryError(null);
    setExamHistoryLoading(true);
    void fetchExamSessionHistory(item.path)
      .then((rows) => setExamHistoryRows(rows))
      .catch((e) =>
        setExamHistoryError(e instanceof Error ? e.message : 'Historie konnte nicht geladen werden'),
      )
      .finally(() => setExamHistoryLoading(false));
  }, []);

  const refreshExamHistory = useCallback(() => {
    if (!examHistoryItem) return;
    setExamHistoryLoading(true);
    setExamHistoryError(null);
    void fetchExamSessionHistory(examHistoryItem.path)
      .then((rows) => setExamHistoryRows(rows))
      .catch((e) =>
        setExamHistoryError(e instanceof Error ? e.message : 'Historie konnte nicht geladen werden'),
      )
      .finally(() => setExamHistoryLoading(false));
  }, [examHistoryItem]);

  const buckets = useMemo(() => groupByStufeReihe(items), [items]);

  const emptyHint =
    rootPaths.length === 0
      ? 'Noch keine Arbeits-Reihe gewählt — im Tab „Reihen“ eine Reihe auswählen.'
      : 'Noch keine Prüfung unter den gewählten Reihen / Lerngruppen-Ordnern.';

  const isExamVariantFile = (name: string) => /__[A-Z]\.html?$/i.test(name || '');

  const openTypeDialog = (item: LibraryExamItem) => {
    setTypeDialogItem(item);
    setTypeChoice(examTypeFromFileName(item.name) || 'QZ');
    setTypeName(examTitleFromFileName(item.name));
  };

  const saveIconTemplate = () => {
    setIconTemplateSaving(true);
    void (async () => {
      try {
        const { icons, iconTemplate: tpl } = await saveExamLibraryIconTemplateToServer();
        setIconMap(icons);
        setIconTemplate(tpl);
        void loadExamIcons();
        const n = Object.keys(tpl.icons).length;
        onNotify?.(
          n
            ? `Icon-Vorlage gespeichert (${n} Zuordnung${n === 1 ? '' : 'en'})`
            : 'Icon-Vorlage gespeichert',
          'success',
        );
      } catch (e) {
        onNotify?.(e instanceof Error ? e.message : 'Vorlage konnte nicht gespeichert werden', 'error');
      } finally {
        setIconTemplateSaving(false);
      }
    })();
  };

  const submitTypeChange = async () => {
    if (!typeDialogItem || !typeChoice || !typeName.trim()) return;
    setTypeSaving(true);
    try {
      const res = await fetch('/api/file-system-paths/change-examination-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': localStorage.getItem('loginCode') || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          filePath: typeDialogItem.path,
          examType: typeChoice,
          examName: typeName.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fileName?: string;
        unchanged?: boolean;
        presentationPatched?: boolean;
      };
      if (!res.ok) throw new Error(data.error || 'Typ konnte nicht geändert werden');
      if (data.presentationPatched && data.unchanged) {
        onNotify?.('Titel in der Prüfung und im Tab wurden aktualisiert — bitte Tab neu laden', 'success');
      } else if (data.unchanged) {
        onNotify?.('Keine Änderung nötig', 'success');
      } else {
        onNotify?.(
          `Umbenannt in ${data.fileName || typeChoice + '_…'} — alten Tab schließen und Datei neu öffnen`,
          'success',
        );
      }
      setTypeDialogItem(null);
      void load();
    } catch (e) {
      onNotify?.(e instanceof Error ? e.message : 'Typ konnte nicht geändert werden', 'error');
    } finally {
      setTypeSaving(false);
    }
  };

  const examCustomIconChoices = customIconChoices;

  return (
    <>
    <LibraryShell
      colors={colors}
      title="Prüfungen"
      titleColor={COLOR_PRUEFUNG}
      icon={<AssignmentIcon sx={{ fontSize: 16 }} />}
      loading={loading}
      empty={!items.length}
      emptyHint={emptyHint}
      onReload={() => void load()}
      onCreateNew={onCreateExam ? () => onCreateExam() : undefined}
      onCreateNewAlt={onCreateExamStandardTab ? () => onCreateExamStandardTab() : undefined}
      createLabel="Neue Prüfung"
      createAltLabel="Neue Prüfung (Standarddesign, neuer Tab)"
      createColor={COLOR_PRUEFUNG}
      createHover={COLOR_PRUEFUNG_HOVER}
      createAltColor={BTN_EDIT}
      createAltHover={BTN_EDIT_HOVER}
      onSaveIconTemplate={saveIconTemplate}
      iconTemplateSaving={iconTemplateSaving}
    >
      <StufeReiheSections
        buckets={buckets}
        colors={colors}
        meta={meta}
        itemPath={(item) => item.lessonFolder || item.path}
        itemAccent={COLOR_PRUEFUNG}
        onCreateInFolder={onCreateExam}
        createAccent={COLOR_PRUEFUNG}
        renderItem={(item) => {
          const rowStyle = examMaterialRowStyle(item.name);
          return (
          <MaterialRow
            key={item.path}
            title={item.name}
            subtitle={item.lessonLabel !== item.reihe ? item.lessonLabel : undefined}
            accent={rowStyle.accent}
            accentWidth={rowStyle.accentWidth}
            rowBg={rowStyle.rowBg}
            icon={getExamLibraryIcon(item.path, item.name, iconMap, iconTemplate)}
            onIconClick={() => setIconPickerItem(item)}
            actions={
              <>
                {!isExamVariantFile(item.name) ? (() => {
                  const runningGids = runningGroupIdsForExam(item.path);
                  const isRunning = runningGids.length > 0;
                  const runBusy = examRunBusyPath === item.path;
                  return (
                    <TinyAction
                      title={
                        isRunning
                          ? `Prüfung beenden (${runningGids.length} Lerngruppe${runningGids.length === 1 ? '' : 'n'})`
                          : 'Prüfung starten — Lerngruppe wählen'
                      }
                      bgcolor={isRunning ? BTN_DELETE : BTN_PLAY}
                      hover={isRunning ? BTN_DELETE_HOVER : BTN_PLAY_HOVER}
                      onClick={() => {
                        if (runBusy) return;
                        if (isRunning) void stopExamForGroups(item, runningGids);
                        else openExamStartDialog(item);
                      }}
                    >
                      {runBusy ? (
                        <CircularProgress size={11} sx={{ color: '#fff' }} />
                      ) : isRunning ? (
                        <StopIcon sx={{ fontSize: 12 }} />
                      ) : (
                        <PlayArrowIcon sx={{ fontSize: 13 }} />
                      )}
                    </TinyAction>
                  );
                })() : null}
                {!isExamVariantFile(item.name) ? (
                  <TinyAction
                    title="Historie — Starts, Dauer und Abgaben pro Lerngruppe"
                    bgcolor="#546e7a"
                    hover="#455a64"
                    onClick={() => openExamHistoryDialog(item)}
                  >
                    <HistoryIcon sx={{ fontSize: 12 }} />
                  </TinyAction>
                ) : null}
                {onCorrectExam ? (
                  <TinyAction
                    title="Korrektur"
                    bgcolor={BTN_CORRECT}
                    hover={BTN_CORRECT_HOVER}
                    onClick={() => onCorrectExam(item)}
                  >
                    <GradingIcon sx={{ fontSize: 12 }} />
                  </TinyAction>
                ) : null}
                {!isExamVariantFile(item.name) && onDuplicateExam ? (
                  <TinyAction
                    title="Prüfung duplizieren (Kopie im gleichen Ordner)"
                    bgcolor="#00838f"
                    hover="#006064"
                    onClick={() => {
                      if (duplicatingPath) return;
                      setDuplicatingPath(item.path);
                      void (async () => {
                        try {
                          await onDuplicateExam(item);
                          await reloadExams();
                        } finally {
                          setDuplicatingPath(null);
                        }
                      })();
                    }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 12, opacity: duplicatingPath === item.path ? 0.5 : 1 }} />
                  </TinyAction>
                ) : null}
                {!isExamVariantFile(item.name) ? (
                  <TinyAction
                    title="Prüfungstyp ändern (QZ → HÜ …)"
                    bgcolor="#546e7a"
                    hover="#455a64"
                    onClick={() => openTypeDialog(item)}
                  >
                    <SwapHorizIcon sx={{ fontSize: 12 }} />
                  </TinyAction>
                ) : null}
                {onDeleteExam ? (
                  <TinyAction
                    title={
                      isExamVariantFile(item.name)
                        ? 'Prüfungsversion löschen'
                        : 'Prüfung löschen (inkl. aller Versionen)'
                    }
                    bgcolor={BTN_DELETE}
                    hover={BTN_DELETE_HOVER}
                    onClick={() => onDeleteExam(item)}
                  >
                    <DeleteIcon sx={{ fontSize: 12 }} />
                  </TinyAction>
                ) : null}
                <TinyAction
                  title="Öffnen"
                  bgcolor={BTN_OPEN}
                  hover={BTN_OPEN_HOVER}
                  onClick={() => window.open(examOpenUrl(item.path), '_blank', 'noopener,noreferrer')}
                >
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </TinyAction>
              </>
            }
          />
          );
        }}
      />
    </LibraryShell>
    <Dialog open={Boolean(typeDialogItem)} onClose={() => !typeSaving && setTypeDialogItem(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Prüfungstyp ändern</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
          Datei: <strong>{typeDialogItem?.name}</strong>
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
          Typ-Präfix und Dateiname werden angepasst (z. B. QZ_… → HU_…), inkl. aller Versionen A/B/C.
        </Typography>
        <TextField
          label="Name (Dateiname ohne Präfix)"
          value={typeName}
          onChange={(e) => setTypeName(e.target.value)}
          fullWidth
          size="small"
          margin="dense"
          disabled={typeSaving}
          helperText={`Ergebnis: ${typeChoice}_${typeName.trim() || '…'}.html`}
          sx={{ mb: 1.5 }}
        />
        <RadioGroup
          value={typeChoice}
          onChange={(e) => setTypeChoice(e.target.value as ExamLibraryType)}
        >
          {(Object.keys(EXAM_TYPE_LABELS) as Exclude<ExamLibraryType, ''>[]).map((t) => (
            <FormControlLabel
              key={t}
              value={t}
              control={<Radio size="small" />}
              label={EXAM_TYPE_LABELS[t]}
            />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTypeDialogItem(null)} disabled={typeSaving}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          onClick={() => void submitTypeChange()}
          disabled={typeSaving || !typeChoice || !typeName.trim()}
        >
          {typeSaving ? 'Speichern…' : 'Umbenennen'}
        </Button>
      </DialogActions>
    </Dialog>
    <Dialog
      open={Boolean(examStartDialogItem)}
      onClose={() => setExamStartDialogItem(null)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Prüfung starten — Lerngruppe(n)</DialogTitle>
      <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {groups.length === 0 ? (
          <Typography variant="body2">Keine Lerngruppe vorhanden — zuerst im Tab „Lerngruppen“ anlegen.</Typography>
        ) : (
          <FormGroup>
            {examStartGroupsOrdered.map((g) => (
              <FormControlLabel
                key={g.id}
                sx={{
                  ml: 0,
                  ...(g.isArchived
                    ? {
                        color: 'text.disabled',
                        '& .MuiCheckbox-root': { color: 'action.disabled' },
                      }
                    : {}),
                }}
                control={
                  <Checkbox
                    size="small"
                    checked={examStartGroupIds.includes(g.id)}
                    onChange={(_, checked) => {
                      setExamStartGroupIds((prev) =>
                        checked ? [...new Set([...prev, g.id])] : prev.filter((id) => id !== g.id),
                      );
                    }}
                  />
                }
                label={
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      color: g.isArchived ? 'text.disabled' : 'text.primary',
                      fontStyle: g.isArchived ? 'italic' : 'normal',
                    }}
                  >
                    {g.name}
                    {g.isArchived ? ' (Archiv)' : ''}
                  </Typography>
                }
              />
            ))}
          </FormGroup>
        )}
        <ExamStartAdvancedSection
          groups={examStartGroupsOrdered}
          selectedGroupIds={examStartSelectedGroupIdsOrdered}
          advanced={examStartAdvanced}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExamStartDialogItem(null)}>Abbrechen</Button>
        <Button
          variant="contained"
          disabled={!examStartGroupIds.length || examRunBusyPath === examStartDialogItem?.path}
          onClick={() => void confirmExamStart()}
          sx={{ bgcolor: COLOR_PRUEFUNG, '&:hover': { bgcolor: COLOR_PRUEFUNG_HOVER } }}
        >
          Starten
        </Button>
      </DialogActions>
    </Dialog>
    <Dialog
      open={Boolean(examHistoryItem)}
      onClose={() => setExamHistoryItem(null)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <span>
          Historie —{' '}
          {examHistoryItem?.name.replace(/\.html?$/i, '') || 'Prüfung'}
        </span>
        <Tooltip title="Aktualisieren">
          <span>
            <IconButton
              size="small"
              aria-label="Historie aktualisieren"
              disabled={examHistoryLoading}
              onClick={() => refreshExamHistory()}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        {examHistoryLoading && examHistoryRows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : examHistoryError ? (
          <Typography color="error" variant="body2">
            {examHistoryError}
          </Typography>
        ) : examHistoryRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Noch keine protokollierten Starts für diese Prüfung.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lerngruppe</TableCell>
                <TableCell>Start</TableCell>
                <TableCell>Ende</TableCell>
                <TableCell align="right">Dauer</TableCell>
                <TableCell align="right">Abgaben</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {examHistoryRows.map((row) => (
                <TableRow key={row.id} sx={row.running ? { bgcolor: 'rgba(46, 125, 50, 0.06)' } : undefined}>
                  <TableCell>
                    {row.groupName}
                    {row.running ? (
                      <Chip label="läuft" size="small" color="success" sx={{ ml: 0.75, height: 18, fontSize: '0.65rem' }} />
                    ) : null}
                  </TableCell>
                  <TableCell>{formatExamSessionDateTime(row.startedAt)}</TableCell>
                  <TableCell>
                    {row.endedAt ? formatExamSessionDateTime(row.endedAt) : '—'}
                  </TableCell>
                  <TableCell align="right">{formatExamSessionDuration(row.durationMs)}</TableCell>
                  <TableCell align="right">{row.submissionCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExamHistoryItem(null)}>Schließen</Button>
      </DialogActions>
    </Dialog>
    <EmojiSelector
      open={Boolean(iconPickerItem)}
      onClose={() => setIconPickerItem(null)}
      title="Icon für diese Prüfung"
      currentEmoji={
        iconPickerItem
          ? getExamLibraryIcon(iconPickerItem.path, iconPickerItem.name, iconMap, iconTemplate)
          : '📄'
      }
      onSelect={(emoji) => {
        if (!iconPickerItem) return;
        void (async () => {
          try {
            const { icons, customIconChoices: choices } = await saveExamLibraryIconToServer(
              iconPickerItem.path,
              emoji,
            );
            setIconMap(icons);
            if (choices.length) setCustomIconChoices(choices);
            onNotify?.('Icon gespeichert', 'success');
          } catch (e) {
            onNotify?.(e instanceof Error ? e.message : 'Speichern fehlgeschlagen', 'error');
          } finally {
            setIconPickerItem(null);
          }
        })();
      }}
      customIcons={examCustomIconChoices}
      allowImageUpload
      onUploadImage={async (file) => {
        if (!iconPickerItem) throw new Error('Keine Prüfung ausgewählt');
        const { icons, icon, customIconChoices: choices } =
          await uploadExamLibraryIconImageToServer(iconPickerItem.path, file);
        setIconMap(icons);
        const label = iconPickerItem.name.replace(/\.html?$/i, '').replace(/^((ka|ku|hu|hü|qz)_)/i, '');
        setCustomIconChoices((prev) =>
          choices.length > 0 ? choices : upsertExamLibraryCustomIconChoice(prev, icon, label),
        );
        if (!choices.length) void loadExamIcons();
        onNotify?.('Bild-Icon gespeichert — in „Eigene“', 'success');
        return icon;
      }}
      keepOpenAfterImageUpload
    />
    </>
  );
};

export const DashboardInteractiveExercisesPanel: React.FC<{
  rootPaths: string[];
  colors: Colors;
  groupId?: string;
  groups?: GroupLite[];
  assignedFolders?: Record<string, string[]>;
  onCreateExercise?: (lessonPath?: string) => void;
}> = ({ rootPaths, colors, groupId, groups = [], assignedFolders = {}, onCreateExercise }) => {
  const [items, setItems] = useState<LibraryExerciseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const meta = useMemo(() => ({ groups, assignedFolders }), [groups, assignedFolders]);

  const rootsKey = useMemo(
    () => [...rootPaths].map((p) => p.replace(/\\/g, '/').replace(/\/+$/, '').trim()).sort().join('|'),
    [rootPaths],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await scanLibraryInteractiveExercises(rootPaths));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rootsKey, rootPaths]);

  useEffect(() => {
    void load();
  }, [load]);

  const buckets = useMemo(() => groupByStufeReihe(items), [items]);

  const emptyHint =
    rootPaths.length === 0
      ? 'Noch keine Arbeits-Reihe gewählt — im Tab „Reihen“ eine Reihe auswählen.'
      : 'Noch keine interaktive Übung unter den gewählten Reihen / Lerngruppen-Ordnern.';

  return (
    <LibraryShell
      colors={colors}
      title="Interaktive Übungen"
      titleColor={COLOR_UEBUNG_TEXT}
      icon={<QuizIcon sx={{ fontSize: 16 }} />}
      loading={loading}
      empty={!items.length}
      emptyHint={emptyHint}
      onReload={() => void load()}
      onCreateNew={onCreateExercise ? () => onCreateExercise() : undefined}
      createLabel="Neue Übung"
      createColor={COLOR_UEBUNG}
      createHover={COLOR_UEBUNG_HOVER}
    >
      <StufeReiheSections
        buckets={buckets}
        colors={colors}
        meta={meta}
        itemPath={(item) => item.lessonPath}
        itemAccent={COLOR_UEBUNG}
        onCreateInFolder={onCreateExercise}
        createAccent={COLOR_UEBUNG_TEXT}
        renderItem={(item, accent) => {
          const editorGid =
            groupsForMaterialPath(item.lessonPath, meta)[0]?.id || groupId;
          return (
            <MaterialRow
              key={`${item.lessonPath}:${item.slideId || item.slideIndex}`}
              title={item.title}
              subtitle={`Folie ${item.slideIndex}${
                item.lessonLabel !== item.reihe ? ` · ${item.lessonLabel}` : ''
              }`}
              accent={accent}
              actions={
                <>
                  <TinyAction
                    title="Bearbeiten"
                    bgcolor={BTN_EDIT}
                    hover={BTN_EDIT_HOVER}
                    onClick={() => {
                      window.location.href = exerciseEditorUrl(
                        item.lessonPath,
                        item.slideId,
                        editorGid,
                      );
                    }}
                  >
                    <EditIcon sx={{ fontSize: 12 }} />
                  </TinyAction>
                  <TinyAction
                    title="Spielen"
                    bgcolor={BTN_PLAY}
                    hover={BTN_PLAY_HOVER}
                    onClick={() => {
                      window.location.href = exercisePresentUrl(
                        item.lessonPath,
                        item.slideId,
                        editorGid,
                      );
                    }}
                  >
                    <PlayArrowIcon sx={{ fontSize: 13 }} />
                  </TinyAction>
                </>
              }
            />
          );
        }}
      />
    </LibraryShell>
  );
};
