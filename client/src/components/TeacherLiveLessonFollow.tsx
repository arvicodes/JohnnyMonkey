import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { presentationLessonReturnWithPresentationUrl } from '../lib/presentationEditorUi';
import {
  isTeacherPlayHost,
  teacherLessonPathsMatch,
} from '../lib/teacherLiveLesson';

type ActiveSession = {
  id: string;
  groupId: string;
  lessonPath: string;
  status: string;
  startsAt?: string;
  updatedAt?: string;
};

function sessionStartMs(s: ActiveSession): number {
  const raw = s.updatedAt || s.startsAt || '';
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Tablet startet Play → andere eingeloggte Lehrer-Tabs/Geräte öffnen dieselbe Stunde im Laptop-Modus.
 */
export default function TeacherLiveLessonFollow() {
  const navigate = useNavigate();
  const location = useLocation();
  const followingRef = useRef(false);

  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toUpperCase();
    if (role !== 'TEACHER' && !localStorage.getItem('teacherId')) return undefined;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || followingRef.current) return;
      const loginCode = localStorage.getItem('loginCode') || '';
      if (!loginCode) return;
      if (location.pathname.startsWith('/presentation/present')) return;

      try {
        const res = await fetch('/api/teacher-schedule/active-lessons/teacher', {
          headers: { 'x-login-code': loginCode },
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const sessions: ActiveSession[] = (Array.isArray(data?.sessions) ? data.sessions : [])
          .map((s: Record<string, unknown>) => ({
            id: String(s.id || ''),
            groupId: String(s.groupId || ''),
            lessonPath: s.lessonPath != null ? String(s.lessonPath) : '',
            status: String(s.status || ''),
            startsAt: s.startsAt != null ? String(s.startsAt) : undefined,
            updatedAt: s.updatedAt != null ? String(s.updatedAt) : undefined,
          }))
          .filter((s: ActiveSession) => s.id && s.groupId && s.lessonPath && s.status === 'ACTIVE');

        if (sessions.length === 0) return;

        sessions.sort((a, b) => sessionStartMs(b) - sessionStartMs(a));
        const session = sessions[0];
        if (!session || isTeacherPlayHost(session.groupId, session.lessonPath)) return;

        const params = new URLSearchParams(location.search);
        const onStunde = location.pathname === '/teacher/stunde';
        const sameLesson =
          onStunde &&
          params.get('groupId') === session.groupId &&
          teacherLessonPathsMatch(params.get('lessonPath'), session.lessonPath);
        const alreadyLaptop =
          sameLesson &&
          (params.get('planMode') === 'background' || params.get('openPresentation') === '1');
        if (alreadyLaptop) return;

        followingRef.current = true;
        navigate(presentationLessonReturnWithPresentationUrl(session.lessonPath, session.groupId), {
          replace: onStunde,
        });
        window.setTimeout(() => {
          followingRef.current = false;
        }, 1500);
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [location.pathname, location.search, navigate]);

  return null;
}
