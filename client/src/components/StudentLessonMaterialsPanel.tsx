import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { apiGetSafe } from '../lib/api';
import {
  isLessonPresentationMaterialPdf,
  isJohnnyPresentationExportPdf,
  isStudentVisibleLessonMaterialFile,
  johnnyPresentationVersionLabel,
  LESSON_PRESENTATION_PDF_EDITED,
  LESSON_PRESENTATION_PDF_ORIGINAL,
  LESSON_PRESENTATION_PDF_STAND,
} from '../lib/presentationLessonAssets';
import { isLessonFileShared, normalizeLessonMaterialPath } from '../lib/lessonFileSharePath';
import { openStudentLessonMaterialFile } from '../lib/openStudentLessonMaterial';
import { openLessonFolderFile, isLessonCorrectionFileName } from '../lib/openLessonFolderFile';
import { downloadPresentationStandPdfForStudent } from '../lib/presentationExport';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import {
  deckFilePath,
  loadJsonFile,
  printMaterialPathsAfterNow,
  findNowSlideIndex,
  presentationReviewUrl,
  sortSlides,
  type PresentationDeck,
} from '../lib/presentationDeck';
import {
  findHomeworkSlides,
  isHomeworkSubmissionRequired,
} from '../lib/presentationSlideTemplates';
import { resolvePreviousLessonFolder } from '../lib/previousLessonFolder';
import { parseExamAnswerKey } from '../lib/examAnswerKey';
import { examGradeLabelFromPoints, formatExamGradeNumber } from '../lib/examGradeLabel';

type LessonFile = { type: string; name: string; path: string };

type ReleasedExamResult = {
  id: string;
  kaFilePath: string;
  fileName: string;
  title: string;
  totalPoints: number;
  autoPoints: number;
  answers: Record<string, unknown>;
  corrections: Array<{ taskNumber: string; manualPoints: number | null; comment: string | null }>;
  recentGrades?: Array<{ categoryName: string; grade: number; updatedAt?: string }>;
  maxPoints?: number;
  gradeLabel?: string;
  filePath?: string;
};

const actionBtnSx = {
  py: 0.35,
  px: 0.85,
  fontSize: '0.68rem',
  minHeight: 28,
  lineHeight: 1.2,
  textTransform: 'none' as const,
  whiteSpace: 'nowrap' as const,
};

/** Folien-Zeile */
const FOLIEN_ROW_HEIGHT = 32;
/** ToDo-HA-Button — etwas flacher als die Folien-Zeile */
const TODO_HA_BTN_HEIGHT = 24;

/** Rahmen nur bei ToDo HA mit Abgabe-Pflicht */
const ABGABE_FRAME = '2px solid rgba(140, 60, 50, 0.95)';

function tryOpenInNewTab(url: string): boolean {
  const w = window.open(url, '_blank');
  return !!(w && !w.closed);
}

export default function StudentLessonMaterialsPanel({
  lessonName,
  lessonPath,
  files,
  sharedPaths,
  groupId,
  showLeinwand,
  onOpenHomeworkTodo,
}: {
  lessonName: string;
  /** Stundenordner-Pfad — für ToDo/Hausaufgaben-Abgabe */
  lessonPath: string;
  files: LessonFile[];
  sharedPaths: string[];
  /** Lerngruppe — für Leinwand-Vollansicht */
  groupId?: string;
  /** Leinwand freigegeben → grüner Button neben ToDo HA */
  showLeinwand?: boolean;
  /** Öffnet das ToDo-Modal auf Dashboard-Ebene (überlebt Panel-Remounts).
   *  lessonPath = Stunde der HA-Folie (aktuelle Stunde); contextLabel optional. */
  onOpenHomeworkTodo?: (lessonPath: string, contextLabel?: string | null) => void;
}) {
  const downloadLessonName = (lessonName || '').trim();
  const canOpenLeinwand = Boolean(showLeinwand && groupId && lessonPath);

  const openLeinwandFullscreen = () => {
    if (!groupId || !lessonPath) return;
    const u = new URL('/shared-overview', window.location.origin);
    u.searchParams.set('groupId', groupId);
    u.searchParams.set('lessonPath', lessonPath);
    window.open(u.pathname + u.search, '_blank', 'noopener,noreferrer');
  };

  const [abgabeRequired, setAbgabeRequired] = useState(false);
  /** ToDo HA = HA dieser Stunde (Lehrer „Neue HA“); Fallback: Vorstunde */
  const [homeworkTodoPath, setHomeworkTodoPath] = useState<string | null>(null);
  const [homeworkTodoLabel, setHomeworkTodoLabel] = useState<string | null>(null);
  const [completedEntryTicket, setCompletedEntryTicket] = useState(false);
  /** Materialkisten-Dateien hinter dem NOW-Fortschritt ausblenden */
  const [blockedMaterialPaths, setBlockedMaterialPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [releasedExams, setReleasedExams] = useState<ReleasedExamResult[]>([]);
  const [selectedExam, setSelectedExam] = useState<ReleasedExamResult | null>(null);

  useEffect(() => {
    if (!lessonPath) {
      setBlockedMaterialPaths(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await loadJsonFile<PresentationDeck>(deckFilePath(lessonPath));
        if (cancelled) return;
        if (!loaded?.slides?.length) {
          setBlockedMaterialPaths(new Set());
          return;
        }
        setBlockedMaterialPaths(printMaterialPathsAfterNow(loaded));
      } catch {
        if (!cancelled) setBlockedMaterialPaths(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonPath]);

  // Freigegebene Prüfungen dieser Stunde (unter den Folien)
  useEffect(() => {
    if (!lessonPath) {
      setReleasedExams([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const examFiles = files.filter(
          (f) => f.type === 'file' && isLessonCorrectionFileName(f.name || ''),
        );
        const fileNames = examFiles.map((f) => f.name).join(',');
        const qs = new URLSearchParams({ lessonPath });
        if (fileNames) qs.set('fileNames', fileNames);
        const res = await apiGetSafe(`/api/ka-corrections/my-released?${qs.toString()}`);
        if (!res || !res.ok || cancelled) {
          if (!cancelled) setReleasedExams([]);
          return;
        }
        const data = (await res.json()) as { results?: ReleasedExamResult[] };
        const rows = Array.isArray(data.results) ? data.results : [];

        const enriched: ReleasedExamResult[] = [];
        for (const row of rows) {
          const matchFile =
            examFiles.find((f) => f.name.toLowerCase() === (row.fileName || '').toLowerCase()) ||
            examFiles.find((f) => {
              const base = (row.kaFilePath || '').replace(/\\/g, '/').split('/').pop() || '';
              return f.name.toLowerCase() === base.toLowerCase();
            });

          let maxPoints = 0;
          if (matchFile?.path) {
            try {
              const htmlRes = await fetch(
                `/api/file-system-paths/read-html?filePath=${encodeURIComponent(matchFile.path)}`,
              );
              if (htmlRes.ok) {
                const html = await htmlRes.text();
                maxPoints = parseExamAnswerKey(html).maxPoints || 0;
              }
            } catch {
              /* ignore */
            }
          }

          const fromPoints =
            maxPoints > 0
              ? examGradeLabelFromPoints(Number(row.totalPoints) || 0, maxPoints)
              : null;
          const recent = row.recentGrades?.[0];
          const gradeLabel =
            fromPoints?.label ||
            (recent?.grade != null ? formatExamGradeNumber(Number(recent.grade)) : '-');

          enriched.push({
            ...row,
            maxPoints,
            gradeLabel,
            filePath: matchFile?.path,
          });
        }

        if (!cancelled) setReleasedExams(enriched);
      } catch {
        if (!cancelled) setReleasedExams([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonPath, files]);

  const materials = useMemo(() => {
    const fromTree = files.filter(
      (f) =>
        f.type === 'file' &&
        isStudentVisibleLessonMaterialFile(f.name || '') &&
        isLessonFileShared(f.path, sharedPaths)
    );
    // Freigegebene Präsentations-PDFs auch dann anzeigen, wenn der Ordnerbaum
    // noch nicht neu geladen wurde (z. B. PDF erst nach Stundenstart erzeugt).
    const folderKey = normalizeLessonMaterialPath(lessonPath || '').replace(/\/+$/, '');
    const byName = new Map(fromTree.map((f) => [f.name, f]));
    if (folderKey) {
      for (const sp of sharedPaths) {
        const p = (sp || '').replace(/\\/g, '/');
        const name = p.split('/').pop() || '';
        if (!isLessonPresentationMaterialPdf(name) || byName.has(name)) continue;
        const parentKey = normalizeLessonMaterialPath(p.replace(/\/[^/]+$/, '')).replace(/\/+$/, '');
        if (parentKey !== folderKey) continue;
        byName.set(name, { type: 'file', name, path: p });
      }
    }
    return [...byName.values()]
      .filter((f) => {
        if (isLessonPresentationMaterialPdf(f.name)) return true;
        const key = normalizeLessonMaterialPath(f.path).replace(/\/+$/, '');
        for (const blocked of blockedMaterialPaths) {
          if (normalizeLessonMaterialPath(blocked).replace(/\/+$/, '') === key) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [files, sharedPaths, lessonPath, blockedMaterialPaths]);

  const presentationOriginal = materials.find((f) => f.name === LESSON_PRESENTATION_PDF_ORIGINAL);
  const presentationEdited = materials.find((f) => f.name === LESSON_PRESENTATION_PDF_EDITED);
  const presentationShared = materials.some(
    (f) =>
      isJohnnyPresentationExportPdf(f.name) &&
      f.name !== LESSON_PRESENTATION_PDF_STAND &&
      isLessonFileShared(f.path, sharedPaths),
  );
  // Johnny-Folien-PDFs (Original/bearbeitet/Versionen/Stand) nie als Extra-Zeilen —
  // SuS sehen nur die Folien-Zeile mit einem Download bis NOW.
  const otherMaterials = materials.filter((f) => !isJohnnyPresentationExportPdf(f.name));
  const hasPresentation = presentationShared || !!(presentationOriginal || presentationEdited);
  const canOpenFolien = hasPresentation;
  const [standDownloadBusy, setStandDownloadBusy] = useState(false);

  useEffect(() => {
    if (!lessonPath || !groupId) {
      setCompletedEntryTicket(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams({ lessonPath, groupId });
        const res = await apiGetSafe(`/api/entry-ticket/completed?${qs.toString()}`);
        if (!res || !res.ok || cancelled) {
          if (!cancelled) setCompletedEntryTicket(false);
          return;
        }
        const data = (await res.json()) as { completed?: boolean; tasks?: unknown[] | null };
        if (cancelled) return;
        setCompletedEntryTicket(
          data.completed === true && Array.isArray(data.tasks) && data.tasks.length > 0,
        );
      } catch {
        if (!cancelled) setCompletedEntryTicket(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonPath, groupId]);

  const openCompletedEntryTicket = () => {
    if (!lessonPath || !groupId) return;
    const u = new URL('/entry-ticket', window.location.origin);
    u.searchParams.set('review', '1');
    u.searchParams.set('lessonPath', lessonPath);
    u.searchParams.set('groupId', groupId);
    u.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}`);
    window.location.assign(u.pathname + u.search);
  };

  useEffect(() => {
    if (!lessonPath || !hasPresentation || !onOpenHomeworkTodo) {
      setAbgabeRequired(false);
      setHomeworkTodoPath(null);
      setHomeworkTodoLabel(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const prev = await resolvePreviousLessonFolder(lessonPath);
        // Zuerst die HA dieser Stunde; nur wenn keine HA-Folie da ist → Vorstunde
        const candidates: { path: string; label: string | null }[] = [
          { path: lessonPath, label: null },
        ];
        if (prev?.path) {
          candidates.push({
            path: prev.path,
            label: prev.name ? `Vorstunde · ${prev.name}` : 'Vorstunde',
          });
        }

        for (const c of candidates) {
          if (cancelled) return;
          try {
            const loaded = await loadJsonFile<PresentationDeck>(deckFilePath(c.path));
            if (cancelled) return;
            if (!loaded?.slides?.length) continue;
            const haSlides = findHomeworkSlides(sortSlides(loaded.slides));
            if (haSlides.length === 0) continue;
            // Aktuelle Stunde: HA erst sichtbar, wenn NOW die HA-Folie erreicht hat
            if (c.path === lessonPath) {
              const nowIdx = findNowSlideIndex(loaded);
              if (nowIdx >= 0) {
                const sorted = sortSlides(loaded.slides);
                const nowOrder = sorted[nowIdx]!.order;
                const haReached = haSlides.some((s) => s.order <= nowOrder);
                if (!haReached) continue;
              }
            }
            const ha = haSlides[haSlides.length - 1] ?? haSlides[0];
            setHomeworkTodoPath(c.path);
            setHomeworkTodoLabel(c.label);
            setAbgabeRequired(isHomeworkSubmissionRequired(ha));
            return;
          } catch {
            /* try next candidate */
          }
        }
        if (!cancelled) {
          setHomeworkTodoPath(null);
          setHomeworkTodoLabel(null);
          setAbgabeRequired(false);
        }
      } catch {
        if (!cancelled) {
          setHomeworkTodoPath(null);
          setHomeworkTodoLabel(null);
          setAbgabeRequired(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonPath, hasPresentation, onOpenHomeworkTodo]);

  if (materials.length === 0 && !canOpenLeinwand && !completedEntryTicket && releasedExams.length === 0) {
    return (
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', py: 0.5 }}>
        Noch keine Materialien freigegeben.
      </Typography>
    );
  }

  const showTodoHa = Boolean(hasPresentation && homeworkTodoPath && onOpenHomeworkTodo);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {hasPresentation && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            minWidth: 0,
            gap: 0.65,
          }}
        >
          {completedEntryTicket && (
            <Tooltip title="Entry Ticket + Lösungen ansehen">
              <IconButton
                size="small"
                onClick={openCompletedEntryTicket}
                aria-label="Entry Ticket ansehen"
                sx={{
                  flexShrink: 0,
                  p: 0,
                  minWidth: 22,
                  width: 22,
                  height: 22,
                  borderRadius: 0.8,
                  border: '1.5px solid rgba(33, 150, 243, 0.5)',
                  background: 'linear-gradient(135deg, #1e88e5 0%, #3949ab 100%)',
                  color: 'white',
                  boxShadow: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1976d2 0%, #303f9f 100%)',
                  },
                }}
              >
                <Typography
                  component="span"
                  sx={{ fontSize: '0.7rem', fontWeight: 800, lineHeight: 1, color: 'inherit' }}
                >
                  E
                </Typography>
              </IconButton>
            </Tooltip>
          )}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
              height: FOLIEN_ROW_HEIGHT,
              boxSizing: 'border-box',
              py: 0,
              px: 1,
              borderRadius: 1.5,
              bgcolor: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              gap: 0.45,
            }}
          >
            <Tooltip title={canOpenFolien ? 'Folien bis NOW öffnen' : 'Folien'}>
              <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}>
                <Box
                  component="button"
                  type="button"
                  disabled={!canOpenFolien}
                  onClick={() => {
                    if (!canOpenFolien || !lessonPath) return;
                    const url = `${presentationReviewUrl(lessonPath, undefined, 'edited')}&viewer=student`;
                    if (!tryOpenInNewTab(url)) window.location.assign(url);
                  }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    border: 'none',
                    background: 'none',
                    p: 0,
                    m: 0,
                    cursor: canOpenFolien ? 'pointer' : 'default',
                    opacity: canOpenFolien ? 1 : 0.5,
                    font: 'inherit',
                    textAlign: 'left',
                    color: 'text.primary',
                    borderBottom: '1.5px solid transparent',
                    transition: 'color 0.15s ease, border-color 0.15s ease',
                    '&:hover':
                      canOpenFolien
                        ? {
                            color: JOHNNY_PRESENTATION.warm,
                            borderBottomColor: JOHNNY_PRESENTATION.warm,
                          }
                        : undefined,
                  }}
                >
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                      color: 'inherit',
                    }}
                  >
                    Folien
                  </Typography>
                </Box>
              </Box>
            </Tooltip>
            <Tooltip title="PDF bis NOW herunterladen">
              <span style={{ display: 'inline-flex', marginLeft: 'auto', flexShrink: 0 }}>
                <IconButton
                  size="small"
                  disabled={!canOpenFolien || standDownloadBusy || !lessonPath}
                  aria-label="Folienstand PDF herunterladen"
                  onClick={() => {
                    if (!lessonPath || standDownloadBusy) return;
                    setStandDownloadBusy(true);
                    void downloadPresentationStandPdfForStudent(
                      lessonPath,
                      `${(downloadLessonName || 'Folien').trim() || 'Folien'}_Stand.pdf`,
                    )
                      .catch((e) => {
                        console.warn('Stand-PDF Download fehlgeschlagen', e);
                        window.alert(
                          e instanceof Error
                            ? e.message
                            : 'PDF konnte nicht heruntergeladen werden.',
                        );
                      })
                      .finally(() => setStandDownloadBusy(false));
                  }}
                  sx={{
                    width: 28,
                    height: 28,
                    color: '#546e7a',
                    border: '1px solid rgba(0,0,0,0.23)',
                    borderRadius: 1,
                    bgcolor: 'transparent',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                    '&.Mui-disabled': { opacity: 0.45 },
                  }}
                >
                  <DownloadIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      )}

      {releasedExams.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
          {releasedExams.map((exam) => (
            <Box
              key={exam.id}
              component="button"
              type="button"
              onClick={() => setSelectedExam(exam)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                width: '100%',
                textAlign: 'left',
                border: '1px solid rgba(46, 125, 50, 0.35)',
                borderRadius: 1.5,
                bgcolor: 'rgba(232, 245, 233, 0.95)',
                px: 1,
                py: 0.55,
                cursor: 'pointer',
                font: 'inherit',
                '&:hover': { bgcolor: 'rgba(200, 230, 201, 0.95)' },
              }}
            >
              <AssignmentTurnedInIcon sx={{ fontSize: 18, color: '#2e7d32', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#1b5e20',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {exam.title || exam.fileName}
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: '#546e7a' }}>
                  {exam.maxPoints && exam.maxPoints > 0
                    ? `${Number(exam.totalPoints || 0).toFixed(1)} / ${exam.maxPoints} Punkte`
                    : `${Number(exam.totalPoints || 0).toFixed(1)} Punkte`}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 0.9,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: '#2e7d32',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {exam.gradeLabel || '-'}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {(canOpenLeinwand || showTodoHa) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            alignSelf: 'flex-start',
            flexWrap: 'nowrap',
          }}
        >
          {canOpenLeinwand && (
            <Button
              type="button"
              size="small"
              variant="contained"
              onClick={openLeinwandFullscreen}
              sx={{
                minWidth: 0,
                width: 'auto',
                height: TODO_HA_BTN_HEIGHT,
                minHeight: TODO_HA_BTN_HEIGHT,
                py: 0,
                px: 1.25,
                fontSize: '0.7rem',
                fontWeight: 700,
                lineHeight: 1.2,
                textTransform: 'none',
                borderRadius: 1.5,
                boxSizing: 'border-box',
                bgcolor: '#2e7d32',
                color: '#fff',
                border: '2px solid transparent',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#1b5e20', boxShadow: 'none' },
              }}
            >
              Leinwand
            </Button>
          )}
          {showTodoHa && (
            <Button
              type="button"
              size="small"
              variant="contained"
              title={homeworkTodoLabel ? `ToDo HA (${homeworkTodoLabel})` : 'ToDo HA'}
              onClick={() => onOpenHomeworkTodo!(homeworkTodoPath!, homeworkTodoLabel)}
              sx={{
                minWidth: 0,
                width: 'auto',
                height: TODO_HA_BTN_HEIGHT,
                minHeight: TODO_HA_BTN_HEIGHT,
                py: 0,
                px: 1.25,
                fontSize: '0.7rem',
                fontWeight: 700,
                lineHeight: 1.2,
                textTransform: 'none',
                borderRadius: 1.5,
                boxSizing: 'border-box',
                bgcolor: JOHNNY_PRESENTATION.warm,
                color: '#fff',
                border: abgabeRequired ? ABGABE_FRAME : '2px solid transparent',
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#F57C00',
                  boxShadow: 'none',
                  border: abgabeRequired ? ABGABE_FRAME : '2px solid transparent',
                },
              }}
            >
              ToDo HA
            </Button>
          )}
        </Box>
      )}

      {otherMaterials.map((file) => (
        <Box
          key={file.path}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 0.75,
            width: '100%',
            py: 0.5,
            px: 0.75,
            borderRadius: 1,
            bgcolor: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <PictureAsPdfIcon sx={{ fontSize: 20, color: '#546e7a', flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              flex: '1 1 80px',
              minWidth: 0,
              fontWeight: 600,
              fontSize: '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isLessonPresentationMaterialPdf(file.name)
              ? johnnyPresentationVersionLabel(file.name, files)
              : file.name}
          </Typography>
          <ButtonGroup
            size="small"
            variant="outlined"
            sx={{
              ml: 'auto',
              flexShrink: 0,
              '& .MuiButton-root': actionBtnSx,
              '& .MuiButton-contained': {
                bgcolor: '#546e7a',
                borderColor: '#546e7a',
                color: '#fff',
                '&:hover': { bgcolor: '#455a64', borderColor: '#455a64' },
              },
            }}
          >
            <Button onClick={() => void openStudentLessonMaterialFile(file, 'open')}>Öffnen</Button>
            <Button
              variant="contained"
              onClick={() => void openStudentLessonMaterialFile(file, 'download')}
            >
              Download
            </Button>
          </ButtonGroup>
        </Box>
      ))}

      <Dialog
        open={Boolean(selectedExam)}
        onClose={() => setSelectedExam(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.5, fontSize: '0.95rem', fontWeight: 700 }}>
          {selectedExam?.title || selectedExam?.fileName || 'Prüfung'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {selectedExam && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(232, 245, 233, 0.9)',
                  border: '1px solid rgba(46, 125, 50, 0.3)',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', color: '#546e7a' }}>Bewertung</Typography>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: '#1b5e20' }}>
                    Note {selectedExam.gradeLabel || '-'}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#2e7d32' }}>
                  {selectedExam.maxPoints && selectedExam.maxPoints > 0
                    ? `${Number(selectedExam.totalPoints || 0).toFixed(1)} / ${selectedExam.maxPoints} Punkte`
                    : `${Number(selectedExam.totalPoints || 0).toFixed(1)} Punkte`}
                </Typography>
              </Box>

              {selectedExam.corrections?.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>
                    Korrektur im Detail
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                    {selectedExam.corrections.map((c) => (
                      <Box
                        key={c.taskNumber}
                        sx={{
                          display: 'flex',
                          gap: 0.75,
                          alignItems: 'flex-start',
                          px: 0.8,
                          py: 0.45,
                          borderRadius: 1,
                          bgcolor: 'rgba(0,0,0,0.03)',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, minWidth: 36 }}>
                          {c.taskNumber}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, minWidth: 42 }}>
                          {c.manualPoints != null ? `${c.manualPoints} P` : '–'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#546e7a', flex: 1 }}>
                          {c.comment || ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, gap: 0.5 }}>
          <Button onClick={() => setSelectedExam(null)} size="small" sx={{ textTransform: 'none' }}>
            Schließen
          </Button>
          {selectedExam?.filePath && (
            <Button
              variant="contained"
              size="small"
              sx={{ textTransform: 'none', bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
              onClick={() => {
                const path = selectedExam.filePath!;
                const name = selectedExam.fileName || path.split('/').pop() || 'Prüfung.html';
                void openLessonFolderFile({ type: 'file', name, path });
              }}
            >
              Prüfung öffnen
            </Button>
          )}
        </DialogActions>
      </Dialog>

    </Box>
  );
}
