/**
 * Prüfung an einer Folie: anhängen (Editor) und Start/Stop/Öffnen (Editor + Play).
 * Das alte KA-Korrekturmodul gehört nicht dazu.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Menu, MenuItem, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  fetchLessonFolderLinkableFiles,
  type LessonFolderFsItem,
} from '../../lib/presentationLessonFileLink';
import { isLessonCorrectionFileName } from '../../lib/openLessonFolderFile';
import type { SlideExam } from '../../lib/presentationDeck';
import {
  fetchLessonExamBeacon,
  openExamHtmlInTab,
  startLessonExam,
  stopLessonExam,
  teacherIdFromStorage,
} from '../../lib/lessonExamBeacon';

const EXAM_RED = '#c62828';

function examLabel(name: string): string {
  return (name || '').replace(/\.(html|htm)$/i, '');
}

type Props = {
  exam?: SlideExam;
  lessonPath?: string;
  groupId?: string;
  /** Fehlt im Play: nur Management, kein Anhängen/Lösen. */
  onChange?: (next: SlideExam | undefined) => void;
  onMessage?: (text: string) => void;
  compact?: boolean;
};

const PresentationSlideExamBox: React.FC<Props> = ({
  exam,
  lessonPath,
  groupId,
  onChange,
  onMessage,
  compact = true,
}) => {
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const [examFiles, setExamFiles] = useState<LessonFolderFsItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runningPath, setRunningPath] = useState<string | null>(null);

  const canEdit = typeof onChange === 'function';
  const gid = (groupId || '').trim();
  const examPath = (exam?.path || '').replace(/\\/g, '/');
  const isRunning = Boolean(runningPath && examPath && runningPath === examPath);

  const loadExamFiles = useCallback(async () => {
    if (!lessonPath) {
      setExamFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const all = await fetchLessonFolderLinkableFiles(lessonPath);
      setExamFiles(
        all.filter((f) => /\.(html|htm)$/i.test(f.name) && isLessonCorrectionFileName(f.name)),
      );
    } catch {
      setExamFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [lessonPath]);

  useEffect(() => {
    if (addAnchor) void loadExamFiles();
  }, [addAnchor, loadExamFiles]);

  useEffect(() => {
    if (!gid) {
      setRunningPath(null);
      return undefined;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchLessonExamBeacon(gid);
        if (cancelled) return;
        setRunningPath(status.active && status.filePath ? status.filePath.replace(/\\/g, '/') : null);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [gid]);

  const attach = (file: LessonFolderFsItem) => {
    onChange?.({ path: file.path.replace(/\\/g, '/'), name: file.name });
    setAddAnchor(null);
    onMessage?.(`Prüfung „${examLabel(file.name)}“ an diese Folie gehängt`);
  };

  const toggleRun = async () => {
    if (!examPath) return;
    const teacherId = teacherIdFromStorage();
    if (!teacherId || !gid) {
      onMessage?.('Prüfung starten geht nur, wenn die Stunde über eine Lerngruppe geöffnet ist.');
      return;
    }
    setBusy(true);
    try {
      if (isRunning) {
        await stopLessonExam({ teacherId, groupId: gid });
        setRunningPath(null);
        onMessage?.('Prüfung beendet');
      } else {
        const started = await startLessonExam({
          teacherId,
          groupId: gid,
          filePath: examPath,
          lessonPath,
        });
        setRunningPath((started.filePath || examPath).replace(/\\/g, '/'));
        onMessage?.('Prüfung gestartet — SuS sehen Vollbild');
      }
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : 'Prüfung Start/Stop fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  if (!exam && !canEdit) return null;

  const btnSx = {
    minWidth: 0,
    height: 26,
    px: 0.9,
    py: 0,
    fontSize: '0.68rem',
    fontWeight: 800,
    lineHeight: 1,
    textTransform: 'none' as const,
    borderRadius: 0.75,
    boxShadow: 'none',
  };

  const addMenu = (
    <Menu
      anchorEl={addAnchor}
      open={Boolean(addAnchor)}
      onClose={() => setAddAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      {loadingFiles ? (
        <MenuItem disabled>Lade Prüfungsdateien…</MenuItem>
      ) : examFiles.length === 0 ? (
        <MenuItem disabled>Keine KA_/KU_/HU_/QZ_-HTML im Stundenordner</MenuItem>
      ) : (
        examFiles.map((f) => (
          <MenuItem key={f.path} onClick={() => attach(f)}>
            {examLabel(f.name)}
          </MenuItem>
        ))
      )}
    </Menu>
  );

  if (!exam) {
    return (
      <Box data-pres-exam-box="1" sx={{ flexShrink: 0, mx: compact ? 0.85 : 0, mt: 0.15, mb: 0.25 }}>
        <Button
          size="small"
          variant="text"
          onClick={(e) => {
            setLoadingFiles(true);
            setAddAnchor(e.currentTarget);
          }}
          sx={{
            ...btnSx,
            color: EXAM_RED,
            px: 0.4,
            '&:hover': { bgcolor: '#ffebee' },
          }}
        >
          Prüfung an diese Folie
        </Button>
        {addMenu}
      </Box>
    );
  }

  return (
    <Box
      data-pres-exam-box="1"
      sx={{
        flexShrink: 0,
        borderRadius: compact ? 1.5 : 2,
        overflow: 'hidden',
        border: `1px solid ${alpha(EXAM_RED, 0.45)}`,
        background: `linear-gradient(180deg, ${alpha('#ef5350', 0.22)} 0%, ${alpha('#ffebee', 0.96)} 38%, #fff5f5 100%)`,
        mx: compact ? 0.85 : 0,
        mt: compact ? 0.15 : 0,
        mb: compact ? 0.35 : 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.6,
          px: 1,
          py: 0.55,
          bgcolor: alpha(EXAM_RED, 0.92),
          color: '#fff',
        }}
      >
        <Box
          sx={{
            width: 18,
            height: 18,
            borderRadius: 0.5,
            bgcolor: 'rgba(255,255,255,0.22)',
            fontSize: 10,
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          P
        </Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, flex: 1, minWidth: 0 }} noWrap>
          Prüfung
        </Typography>
      </Box>

      <Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.65 }}>
        <Typography
          sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#5d1a1a', lineHeight: 1.25 }}
          noWrap
          title={exam.name}
        >
          {examLabel(exam.name)}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Button
            size="small"
            variant={isRunning ? 'contained' : 'outlined'}
            disabled={busy || !gid}
            onClick={() => void toggleRun()}
            title={
              !gid
                ? 'Lerngruppe nötig (Stunde über das Tablet/Laptop öffnen)'
                : isRunning
                  ? 'Prüfung beenden (Overlay bei SuS schließen)'
                  : 'Prüfung starten (Vollbild bei allen SuS)'
            }
            sx={{
              ...btnSx,
              ...(isRunning
                ? {
                    bgcolor: EXAM_RED,
                    color: '#fff',
                    border: `1px solid ${EXAM_RED}`,
                    '&:hover': { bgcolor: '#b71c1c' },
                  }
                : {
                    color: EXAM_RED,
                    borderColor: '#ef9a9a',
                    bgcolor: '#fff',
                    '&:hover': { bgcolor: '#ffebee', borderColor: '#e57373' },
                  }),
            }}
          >
            {busy ? <CircularProgress size={12} color="inherit" /> : isRunning ? 'STOP' : 'START'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => openExamHtmlInTab(exam.path)}
            sx={{
              ...btnSx,
              color: '#5d1a1a',
              borderColor: '#ef9a9a',
              bgcolor: '#fff',
              '&:hover': { bgcolor: '#ffebee' },
            }}
          >
            Öffnen
          </Button>
          {canEdit ? (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                onChange?.(undefined);
                onMessage?.('Prüfung von dieser Folie gelöst');
              }}
              sx={{ ...btnSx, color: '#8d4a4a' }}
            >
              Lösen
            </Button>
          ) : null}
        </Box>
        {!gid ? (
          <Typography sx={{ fontSize: '0.62rem', color: '#8d4a4a', lineHeight: 1.3 }}>
            Start nur mit Lerngruppe (TABLET / Laptop).
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default PresentationSlideExamBox;
