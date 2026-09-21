import type { NavigateFunction } from 'react-router-dom';
import { markTeacherWantsDashboard } from './teacherLiveLesson';
import { exitPresentFullscreen } from './presentationPresentFullscreen';

export const TEACHER_GO_DASHBOARD_EVENT = 'johnny:teacher-go-dashboard';

/** Lehrer-Übersicht: Route /dashboard, Tab „Reihen“ (Ecke D, Taste D, …). */
export function requestTeacherDashboard(navigate: NavigateFunction): void {
  exitPresentFullscreen();
  markTeacherWantsDashboard();
  window.dispatchEvent(new Event(TEACHER_GO_DASHBOARD_EVENT));
  navigate('/dashboard');
}
