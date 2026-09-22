export async function resetExamSession(
  kaFilePath: string,
  options?: { restartTimer?: boolean },
): Promise<{ deletedCount: number; restartedGroups: number; message: string }> {
  const loginCode = localStorage.getItem('loginCode') || '';
  const res = await fetch('/api/ka-corrections/reset-exam-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-login-code': loginCode,
    },
    body: JSON.stringify({
      kaFilePath,
      restartTimer: Boolean(options?.restartTimer),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Zurücksetzen fehlgeschlagen');
  }
  return {
    deletedCount: Number(data.deletedCount) || 0,
    restartedGroups: Number(data.restartedGroups) || 0,
    message: String(data.message || 'OK'),
  };
}
