import type { EpoNotenEntry, EpoNotenGroupMeta } from './epoNotenShared';
import { epoGroupWorkflow } from './epoNotenShared';

export type EpoJaFlags = {
  self: boolean;
  raster: boolean;
  goals: boolean;
};

/** Aktiver Zustand für Freigabe / Notenschema (Icon-Buttons links) */
export const EPO_GREEN_ACTIVE_ICON_SX = {
  bgcolor: '#2e7d32',
  color: '#fff',
  borderColor: '#1b5e20',
  '&:hover': { bgcolor: '#388e3c' },
};

/** Nur Anordnung — ohne Rahmen um Button-Gruppen */
export const epoJaFeatureGroupShellSx = {
  display: 'inline-flex',
  alignItems: 'center',
  flexWrap: 'nowrap',
  maxWidth: '100%',
  overflowX: 'auto',
} as const;

export function epoGroupJaFlags(
  round: { groupMeta?: Record<string, EpoNotenGroupMeta> },
  groupId: string,
): EpoJaFlags {
  const m = round.groupMeta?.[groupId];
  if (
    m &&
    (m.selfAssessmentEnabled !== undefined ||
      m.teacherRasterEnabled !== undefined ||
      m.goalsEnabled !== undefined)
  ) {
    return {
      self: m.selfAssessmentEnabled !== false,
      raster: m.teacherRasterEnabled !== false,
      goals: m.goalsEnabled !== false,
    };
  }
  const w = epoGroupWorkflow(round, groupId);
  switch (w) {
    case 'teacher_only':
      return { self: false, raster: false, goals: false };
    case 'teacher_raster':
      return { self: false, raster: true, goals: true };
    case 'self_no_raster':
      return { self: true, raster: false, goals: false };
    default:
      return { self: true, raster: true, goals: true };
  }
}

export function epoJaFlagsToEntryFields(flags: EpoJaFlags): Pick<
  EpoNotenEntry,
  'withoutSelfAssessment' | 'teacherGradeOnly' | 'goalsWaived' | 'selfUsesRaster'
> {
  const self = flags.self;
  const raster = flags.raster;
  const goals = flags.goals;
  return {
    withoutSelfAssessment: !self,
    teacherGradeOnly: !self && !raster,
    goalsWaived: !goals,
    selfUsesRaster: self && raster ? true : self && !raster ? false : undefined,
  };
}

export function epoEntryJaFlags(entry: EpoNotenEntry, group?: EpoJaFlags): EpoJaFlags {
  if (entry.teacherGradeOnly) {
    return { self: false, raster: false, goals: !entry.goalsWaived };
  }
  const self = !entry.withoutSelfAssessment;
  const goals = !entry.goalsWaived;
  if (!self) {
    return { self: false, raster: true, goals };
  }
  let raster = group?.raster ?? true;
  if (entry.selfUsesRaster === false) raster = false;
  if (entry.selfUsesRaster === true) raster = true;
  return { self: true, raster, goals };
}
