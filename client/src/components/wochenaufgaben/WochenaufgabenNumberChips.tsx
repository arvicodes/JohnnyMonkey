import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import {
  WOCHENAUFGABEN_BG,
  WOCHENAUFGABEN_BORDER,
  WOCHENAUFGABEN_TEXT_COLOR,
  WochenaufgabenFsNode,
  numberedWochenaufgabeDirs,
} from '../../lib/wochenaufgabenFolder';
import {
  WA_SLOT_BUTTONS,
  WaUploadKind,
  WochenaufgabeTaskState,
  formatWaRemaining,
  waSubmissionDownloadUrl,
} from '../../lib/wochenaufgabenWorkflow';
import { INITIAL_WOCHENAUFGABE_NUMBERS } from '../../lib/wochenaufgabenPresentation';

type Props = {
  children: WochenaufgabenFsNode[] | undefined;
  parentPath: string;
  isTeacher?: boolean;
  statesByPath?: Record<string, WochenaufgabeTaskState>;
  onSelect?: (lessonPath: string) => void;
  onOpenPdf?: (lessonPath: string) => void;
  onActivate?: (lessonPath: string) => void;
  onClaimVideo?: (lessonPath: string) => void;
  onUpload?: (lessonPath: string, kind: WaUploadKind) => void;
  onAdd?: () => void;
};

function normPath(p: string) {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

function cell(extra?: object) {
  return {
    m: 0,
    p: 0,
    border: 'none',
    bgcolor: 'transparent',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    minWidth: 0,
    ...extra,
  };
}

function cardColors(state: WochenaufgabeTaskState | undefined, isTeacher: boolean) {
  if (!state || state.phase === 'draft') {
    return {
      border: '#d0d0d0',
      bg: '#eceff1',
      color: '#78909c',
    };
  }
  if (isTeacher || state.phase === 'completed') {
    return {
      border: WOCHENAUFGABEN_BORDER,
      bg: WOCHENAUFGABEN_BG,
      color: WOCHENAUFGABEN_TEXT_COLOR,
    };
  }
  return {
    border: WOCHENAUFGABEN_TEXT_COLOR,
    bg: '#fff8e1',
    color: WOCHENAUFGABEN_TEXT_COLOR,
  };
}

/** Pro WA: oben Nummer|V, unten 1–5. Phasen-Timer, kein Schüler-Dropdown. */
export default function WochenaufgabenNumberChips({
  children,
  parentPath,
  isTeacher = false,
  statesByPath = {},
  onSelect,
  onOpenPdf,
  onActivate,
  onClaimVideo,
  onUpload,
  onAdd,
}: Props) {
  const dirsFromFs = numberedWochenaufgabeDirs(children);
  const dirs =
    dirsFromFs.length > 0
      ? dirsFromFs
      : isTeacher || onAdd
        ? INITIAL_WOCHENAUFGABE_NUMBERS.map((n) => ({
            name: String(n),
            type: 'directory' as const,
            path: `${normPath(parentPath)}/${n}`,
          }))
        : [];

  const openDownload = (submissionId: string) => {
    window.open(waSubmissionDownloadUrl(submissionId), '_blank');
  };

  if (dirs.length === 0 && !onAdd) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem', mt: 0.35 }}>
        Noch keine Wochenaufgaben — bitte warten, bis der Lehrer welche anlegt.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      {dirs.map((child) => {
        const lessonPath = normPath(child.path || `${parentPath}/${child.name || ''}`);
        const state = statesByPath[lessonPath];
        const colors = cardColors(state, isTeacher);
        const active = state && state.phase !== 'draft';
        const timer = active ? formatWaRemaining(state?.remainingMs ?? null) : null;

        const handleNumber = () => {
          if (isTeacher) {
            if (!active && onActivate) {
              onActivate(lessonPath);
              return;
            }
            onSelect?.(lessonPath);
            return;
          }
          onOpenPdf?.(lessonPath);
        };

        const handleV = () => {
          if (isTeacher) return;
          if (!state) return;
          if (state.canClaimVideo) {
            onClaimVideo?.(lessonPath);
            return;
          }
          if (state.isVideoClaimMine && !state.hasVideo) {
            onUpload?.(lessonPath, 'video');
            return;
          }
          if (state.videoVisibleToAll && state.videoSubmissionId) {
            openDownload(state.videoSubmissionId);
          }
        };

        const slotHandler = (slot: (typeof WA_SLOT_BUTTONS)[number]) => {
          if (isTeacher || !state) return;
          if (slot === 1 && state.phase === 'phase1') {
            if (state.mySolutionSubmissionId) openDownload(state.mySolutionSubmissionId);
            else onUpload?.(lessonPath, 'solution');
            return;
          }
          if (slot === 2 && state.peerSolutionSubmissionId) {
            openDownload(state.peerSolutionSubmissionId);
            return;
          }
          if (slot === 3 && state.phase === 'phase2') {
            if (state.myAudioSubmissionId) openDownload(state.myAudioSubmissionId);
            else onUpload?.(lessonPath, 'audio');
            return;
          }
          if (slot === 4 && state.receivedAudioSubmissionId) {
            openDownload(state.receivedAudioSubmissionId);
            return;
          }
          if (slot === 5 && state.phase === 'phase3') {
            if (state.myCorrectionSubmissionId) openDownload(state.myCorrectionSubmissionId);
            else onUpload?.(lessonPath, 'correction');
          }
        };

        const slotEnabled = (slot: (typeof WA_SLOT_BUTTONS)[number]) => {
          if (isTeacher || !state || state.phase === 'draft') return false;
          if (slot === 1) return state.phase === 'phase1';
          if (slot === 2) return Boolean(state.peerSolutionSubmissionId);
          if (slot === 3) return state.phase === 'phase2';
          if (slot === 4) return Boolean(state.receivedAudioSubmissionId);
          if (slot === 5) return state.phase === 'phase3';
          return false;
        };

        const slotDone = (slot: (typeof WA_SLOT_BUTTONS)[number]) => {
          if (!state) return false;
          if (slot === 1) return Boolean(state.mySolutionSubmissionId);
          if (slot === 2) return Boolean(state.peerSolutionSubmissionId);
          if (slot === 3) return Boolean(state.myAudioSubmissionId);
          if (slot === 4) return Boolean(state.receivedAudioSubmissionId);
          if (slot === 5) return Boolean(state.myCorrectionSubmissionId);
          return false;
        };

        const vEnabled =
          !isTeacher &&
          state &&
          (state.canClaimVideo ||
            (state.isVideoClaimMine && !state.hasVideo) ||
            (state.videoVisibleToAll && state.videoSubmissionId));

        const vLabel = state?.canClaimVideo
          ? 'V'
          : state?.isVideoClaimMine && !state.hasVideo
            ? 'V↑'
            : state?.videoVisibleToAll
              ? 'V▶'
              : state?.videoClaimStudentId
                ? 'V✓'
                : 'V';

        return (
          <Box key={String(child.name)} sx={{ width: 68, flexShrink: 0 }}>
            <Box
              sx={{
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                overflow: 'hidden',
                bgcolor: colors.bg,
              }}
            >
              <Box sx={{ display: 'flex', height: 24, borderBottom: `1px solid ${colors.border}` }}>
                <Tooltip title={isTeacher ? (active ? 'Folie bearbeiten' : 'Freigeben (gelb)') : 'Aufgaben-PDF'}>
                  <Box
                    component="button"
                    type="button"
                    onClick={handleNumber}
                    sx={cell({
                      flex: 1,
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      color: colors.color,
                      borderRight: `1px solid ${colors.border}`,
                      '&:hover': { bgcolor: '#fff3e0' },
                    })}
                  >
                    {child.name}
                  </Box>
                </Tooltip>
                <Tooltip
                  title={
                    isTeacher
                      ? 'Erklärvideo (SuS)'
                      : state?.canClaimVideo
                        ? 'Erklärvideo reservieren'
                        : state?.isVideoClaimMine
                          ? 'Video hochladen'
                          : state?.videoVisibleToAll
                            ? 'Video ansehen'
                            : 'Erklärvideo'
                  }
                >
                  <Box
                    component="button"
                    type="button"
                    disabled={!vEnabled && !isTeacher}
                    onClick={handleV}
                    sx={cell({
                      flex: 1,
                      fontWeight: 700,
                      fontSize: '0.58rem',
                      color: colors.color,
                      cursor: vEnabled ? 'pointer' : 'default',
                      opacity: vEnabled || isTeacher ? 1 : 0.4,
                      bgcolor: state?.isVideoClaimMine ? '#ffe0b2' : 'transparent',
                      '&:hover': vEnabled ? { bgcolor: '#fff3e0' } : {},
                    })}
                  >
                    {vLabel}
                  </Box>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', height: 16 }}>
                {WA_SLOT_BUTTONS.map((slot) => {
                  const enabled = slotEnabled(slot);
                  const done = slotDone(slot);
                  return (
                    <Tooltip
                      key={slot}
                      title={
                        slot === 1
                          ? 'Eigene Lösung (PDF)'
                          : slot === 2
                            ? state?.peerSolutionStudentName
                              ? `Lösung: ${state.peerSolutionStudentName}`
                              : 'Partner-Lösung'
                            : slot === 3
                              ? 'Audio-Rückmeldung'
                              : slot === 4
                                ? 'Erhaltene Rückmeldung'
                                : 'Korrigierte Lösung'
                      }
                    >
                      <Box
                        component="button"
                        type="button"
                        disabled={!enabled}
                        onClick={() => slotHandler(slot)}
                        sx={cell({
                          flex: 1,
                          fontSize: '0.48rem',
                          fontWeight: done ? 800 : 500,
                          color: done ? WOCHENAUFGABEN_TEXT_COLOR : enabled ? colors.color : '#b0bec5',
                          bgcolor: done ? '#fff3e0' : 'transparent',
                          borderRight: slot < 5 ? `1px solid ${colors.border}` : 'none',
                          cursor: enabled ? 'pointer' : 'default',
                          opacity: enabled ? 1 : 0.35,
                          '&:hover': enabled ? { bgcolor: '#fff8e1' } : {},
                        })}
                      >
                        {slot}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
            {timer && active ? (
              <Typography
                component="div"
                sx={{
                  fontSize: '0.48rem',
                  color: colors.color,
                  textAlign: 'center',
                  mt: 0.15,
                  fontWeight: 600,
                  lineHeight: 1.1,
                }}
              >
                {timer}
              </Typography>
            ) : null}
          </Box>
        );
      })}

      {onAdd ? (
        <Box
          component="button"
          type="button"
          aria-label="Wochenaufgabe hinzufügen"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          sx={{
            width: 32,
            height: 42,
            border: `1px solid ${WOCHENAUFGABEN_BORDER}`,
            borderRadius: '6px',
            bgcolor: WOCHENAUFGABEN_BG,
            color: WOCHENAUFGABEN_TEXT_COLOR,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: '1rem',
            '&:hover': { bgcolor: '#fff3e0' },
          }}
        >
          +
        </Box>
      ) : null}
    </Box>
  );
}
