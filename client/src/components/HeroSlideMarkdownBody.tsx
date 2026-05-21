import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';
import { Box } from '@mui/material';

/** Markdown + nur `<u>` aus den Shortcuts, Rest wie GitHub-Sanitizer */
const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
  attributes: {
    ...defaultSchema.attributes,
    u: [],
  },
};

type Props = { source: string };

/**
 * Rendert Folientext: **fett**, *kursiv*, ~~durchgestrichen~~, Zeilenumbrüche, sowie `<u>` für Unterstreichen.
 */
export function HeroSlideMarkdownBody({ source }: Props) {
  return (
    <Box
      sx={{
        typography: 'body1',
        lineHeight: 1.65,
        '& p': { mb: 1, '&:last-child': { mb: 0 } },
        '& strong': { fontWeight: 700 },
        '& em': { fontStyle: 'italic' },
        '& u': { textDecoration: 'underline', textUnderlineOffset: '2px' },
        '& del': { textDecoration: 'line-through', opacity: 0.95 },
        '& ul, & ol': { pl: 2.5, mb: 1 },
        '& li': { mb: 0.35 },
        '& h1, & h2, & h3': { fontWeight: 800, mb: 0.75, mt: 0.5 },
        '& h1': { typography: 'h5' },
        '& h2': { typography: 'h6' },
        '& h3': { typography: 'subtitle1' },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      >
        {source ?? ''}
      </ReactMarkdown>
    </Box>
  );
}
