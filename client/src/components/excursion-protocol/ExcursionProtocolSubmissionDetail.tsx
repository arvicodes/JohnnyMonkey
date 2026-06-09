import React from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import {
  activityVibeLabel,
  type ExcursionProtocolSubmission,
} from '../../lib/excursionProtocolTypes';
import { protocolSectionHeadSx, protocolPalette, sectionCardSx } from './excursionProtocolUi';

const activityThumbReadSx = {
  width: 72,
  height: 54,
  objectFit: 'cover' as const,
  borderRadius: 1,
  flexShrink: 0,
  border: '1px solid',
  borderColor: 'divider',
};

const fullGrid2 = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
  gap: { xs: 1, sm: 1.25 },
  width: '100%',
  minWidth: 0,
};

type Props = {
  submission: ExcursionProtocolSubmission;
  reflectionQuestions: [string, string, string];
  title?: string;
  subtitle?: string;
};

export function ExcursionProtocolSubmissionDetail({
  submission,
  reflectionQuestions,
  title = 'Abgabe',
  subtitle,
}: Props) {
  return (
    <Card sx={sectionCardSx}>
      <Box sx={protocolSectionHeadSx(0)}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: protocolPalette.deep }}>
          {title}
        </Typography>
      </Box>
      <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {subtitle}
          </Typography>
        )}
        <Box sx={fullGrid2}>
          {submission.activities.map((a, i) => (
            <Box
              key={i}
              sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                {a.imageDataUrl && (
                  <Box component="img" src={a.imageDataUrl} alt="" sx={activityThumbReadSx} />
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {i + 1}. {a.content}
                  </Typography>
                  {a.activityRating && (
                    <Chip
                      size="small"
                      label={activityVibeLabel(a.activityRating)}
                      sx={{ height: 22, fontWeight: 700, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 1.5, display: 'grid', gap: 0.75 }}>
          <Typography variant="body2">
            <strong>{reflectionQuestions[0]}</strong> {submission.reflection.learned}
          </Typography>
          <Typography variant="body2">
            <strong>{reflectionQuestions[1]}</strong> {submission.reflection.highlight}
          </Typography>
          <Typography variant="body2">
            <strong>{reflectionQuestions[2]}</strong> {submission.reflection.openQuestion}
          </Typography>
        </Box>
        <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {submission.ratings.map((r) => (
            <Chip
              key={r.criterion}
              size="small"
              label={`${r.criterion}: ${'★'.repeat(r.score)}${'☆'.repeat(5 - r.score)}`}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
