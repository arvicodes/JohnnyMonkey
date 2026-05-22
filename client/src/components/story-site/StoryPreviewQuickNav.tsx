import React, { useMemo } from 'react';
import { Box, Chip, Stack } from '@mui/material';
import { partitionStoryPages } from '../../lib/storySitesStorage';
import type { StoryPage } from '../../lib/storySitesStorage';
import { storyPageAnchorId, STORY_THEMATIC_ROW_BG } from '../../lib/storyPageLayout';
import { formatStoryPageDateWithWeekday } from '../../lib/storyPageDate';

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
  if (d) return formatStoryPageDateWithWeekday(d) || d;
  return `Seite ${index + 1}`;
}

function renderChip(
  p: StoryPage,
  idx: number,
  activePageId: string | undefined,
  thematic: boolean,
  jumpTo: (pageId: string) => void,
) {
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
        ...(thematic && {
          bgcolor: active ? undefined : STORY_THEMATIC_ROW_BG,
          borderColor: 'rgba(92, 107, 192, 0.35)',
        }),
      }}
    />
  );
}

export function StoryPreviewQuickNav({ pages, activePageId, onSelectPage }: Props) {
  const { thematic, days } = useMemo(() => partitionStoryPages(pages), [pages]);

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
        {thematic.map((p, idx) => renderChip(p, idx, activePageId, true, jumpTo))}
        {thematic.length > 0 && days.length > 0 ? (
          <Box sx={{ flexBasis: '100%', width: 0, height: 0 }} aria-hidden />
        ) : null}
        {days.map((p, idx) => renderChip(p, idx, activePageId, false, jumpTo))}
      </Stack>
    </Box>
  );
}
