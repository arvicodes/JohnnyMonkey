import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  TextField,
  Typography,
} from '@mui/material';
import {
  examVersionStorageKey,
  fetchExamVersionLetters,
  normalizeVersionLetter,
  resolveVersionFilePath,
} from '../lib/examVersionPaths';

type ExamBeacon = {
  groupId: string;
  groupName?: string;
  filePath: string;
  lessonPath?: string;
  beaconId: string;
  updatedAt?: string;
  versionLetters?: string[];
  versionPaths?: Record<string, string>;
  baseFilePath?: string;
};

const POLL_MS = 1500;

/**
 * Lehrer startet Prüfung → SuS bekommen ein nicht schließbares Vollbild-Overlay
 * mit der Prüfungs-HTML (überdeckt alles andere).
 * Bei mehreren Versionen: zuerst Buchstaben eingeben.
 */
export default function StudentLiveExamAlert({ userId }: { userId: string }) {
  const [beacon, setBeacon] = useState<ExamBeacon | null>(null);
  const [htmlUrl, setHtmlUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [versionLetters, setVersionLetters] = useState<string[]>(['A']);
  const [versionPaths, setVersionPaths] = useState<Record<string, string>>({});
  const [baseFilePath, setBaseFilePath] = useState<string | null>(null);
  const [chosenLetter, setChosenLetter] = useState<string | null>(null);
  const [letterInput, setLetterInput] = useState('');
  const [letterError, setLetterError] = useState<string | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const poll = useCallback(async () => {
    if (!userId) return;
    try {
      const loginCode = localStorage.getItem('loginCode')?.trim();
      if (!loginCode) return;
      const res = await fetch('/api/learning-groups/exam-beacon/student-poll', {
        headers: { 'x-login-code': loginCode },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { beacons?: ExamBeacon[] };
      const next = data.beacons?.[0] || null;
      setBeacon((prev) => {
        if (!next) return null;
        if (
          prev &&
          prev.beaconId === next.beaconId &&
          prev.filePath === next.filePath &&
          prev.groupId === next.groupId &&
          prev.updatedAt === next.updatedAt
        ) {
          return prev;
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void poll();
    const t = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(t);
  }, [userId, poll]);

  useEffect(() => {
    if (!beacon?.filePath || !beacon.beaconId) {
      setHtmlUrl(null);
      setLoadError(null);
      setChosenLetter(null);
      setLetterInput('');
      setLetterError(null);
      setVersionLetters(['A']);
      setVersionPaths({});
      setBaseFilePath(null);
      return;
    }

    let cancelled = false;
    setVersionsLoading(true);
    void (async () => {
      try {
        const meta =
          beacon.versionLetters && beacon.versionLetters.length > 0
            ? {
                letters: beacon.versionLetters,
                paths: beacon.versionPaths || {},
                baseFilePath: beacon.baseFilePath || beacon.filePath,
              }
            : await fetchExamVersionLetters(beacon.filePath);
        if (cancelled) return;
        setVersionLetters(meta.letters);
        setVersionPaths(meta.paths);
        setBaseFilePath(meta.baseFilePath);

        const storageKey = examVersionStorageKey(beacon.beaconId, userId);
        const saved = localStorage.getItem(storageKey);
        const savedNorm = saved ? normalizeVersionLetter(saved) : null;
        if (savedNorm && meta.letters.includes(savedNorm)) {
          setChosenLetter(savedNorm);
        } else if (meta.letters.length <= 1) {
          setChosenLetter('A');
        } else {
          setChosenLetter(null);
        }
      } catch {
        if (!cancelled) {
          setVersionLetters(beacon.versionLetters?.length ? beacon.versionLetters : ['A']);
          const letters = beacon.versionLetters?.length ? beacon.versionLetters : ['A'];
          if (letters.length <= 1) setChosenLetter('A');
          else setChosenLetter(null);
        }
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [beacon?.filePath, beacon?.beaconId, userId]);

  useEffect(() => {
    if (!beacon?.filePath || !chosenLetter) {
      setHtmlUrl(null);
      return;
    }
    setLoadError(null);
    const path = resolveVersionFilePath(
      versionPaths,
      baseFilePath || beacon.filePath,
      chosenLetter,
    );
    const timerEpoch = encodeURIComponent(
      beacon.updatedAt || beacon.beaconId || String(Date.now()),
    );
    setHtmlUrl(
      `/api/file-system-paths/read-html?filePath=${encodeURIComponent(path)}&timerEpoch=${timerEpoch}`,
    );
  }, [beacon?.filePath, beacon?.updatedAt, beacon?.beaconId, chosenLetter, versionPaths, baseFilePath]);

  const open = Boolean(beacon);
  const needsLetterPrompt = Boolean(
    beacon && versionLetters.length > 1 && !chosenLetter && !versionsLoading,
  );

  const title = useMemo(() => {
    const name = beacon?.filePath?.split('/').pop()?.replace(/\.(html|htm)$/i, '') || 'Prüfung';
    return name;
  }, [beacon?.filePath]);

  const confirmLetter = () => {
    const L = normalizeVersionLetter(letterInput);
    if (!L || !versionLetters.includes(L)) {
      setLetterError('Dieser Buchstabe ist für diese Prüfung nicht gültig.');
      return;
    }
    setLetterError(null);
    if (beacon?.beaconId) {
      localStorage.setItem(examVersionStorageKey(beacon.beaconId, userId), L);
    }
    setChosenLetter(L);
  };

  return (
    <Dialog
      open={open}
      fullScreen
      disableEscapeKeyDown
      onClose={() => {
        /* vom Lehrer beenden — SuS können nicht schließen */
      }}
      PaperProps={{
        sx: {
          m: 0,
          bgcolor: '#0d1117',
          backgroundImage: 'none',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#0d1117',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            px: 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#b71c1c',
            color: '#fff',
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: 0.75,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontWeight: 900,
              fontSize: '0.8rem',
            }}
          >
            P
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', flex: 1, minWidth: 0 }} noWrap>
            {title}
            {beacon?.groupName ? ` · ${beacon.groupName}` : ''}
            {chosenLetter && versionLetters.length > 1 ? ` · Version ${chosenLetter}` : ''}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 600 }}>
            Gestartet — bitte bearbeiten und abgeben
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: '#fff' }}>
          {(versionsLoading || (open && !needsLetterPrompt && !htmlUrl && !loadError)) && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                bgcolor: '#fff',
                zIndex: 2,
              }}
            >
              <CircularProgress size={28} />
              <Typography color="text.secondary">Prüfung wird vorbereitet…</Typography>
            </Box>
          )}

          {needsLetterPrompt && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f5f9ff',
                zIndex: 3,
                p: 2,
              }}
            >
              <Box
                sx={{
                  maxWidth: 420,
                  width: '100%',
                  bgcolor: '#fff',
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(21,101,192,0.15)',
                  p: 3,
                  border: '2px solid #bbdefb',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1565c0', mb: 1 }}>
                  Prüfungsversion
                </Typography>
                <Typography sx={{ mb: 2, color: '#444', lineHeight: 1.5 }}>
                  Gib den <strong style={{ color: '#1565c0' }}>blauen Buchstaben</strong> oben rechts auf
                  deiner Arbeit ein.
                </Typography>
                <TextField
                  fullWidth
                  autoFocus
                  label="Buchstabe"
                  value={letterInput}
                  onChange={(e) => {
                    setLetterInput(e.target.value);
                    setLetterError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmLetter();
                  }}
                  inputProps={{ maxLength: 2, 'aria-label': 'Prüfungsversion Buchstabe' }}
                  error={Boolean(letterError)}
                  helperText={letterError || `Gültig: ${versionLetters.join(', ')}`}
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" fullWidth onClick={confirmLetter} sx={{ fontWeight: 700 }}>
                  Weiter zur Prüfung
                </Button>
              </Box>
            </Box>
          )}

          {loadError && (
            <Box sx={{ p: 3 }}>
              <Typography color="error">{loadError}</Typography>
            </Box>
          )}
          {htmlUrl && !loadError && !needsLetterPrompt && chosenLetter && (
            <Box
              component="iframe"
              title={title}
              src={htmlUrl}
              sx={{
                border: 0,
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
