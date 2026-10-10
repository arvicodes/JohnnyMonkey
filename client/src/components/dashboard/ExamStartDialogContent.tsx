import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
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
  activeStudentsOfGroup,
  isPassiveStudentId,
  parsePassiveStudentIds,
  passiveStudentMutedSx,
} from '../../lib/passiveStudents';
import {
  type ExamBeaconGroupConfig,
  type ExamGroupStudent,
  emptyGroupExamConfig,
  formulationLetterLabel,
  formulationLettersForCount,
  variantLettersForCount,
} from '../../lib/examStartConfig';

type GroupLite = { id: string; name: string };

export function useExamStartAdvancedState(selectedGroupIds: string[]) {
  const [studentsByGroup, setStudentsByGroup] = useState<Record<string, ExamGroupStudent[]>>({});
  const [passiveByGroup, setPassiveByGroup] = useState<Record<string, string[]>>({});
  const [groupConfig, setGroupConfig] = useState<Record<string, ExamBeaconGroupConfig>>({});
  const [manualVariants, setManualVariants] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const loadStudents = useCallback(async (groupIds: string[]) => {
    if (!groupIds.length) {
      setStudentsByGroup({});
      setPassiveByGroup({});
      return;
    }
    setLoadingMeta(true);
    try {
      const entries = await Promise.all(
        groupIds.map(async (gid) => {
          const res = await fetch(`/api/learning-groups/${encodeURIComponent(gid)}`);
          if (!res.ok) return [gid, [], []] as [string, ExamGroupStudent[], string[]];
          const data = (await res.json()) as {
            students?: ExamGroupStudent[];
            passiveStudentIds?: unknown;
          };
          const students = (data.students || []).map((s) => ({ id: s.id, name: s.name }));
          const passive = parsePassiveStudentIds(data.passiveStudentIds);
          return [gid, students, passive] as [string, ExamGroupStudent[], string[]];
        }),
      );
      const next: Record<string, ExamGroupStudent[]> = {};
      const passiveNext: Record<string, string[]> = {};
      for (const [gid, list, passive] of entries) {
        next[gid] = list;
        passiveNext[gid] = passive;
      }
      setStudentsByGroup(next);
      setPassiveByGroup(passiveNext);
      setGroupConfig((prev) => {
        const out = { ...prev };
        for (const gid of groupIds) {
          if (!out[gid]) {
            const active = activeStudentsOfGroup(next[gid], passiveNext[gid]).map((s) => s.id);
            out[gid] = {
              ...emptyGroupExamConfig(),
              studentIds: active,
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
      const passive = passiveByGroup[gid] || [];
      const activeIds = activeStudentsOfGroup(students, passive).map((s) => s.id);
      const cfg = groupConfig[gid] || emptyGroupExamConfig();
      const formulationVariantCount = (cfg.formulationVariantCount || 1) as 1 | 2;
      const formLetters = formulationLettersForCount(formulationVariantCount);
      const selectedIds =
        cfg.studentIds === undefined
          ? undefined
          : cfg.studentIds.length
            ? cfg.studentIds
            : [];
      const formAssignments = manualVariants ? cfg.formulationVariantAssignments || {} : undefined;
      const normalizedFormAssignments: Record<string, string> = {};
      const assignTargets = selectedIds === undefined ? activeIds : selectedIds;
      if (formAssignments && formulationVariantCount === 2) {
        for (const sid of assignTargets) {
          const L = formAssignments[sid];
          if (L && formLetters.includes(L)) normalizedFormAssignments[sid] = L;
        }
      }
      out[gid] = {
        studentIds: selectedIds,
        versionCount: 1,
        formulationVariantCount,
        formulationVariantAssignments:
          manualVariants && Object.keys(normalizedFormAssignments).length
            ? normalizedFormAssignments
            : undefined,
      };
    }
    return out;
  }, [selectedGroupIds, studentsByGroup, passiveByGroup, groupConfig, manualVariants, lettersForCount]);

  return {
    studentsByGroup,
    passiveByGroup,
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
    passiveByGroup,
    groupConfig,
    manualVariants,
    setManualVariants,
    patchGroupConfig,
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
        label={<Typography variant="body2">Formulierungsvarianten A1/A2 pro SuS zuweisen</Typography>}
        sx={{ mb: 1, ml: 0 }}
      />
      {selectedGroupIds.map((gid) => {
        const students = studentsByGroup[gid] || [];
        const passiveIds = passiveByGroup[gid] || [];
        const activeStudents = activeStudentsOfGroup(students, passiveIds);
        const cfg = groupConfig[gid] || emptyGroupExamConfig();
        const formulationVariantCount = (cfg.formulationVariantCount || 1) as 1 | 2;
        const formLetters = formulationLettersForCount(formulationVariantCount);
        const selectedStudentIds = new Set(
          cfg.studentIds === undefined ? activeStudents.map((s) => s.id) : cfg.studentIds,
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
                      patchGroupConfig(gid, { studentIds: activeStudents.map((s) => s.id) })
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
                  {students.map((s) => {
                    const passive = isPassiveStudentId(s.id, passiveIds);
                    return (
                    <Box
                      key={s.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        minHeight: 34,
                        borderRadius: 0.75,
                        px: 0.25,
                        ...passiveStudentMutedSx(passive),
                        ...(passive ? { bgcolor: 'rgba(0,0,0,0.03)' } : {}),
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedStudentIds.has(s.id)}
                        onChange={(_, checked) => {
                          const base =
                            cfg.studentIds === undefined
                              ? activeStudents.map((x) => x.id)
                              : [...cfg.studentIds];
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
                          opacity: passive ? 1 : selectedStudentIds.has(s.id) ? 1 : 0.55,
                          color: passive ? '#757575' : undefined,
                        }}
                        noWrap
                      >
                        {s.name}
                      </Typography>
                      {passive ? (
                        <Chip
                          label="Passiv"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            bgcolor: '#9e9e9e',
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      {manualVariants && formulationVariantCount === 2 ? (
                        <Select
                          size="small"
                          disabled={!selectedStudentIds.has(s.id)}
                          value={
                            cfg.formulationVariantAssignments?.[s.id] &&
                            formLetters.includes(cfg.formulationVariantAssignments[s.id])
                              ? cfg.formulationVariantAssignments[s.id]
                              : formLetters[0]
                          }
                          onChange={(e) => {
                            const L = String(e.target.value);
                            patchGroupConfig(gid, {
                              formulationVariantAssignments: {
                                ...(cfg.formulationVariantAssignments || {}),
                                [s.id]: L,
                              },
                            });
                          }}
                          sx={{ minWidth: 56, fontSize: '0.8rem', flexShrink: 0 }}
                        >
                          {formLetters.map((L) => (
                            <MenuItem key={L} value={L}>{formulationLetterLabel(L)}</MenuItem>
                          ))}
                        </Select>
                      ) : null}
                    </Box>
                    );
                  })}
                </Box>
                <FormControl size="small">
                  <FormLabel sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                    Formulierungsvarianten ($$ / $$$ im Aufgabentext)
                  </FormLabel>
                  <RadioGroup
                    row
                    value={String(formulationVariantCount)}
                    onChange={(_, v) => {
                      const n = Number(v) === 2 ? 2 : 1;
                      patchGroupConfig(gid, { formulationVariantCount: n });
                    }}
                  >
                    <FormControlLabel
                      value="1"
                      control={<Radio size="small" />}
                      label="1 (Standard)"
                    />
                    <FormControlLabel
                      value="2"
                      control={<Radio size="small" />}
                      label="2 (A1 / A2)"
                    />
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
