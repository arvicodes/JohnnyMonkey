import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ensureWochenaufgabeDeck } from '../../lib/wochenaufgabenPresentation';

type Props = {
  children: WochenaufgabenFsNode[] | undefined;
  parentPath: string;
  /** Cache-Prefix (darf __dashboard_reihen__ sein). */
  groupId?: string | null;
  /** Echte Lerngruppe(n) für Freigabe/API — wenn leer, wird groupId genutzt. */
  workflowGroupIds?: string[];
  studentId?: string;
  showLabel?: boolean;
  onSelect?: (lessonPath: string) => void;
  onOpenPdf?: (lessonPath: string) => void;
  onAdd?: () => void;
};

function normPath(p: string) {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

function isRealGroupId(id: string | null | undefined): id is string {
  return Boolean(id && !id.startsWith('__'));
}

/** Lehrerin: Wochenaufgaben an eine Reihe hängen, ohne dass sie standardmäßig da sind. */
export function WochenaufgabenAddToReiheButton({ onAdd }: { onAdd: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      title="Wochenaufgaben zu dieser Reihe hinzufügen"
      aria-label="Wochenaufgaben zu dieser Reihe hinzufügen"
      onClick={(e) => {
        e.stopPropagation();
        onAdd();
      }}
      sx={{
        mb: 0.75,
        width: '100%',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 0.5,
        border: `1px dashed ${WOCHENAUFGABEN_BOX_BORDER}`,
        borderRadius: 1.25,
        bgcolor: 'transparent',
        px: 0.75,
        py: 0.45,
        cursor: 'pointer',
        fontFamily: 'inherit',
        '&:hover': { bgcolor: WOCHENAUFGABEN_BOX_BG },
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: WOCHENAUFGABEN_TEXT_COLOR,
          lineHeight: 1,
        }}
      >
        + Wochenaufgaben
      </Typography>
    </Box>
  );
}

export default function WochenaufgabenFolderRow({
  children,
  parentPath,
  groupId,
  workflowGroupIds,
  studentId,
  showLabel = true,
  onSelect,
  onOpenPdf,
  onAdd,
}: Props) {
  const [statesByPath, setStatesByPath] = useState<Record<string, WochenaufgabeTaskState>>({});
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ lessonPath: string; kind: WaUploadKind } | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);

  const apiGroupIds = useMemo(() => {
    const fromProp = (workflowGroupIds || []).filter(isRealGroupId);
    if (fromProp.length > 0) return fromProp;
    if (isRealGroupId(groupId)) return [groupId];
    return [];
  }, [workflowGroupIds, groupId]);

  const loadGroupId = apiGroupIds[0] ?? null;
  const isTeacher = Boolean(onSelect && !studentId);

  const mergeState = useCallback((state: WochenaufgabeTaskState) => {
    setStatesByPath((prev) => ({ ...prev, [normPath(state.lessonPath)]: state }));
  }, []);

  const reload = useCallback(async () => {
    if (!loadGroupId) {
      setStatesByPath({});
      setTeacherId(null);
      return;
    }
    try {
      setStatusHint(null);
      const data = await fetchWochenaufgabeStates(loadGroupId, parentPath, studentId);
      const map: Record<string, WochenaufgabeTaskState> = {};
      for (const row of data.states) {
        map[normPath(row.lessonPath)] = row;
      }
      setStatesByPath(map);
      setTeacherId(data.teacherId);
    } catch (err) {
      console.error(err);
      setStatusHint(
        err instanceof Error && err.message.includes('nicht gefunden')
          ? 'Lerngruppe nicht gefunden — bitte Seite neu laden.'
          : 'Status konnte nicht geladen werden. Läuft der Server (Port 3003)?',
      );
    }
  }, [loadGroupId, parentPath, studentId]);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 60000);
    return () => clearInterval(t);
  }, [reload, children]);

  const handleActivate = async (lessonPath: string) => {
    if (!window.confirm('Wochenaufgabe anlegen und für Schüler freigeben? (5 Tage Phase 1)')) return;
    try {
      setStatusHint(null);
      await ensureWochenaufgabeDeck(lessonPath);
      if (apiGroupIds.length === 0) {
        alert(
          'Wochenaufgabe wurde angelegt. Bitte ordne die Reihe mindestens einer Lerngruppe zu (Häkchen oben rechts), um sie freizugeben.',
        );
        onSelect?.(lessonPath);
        return;
      }
      let lastState: WochenaufgabeTaskState | null = null;
      for (const gid of apiGroupIds) {
        lastState = await activateWochenaufgabe(gid, lessonPath);
        mergeState(lastState);
      }
      if (lastState) mergeState(lastState);
      await reload();
      onSelect?.(lessonPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Freigabe fehlgeschlagen';
      setStatusHint(msg);
      alert(msg);
    }
  };

  const handleClaimVideo = async (lessonPath: string) => {
    if (!loadGroupId || !studentId) return;
    try {
      const state = await claimWochenaufgabeVideo(loadGroupId, lessonPath, studentId);
      mergeState(state);
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
        py: 0.4,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 0.65,
          minWidth: 0,
        }}
      >
        {showLabel ? (
          <Typography
            component="div"
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: WOCHENAUFGABEN_TEXT_COLOR,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Wochenaufgaben
          </Typography>
        ) : null}
        {studentId ? <WochenaufgabenInfoButton /> : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <WochenaufgabenNumberChips
            children={children}
            parentPath={parentPath}
            isTeacher={isTeacher}
            statesByPath={loadGroupId ? statesByPath : {}}
            onSelect={onSelect}
            onOpenPdf={onOpenPdf}
            onActivate={isTeacher ? handleActivate : undefined}
            onClaimVideo={studentId ? handleClaimVideo : undefined}
            onUpload={studentId && teacherId ? (lessonPath, kind) => setUpload({ lessonPath, kind }) : undefined}
            onAdd={onAdd}
          />
        </Box>
      </Box>

      {statusHint ? (
        <Typography sx={{ fontSize: '0.58rem', color: 'error.main', mt: 0.35, lineHeight: 1.3 }}>
          {statusHint}
        </Typography>
      ) : null}

      {!loadGroupId && isTeacher ? (
        <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', mt: 0.35, lineHeight: 1.3 }}>
          Reihe einer Lerngruppe zuordnen (Häkchen), dann wird Freigeben aktiv.
        </Typography>
      ) : null}

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
