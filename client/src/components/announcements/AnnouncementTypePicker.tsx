import React from 'react';
import { Box, Button, ButtonGroup, Tooltip } from '@mui/material';
import {
  ANNOUNCEMENT_KINDS_BY_REALM,
  ANNOUNCEMENT_REALM_OPTIONS,
  defaultKindForRealm,
  type AnnouncementKind,
  type AnnouncementRealm,
} from './announcementKinds';
import {
  announcementTypeKindActiveSx,
  announcementTypePickerGridSx,
  announcementTypeRowGroupSx,
} from './announcementUi';

const PUBLIC = process.env.PUBLIC_URL || '';

const REALM_META: Record<AnnouncementRealm, { label: string; logoUrl: string }> = {
  verein: {
    label: 'Verein',
    logoUrl: `${PUBLIC}/announcement-vorlagen/verein/vel-logo.png`,
  },
  schule: {
    label: 'Schule',
    logoUrl: `${PUBLIC}/johnny-logo.png`,
  },
};

type Props = {
  realm: AnnouncementRealm;
  kind: AnnouncementKind;
  onSelect: (realm: AnnouncementRealm, kind: AnnouncementKind) => void;
};

export function AnnouncementTypePicker({ realm, kind, onSelect }: Props) {
  return (
    <Box sx={announcementTypePickerGridSx}>
      {ANNOUNCEMENT_REALM_OPTIONS.map((realmOption) => {
        const realmActive = realm === realmOption.id;
        const meta = REALM_META[realmOption.id];
        const kinds = ANNOUNCEMENT_KINDS_BY_REALM[realmOption.id];

        return (
          <ButtonGroup
            key={realmOption.id}
            size="small"
            sx={announcementTypeRowGroupSx(realmOption.id, realmActive)}
          >
            <Tooltip title={meta.label}>
              <Button
                onClick={() => onSelect(realmOption.id, defaultKindForRealm(realmOption.id))}
                aria-pressed={realmActive}
                aria-label={meta.label}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component="img"
                  src={meta.logoUrl}
                  alt=""
                  sx={{
                    height: 14,
                    width: 'auto',
                    maxWidth: 22,
                    objectFit: 'contain',
                    display: 'block',
                    flexShrink: 0,
                  }}
                />
              </Button>
            </Tooltip>

            {kinds.map((entry) => {
              const kindActive = realmActive && kind === entry.id;
              return (
                <Button
                  key={entry.id}
                  onClick={() => onSelect(realmOption.id, entry.id)}
                  aria-pressed={kindActive}
                  aria-current={kindActive ? 'true' : undefined}
                  title={entry.label}
                  sx={kindActive ? announcementTypeKindActiveSx(realmOption.id) : undefined}
                >
                  {entry.label}
                </Button>
              );
            })}
          </ButtonGroup>
        );
      })}
    </Box>
  );
}
