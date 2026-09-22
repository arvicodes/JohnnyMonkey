import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  examBaseGitPath,
  examFamilyKey,
  fetchExamVersionLetters,
  normalizeVersionLetter,
  resolveVersionFilePath,
  versionLetterFromKaPath,
} from '../../lib/examVersionPaths';

const compactIconBtn = {
  p: 0,
  minWidth: 28,
  width: 28,
  height: 28,
};

type Props = {
  /** Beliebiger Pfad der Prüfungsfamilie (A oder Variante). */
  filePath: string;
  /** Aktuell bearbeitete Datei (steuert Tab-Hervorhebung). */
  activeVariantPath?: string;
  onActiveFilePathChange: (path: string, letter: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

function nextVersionLetter(letters: string[]): string | null {
  for (let c = 66; c <= 90; c += 1) {
    const L = String.fromCharCode(c);
    if (!letters.includes(L)) return L;
  }
  return null;
}

export default function ExamVersionTabsBar({
  filePath,
  activeVariantPath,
  onActiveFilePathChange,
  disabled,
  compact,
}: Props) {
  const [letters, setLetters] = useState<string[]>(['A']);
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [basePath, setBasePath] = useState(() => examBaseGitPath(filePath));
  const [activeLetter, setActiveLetter] = useState('A');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const familyKeyRef = useRef('');

  const refreshMeta = useCallback(async (anyPathInFamily: string) => {
    const base = examBaseGitPath(anyPathInFamily);
    if (!base) return null;
    const meta = await fetchExamVersionLetters(base);
    setLetters(meta.letters);
    setPaths(meta.paths);
    setBasePath(meta.baseFilePath);
    return meta;
  }, []);

  useEffect(() => {
    const family = examFamilyKey(filePath);
    if (!family) return;
    if (familyKeyRef.current === family) return;
    familyKeyRef.current = family;
    void (async () => {
      try {
        const meta = await refreshMeta(filePath);
        if (!meta) return;
        const ext = activeVariantPath || filePath;
        const fromPath = versionLetterFromKaPath(ext);
        const safe = meta.letters.includes(fromPath) ? fromPath : 'A';
        setActiveLetter(safe);
      } catch {
        setLetters(['A']);
        setActiveLetter('A');
      }
    })();
  }, [filePath, activeVariantPath, refreshMeta]);

  useEffect(() => {
    if (!activeVariantPath) return;
    const letter = versionLetterFromKaPath(activeVariantPath);
    if (letters.includes(letter)) setActiveLetter(letter);
  }, [activeVariantPath, letters]);

  const switchLetter = (letter: string) => {
    const L = normalizeVersionLetter(letter) || 'A';
    const resolved = resolveVersionFilePath(paths, basePath, L);
    setActiveLetter(L);
    onActiveFilePathChange(resolved, L);
  };

  const addVersion = async () => {
    const next = nextVersionLetter(letters);
    if (!next) {
      setError('Maximal 25 Versionen (A–Z).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/file-system-paths/add-examination-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: basePath, letter: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Version konnte nicht angelegt werden');
      }
      const meta = await refreshMeta(basePath);
      if (meta) {
        const p = resolveVersionFilePath(meta.paths, meta.baseFilePath, next);
        setActiveLetter(next);
        onActiveFilePathChange(p, next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  };

  const removeVersion = async (letter: string) => {
    if (letter === 'A') return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/file-system-paths/remove-examination-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: basePath, letter }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Version konnte nicht entfernt werden');
      }
      const meta = await refreshMeta(basePath);
      if (meta) {
        const p = resolveVersionFilePath(meta.paths, meta.baseFilePath, 'A');
        setActiveLetter('A');
        onActiveFilePathChange(p, 'A');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  };

  if (letters.length <= 1 && !error) {
    if (compact) {
      return (
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Tabs value="A" sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, minWidth: 40, py: 0 } }}>
            <Tab label="A" value="A" disabled={disabled || busy} sx={{ fontWeight: 700 }} />
          </Tabs>
          <Tooltip title={`Version ${nextVersionLetter(letters) || ''} hinzufügen`}>
            <span>
              <IconButton
                size="small"
                disabled={disabled || busy || !nextVersionLetter(letters)}
                onClick={() => void addVersion()}
                sx={{ ...compactIconBtn, border: '1px solid', borderColor: 'divider' }}
                aria-label="Neue Prüfungsversion"
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      );
    }
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Standard: eine Version (A). Weitere Versionen sind Kopien von A zum leichten Anpassen.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={disabled || busy}
          onClick={() => void addVersion()}
        >
          Version B hinzufügen
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: compact ? 1.5 : 2 }}>
      {!compact ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Versionen bearbeiten — B, C … sind eigene Dateien (Änderungen gelten nur für den gewählten
          Tab).
        </Typography>
      ) : null}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Tabs
          value={activeLetter}
          onChange={(_, v) => switchLetter(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36, flex: 1 }}
        >
          {letters.map((L) => (
            <Tab
              key={L}
              value={L}
              label={L}
              disabled={disabled || busy}
              sx={{ minHeight: 36, minWidth: 48, fontWeight: 700 }}
            />
          ))}
        </Tabs>
        {compact ? (
          <Tooltip title={`Version ${nextVersionLetter(letters) || ''} hinzufügen`}>
            <span>
              <IconButton
                size="small"
                disabled={disabled || busy || !nextVersionLetter(letters)}
                onClick={() => void addVersion()}
                sx={{ ...compactIconBtn, border: '1px solid', borderColor: 'divider' }}
                aria-label="Neue Prüfungsversion"
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={disabled || busy || !nextVersionLetter(letters)}
            onClick={() => void addVersion()}
          >
            Version
          </Button>
        )}
        {activeLetter !== 'A' &&
          (compact ? (
            <Tooltip title={`Version ${activeLetter} entfernen`}>
              <IconButton
                size="small"
                color="error"
                disabled={disabled || busy}
                onClick={() => void removeVersion(activeLetter)}
                sx={compactIconBtn}
                aria-label={`Version ${activeLetter} löschen`}
              >
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, lineHeight: 1 }}>×</Typography>
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              size="small"
              color="error"
              variant="text"
              disabled={disabled || busy}
              onClick={() => void removeVersion(activeLetter)}
            >
              {activeLetter} löschen
            </Button>
          ))}
      </Box>
      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  );
}
