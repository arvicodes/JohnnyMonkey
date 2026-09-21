import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  fetchExamVersionLetters,
  normalizeVersionLetter,
  resolveVersionFilePath,
} from '../../lib/examVersionPaths';

type Props = {
  filePath: string;
  onActiveFilePathChange: (path: string, letter: string) => void;
  disabled?: boolean;
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
  onActiveFilePathChange,
  disabled,
}: Props) {
  const [letters, setLetters] = useState<string[]>(['A']);
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [basePath, setBasePath] = useState(filePath);
  const [activeLetter, setActiveLetter] = useState('A');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadMeta = useCallback(async () => {
    if (!filePath) return;
    const meta = await fetchExamVersionLetters(filePath);
    setLetters(meta.letters);
    setPaths(meta.paths);
    setBasePath(meta.baseFilePath);
    const letter = normalizeVersionLetter(activeLetter) || 'A';
    const safeLetter = meta.letters.includes(letter) ? letter : 'A';
    setActiveLetter(safeLetter);
    onActiveFilePathChange(
      resolveVersionFilePath(meta.paths, meta.baseFilePath, safeLetter),
      safeLetter,
    );
  }, [filePath, activeLetter, onActiveFilePathChange]);

  useEffect(() => {
    void reloadMeta().catch(() => {
      setLetters(['A']);
      onActiveFilePathChange(filePath, 'A');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when opened file changes
  }, [filePath]);

  const switchLetter = (letter: string) => {
    setActiveLetter(letter);
    onActiveFilePathChange(
      resolveVersionFilePath(paths, basePath, letter),
      letter,
    );
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
      await reloadMeta();
      switchLetter(next);
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
      await reloadMeta();
      switchLetter('A');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  };

  if (letters.length <= 1 && !error) {
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
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Versionen bearbeiten — B, C … starten als Kopie von A.
      </Typography>
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
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={disabled || busy || !nextVersionLetter(letters)}
          onClick={() => void addVersion()}
        >
          Version
        </Button>
        {activeLetter !== 'A' && (
          <Button
            size="small"
            color="error"
            variant="text"
            disabled={disabled || busy}
            onClick={() => void removeVersion(activeLetter)}
          >
            {activeLetter} löschen
          </Button>
        )}
      </Box>
      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  );
}
