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
  IconButton,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GradingIcon from '@mui/icons-material/Grading';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import {
  examOpenUrl,
  exerciseEditorUrl,
  exercisePresentUrl,
  scanLibraryExams,
  scanLibraryInteractiveExercises,
  type LibraryExamItem,
  type LibraryExerciseItem,
} from '../../lib/dashboardMaterialLibrary';
import {
  EXAM_TYPE_LABELS,
  examMaterialRowStyle,
  examTypeFromFileName,
  type ExamLibraryType,
} from '../../lib/examLibraryUi';
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
  onEditExam?: (item: LibraryExamItem) => void;
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
  onEditExam,
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
  const [typeSaving, setTypeSaving] = useState(false);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const [iconTemplate, setIconTemplate] = useState<ExamLibraryIconTemplate | null>(null);
  const [customIconChoices, setCustomIconChoices] = useState<ExamLibraryCustomIconChoice[]>([]);
  const [iconTemplateSaving, setIconTemplateSaving] = useState(false);
  const [iconPickerItem, setIconPickerItem] = useState<LibraryExamItem | null>(null);
  const [duplicatingPath, setDuplicatingPath] = useState<string | null>(null);

  const loadExamIcons = useCallback(async () => {
    const loaded = await fetchExamLibraryIconsFromServer();
    setIconMap(loaded.icons);
    setIconTemplate(loaded.template);
    setCustomIconChoices(loaded.customIconChoices);
  }, []);

  useEffect(() => {
    void loadExamIcons();
  }, [refreshKey, loadExamIcons]);

  const meta = useMemo(() => ({ groups, assignedFolders }), [groups, assignedFolders]);

  const rootsKey = useMemo(
    () => [...rootPaths].map((p) => p.replace(/\\/g, '/').replace(/\/+$/, '').trim()).sort().join('|'),
    [rootPaths],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await scanLibraryExams(rootPaths));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rootsKey, rootPaths]);

  const reloadExams = useCallback(async () => {
    const { invalidateFsDirectoryCache } = await import('../../lib/fsTreeCache');
    invalidateFsDirectoryCache();
    await load();
    await loadExamIcons();
  }, [load, loadExamIcons]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const buckets = useMemo(() => groupByStufeReihe(items), [items]);

  const emptyHint =
    rootPaths.length === 0
      ? 'Noch keine Arbeits-Reihe gewählt — im Tab „Reihen“ eine Reihe auswählen.'
      : 'Noch keine Prüfung unter den gewählten Reihen / Lerngruppen-Ordnern.';

  const isExamVariantFile = (name: string) => /__[A-Z]\.html?$/i.test(name || '');

  const openTypeDialog = (item: LibraryExamItem) => {
    setTypeDialogItem(item);
    setTypeChoice(examTypeFromFileName(item.name) || 'QZ');
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
    if (!typeDialogItem || !typeChoice) return;
    setTypeSaving(true);
    try {
      const res = await fetch('/api/file-system-paths/change-examination-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': localStorage.getItem('loginCode') || '',
        },
        credentials: 'include',
        body: JSON.stringify({ filePath: typeDialogItem.path, examType: typeChoice }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fileName?: string;
        unchanged?: boolean;
      };
      if (!res.ok) throw new Error(data.error || 'Typ konnte nicht geändert werden');
      if (data.unchanged) {
        onNotify?.('Prüfungstyp ist bereits ' + typeChoice, 'success');
      } else {
        onNotify?.(`Umbenannt in ${data.fileName || typeChoice + '_…'}`, 'success');
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
                {onEditExam ? (
                  <TinyAction
                    title="Bearbeiten"
                    bgcolor={BTN_EDIT}
                    hover={BTN_EDIT_HOVER}
                    onClick={() => onEditExam(item)}
                  >
                    <EditIcon sx={{ fontSize: 12 }} />
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
        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
          Präfix und Dateiname werden angepasst (z. B. QZ_… → HU_…), inkl. aller Versionen A/B/C.
        </Typography>
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
        <Button variant="contained" onClick={() => void submitTypeChange()} disabled={typeSaving || !typeChoice}>
          {typeSaving ? 'Speichern…' : 'Umbenennen'}
        </Button>
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
