import React from 'react';
import { Box, Chip, Stack } from '@mui/material';
import type { StoryPage } from '../../lib/storySitesStorage';
import { storyPageAnchorId } from '../../lib/storyPageLayout';

type Props = {
  pages: StoryPage[];
  activePageId?: string;
  /** Builder: Seite wechseln. Vorschau: nur scrollen. */
  onSelectPage?: (pageId: string) => void;
};

function pageLabel(page: StoryPage, index: number): string {
  const t = page.title?.trim();
  if (t) return t;
  const d = page.dateStr?.trim();
  if (d) return d;
  return `Seite ${index + 1}`;
}

export function StoryPreviewQuickNav({ pages, activePageId, onSelectPage }: Props) {
  if (pages.length <= 1) return null;

  const jumpTo = (pageId: string) => {
    if (onSelectPage) onSelectPage(pageId);
    window.setTimeout(() => {
      document.getElementById(storyPageAnchorId(pageId))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, onSelectPage ? 80 : 0);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        mb: 3,
        px: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        flexWrap="wrap"
        justifyContent="center"
        sx={{
          width: '100%',
          maxWidth: '100%',
        }}
      >
        {pages.map((p, idx) => {
          const active = activePageId === p.id;
          return (
            <Chip
              key={p.id}
              size="small"
              label={pageLabel(p, idx)}
              onClick={() => jumpTo(p.id)}
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 700,
                maxWidth: { xs: '100%', sm: 220 },
                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
