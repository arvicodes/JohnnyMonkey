import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import {
  type ExamBeaconGroupConfig,
  type ExamGroupStudent,
  emptyGroupExamConfig,
  variantLettersForCount,
} from '../../lib/examStartConfig';

type GroupLite = { id: string; name: string };

export function useExamStartAdvancedState(selectedGroupIds: string[]) {
  const [studentsByGroup, setStudentsByGroup] = useState<Record<string, ExamGroupStudent[]>>({});
  const [groupConfig, setGroupConfig] = useState<Record<string, ExamBeaconGroupConfig>>({});
  const [manualVariants, setManualVariants] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const loadStudents = useCallback(async (groupIds: string[]) => {
    if (!groupIds.length) {
      setStudentsByGroup({});
      return;
    }
    setLoadingMeta(true);
    try {
      const entries = await Promise.all(
        groupIds.map(async (gid) => {
          const res = await fetch(`/api/learning-groups/${encodeURIComponent(gid)}`);
          if (!res.ok) return [gid, []] as [string, ExamGroupStudent[]];
          const data = (await res.json()) as { students?: ExamGroupStudent[] };
          const students = (data.students || []).map((s) => ({ id: s.id, name: s.name }));
          return [gid, students] as [string, ExamGroupStudent[]];
        }),
      );
      const next: Record<string, ExamGroupStudent[]> = {};
      for (const [gid, list] of entries) next[gid] = list;
      setStudentsByGroup(next);
      setGroupConfig((prev) => {
        const out = { ...prev };
        for (const gid of groupIds) {
          if (!out[gid]) {
            out[gid] = {
              ...emptyGroupExamConfig(),
              studentIds: next[gid]?.map((s) => s.id),
            };
          }
        }
        return out;
      });
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents(selectedGroupIds);
  }, [selectedGroupIds.join('|'), loadStudents]);

  const lettersForCount = useCallback(
    (count: 1 | 2 | 3) => variantLettersForCount(count),
    [],
  );

  const patchGroupConfig = (gid: string, patch: Partial<ExamBeaconGroupConfig>) => {
    setGroupConfig((prev) => ({
      ...prev,
      [gid]: { ...(prev[gid] || emptyGroupExamConfig()), ...patch },
    }));
  };

  const buildConfigForStart = useCallback((): Record<string, ExamBeaconGroupConfig> => {
    const out: Record<string, ExamBeaconGroupConfig> = {};
    for (const gid of selectedGroupIds) {
      const students = studentsByGroup[gid] || [];
      const cfg = groupConfig[gid] || emptyGroupExamConfig();
      const versionCount = (cfg.versionCount || 1) as 1 | 2 | 3;
      const letters = lettersForCount(versionCount);
      const selectedIds =
        cfg.studentIds?.length && cfg.studentIds.length < students.length
          ? cfg.studentIds
          : undefined;
      const versionAssignments = manualVariants ? cfg.versionAssignments || {} : undefined;
      const normalizedAssignments: Record<string, string> = {};
      if (versionAssignments && selectedIds) {
        for (const sid of selectedIds) {
          const L = versionAssignments[sid];
          if (L && letters.includes(L)) normalizedAssignments[sid] = L;
        }
      } else if (versionAssignments) {
        for (const s of students) {
          const L = versionAssignments[s.id];
          if (L && letters.includes(L)) normalizedAssignments[s.id] = L;
        }
      }
      out[gid] = {
        studentIds: selectedIds,
        versionCount,
        versionAssignments:
          manualVariants && Object.keys(normalizedAssignments).length
            ? normalizedAssignments
            : undefined,
      };
    }
    return out;
  }, [selectedGroupIds, studentsByGroup, groupConfig, manualVariants, lettersForCount]);

  return {
    studentsByGroup,
    groupConfig,
    manualVariants,
    setManualVariants,
    patchGroupConfig,
    lettersForCount,
    buildConfigForStart,
    loadingMeta,
  };
}

export const ExamStartAdvancedSection: React.FC<{
  groups: GroupLite[];
  selectedGroupIds: string[];
  advanced: ReturnType<typeof useExamStartAdvancedState>;
}> = ({ groups, selectedGroupIds, advanced }) => {
  const {
    studentsByGroup,
    groupConfig,
    manualVariants,
    setManualVariants,
    patchGroupConfig,
    lettersForCount,
    loadingMeta,
  } = advanced;

  const groupNames = useMemo(() => {
    const m = new Map(groups.map((g) => [g.id, g.name]));
    return m;
  }, [groups]);

  if (!selectedGroupIds.length) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Teilnehmer &amp; Varianten
      </Typography>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={manualVariants}
            onChange={(_, v) => setManualVariants(v)}
          />
        }
        label={<Typography variant="body2">Varianten pro SuS manuell zuweisen</Typography>}
        sx={{ mb: 1, ml: 0 }}
      />
      {selectedGroupIds.map((gid) => {
        const students = studentsByGroup[gid] || [];
        const cfg = groupConfig[gid] || emptyGroupExamConfig();
        const versionCount = (cfg.versionCount || 1) as 1 | 2 | 3;
        const letters = lettersForCount(versionCount);
        const selectedStudentIds = new Set(
          cfg.studentIds?.length ? cfg.studentIds : students.map((s) => s.id),
        );
        return (
          <Box
            key={gid}
            sx={{
              mb: 2,
              p: 1.25,
              borderRadius: 1,
              border: '1px solid rgba(0,0,0,0.08)',
              bgcolor: 'rgba(0,0,0,0.02)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              {groupNames.get(gid) || 'Lerngruppe'}
            </Typography>
            {loadingMeta && !students.length ? (
              <Typography variant="caption" color="text.secondary">Lade SuS…</Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 0.75, mb: 0.75 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      patchGroupConfig(gid, { studentIds: students.map((s) => s.id) })
                    }
                  >
                    Alle
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => patchGroupConfig(gid, { studentIds: [] })}
                  >
                    Keiner
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, mb: 1 }}>
                  {students.map((s) => (
                    <Box
                      key={s.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        minHeight: 34,
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedStudentIds.has(s.id)}
                        onChange={(_, checked) => {
                          const base = cfg.studentIds?.length
                            ? [...cfg.studentIds]
                            : students.map((x) => x.id);
                          const next = checked
                            ? [...new Set([...base, s.id])]
                            : base.filter((id) => id !== s.id);
                          patchGroupConfig(gid, { studentIds: next });
                        }}
                        sx={{ p: 0.5 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.85rem',
                          flex: 1,
                          minWidth: 0,
                          opacity: selectedStudentIds.has(s.id) ? 1 : 0.55,
                        }}
                        noWrap
                      >
                        {s.name}
                      </Typography>
                      {manualVariants ? (
                        <Select
                          size="small"
                          disabled={!selectedStudentIds.has(s.id)}
                          value={
                            cfg.versionAssignments?.[s.id] &&
                            letters.includes(cfg.versionAssignments[s.id])
                              ? cfg.versionAssignments[s.id]
                              : letters[0]
                          }
                          onChange={(e) => {
                            const L = String(e.target.value);
                            patchGroupConfig(gid, {
                              versionAssignments: {
                                ...(cfg.versionAssignments || {}),
                                [s.id]: L,
                              },
                            });
                          }}
                          sx={{ minWidth: 56, fontSize: '0.8rem', flexShrink: 0 }}
                        >
                          {letters.map((L) => (
                            <MenuItem key={L} value={L}>{L}</MenuItem>
                          ))}
                        </Select>
                      ) : null}
                    </Box>
                  ))}
                </Box>
                <FormControl size="small">
                  <FormLabel sx={{ fontSize: '0.75rem', mb: 0.25 }}>Varianten in dieser Gruppe</FormLabel>
                  <RadioGroup
                    row
                    value={String(versionCount)}
                    onChange={(_, v) => {
                      const n = Number(v) as 1 | 2 | 3;
                      patchGroupConfig(gid, { versionCount: n });
                    }}
                  >
                    <FormControlLabel value="1" control={<Radio size="small" />} label="1 (A)" />
                    <FormControlLabel value="2" control={<Radio size="small" />} label="2 (A/B)" />
                    <FormControlLabel value="3" control={<Radio size="small" />} label="3 (A/B/C)" />
                  </RadioGroup>
                </FormControl>
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
