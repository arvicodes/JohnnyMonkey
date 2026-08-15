import React from 'react';
import { Box } from '@mui/material';
import {
  WOCHENAUFGABEN_BG,
  WOCHENAUFGABEN_BORDER,
  WOCHENAUFGABEN_TEXT_COLOR,
  WochenaufgabenFsNode,
  numberedWochenaufgabeDirs,
} from '../../lib/wochenaufgabenFolder';

type Props = {
  children: WochenaufgabenFsNode[] | undefined;
  parentPath: string;
  onSelect?: (lessonPath: string) => void;
};

/** Nummerierte Wochenaufgaben (1, 2, 3, …) nebeneinander als klickbare Chips. */
export default function WochenaufgabenNumberChips({ children, parentPath, onSelect }: Props) {
  const dirs = numberedWochenaufgabeDirs(children);
  if (dirs.length === 0) return null;

  const clickable = Boolean(onSelect);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        alignItems: 'center',
        mt: 0.35,
      }}
    >
      {dirs.map((child) => {
        const lessonPath = (child.path || `${parentPath}/${child.name || ''}`).replace(/\\/g, '/');
        return (
          <Box
            key={String(child.name)}
            component={clickable ? 'button' : 'span'}
            type={clickable ? 'button' : undefined}
            onClick={clickable ? () => onSelect!(lessonPath) : undefined}
            sx={{
              minWidth: 30,
              height: 28,
              px: 1,
              borderRadius: 1,
              border: `1px solid ${WOCHENAUFGABEN_BORDER}`,
              bgcolor: WOCHENAUFGABEN_BG,
              color: WOCHENAUFGABEN_TEXT_COLOR,
              fontWeight: 700,
              fontSize: '0.78rem',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: clickable ? 'pointer' : 'default',
              fontFamily: 'inherit',
              ...(clickable
                ? {
                    '&:hover': {
                      bgcolor: '#fff3e0',
                      borderColor: WOCHENAUFGABEN_TEXT_COLOR,
                    },
                  }
                : {}),
            }}
          >
            {child.name}
          </Box>
        );
      })}
    </Box>
  );
}
