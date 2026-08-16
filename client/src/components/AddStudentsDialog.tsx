import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';

type DirectoryStudent = {
  id: string;
  name: string;
  loginCode: string;
  learningGroups?: Array<{ id: string; name: string; isArchived?: boolean }>;
  inCurrentGroup?: boolean;
};

type Section = {
  key: string;
  title: string;
  students: DirectoryStudent[];
  isCurrent: boolean;
  isArchived?: boolean;
};

const COLORS = {
  primary: '#2E7D32',
  secondary: '#F57C00',
  accent1: '#1976D2',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  success: '#4CAF50',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#E0E0E0',
};

function formatStudentName(fullName: string): string {
  if (!fullName || !fullName.trim()) return '';
  const parts = fullName.trim().split(/\s+/).filter((p) => p.length > 0);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

const nativeInputSx: React.CSSProperties = {
  width: '100%',
  height: 28,
  border: '1px solid transparent',
  borderRadius: 6,
  padding: '0 8px',
  fontSize: '0.8rem',
  background: 'transparent',
  outline: 'none',
  color: COLORS.textPrimary,
  boxSizing: 'border-box',
};

const StudentRow = React.memo(function StudentRow({
  student,
  index,
  checked,
  saving,
  onToggle,
  onSaveCredentials,
}: {
  student: DirectoryStudent;
  index: number;
  checked: boolean;
  saving: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onSaveCredentials: (id: string, name: string, loginCode: string) => void;
}) {
  const inGroup = Boolean(student.inCurrentGroup);
  const [name, setName] = useState(student.name);
  const [loginCode, setLoginCode] = useState(student.loginCode);

  useEffect(() => {
    setName(student.name);
    setLoginCode(student.loginCode);
  }, [student.name, student.loginCode]);

  const commit = () => {
    const nextName = formatStudentName(name) || name.trim();
    const nextCode = loginCode.trim();
    if (nextName === student.name && nextCode === student.loginCode) return;
    onSaveCredentials(student.id, nextName, nextCode);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '28px minmax(0, 1fr) 112px 36px',
        gap: 0.75,
        alignItems: 'center',
        py: 0.4,
        borderTop: `1px solid ${COLORS.border}`,
        opacity: saving ? 0.65 : 1,
      }}
    >
      <Typography variant="caption" sx={{ color: COLORS.textSecondary, textAlign: 'right', pr: 0.25 }}>
        {index + 1}.
      </Typography>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        style={{ ...nativeInputSx, fontWeight: 600 }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = COLORS.accent1;
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = 'transparent';
        }}
      />
      <input
        value={loginCode}
        onChange={(e) => setLoginCode(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        style={{
          ...nativeInputSx,
          fontSize: '0.75rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          color: COLORS.accent1,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = COLORS.accent1;
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = 'transparent';
        }}
      />
      <Checkbox
        size="small"
        checked={checked}
        onChange={(event) => onToggle(student.id, event.target.checked)}
        sx={{
          p: 0.25,
          color: COLORS.border,
          '&.Mui-checked': {
            color: inGroup && checked ? COLORS.success : COLORS.primary,
          },
        }}
      />
    </Box>
  );
});

type Props = {
  open: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
};

function AddStudentsDialog({
  open,
  groupId,
  groupName,
  onClose,
  onChanged,
  onNotify,
}: Props) {
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const studentsRef = useRef<DirectoryStudent[]>([]);
  const addingRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingRemoveIds, setPendingRemoveIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, inGroup: 0 });
  const [webUntisPreview, setWebUntisPreview] = useState<any | null>(null);
  const [webUntisBusy, setWebUntisBusy] = useState(false);
  const [webUntisPanelOpen, setWebUntisPanelOpen] = useState(false);
  const webUntisFileInputRef = useRef<HTMLInputElement | null>(null);
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const loadDirectory = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/learning-groups/${id}/available-students`);
      if (!response.ok) throw new Error('Fehler beim Laden der Schüler');
      const data = await response.json();
      const list: DirectoryStudent[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.students)
          ? data.students
          : [];
      setStudents(list);
      studentsRef.current = list;
      setMeta({
        total: typeof data?.total === 'number' ? data.total : list.length,
        inGroup:
          typeof data?.inGroup === 'number'
            ? data.inGroup
            : list.filter((s) => s.inCurrentGroup).length,
      });
      setExpanded((prev) => (Object.keys(prev).length > 0 ? prev : { [id]: true }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !groupId) return;
    setSelectedIds([]);
    setPendingRemoveIds([]);
    setWebUntisPreview(null);
    setWebUntisBusy(false);
    setWebUntisPanelOpen(false);
    setSearch('');
    setExpanded({ [groupId]: true });
    void loadDirectory(groupId).catch(() => {
      onNotifyRef.current('Fehler beim Laden der verfügbaren Schüler', 'error');
    });
  }, [open, groupId, loadDirectory]);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (s: DirectoryStudent) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.loginCode.toLowerCase().includes(q) ||
        formatStudentName(s.name).toLowerCase().includes(q)
      );
    };
    const filtered = students.filter(matches);
    const byGroup = new Map<string, Section>();
    const ungrouped: DirectoryStudent[] = [];

    for (const student of filtered) {
      const memberships = student.learningGroups || [];
      if (memberships.length === 0) {
        ungrouped.push(student);
        continue;
      }
      for (const g of memberships) {
        if (!byGroup.has(g.id)) {
          byGroup.set(g.id, {
            key: g.id,
            title: g.name,
            students: [],
            isCurrent: g.id === groupId,
            isArchived: Boolean(g.isArchived),
          });
        }
        byGroup.get(g.id)!.students.push(student);
      }
    }

    for (const sec of byGroup.values()) {
      const seen = new Set<string>();
      sec.students = sec.students.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      sec.students.sort((a, b) =>
        formatStudentName(a.name).localeCompare(formatStudentName(b.name), 'de'),
      );
    }

    const next = [...byGroup.values()].sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return a.title.localeCompare(b.title, 'de');
    });

    if (ungrouped.length > 0) {
      ungrouped.sort((a, b) =>
        formatStudentName(a.name).localeCompare(formatStudentName(b.name), 'de'),
      );
      next.push({
        key: '_none',
        title: 'Ohne Lerngruppe',
        students: ungrouped,
        isCurrent: false,
      });
    }
    return next;
  }, [students, search, groupId]);

  const uniqueVisibleCount = useMemo(() => {
    const ids = new Set<string>();
    for (const sec of sections) {
      for (const s of sec.students) ids.add(s.id);
    }
    return ids.size;
  }, [sections]);

  const handleClose = () => {
    if (addingRef.current) return;
    onClose();
  };

  const handleToggle = useCallback((id: string, checked: boolean) => {
    const student = studentsRef.current.find((s) => s.id === id);
    if (student?.inCurrentGroup) {
      setPendingRemoveIds((prev) => {
        if (checked) return prev.filter((x) => x !== id);
        return prev.includes(id) ? prev : [...prev, id];
      });
      return;
    }
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }, []);

  const isStudentChecked = useCallback(
    (student: DirectoryStudent) => {
      if (student.inCurrentGroup) return !pendingRemoveIds.includes(student.id);
      return selectedIds.includes(student.id);
    },
    [pendingRemoveIds, selectedIds],
  );

  const handleSaveCredentials = useCallback(
    async (studentId: string, name: string, loginCode: string) => {
      if (!name || !loginCode) {
        onNotifyRef.current('Name und Login-Code dürfen nicht leer sein', 'error');
        return;
      }
      setSavingId(studentId);
      try {
        const response = await fetch(`/api/users/${studentId}/credentials`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-login-code': localStorage.getItem('loginCode') || '',
          },
          body: JSON.stringify({ name, loginCode }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
        setStudents((prev) => {
          const next = prev.map((s) =>
            s.id === studentId
              ? { ...s, name: data.name ?? name, loginCode: data.loginCode ?? loginCode }
              : s,
          );
          studentsRef.current = next;
          return next;
        });
        await onChangedRef.current();
      } catch (error: any) {
        onNotifyRef.current(error?.message || 'Speichern fehlgeschlagen', 'error');
        if (groupId) {
          try {
            await loadDirectory(groupId);
          } catch {
            // ignore
          }
        }
      } finally {
        setSavingId(null);
      }
    },
    [groupId, loadDirectory],
  );

  const handleApplyMembership = async () => {
    if (addingRef.current) return;
    if (!groupId) return;

    const studentIdsToAdd = selectedIds.filter((id) => {
      const s = studentsRef.current.find((x) => x.id === id);
      return s && !s.inCurrentGroup;
    });
    const studentIdsToRemove = pendingRemoveIds.filter((id) => {
      const s = studentsRef.current.find((x) => x.id === id);
      return Boolean(s?.inCurrentGroup);
    });

    if (studentIdsToAdd.length === 0 && studentIdsToRemove.length === 0) {
      onNotify('Bitte Häkchen setzen oder entfernen', 'error');
      return;
    }

    addingRef.current = true;
    try {
      if (studentIdsToAdd.length > 0) {
        const response = await fetch(`/api/learning-groups/${groupId}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: studentIdsToAdd }),
        });
        if (!response.ok) throw new Error('Fehler beim Hinzufügen der Schüler');
      }

      for (const studentId of studentIdsToRemove) {
        const response = await fetch(`/api/learning-groups/${groupId}/students/${studentId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Fehler beim Entfernen der Schüler');
      }

      setSelectedIds([]);
      setPendingRemoveIds([]);
      await onChanged();
      await loadDirectory(groupId);

      const parts: string[] = [];
      if (studentIdsToAdd.length > 0) parts.push(`${studentIdsToAdd.length} hinzugefügt`);
      if (studentIdsToRemove.length > 0) parts.push(`${studentIdsToRemove.length} entfernt`);
      onNotify(parts.join(', '), 'success');
    } catch {
      onNotify('Fehler beim Aktualisieren der Gruppenmitglieder', 'error');
    } finally {
      addingRef.current = false;
    }
  };

  const handleWebUntisFileSelected = async (file: File | null) => {
    if (!file || !groupId) return;
    setWebUntisBusy(true);
    setWebUntisPreview(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/learning-groups/${groupId}/import-webuntis/preview`, {
        method: 'POST',
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Fehler beim Lesen der WebUntis-Liste');
      setWebUntisPreview(data);
      setWebUntisPanelOpen(true);
    } catch (error: any) {
      onNotify(error?.message || 'Fehler beim WebUntis-Import', 'error');
    } finally {
      setWebUntisBusy(false);
    }
  };

  const handleConfirmWebUntisImport = async () => {
    if (!groupId || !webUntisPreview?.students?.length || webUntisBusy) return;
    setWebUntisBusy(true);
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/import-webuntis/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupNumber: webUntisPreview.groupNumber,
          students: webUntisPreview.students.map((s: any) => ({
            firstName: s.firstName,
            lastName: s.lastName,
            fullName: s.fullName,
            loginCode: s.loginCode,
            listIndex: s.listIndex,
            existingUserId: s.existingUserId,
            status: s.status,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Fehler beim Anlegen der Schüler');
      setWebUntisPreview(null);
      setSelectedIds([]);
      await onChanged();
      await loadDirectory(groupId);
      onNotify(
        `WebUntis: ${data.created ?? 0} neu angelegt, ${data.connected ?? 0} der Gruppe zugeordnet`,
        'success',
      );
    } catch (error: any) {
      onNotify(error?.message || 'Fehler beim WebUntis-Import', 'error');
    } finally {
      setWebUntisBusy(false);
    }
  };

  const updateWebUntisPreviewRow = (index: number, patch: Record<string, unknown>) => {
    setWebUntisPreview((prev: any) => {
      if (!prev?.students) return prev;
      const nextStudents = prev.students.map((row: any, i: number) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (typeof patch.fullName === 'string') {
          const parts = patch.fullName.trim().split(/\s+/).filter(Boolean);
          next.firstName = parts[0] || '';
          next.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
          next.fullName =
            parts.length <= 1 ? parts[0] || '' : `${parts[0]} ${parts[parts.length - 1]}`;
        }
        return next;
      });
      return { ...prev, students: nextStudents };
    });
  };

  const searching = search.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 18px 48px rgba(44,62,80,0.18)',
          maxHeight: '92vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          py: 1.5,
          px: 2,
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent1} 100%)`,
          color: '#fff',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
          Schüler verwalten
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.92, display: 'block' }}>
          {groupName || 'Lerngruppe'}
          {' · '}
          {meta.total} in DB
          {' · '}
          {meta.inGroup} in dieser Gruppe
          {searching ? ` · ${uniqueVisibleCount} Treffer` : ''}
        </Typography>
        <DialogCloseIconButton onClose={handleClose} sx={{ color: '#fff' }} iconSx={{ color: '#fff' }} />
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: COLORS.background, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            px: 1.5,
            pt: 1,
            pb: 0.75,
            display: 'flex',
            gap: 0.75,
            alignItems: 'center',
            flexWrap: 'nowrap',
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              height: 32,
              px: 1,
              borderRadius: 1.5,
              bgcolor: COLORS.cardBg,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <SearchIcon sx={{ fontSize: 16, color: COLORS.textSecondary, mr: 0.5 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen…"
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.8rem',
                color: COLORS.textPrimary,
              }}
            />
          </Box>
          <ButtonGroup
            size="small"
            variant="outlined"
            sx={{
              flexShrink: 0,
              height: 32,
              '& .MuiButtonGroup-grouped': {
                minWidth: 0,
                px: 1,
                fontSize: '0.7rem',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                borderColor: COLORS.border,
                color: COLORS.textPrimary,
                lineHeight: 1.2,
              },
            }}
          >
            <Button
              disabled={loading || !groupId}
              onClick={() => groupId && void loadDirectory(groupId)}
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              sx={{ '& .MuiButton-startIcon': { mr: 0.35, ml: -0.15 } }}
            >
              Laden
            </Button>
            <Button
              onClick={() => setWebUntisPanelOpen((v) => !v)}
              startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
              sx={{
                '& .MuiButton-startIcon': { mr: 0.35, ml: -0.15 },
                ...(webUntisPanelOpen
                  ? {
                      bgcolor: `${COLORS.secondary}22`,
                      borderColor: COLORS.secondary,
                      color: COLORS.secondary,
                      '&:hover': { bgcolor: `${COLORS.secondary}33` },
                    }
                  : {}),
              }}
            >
              Untis
            </Button>
          </ButtonGroup>
        </Box>

        <Collapse in={webUntisPanelOpen} unmountOnExit>
          <Box
            sx={{
              mx: 2,
              mb: 1,
              p: 1.25,
              borderRadius: 2,
              bgcolor: COLORS.cardBg,
              border: `1px dashed ${COLORS.secondary}66`,
            }}
          >
            <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mb: 1 }}>
              PDF „Schüler*innen im Unterricht“ · ohne Mittelnamen · Name/Login vor dem Anlegen editierbar
            </Typography>
            <input
              ref={webUntisFileInputRef}
              type="file"
              accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                e.target.value = '';
                void handleWebUntisFileSelected(file);
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={webUntisBusy || !groupId}
                onClick={() => webUntisFileInputRef.current?.click()}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {webUntisBusy ? 'Lädt…' : 'Liste hochladen'}
              </Button>
              {webUntisPreview?.students?.length ? (
                <Button
                  size="small"
                  variant="contained"
                  disabled={webUntisBusy}
                  onClick={() => void handleConfirmWebUntisImport()}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    bgcolor: COLORS.secondary,
                    '&:hover': { bgcolor: COLORS.secondary },
                  }}
                >
                  Anlegen & zuordnen ({webUntisPreview.students.length})
                </Button>
              ) : null}
            </Box>
            {webUntisPreview?.students?.length ? (
              <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>
                  {webUntisPreview.summary?.neu ?? 0} neu · {webUntisPreview.summary?.vorhanden ?? 0} vorhanden ·{' '}
                  {webUntisPreview.summary?.schonInGruppe ?? 0} schon in Gruppe
                </Typography>
                {webUntisPreview.students.map((row: any, idx: number) => (
                  <Box
                    key={`${row.existingUserId || row.fullName}-${idx}`}
                    sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 0.75 }}
                  >
                    <Typography variant="caption" sx={{ width: 22, color: COLORS.textSecondary }}>
                      {row.listIndex ?? idx + 1}.
                    </Typography>
                    <input
                      value={row.fullName || ''}
                      onChange={(e) => updateWebUntisPreviewRow(idx, { fullName: e.target.value })}
                      placeholder="Name"
                      style={{ ...nativeInputSx, flex: 1, border: `1px solid ${COLORS.border}`, background: '#fff' }}
                    />
                    <input
                      value={row.loginCode || ''}
                      onChange={(e) => updateWebUntisPreviewRow(idx, { loginCode: e.target.value })}
                      placeholder="Login"
                      style={{
                        ...nativeInputSx,
                        width: 118,
                        border: `1px solid ${COLORS.border}`,
                        background: '#fff',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        </Collapse>

        <Box sx={{ px: 2, pb: 1.5, flex: 1, overflow: 'auto', minHeight: 280 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} sx={{ color: COLORS.primary }} />
            </Box>
          ) : sections.length === 0 ? (
            <Typography variant="body2" sx={{ color: COLORS.textSecondary, textAlign: 'center', py: 4 }}>
              Keine Schüler gefunden.
            </Typography>
          ) : searching ? (
            <Box
              sx={{
                mb: 1,
                borderRadius: 2,
                bgcolor: COLORS.cardBg,
                border: `1px solid ${COLORS.border}`,
                overflow: 'hidden',
                px: 1,
                pb: 0.75,
              }}
            >
              {Array.from(
                new Map(sections.flatMap((sec) => sec.students.map((s) => [s.id, s] as const))).values(),
              ).map((student, index) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  index={index}
                  checked={isStudentChecked(student)}
                  saving={savingId === student.id}
                  onToggle={handleToggle}
                  onSaveCredentials={handleSaveCredentials}
                />
              ))}
            </Box>
          ) : (
            sections.map((section) => {
              const isExpanded = expanded[section.key] ?? section.isCurrent;
              const selectable = section.students.filter((s) => !s.inCurrentGroup);
              const selectedInSection = selectable.filter((s) => selectedIds.includes(s.id)).length;
              return (
                <Box
                  key={section.key}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: COLORS.cardBg,
                    border: `1px solid ${section.isCurrent ? COLORS.primary + '55' : COLORS.border}`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [section.key]: !isExpanded,
                      }))
                    }
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.25,
                      py: 0.75,
                      cursor: 'pointer',
                      bgcolor: section.isCurrent ? COLORS.primary + '12' : 'transparent',
                      '&:hover': { bgcolor: section.isCurrent ? COLORS.primary + '18' : '#f1f5f9' },
                    }}
                  >
                    {isExpanded ? (
                      <ExpandLessIcon sx={{ fontSize: 18, color: COLORS.textSecondary }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 18, color: COLORS.textSecondary }} />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: section.isCurrent ? COLORS.primary : COLORS.textPrimary,
                        flex: 1,
                      }}
                    >
                      {section.title}
                      {section.isCurrent ? ' · diese Gruppe' : ''}
                      {section.isArchived ? ' · archiviert' : ''}
                    </Typography>
                    <Chip
                      size="small"
                      label={section.students.length}
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        bgcolor: section.isCurrent ? COLORS.primary : '#e2e8f0',
                        color: section.isCurrent ? '#fff' : COLORS.textPrimary,
                      }}
                    />
                    {selectable.length > 0 && !section.isCurrent ? (
                      <Checkbox
                        size="small"
                        indeterminate={selectedInSection > 0 && selectedInSection < selectable.length}
                        checked={selectable.length > 0 && selectedInSection === selectable.length}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const ids = selectable.map((s) => s.id);
                          setSelectedIds((prev) => {
                            if (e.target.checked) return Array.from(new Set([...prev, ...ids]));
                            return prev.filter((id) => !ids.includes(id));
                          });
                        }}
                        sx={{ p: 0.25 }}
                      />
                    ) : null}
                  </Box>
                  <Collapse in={isExpanded} unmountOnExit>
                    <Box sx={{ px: 1, pb: 0.75 }}>
                      {section.students.map((student, index) => (
                        <StudentRow
                          key={`${section.key}-${student.id}`}
                          student={student}
                          index={index}
                          checked={isStudentChecked(student)}
                          saving={savingId === student.id}
                          onToggle={handleToggle}
                          onSaveCredentials={handleSaveCredentials}
                        />
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              );
            })
          )}
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: COLORS.cardBg,
          borderTop: `1px solid ${COLORS.border}`,
          gap: 0.75,
        }}
      >
        <Typography variant="caption" sx={{ color: COLORS.textSecondary, mr: 'auto', fontSize: '0.7rem' }}>
          Name/Login → DB
          {selectedIds.length > 0 ? ` · ${selectedIds.length} hinzufügen` : ''}
          {pendingRemoveIds.length > 0 ? ` · ${pendingRemoveIds.length} entfernen` : ''}
        </Typography>
        <ButtonGroup
          size="small"
          variant="outlined"
          sx={{
            flexShrink: 0,
            height: 32,
            '& .MuiButtonGroup-grouped': {
              minWidth: 0,
              px: 1,
              fontSize: '0.7rem',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              borderColor: COLORS.border,
              color: COLORS.textPrimary,
              lineHeight: 1.2,
            },
          }}
        >
          <Button onClick={handleClose}>Schließen</Button>
          <Button
            onClick={() => void handleApplyMembership()}
            disabled={(selectedIds.length === 0 && pendingRemoveIds.length === 0) || loading}
            sx={{
              fontWeight: 700,
              bgcolor:
                selectedIds.length > 0 || pendingRemoveIds.length > 0
                  ? `${COLORS.primary}18`
                  : undefined,
              borderColor:
                selectedIds.length > 0 || pendingRemoveIds.length > 0
                  ? COLORS.primary
                  : undefined,
              color:
                selectedIds.length > 0 || pendingRemoveIds.length > 0
                  ? COLORS.primary
                  : undefined,
              '&:hover': {
                bgcolor:
                  selectedIds.length > 0 || pendingRemoveIds.length > 0
                    ? `${COLORS.primary}28`
                    : undefined,
              },
            }}
          >
            {pendingRemoveIds.length > 0 && selectedIds.length === 0
              ? `Entfernen (${pendingRemoveIds.length})`
              : pendingRemoveIds.length > 0 && selectedIds.length > 0
                ? `Übernehmen (+${selectedIds.length}/−${pendingRemoveIds.length})`
                : `Hinzufügen${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
          </Button>
        </ButtonGroup>
      </DialogActions>
    </Dialog>
  );
}

export default React.memo(AddStudentsDialog, (prev, next) => (
  prev.open === next.open &&
  prev.groupId === next.groupId &&
  prev.groupName === next.groupName
));
