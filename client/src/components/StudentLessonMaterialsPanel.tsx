import React, { useMemo } from 'react';
import { Box, Button, ButtonGroup, Tooltip, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import {
  isLessonPresentationMaterialPdf,
  isStudentVisibleLessonMaterialFile,
  johnnyPresentationVersionLabel,
  lessonPresentationDownloadFilename,
  LESSON_PRESENTATION_PDF_EDITED,
  LESSON_PRESENTATION_PDF_ORIGINAL,
} from '../lib/presentationLessonAssets';
import { isLessonFileShared } from '../lib/lessonFileSharePath';
import { openStudentLessonMaterialFile } from '../lib/openStudentLessonMaterial';

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
  minWidth: 31,
  width: 31,
  height: 29,
  p: 0.25,
};

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
  editedLabel = 'bearbeitet',
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
                downloadName: lessonPresentationDownloadFilename(lessonName, 'edited'),
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
  files,
  sharedPaths,
}: {
  lessonName: string;
  files: LessonFile[];
  sharedPaths: string[];
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
    ? johnnyPresentationVersionLabel(presentationEdited.name)
    : 'bearbeitet';
  const originalShared = presentationOriginal
    ? isLessonFileShared(presentationOriginal.path, sharedPaths)
    : false;

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
            py: 0.75,
            px: 0.75,
            borderRadius: 1,
            bgcolor: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <Tooltip title="Original öffnen">
            <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}>
              <Box
                component="button"
                type="button"
                disabled={!originalShared}
                onClick={() =>
                  originalShared &&
                  presentationOriginal &&
                  void openStudentLessonMaterialFile(presentationOriginal, 'open')
                }
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexShrink: 0,
                  border: 'none',
                  background: 'none',
                  p: 0,
                  m: 0,
                  cursor: originalShared ? 'pointer' : 'default',
                  opacity: originalShared ? 1 : 0.5,
                  font: 'inherit',
                  textAlign: 'left',
                  '&:hover': originalShared ? { opacity: 0.82 } : undefined,
                }}
              >
                <PictureAsPdfIcon sx={{ fontSize: 20, color: '#546e7a' }} />
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    color: 'text.primary',
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
              ? johnnyPresentationVersionLabel(file.name)
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
