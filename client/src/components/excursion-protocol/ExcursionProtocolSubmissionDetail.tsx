import React, { useRef, useState } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import {
  activityVibeLabel,
  type ExcursionProtocolSubmission,
} from '../../lib/excursionProtocolTypes';
import {
  protocolPalette,
  protocolSectionHeadSx,
  protocolStepBadgeSx,
  sectionCardSx,
  submissionAnswerChipSx,
  submissionAnswerSx,
  submissionSectionNavChipSx,
} from './excursionProtocolUi';

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

const fullGrid3 = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(3, minmax(0, 1fr))' },
  gap: { xs: 1, sm: 1.25 },
  width: '100%',
  minWidth: 0,
};

const activityCardReadSx = {
  p: 1.25,
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fafafa',
};

const SECTION_NAV = [
  { id: 'activities', label: 'Aktivitäten', step: 0 },
  { id: 'reflection', label: 'Reflexion', step: 1 },
  { id: 'ratings', label: 'Bewertung', step: 2 },
] as const;

type SectionId = (typeof SECTION_NAV)[number]['id'];

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
  const [activeSection, setActiveSection] = useState<SectionId>('activities');
  const activitiesRef = useRef<HTMLDivElement>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);
  const ratingsRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const target =
      id === 'activities' ? activitiesRef : id === 'reflection' ? reflectionRef : ratingsRef;
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Stack spacing={1.25}>
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
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {SECTION_NAV.map((section) => (
              <Chip
                key={section.id}
                size="small"
                label={section.label}
                onClick={() => scrollToSection(section.id)}
                sx={submissionSectionNavChipSx(activeSection === section.id, section.step)}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card ref={activitiesRef} sx={{ ...sectionCardSx, scrollMarginTop: 12 }}>
        <Box
          sx={protocolSectionHeadSx(0)}
          onClick={() => scrollToSection('activities')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') scrollToSection('activities');
          }}
        >
          <Chip label="1" size="small" sx={protocolStepBadgeSx(0)} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: protocolPalette.deep }}>
            Aktivitäten, Fotos & Vibe
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
          <Box sx={fullGrid2}>
            {submission.activities.map((a, i) => (
              <Box key={i} sx={activityCardReadSx}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  {a.imageDataUrl && (
                    <Box component="img" src={a.imageDataUrl} alt="" sx={activityThumbReadSx} />
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: protocolPalette.textPrimary }}>
                      Aktivität {i + 1}
                    </Typography>
                    <Typography component="div" variant="body2" sx={submissionAnswerSx}>
                      {a.content}
                    </Typography>
                    {a.activityRating && (
                      <Chip
                        size="small"
                        label={activityVibeLabel(a.activityRating)}
                        sx={{ ...submissionAnswerChipSx, mt: 0.5 }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card ref={reflectionRef} sx={{ ...sectionCardSx, scrollMarginTop: 12 }}>
        <Box
          sx={protocolSectionHeadSx(1)}
          onClick={() => scrollToSection('reflection')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') scrollToSection('reflection');
          }}
        >
          <Chip label="2" size="small" sx={protocolStepBadgeSx(1)} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: protocolPalette.deep }}>
            Drei-Fragen-Methode
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
          <Box sx={fullGrid3}>
            {(
              [
                [reflectionQuestions[0], submission.reflection.learned],
                [reflectionQuestions[1], submission.reflection.highlight],
                [reflectionQuestions[2], submission.reflection.openQuestion],
              ] as const
            ).map(([question, answer], i) => (
              <Box key={i}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: protocolPalette.textPrimary, display: 'block', mb: 0.5 }}>
                  Frage {i + 1}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, lineHeight: 1.35 }}>
                  {question}
                </Typography>
                <Typography component="div" variant="body2" sx={submissionAnswerSx}>
                  {answer.trim() ? answer : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card ref={ratingsRef} sx={{ ...sectionCardSx, scrollMarginTop: 12 }}>
        <Box
          sx={protocolSectionHeadSx(2)}
          onClick={() => scrollToSection('ratings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') scrollToSection('ratings');
          }}
        >
          <Chip label="3" size="small" sx={protocolStepBadgeSx(2)} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: protocolPalette.deep }}>
            Bewertung (1–5)
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
                xl: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 1,
            }}
          >
            {submission.ratings.map((r) => (
              <Box
                key={r.criterion}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'rgba(25, 118, 210, 0.15)',
                  bgcolor: 'rgba(25, 118, 210, 0.04)',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.25, display: 'block', mb: 0.35 }}>
                  {r.criterion}
                </Typography>
                <Chip
                  size="small"
                  label={`${'★'.repeat(r.score)}${'☆'.repeat(5 - r.score)}`}
                  sx={submissionAnswerChipSx}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
