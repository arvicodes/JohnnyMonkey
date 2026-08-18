import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { markTeacherWantsDashboard } from '../lib/teacherLiveLesson';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest('[role="textbox"]')) return true;
  return false;
}

/**
 * Taste „d“: von überall sofort zum Dashboard (nicht während Texteingabe).
 * Sichtbarer Sprung: Profil-Icon oben links im Menü.
 */
export default function GlobalDashboardShortcut() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      markTeacherWantsDashboard();
      navigate('/dashboard');
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [navigate]);

  return null;
}
