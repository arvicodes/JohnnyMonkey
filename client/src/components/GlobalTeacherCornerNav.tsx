import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestTeacherDashboard } from '../lib/teacherGoDashboard';
import TeacherCornerNavControls from './TeacherCornerNavControls';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest('[role="textbox"]')) return true;
  return false;
}

/** Ecke N+D für Lehrkräfte (ersetzt die alten FABs unten rechts). */
export default function GlobalTeacherCornerNav() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      requestTeacherDashboard(navigate);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [navigate]);

  return (
    <TeacherCornerNavControls onDashboard={() => requestTeacherDashboard(navigate)} />
  );
}
