import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, ButtonGroup, Tooltip, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import {
  isLessonPresentationMaterialPdf,
  isStudentVisibleLessonMaterialFile,
  johnnyPresentationVersionLabel,
  firstNamedJohnnyPresentationLabel,
  lessonPresentationDownloadFilename,
  LESSON_PRESENTATION_PDF_EDITED,
  LESSON_PRESENTATION_PDF_ORIGINAL,
} from '../lib/presentationLessonAssets';
import { isLessonFileShared } from '../lib/lessonFileSharePath';
import { openStudentLessonMaterialFile } from '../lib/openStudentLessonMaterial';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import {
  deckFilePath,
  loadJsonFile,
  sortSlides,
  type PresentationDeck,
} from '../lib/presentationDeck';
import {
  findHomeworkSlides,
  isHomeworkSubmissionRequired,
} from '../lib/presentationSlideTemplates';

type LessonFile = { type: string; name: string; path: string };

const actionBtnSx = {
  py: 0.35,
  px: 0.85,
  fontSize: '0.68rem',
  minHeight: 28,
  lineHeight: 1.2,
  textTransform: 'none' as const,
  whiteSpace: 'nowrap' as const,
};

const iconActionBtnSx = {
  minWidth: 29,
  width: 29,
  height: 26,
  p: 0.2,
};

/** Folien-Zeile */
const FOLIEN_ROW_HEIGHT = 32;
/** ToDo-HA-Button — etwas flacher als die Folien-Zeile */
const TODO_HA_BTN_HEIGHT = 24;

/** Rahmen nur bei ToDo HA mit Abgabe-Pflicht */
const ABGABE_FRAME = '2px solid rgba(140, 60, 50, 0.95)';

function EditDownloadComboIcon() {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 20,
        height: 20,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'inherit',
      }}
    >
      <CreateOutlinedIcon sx={{ fontSize: 17 }} />
      <DownloadIcon
        sx={{
          fontSize: 11,
          position: 'absolute',
          right: -2,
          bottom: -2,
          bgcolor: '#fff',
          borderRadius: '50%',
          p: '1px',
        }}
      />
    </Box>
  );
}

function PresentationCombinedActions({
  lessonName,
  original,
  edited,
  editedLabel = 'Version',
  sharedPaths,
}: {
  lessonName: string;
  original?: LessonFile;
  edited?: LessonFile;
  editedLabel?: string;
  sharedPaths: string[];
}) {
  const originalShared = original ? isLessonFileShared(original.path, sharedPaths) : false;
  const editedShared = edited ? isLessonFileShared(edited.path, sharedPaths) : false;

  const groupBtnSx = {
    ...iconActionBtnSx,
    borderRadius: 0,
    borderColor: 'rgba(0,0,0,0.23) !important',
    borderRight: '1px solid rgba(0,0,0,0.12) !important',
    color: '#546e7a',
    bgcolor: 'transparent',
    boxShadow: 'none',
    '&:hover': {
      bgcolor: 'rgba(0,0,0,0.04)',
      borderColor: 'rgba(0,0,0,0.35) !important',
    },
    '&:focus': { outline: 'none' },
    '&.Mui-focusVisible': { outline: 'none' },
    '&:last-of-type': { borderRight: 'none !important' },
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        ml: 'auto',
        border: '1px solid rgba(0,0,0,0.23)',
        borderRadius: 1,
        overflow: 'hidden',
        '& .MuiButton-root': groupBtnSx,
      }}
    >
      <Tooltip title="Original herunterladen">
        <span style={{ display: 'inline-flex', lineHeight: 0 }}>
          <Button
            variant="outlined"
            disabled={!originalShared}
            onClick={() =>
              originalShared &&
              original &&
              void openStudentLessonMaterialFile(original, 'download', {
                downloadName: lessonPresentationDownloadFilename(lessonName, 'original'),
              })
            }
          >
            <DownloadIcon sx={{ fontSize: 20 }} />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={`${editedLabel} öffnen`}>
        <span style={{ display: 'inline-flex', lineHeight: 0 }}>
          <Button
            variant="outlined"
            disabled={!editedShared}
            onClick={() => editedShared && edited && void openStudentLessonMaterialFile(edited, 'open')}
          >
            <EditNoteOutlinedIcon sx={{ fontSize: 20 }} />
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={`${editedLabel} downloaden`}>
        <span style={{ display: 'inline-flex', lineHeight: 0 }}>
          <Button
            variant="outlined"
            disabled={!editedShared}
            onClick={() =>
              editedShared &&
              edited &&
              void openStudentLessonMaterialFile(edited, 'download', {
                downloadName: lessonPresentationDownloadFilename(lessonName, 'edited', editedLabel),
              })
            }
          >
            <EditDownloadComboIcon />
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
}

export default function StudentLessonMaterialsPanel({
  lessonName,
  lessonPath,
  files,
  sharedPaths,
  onOpenHomeworkTodo,
}: {
  lessonName: string;
  /** Stundenordner-Pfad — für ToDo/Hausaufgaben-Abgabe */
  lessonPath: string;
  files: LessonFile[];
  sharedPaths: string[];
  /** Öffnet das ToDo-Modal auf Dashboard-Ebene (überlebt Panel-Remounts) */
  onOpenHomeworkTodo?: (lessonPath: string) => void;
}) {
  const downloadLessonName = (lessonName || '').trim();

  const materials = useMemo(() => {
    return files
      .filter(
        (f) =>
          f.type === 'file' &&
          isStudentVisibleLessonMaterialFile(f.name || '') &&
          isLessonFileShared(f.path, sharedPaths)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [files, sharedPaths]);

  const presentationOriginal = materials.find((f) => f.name === LESSON_PRESENTATION_PDF_ORIGINAL);
  const namedPresentationPdfs = materials.filter(
    (f) =>
      isLessonPresentationMaterialPdf(f.name) &&
      f.name !== LESSON_PRESENTATION_PDF_ORIGINAL &&
      f.name !== LESSON_PRESENTATION_PDF_EDITED
  );
  // Benannte Version (z. B. 2026) ersetzt „bearbeitet“ — gleiche Ansicht, anderer Name
  const presentationEdited =
    namedPresentationPdfs[0] ??
    materials.find((f) => f.name === LESSON_PRESENTATION_PDF_EDITED);
  const otherMaterials = materials.filter((f) => {
    if (!isLessonPresentationMaterialPdf(f.name)) return true;
    if (f.name === LESSON_PRESENTATION_PDF_ORIGINAL || f.name === LESSON_PRESENTATION_PDF_EDITED) {
      return false;
    }
    // Erste benannte Version steckt schon im Folien-Slot
    if (presentationEdited && f.path === presentationEdited.path) return false;
    return true;
  });
  const hasPresentation = !!(presentationOriginal || presentationEdited);
  const editedVersionLabel = presentationEdited
    ? johnnyPresentationVersionLabel(presentationEdited.name, files)
    : firstNamedJohnnyPresentationLabel(files) || 'Version';
  const originalShared = presentationOriginal
    ? isLessonFileShared(presentationOriginal.path, sharedPaths)
    : false;
  const editedShared = presentationEdited
    ? isLessonFileShared(presentationEdited.path, sharedPaths)
    : false;

  const [abgabeRequired, setAbgabeRequired] = useState(false);
  useEffect(() => {
    if (!lessonPath || !hasPresentation || !onOpenHomeworkTodo) {
      setAbgabeRequired(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadJsonFile<PresentationDeck>(deckFilePath(lessonPath));
        if (cancelled) return;
        if (!loaded?.slides?.length) {
          setAbgabeRequired(false);
          return;
        }
        const haSlides = findHomeworkSlides(sortSlides(loaded.slides));
        const ha = haSlides[haSlides.length - 1] ?? haSlides[0];
        setAbgabeRequired(isHomeworkSubmissionRequired(ha));
      } catch {
        if (!cancelled) setAbgabeRequired(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonPath, hasPresentation, onOpenHomeworkTodo]);

  if (materials.length === 0) {
    return (
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', py: 0.5 }}>
        Noch keine Materialien freigegeben.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {hasPresentation && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            minWidth: 0,
            height: FOLIEN_ROW_HEIGHT,
            boxSizing: 'border-box',
            py: 0,
            px: 1,
            borderRadius: 1.5,
            bgcolor: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <Tooltip title={editedShared ? `${editedVersionLabel} öffnen` : originalShared ? 'Original öffnen' : 'Folien'}>
            <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0, mr: 0.5 }}>
              <Box
                component="button"
                type="button"
                disabled={!editedShared && !originalShared}
                onClick={() => {
                  if (editedShared && presentationEdited) {
                    void openStudentLessonMaterialFile(presentationEdited, 'open');
                    return;
                  }
                  if (originalShared && presentationOriginal) {
                    void openStudentLessonMaterialFile(presentationOriginal, 'open');
                  }
                }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  border: 'none',
                  background: 'none',
                  p: 0,
                  m: 0,
                  cursor: editedShared || originalShared ? 'pointer' : 'default',
                  opacity: editedShared || originalShared ? 1 : 0.5,
                  font: 'inherit',
                  textAlign: 'left',
                  color: 'text.primary',
                  borderBottom: '1.5px solid transparent',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  '&:hover':
                    editedShared || originalShared
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
          <PresentationCombinedActions
            lessonName={downloadLessonName}
            original={presentationOriginal}
            edited={presentationEdited}
            editedLabel={editedVersionLabel}
            sharedPaths={sharedPaths}
          />
        </Box>
      )}

      {hasPresentation && lessonPath && onOpenHomeworkTodo && (
        <Button
          type="button"
          size="small"
          variant="contained"
          onClick={() => onOpenHomeworkTodo(lessonPath)}
          sx={{
            alignSelf: 'flex-start',
            ml: 0,
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

    </Box>
  );
}
