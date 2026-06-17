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

type Props = { source: string; compact?: boolean; large?: boolean; instruction?: boolean };

/**
 * Rendert Folientext: **fett**, *kursiv*, ~~durchgestrichen~~, Zeilenumbrüche, sowie `<u>` für Unterstreichen.
 */
export function HeroSlideMarkdownBody({ source, compact = false, large = false, instruction = false }: Props) {
  return (
    <Box
      sx={{
        typography: instruction ? 'h5' : large ? 'h6' : compact ? 'body2' : 'body1',
        fontSize: instruction
          ? { xs: '1.35rem', sm: '1.55rem', md: '1.7rem' }
          : large
            ? { xs: '1.08rem', sm: '1.22rem' }
            : compact
              ? '0.92rem'
              : undefined,
        lineHeight: instruction ? 1.45 : large ? 1.6 : compact ? 1.55 : 1.65,
        color: instruction || large ? 'text.primary' : undefined,
        fontWeight: instruction ? 600 : large ? 500 : undefined,
        '& p': { mb: instruction ? 1.15 : 1, '&:last-child': { mb: 0 } },
        '& strong': { fontWeight: instruction ? 800 : 700 },
        '& em': { fontStyle: 'italic' },
        '& u': { textDecoration: 'underline', textUnderlineOffset: '2px' },
        '& del': { textDecoration: 'line-through', opacity: 0.95 },
        '& ul, & ol': { pl: instruction ? 2.75 : 2.5, mb: 1 },
        '& li': { mb: instruction ? 0.5 : 0.35 },
        '& h1, & h2, & h3': { fontWeight: 800, mb: 0.75, mt: 0.5 },
        '& h1': { typography: instruction ? 'h4' : 'h5' },
        '& h2': { typography: instruction ? 'h5' : 'h6' },
        '& h3': { typography: instruction ? 'h6' : 'subtitle1' },
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
