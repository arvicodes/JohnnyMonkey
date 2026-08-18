/** Profil / Taste d: merken, dass die Lehrkraft bewusst zum Dashboard will. */
export function markTeacherWantsDashboard(): void {
  try {
    sessionStorage.setItem('jm-teacher-wants-dashboard-at', String(Date.now()));
  } catch {
    /* ignore */
  }
}
