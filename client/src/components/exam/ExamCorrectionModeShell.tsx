import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Typography,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import KACorrectionMode from '../KACorrectionMode';
import {
  scanLibraryExams,
  type LibraryExamItem,
} from '../../lib/dashboardMaterialLibrary';
import { fetchExamSessionHistory } from '../../lib/examSessionHistory';
import { fetchLessonExamBeacon, examBeaconPathsEqual } from '../../lib/lessonExamBeacon';
import {
  isExamCorrectionFinished,
  setExamCorrectionFinished,
} from '../../lib/examCorrectionFinished';
import { examTitleFromFileName } from '../../lib/examLibraryUi';

type GroupLite = { id: string; name?: string; isArchived?: boolean };

const PURPLE_CORRECTION = '#7b1fa2';
const FINISHED_GREEN = '#43a047';

type ExamSessionMeta = {
  everStarted: boolean;
  hasEndedSession: boolean;
};

export type ExamCorrectionListStatus = 'vorbereitung' | 'aktiv' | 'zur-korrektur' | 'fertig';

export function deriveExamCorrectionListStatus(
  finished: boolean,
  isRunning: boolean,
  session: ExamSessionMeta | undefined,
): ExamCorrectionListStatus {
  if (finished) return 'fertig';
  if (isRunning) return 'aktiv';
  if (session?.hasEndedSession || (session?.everStarted && !isRunning)) return 'zur-korrektur';
  return 'vorbereitung';
}

const STATUS_LABEL: Record<ExamCorrectionListStatus, string> = {
  vorbereitung: 'In Vorbereitung',
  aktiv: 'Aktiv',
  'zur-korrektur': 'Zur Korrektur frei',
  fertig: 'Fertig',
};

function isExamVariantFile(name: string): boolean {
  return /__[A-Z]\.html?$/i.test(name || '');
}

function ExamSidebarRow({
  item,
  selected,
  status,
  finished,
  onSelect,
  onToggleFinished,
}: {
  item: LibraryExamItem;
  selected: boolean;
  status: ExamCorrectionListStatus;
  finished: boolean;
  onSelect: () => void;
  onToggleFinished: (next: boolean) => void;
}) {
  const title = examTitleFromFileName(item.name) || item.name;
  const statusColor =
    status === 'fertig'
      ? FINISHED_GREEN
      : status === 'aktiv'
        ? '#c62828'
        : status === 'zur-korrektur'
          ? PURPLE_CORRECTION
          : '#546e7a';

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        position: 'relative',
        borderRadius: 1,
        border: selected ? '2px solid #1976d2' : '1px solid #e0e0e0',
        bgcolor: '#fff',
        px: 0.75,
        py: 0.65,
        minHeight: 56,
        cursor: 'pointer',
        overflow: 'hidden',
        flexShrink: 0,
        '&:hover': { borderColor: selected ? '#1976d2' : '#bdbdbd' },
      }}
    >
      {finished ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(76, 175, 80, 0.22)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ) : null}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1,
          px: 4,
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: status === 'vorbereitung' ? '0.72rem' : '0.78rem',
            color: statusColor,
            textAlign: 'center',
            lineHeight: 1.15,
            textShadow: '0 0 8px rgba(255,255,255,0.9)',
            animation: status === 'aktiv' ? 'examCorrectionBlink 1.1s ease-in-out infinite' : undefined,
            '@keyframes examCorrectionBlink': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.28 },
            },
          }}
        >
          {STATUS_LABEL[status]}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: '0.68rem',
              color: '#1a1a1a',
              lineHeight: 1.2,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </Typography>
          <FormControlLabel
            onClick={(e) => e.stopPropagation()}
            control={
              <Checkbox
                size="small"
                checked={finished}
                onChange={(_, checked) => onToggleFinished(checked)}
                sx={{
                  p: 0.25,
                  color: '#9e9e9e',
                  '&.Mui-checked': { color: FINISHED_GREEN },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, color: finished ? FINISHED_GREEN : '#757575' }}>
                fertig
              </Typography>
            }
            sx={{ m: 0, flexShrink: 0, alignItems: 'center' }}
          />
        </Box>
        {item.lessonLabel ? (
          <Typography variant="caption" sx={{ fontSize: '0.58rem', color: '#888', lineHeight: 1.1 }}>
            {item.lessonLabel}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

type Props = {
  initialExamPath: string;
  rootPaths: string[];
  groups: GroupLite[];
  onClose: () => void;
};

export default function ExamCorrectionModeShell({
  initialExamPath,
  rootPaths,
  groups,
  onClose,
}: Props) {
  const [items, setItems] = useState<LibraryExamItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedPath, setSelectedPath] = useState(initialExamPath);
  const [finishedMap, setFinishedMap] = useState<Record<string, boolean>>({});
  const [sessionMetaByPath, setSessionMetaByPath] = useState<Record<string, ExamSessionMeta>>({});
  const [activeExamBeacons, setActiveExamBeacons] = useState<
    Record<string, { filePath: string; beaconId: string }>
  >({});

  const rootsKey = useMemo(
    () => [...rootPaths].map((p) => p.replace(/\\/g, '/').replace(/\/+$/, '').trim()).sort().join('|'),
    [rootPaths],
  );

  const listItems = useMemo(
    () => items.filter((i) => !isExamVariantFile(i.name)),
    [items],
  );

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      let latest: LibraryExamItem[] = [];
      await scanLibraryExams(rootPaths, {
        skipDeckSlideExams: true,
        onProgress: (partial) => {
          latest = partial;
        },
      });
      setItems(latest);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [rootsKey, rootPaths]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setSelectedPath(initialExamPath);
  }, [initialExamPath]);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const item of listItems) {
      map[item.path] = isExamCorrectionFinished(item.path);
    }
    setFinishedMap(map);
  }, [listItems]);

  useEffect(() => {
    if (!listItems.length) {
      setSessionMetaByPath({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      listItems.map(async (item) => {
        try {
          const sessions = await fetchExamSessionHistory(item.path);
          const everStarted = sessions.length > 0;
          const hasEndedSession = sessions.some((s) => !s.running || Boolean(s.endedAt));
          return { path: item.path, everStarted, hasEndedSession };
        } catch {
          return { path: item.path, everStarted: false, hasEndedSession: false };
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const next: Record<string, ExamSessionMeta> = {};
      for (const r of rows) {
        next[r.path] = { everStarted: r.everStarted, hasEndedSession: r.hasEndedSession };
      }
      setSessionMetaByPath(next);
    });
    return () => {
      cancelled = true;
    };
  }, [listItems]);

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
  }, [teacherGroupIdsKey]);

  const isExamRunning = useCallback(
    (examPath: string) =>
      Object.values(activeExamBeacons).some((b) => examBeaconPathsEqual(b.filePath, examPath)),
    [activeExamBeacons],
  );

  const toggleFinished = useCallback((path: string, next: boolean) => {
    setExamCorrectionFinished(path, next);
    setFinishedMap((prev) => ({ ...prev, [path]: next }));
  }, []);

  const effectiveSelected =
    selectedPath && listItems.some((i) => i.path === selectedPath)
      ? selectedPath
      : listItems[0]?.path || selectedPath;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh',
        bgcolor: '#eceff1',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.25,
          py: 0.5,
          bgcolor: '#fff',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2' }}>
          Korrekturmodus — Prüfungen
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Schließen">
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
        <Box
          sx={{
            width: { xs: 200, sm: 240 },
            flexShrink: 0,
            borderRight: '1px solid #e0e0e0',
            bgcolor: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {loadingList ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={22} />
              </Box>
            ) : listItems.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                Keine Prüfungen gefunden.
              </Typography>
            ) : (
              listItems.map((item) => {
                const finished = Boolean(finishedMap[item.path]);
                const running = isExamRunning(item.path);
                const status = deriveExamCorrectionListStatus(
                  finished,
                  running,
                  sessionMetaByPath[item.path],
                );
                return (
                  <ExamSidebarRow
                    key={item.path}
                    item={item}
                    selected={effectiveSelected === item.path}
                    status={status}
                    finished={finished}
                    onSelect={() => setSelectedPath(item.path)}
                    onToggleFinished={(next) => toggleFinished(item.path, next)}
                  />
                );
              })
            )}
          </Box>
        </Box>

        <Box
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#f5f7fa',
          }}
        >
          {effectiveSelected ? (
            <KACorrectionMode
              key={effectiveSelected}
              kaFilePath={effectiveSelected}
              onClose={onClose}
              embedded
            />
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">Bitte eine Prüfung links wählen.</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
