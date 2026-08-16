import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  WOCHENAUFGABEN_BOX_BG,
  WOCHENAUFGABEN_BOX_BORDER,
  WOCHENAUFGABEN_TEXT_COLOR,
  WochenaufgabenFsNode,
} from '../../lib/wochenaufgabenFolder';
import {
  WaUploadKind,
  WochenaufgabeTaskState,
  activateWochenaufgabe,
  claimWochenaufgabeVideo,
  fetchWochenaufgabeStates,
} from '../../lib/wochenaufgabenWorkflow';
import WochenaufgabenNumberChips from './WochenaufgabenNumberChips';
import WochenaufgabeUploadModal from './WochenaufgabeUploadModal';
import WochenaufgabenInfoButton from './WochenaufgabenInfoDialog';
import { DASHBOARD_REIHEN_CONTENT_GROUP } from '../../lib/dashboardWorkingReihen';

type Props = {
  children: WochenaufgabenFsNode[] | undefined;
  parentPath: string;
  groupId?: string | null;
  studentId?: string;
  showLabel?: boolean;
  onSelect?: (lessonPath: string) => void;
  onOpenPdf?: (lessonPath: string) => void;
  onAdd?: () => void;
};

function normPath(p: string) {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

export default function WochenaufgabenFolderRow({
  children,
  parentPath,
  groupId,
  studentId,
  showLabel = true,
  onSelect,
  onOpenPdf,
  onAdd,
}: Props) {
  const [statesByPath, setStatesByPath] = useState<Record<string, WochenaufgabeTaskState>>({});
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ lessonPath: string; kind: WaUploadKind } | null>(null);

  const loadGroupId =
    groupId && groupId !== DASHBOARD_REIHEN_CONTENT_GROUP ? groupId : null;
  const isTeacher = Boolean(onSelect && !studentId);

  const reload = useCallback(async () => {
    if (!loadGroupId) {
      setStatesByPath({});
      return;
    }
    try {
      const data = await fetchWochenaufgabeStates(loadGroupId, parentPath, studentId);
      const map: Record<string, WochenaufgabeTaskState> = {};
      for (const row of data.states) {
        map[normPath(row.lessonPath)] = row;
      }
      setStatesByPath(map);
      setTeacherId(data.teacherId);
    } catch (err) {
      console.error(err);
    }
  }, [loadGroupId, parentPath, studentId]);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 60000);
    return () => clearInterval(t);
  }, [reload, children]);

  const handleActivate = async (lessonPath: string) => {
    if (!loadGroupId) return;
    if (!window.confirm('Wochenaufgabe für Schüler freigeben? (5 Tage Phase 1)')) return;
    try {
      await activateWochenaufgabe(loadGroupId, lessonPath);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Freigabe fehlgeschlagen');
    }
  };

  const handleClaimVideo = async (lessonPath: string) => {
    if (!loadGroupId || !studentId) return;
    try {
      await claimWochenaufgabeVideo(loadGroupId, lessonPath, studentId);
      await reload();
      setUpload({ lessonPath, kind: 'video' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reservierung fehlgeschlagen');
    }
  };

  return (
    <Box
      sx={{
        mb: 0.75,
        width: '100%',
        minWidth: 0,
        border: `1px solid ${WOCHENAUFGABEN_BOX_BORDER}`,
        borderRadius: 1.25,
        bgcolor: WOCHENAUFGABEN_BOX_BG,
        px: 0.75,
        pt: 0.55,
        pb: 0.55,
      }}
    >
      {showLabel ? (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.35 }}>
          <Typography
            component="div"
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: WOCHENAUFGABEN_TEXT_COLOR,
              lineHeight: 1.25,
            }}
          >
            📅 Wochenaufgaben
          </Typography>
          {studentId ? <WochenaufgabenInfoButton /> : null}
        </Box>
      ) : studentId ? (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.35 }}>
          <WochenaufgabenInfoButton />
          <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', ml: 0.25 }}>
            So funktionieren Wochenaufgaben
          </Typography>
        </Box>
      ) : null}

      <WochenaufgabenNumberChips
        children={children}
        parentPath={parentPath}
        isTeacher={isTeacher}
        statesByPath={loadGroupId ? statesByPath : undefined}
        onSelect={onSelect}
        onOpenPdf={onOpenPdf}
        onActivate={isTeacher ? handleActivate : undefined}
        onClaimVideo={studentId ? handleClaimVideo : undefined}
        onUpload={studentId && teacherId ? (lessonPath, kind) => setUpload({ lessonPath, kind }) : undefined}
        onAdd={onAdd}
      />

      {upload && studentId && teacherId ? (
        <WochenaufgabeUploadModal
          open
          kind={upload.kind}
          lessonPath={upload.lessonPath}
          studentId={studentId}
          teacherId={teacherId}
          onClose={() => setUpload(null)}
          onUploadSuccess={() => void reload()}
        />
      ) : null}
    </Box>
  );
}
