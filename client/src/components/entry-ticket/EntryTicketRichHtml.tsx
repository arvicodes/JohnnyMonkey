import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import {
  decorateEntryTicketDisplayHtml,
  entryTicketHasImage,
  entryTicketLooksLikeHtml,
  readEntryTicketCardLayout,
  splitEntryTicketMediaAndText,
} from '../../lib/entryTicketRichText';

export const entryTicketRichTextSx = {
  '& p': { m: 0 },
  '& div': { m: 0 },
  '& b, & strong': { fontWeight: 800 },
  '& i, & em': { fontStyle: 'italic' },
  '& u': { textDecoration: 'underline' },
  '& .et-op': { fontWeight: '800 !important', color: '#ef6c00' },
  '& .et-q': { fontWeight: '800 !important', color: '#d32f2f' },
  '& .et-task-op': { fontWeight: '800 !important', color: 'inherit' },
  '&::after': {
    content: '""',
    display: 'table',
    clear: 'both',
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    objectFit: 'contain',
    borderRadius: 1,
  },
  '& img[data-et-place="block"]': {
    my: 0.75,
  },
} as const;

export function EntryTicketRichHtml({
  value,
  sx,
  compact,
  contain,
}: {
  value: string;
  sx?: SxProps<Theme>;
  compact?: boolean;
  contain?: boolean;
}) {
  if (!value) return null;
  const decorated = decorateEntryTicketDisplayHtml(value);
  if (!decorated) return null;

  if (compact) {
    return (
      <Box
        component="div"
        sx={{ display: 'block', whiteSpace: 'pre-wrap', overflow: 'hidden', ...entryTicketRichTextSx, ...sx }}
        dangerouslySetInnerHTML={{ __html: decorated }}
      />
    );
  }

  if (!entryTicketLooksLikeHtml(value) && !entryTicketHasImage(value)) {
    return (
      <Box
        component="div"
        sx={{ display: 'block', whiteSpace: 'pre-line', ...entryTicketRichTextSx, ...sx }}
        dangerouslySetInnerHTML={{ __html: decorated }}
      />
    );
  }

  const layout = readEntryTicketCardLayout(value);
  if (layout === 'split-left' || layout === 'split-right') {
    const { mediaHtml, textHtml } = splitEntryTicketMediaAndText(value);
    const mediaFirst = layout === 'split-left';
    const mediaCol = mediaHtml ? (
      <Box
        key="media"
        sx={{
          minWidth: 0,
          width: '100%',
          alignSelf: 'stretch',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& img': {
            width: '100% !important',
            maxWidth: '100% !important',
            height: 'auto !important',
            maxHeight: contain ? 'min(38vh, 260px)' : 'min(78vh, 640px)',
            objectFit: 'contain',
            borderRadius: 1,
            margin: '0 !important',
            float: 'none !important',
            display: 'block',
          },
        }}
        dangerouslySetInnerHTML={{ __html: mediaHtml }}
      />
    ) : null;
    const textCol = textHtml ? (
      <Box
        key="text"
        component="div"
        sx={{ display: 'block', minWidth: 0, textAlign: 'left', whiteSpace: 'normal', ...entryTicketRichTextSx, ...sx }}
        dangerouslySetInnerHTML={{ __html: decorateEntryTicketDisplayHtml(textHtml) }}
      />
    ) : null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm:
              mediaHtml && textHtml
                ? mediaFirst
                  ? 'minmax(0, 1.15fr) minmax(0, 0.85fr)'
                  : 'minmax(0, 0.85fr) minmax(0, 1.15fr)'
                : '1fr',
          },
          gap: { xs: 1.25, sm: 2.5 },
          alignItems: 'center',
          width: '100%',
          textAlign: 'left',
        }}
      >
        {mediaFirst ? (
          <>
            {mediaCol}
            {textCol}
          </>
        ) : (
          <>
            {textCol}
            {mediaCol}
          </>
        )}
      </Box>
    );
  }

  return (
    <Box
      component="div"
      sx={{ display: 'block', whiteSpace: 'normal', ...entryTicketRichTextSx, ...sx }}
      dangerouslySetInnerHTML={{ __html: decorated }}
    />
  );
}
