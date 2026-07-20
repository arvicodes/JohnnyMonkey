import React from 'react';
import { Box, Checkbox, FormControlLabel, MenuItem, Select, Typography } from '@mui/material';
import { getShareFileForGroup, labelForFolienOption, filterJohnnyPresentationShareVersions } from '../lib/folienVersions';

export function materialSharePickKey(groupId: string, baseName: string) {
  return `${(groupId || '').trim()}:${(baseName || '').trim()}`;
}

/** Freigabe: Version wählen (Dropdown, immer wenn ≥1 Datei) + eine Checkbox pro Dokumentgruppe. */
export default function MaterialShareVersionControl({
  groupId,
  baseName,
  sortedVersions,
  fileShares,
  fileShareKey,
  materialSharePickPath,
  setMaterialSharePickPath,
  toggleFileShare,
  getShareFileForGroup: getShareFileForGroupProp = getShareFileForGroup,
  label = 'Material freigeben',
  variant = 'modal',
}: {
  groupId: string;
  baseName: string;
  sortedVersions: { ext: string; file: any }[];
  fileShares: Record<string, boolean>;
  fileShareKey: (path: string, groupId: string) => string;
  materialSharePickPath: Record<string, string>;
  setMaterialSharePickPath: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  toggleFileShare: (filePath: string, groupId: string) => Promise<void>;
  getShareFileForGroup?: (versions: { ext: string; file: any }[], groupBaseName: string) => any | null;
  label?: string;
  variant?: 'dashboard' | 'modal';
}) {
  const pKey = materialSharePickKey(groupId, baseName);
  const pathSet = new Set(sortedVersions.map((v) => v.file.path));
  const sharedPath =
    sortedVersions.find((v) => fileShares[fileShareKey(v.file.path, groupId)])?.file.path ?? null;
  const defaultFile = getShareFileForGroupProp(sortedVersions, baseName);
  const defaultPath = defaultFile?.path ?? sortedVersions[0]?.file.path ?? null;
  const rawPick = materialSharePickPath[pKey];
  const pickValid = rawPick && pathSet.has(rawPick) ? rawPick : null;
  const effectivePath = (sharedPath && pathSet.has(sharedPath) ? sharedPath : null) ?? pickValid ?? defaultPath;

  if (!effectivePath || sortedVersions.length === 0) return null;

  const visibleVersions = filterJohnnyPresentationShareVersions(sortedVersions);
  const peerFiles = sortedVersions.map((v) => v.file);
  const visiblePaths = new Set(visibleVersions.map((v) => v.file.path));
  const selectValue = visiblePaths.has(effectivePath)
    ? effectivePath
    : visibleVersions[0]?.file.path || effectivePath;

  const handleSelectChange = async (newPath: string) => {
    const oldPath = selectValue;
    if (oldPath === newPath) return;
    if (oldPath && fileShares[fileShareKey(oldPath, groupId)]) {
      await toggleFileShare(oldPath, groupId);
    }
    if (
      effectivePath !== oldPath &&
      effectivePath &&
      fileShares[fileShareKey(effectivePath, groupId)]
    ) {
      await toggleFileShare(effectivePath, groupId);
    }
    setMaterialSharePickPath((prev) => ({ ...prev, [pKey]: newPath }));
  };

  const isShared = !!fileShares[fileShareKey(selectValue, groupId)];

  /** Geschlossen nur Platzhalter; volle Bezeichnung steht in den MenuItems. */
  const selectClosedLabel = '…';

  const selectSx =
    variant === 'dashboard'
      ? {
          width: 34,
          minWidth: 34,
          maxWidth: 34,
          fontSize: '0.7rem',
          height: 26,
          '& .MuiSelect-select': {
            py: 0.25,
            px: 0,
            pr: '18px !important',
            pl: 0.25,
            fontSize: '0.75rem',
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
        }
      : {
          width: 38,
          minWidth: 38,
          maxWidth: 38,
          fontSize: '0.7rem',
          '& .MuiSelect-select': {
            py: 0.35,
            px: 0,
            pr: '20px !important',
            pl: 0.25,
            fontSize: '0.8rem',
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
        };

  const selectEl = (
    <Select
      size="small"
      value={selectValue}
      displayEmpty
      renderValue={() => (
        <Box
          component="span"
          aria-hidden
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            letterSpacing: 0,
            userSelect: 'none',
          }}
        >
          {selectClosedLabel}
        </Box>
      )}
      onChange={(e) => void handleSelectChange(e.target.value as string)}
      variant="standard"
      disableUnderline
      title="Version für die Freigabe wählen (Liste beim Öffnen)"
      inputProps={{ 'aria-label': 'Version für die Freigabe wählen' }}
      MenuProps={{
        PaperProps: {
          sx: { maxWidth: 360 },
        },
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
      }}
      sx={{
        ...selectSx,
        flexShrink: 0,
        bgcolor: 'transparent',
        boxShadow: 'none',
        '&:before': { display: 'none' },
        '&:after': { display: 'none' },
        '&:hover:not(.Mui-disabled):before': { display: 'none' },
        '& .MuiSelect-icon': {
          color: 'text.secondary',
          right: 0,
          fontSize: '1.15rem',
        },
      }}
    >
      {visibleVersions.map(({ ext, file }) => (
        <MenuItem key={file.path} value={file.path} sx={{ fontSize: '0.75rem' }}>
          {labelForFolienOption(file, baseName, peerFiles)} · {ext.toUpperCase()}
        </MenuItem>
      ))}
    </Select>
  );

  if (variant === 'dashboard') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        {selectEl}
        <Box
          sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}
          title={
            isShared
              ? 'Für Schüler freigegeben'
              : 'Version wählen, dann für Schüler freigeben'
          }
        >
          <input
            type="checkbox"
            checked={isShared}
            onChange={() => void toggleFileShare(selectValue, groupId)}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#4caf50' }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexShrink: 0,
        ml: 'auto',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      }}
    >
      {selectEl}
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={isShared}
            onChange={() => void toggleFileShare(selectValue, groupId)}
            sx={{ py: 0 }}
          />
        }
        label={<Typography variant="caption">{label}</Typography>}
      />
    </Box>
  );
}
