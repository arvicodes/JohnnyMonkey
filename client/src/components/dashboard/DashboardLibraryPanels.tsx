import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  folderPathCovers,
  folderPathsEquivalent,
  toPortableWorkingReihePath,
} from '../../lib/dashboardWorkingReihen';
import {
  INFORMATIK_FOLDER_BG,
  INFORMATIK_FOLDER_BORDER,
  isInformatikFolderPath,
} from '../../lib/learningGroupAppearance';

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

function groupByStufeReihe<T extends { stufe: string; reihe: string; subject: string }>(
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
        .map(([reihe, list]) => ({ reihe, items: list })),
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
  icon,
  loading,
  empty,
  emptyHint,
  children,
  onReload,
}: {
  colors: Colors;
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  empty: boolean;
  emptyHint: string;
  children: React.ReactNode;
  onReload: () => void;
}) {
  return (
    <Box sx={{ p: 1.4, position: 'relative' }}>
      <Tooltip title="Aktualisieren">
        <span>
          <IconButton
            size="small"
            aria-label="Aktualisieren"
            onClick={onReload}
            disabled={loading}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              zIndex: 2,
              color: colors.primary,
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45, mb: 1.1, pr: 4.5 }}>
        <Box sx={{ color: colors.primary, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 650, color: colors.primary }}>
          {title}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3.5 }}>
          <CircularProgress size={26} />
        </Box>
      ) : empty ? (
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', px: 0.5, fontStyle: 'italic' }}>
          {emptyHint}
        </Typography>
      ) : (
        children
      )}
    </Box>
  );
}

function GroupChips({ groups }: { groups: GroupLite[] }) {
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
        const color = g.color || '#1976D2';
        return (
          <Chip
            key={g.id}
            size="small"
            label={`${g.iconEmoji ? `${g.iconEmoji} ` : ''}${g.name}`}
            sx={{
              height: 18,
              fontSize: '0.58rem',
              fontWeight: 600,
              bgcolor: `${color}18`,
              color,
              border: `1px solid ${color}40`,
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
  actions,
}: {
  title: string;
  subtitle?: string;
  accent: string;
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
        bgcolor: '#fff',
        border: '1px solid #eee',
        minHeight: 30,
        '&:hover': { bgcolor: '#fafbfc', borderColor: '#e0e0e0' },
      }}
    >
      <Box
        sx={{
          width: 3,
          alignSelf: 'stretch',
          borderRadius: 1,
          bgcolor: accent,
          flexShrink: 0,
          minHeight: 16,
        }}
      />
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
  accent,
  softBg,
  softBorder,
}: {
  buckets: StufeBucket<T>[];
  colors: Colors;
  meta?: LibraryGroupMeta;
  itemPath: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  accent: string;
  softBg: string;
  softBorder: string;
}) {
  const textMain = colors.textPrimary || '#2C3E50';
  const textMuted = colors.textSecondary || '#7F8C8D';

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
              bgcolor: isInf ? INFORMATIK_FOLDER_BG : softBg,
              border: isInf ? INFORMATIK_FOLDER_BORDER : `1px solid ${softBorder}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6, mb: 0.7, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 750, color: accent, lineHeight: 1.2 }}>
                {bucket.stufe}
              </Typography>
              {bucket.subject ? (
                <Typography sx={{ fontSize: '0.62rem', color: textMuted, fontWeight: 600 }}>
                  {bucket.subject}
                </Typography>
              ) : null}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
              {bucket.reihen.map(({ reihe, items }) => {
                const linkedGroups = groupsForMaterialPath(itemPath(items[0]), meta);
                return (
                  <Box
                    key={reihe}
                    sx={{
                      p: 0.85,
                      borderRadius: 1.5,
                      bgcolor: colors.cardBg,
                      border: `1px solid ${colors.border}`,
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
                          color: textMain,
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
                      <GroupChips groups={linkedGroups} />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                      {items.map((item) => renderItem(item))}
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
  groups?: GroupLite[];
  assignedFolders?: Record<string, string[]>;
}> = ({ rootPaths, colors, onEditExam, groups = [], assignedFolders = {} }) => {
  const [items, setItems] = useState<LibraryExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const meta = useMemo(() => ({ groups, assignedFolders }), [groups, assignedFolders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await scanLibraryExams(rootPaths));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rootPaths]);

  useEffect(() => {
    void load();
  }, [load]);

  const buckets = useMemo(() => groupByStufeReihe(items), [items]);
  const accent = colors.secondary || colors.warning || '#F57C00';
  const accentDeep = '#E65100';
  const openBlue = colors.accent1 || '#1976D2';

  const emptyHint =
    rootPaths.length === 0
      ? 'Noch keine Arbeits-Reihe gewählt — im Tab „Reihen“ eine Reihe auswählen.'
      : 'Noch keine Prüfung unter den gewählten Reihen / Lerngruppen-Ordnern.';

  return (
    <LibraryShell
      colors={colors}
      title="Prüfungen"
      icon={<AssignmentIcon sx={{ fontSize: 16 }} />}
      loading={loading}
      empty={!items.length}
      emptyHint={emptyHint}
      onReload={() => void load()}
    >
      <StufeReiheSections
        buckets={buckets}
        colors={colors}
        meta={meta}
        itemPath={(item) => item.lessonFolder || item.path}
        accent={accent}
        softBg="rgba(245, 124, 0, 0.06)"
        softBorder="rgba(245, 124, 0, 0.22)"
        renderItem={(item) => (
          <MaterialRow
            key={item.path}
            title={item.name}
            subtitle={item.lessonLabel !== item.reihe ? item.lessonLabel : undefined}
            accent={accent}
            actions={
              <>
                {onEditExam ? (
                  <TinyAction
                    title="Bearbeiten"
                    bgcolor={accent}
                    hover={accentDeep}
                    onClick={() => onEditExam(item)}
                  >
                    <EditIcon sx={{ fontSize: 12 }} />
                  </TinyAction>
                ) : null}
                <TinyAction
                  title="Öffnen"
                  bgcolor={openBlue}
                  hover="#1565c0"
                  onClick={() => window.open(examOpenUrl(item.path), '_blank', 'noopener,noreferrer')}
                >
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </TinyAction>
              </>
            }
          />
        )}
      />
    </LibraryShell>
  );
};

export const DashboardInteractiveExercisesPanel: React.FC<{
  rootPaths: string[];
  colors: Colors;
  groupId?: string;
  groups?: GroupLite[];
  assignedFolders?: Record<string, string[]>;
}> = ({ rootPaths, colors, groupId, groups = [], assignedFolders = {} }) => {
  const [items, setItems] = useState<LibraryExerciseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const meta = useMemo(() => ({ groups, assignedFolders }), [groups, assignedFolders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await scanLibraryInteractiveExercises(rootPaths));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rootPaths]);

  useEffect(() => {
    void load();
  }, [load]);

  const buckets = useMemo(() => groupByStufeReihe(items), [items]);
  const accent = '#7c3aed';

  const emptyHint =
    rootPaths.length === 0
      ? 'Noch keine Arbeits-Reihe gewählt — im Tab „Reihen“ eine Reihe auswählen.'
      : 'Noch keine interaktive Übung unter den gewählten Reihen / Lerngruppen-Ordnern.';

  return (
    <LibraryShell
      colors={colors}
      title="Interaktive Übungen"
      icon={<QuizIcon sx={{ fontSize: 16 }} />}
      loading={loading}
      empty={!items.length}
      emptyHint={emptyHint}
      onReload={() => void load()}
    >
      <StufeReiheSections
        buckets={buckets}
        colors={colors}
        meta={meta}
        itemPath={(item) => item.lessonPath}
        accent={accent}
        renderItem={(item) => {
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
                    bgcolor="#ef6c00"
                    hover="#e65100"
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
                    bgcolor="#2e7d32"
                    hover="#1b5e20"
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
