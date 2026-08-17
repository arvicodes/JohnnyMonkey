import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, IconButton, Tooltip } from '@mui/material';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest('[role="textbox"]')) return true;
  return false;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return 'JM';
}

/**
 * Taste „d“: von überall sofort zum Dashboard (nicht während Texteingabe).
 * Auf Unterseiten zusätzlich der Profil-Avatar oben links → immer Dashboard.
 */
export default function GlobalDashboardShortcut() {
  const navigate = useNavigate();
  const location = useLocation();
  const showAvatar =
    location.pathname !== '/' &&
    location.pathname !== '/dashboard' &&
    location.pathname !== '/teacher/stunde' &&
    location.pathname !== '/entry-ticket' &&
    !location.pathname.startsWith('/presentation/');

  const initials = useMemo(
    () => initialsFromName(localStorage.getItem('userName') || ''),
    [location.pathname],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      navigate('/dashboard');
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [navigate]);

  if (!showAvatar) return null;

  return (
    <Tooltip title="Zum Dashboard">
      <IconButton
        onClick={() => navigate('/dashboard')}
        aria-label="Zum Dashboard"
        sx={{
          position: 'fixed',
          bottom: 18,
          left: 18,
          zIndex: 1400,
          p: 0,
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: '#1976d2',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.85rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
            border: '2px solid #fff',
          }}
        >
          {initials}
        </Avatar>
      </IconButton>
    </Tooltip>
  );
}
