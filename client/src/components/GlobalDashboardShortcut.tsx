import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { markTeacherWantsDashboard } from '../lib/teacherLiveLesson';
import { exitPresentFullscreen } from '../lib/presentationPresentFullscreen';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest('[role="textbox"]')) return true;
  return false;
}

function goDashboard(navigate: ReturnType<typeof useNavigate>) {
  exitPresentFullscreen();
  markTeacherWantsDashboard();
  navigate('/dashboard');
}

type Props = {
  /** Abstand von rechts, damit der Button neben dem N-Notizbutton sitzt. */
  buttonRight?: number;
};

/**
 * Taste „d“ und grauer D-Button: von überall sofort zum Dashboard (nicht während Texteingabe).
 */
export default function GlobalDashboardShortcut({ buttonRight = 20 }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      goDashboard(navigate);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [navigate]);

  const button = (
    <Tooltip title="Zum Dashboard (D)" placement="left">
      <IconButton
        onClick={() => goDashboard(navigate)}
        aria-label="Zum Dashboard (Taste D)"
        data-teacher-fab="dashboard"
        sx={{
          position: 'fixed',
          bottom: 20,
          right: buttonRight,
          zIndex: 5000,
          p: 0.5,
          minWidth: 40,
          width: 40,
          height: 40,
          color: '#29b6f6',
          bgcolor: '#9e9e9e',
          borderRadius: 1.4,
          boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
          '&:hover': { bgcolor: '#757575' },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: '1.05rem',
            fontWeight: 900,
            lineHeight: 1,
            color: '#4fc3f7',
            textShadow: '0 1px 0 rgba(0,0,0,0.25)',
          }}
        >
          D
        </Typography>
      </IconButton>
    </Tooltip>
  );
  if (typeof document === 'undefined') return button;
  return createPortal(button, document.body);
}
