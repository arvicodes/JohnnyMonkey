import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Rating,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import {
  ACTIVITY_RATING_PROMPTS,
  ACTIVITY_VIBE_OPTIONS,
  type ExcursionActivity,
  type ExcursionRating,
} from '../../lib/excursionProtocolTypes';
import { determinateLinearProgressSx } from '../../lib/muiLinearProgressSx';
import {
  compactIconBtnSx,
  compactIconSx,
  protocolActivityCardSx,
  protocolBtnSubmitSx,
  protocolFieldSx,
  protocolHeroSx,
  protocolPalette,
  protocolProgressChipSx,
  protocolSectionHeadSx,
  protocolStepBadgeSx,
  protocolVibeChipSx,
  sectionCardSx,
} from './excursionProtocolUi';

type ReflectionState = {
  learned: string;
  highlight: string;
  openQuestion: string;
};

type Props = {
  sessionTitle: string;
  sessionDate: string;
  teacherName?: string;
  reflectionQuestions: [string, string, string];
  activities: ExcursionActivity[];
  reflection: ReflectionState;
  ratings: ExcursionRating[];
  submitting: boolean;
  submitError: string | null;
  isResubmit?: boolean;
  onActivitiesChange: (next: ExcursionActivity[]) => void;
  onReflectionChange: (next: ReflectionState) => void;
  onRatingsChange: (next: ExcursionRating[]) => void;
  onSubmit: () => void;
  formatDisplayDate: (isoDate: string) => string;
};

const emptyActivity = (): ExcursionActivity => ({ content: '' });

const activityThumbSx = {
  width: 88,
  height: 66,
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

const pageStackSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
};

export function ExcursionProtocolStudentView({
  sessionTitle,
  sessionDate,
  teacherName,
  reflectionQuestions,
  activities,
  reflection,
  ratings,
  submitting,
  submitError,
  isResubmit = false,
  onActivitiesChange,
  onReflectionChange,
  onRatingsChange,
  onSubmit,
  formatDisplayDate,
}: Props) {
  const validActivities = activities.filter((a) => a.content.trim());
  const activitiesComplete =
    validActivities.length > 0 &&
    validActivities.every((a) => typeof a.activityRating === 'number' && a.activityRating >= 1);
  const reflectionFilled =
    reflection.learned.trim() || reflection.highlight.trim() || reflection.openQuestion.trim();
  const ratingsComplete = ratings.length > 0 && ratings.every((r) => r.score >= 1);

  const progressSteps = [
    { label: 'Aktivitäten', done: activitiesComplete },
    { label: 'Reflexion', done: Boolean(reflectionFilled) },
    { label: 'Bewertung', done: ratingsComplete },
  ];
  const doneCount = progressSteps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / progressSteps.length) * 100);

  const updateActivity = (index: number, patch: Partial<ExcursionActivity>) => {
    onActivitiesChange(activities.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const onPickImage = (index: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      updateActivity(index, { imageDataUrl: result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Stack spacing={1.25} sx={pageStackSx}>
      {/* Kompakter Kopf — volle Breite */}
      <Box
        sx={{
          ...protocolHeroSx,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1.5 },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ minWidth: 0, flex: '1 1 140px', maxWidth: '100%', position: 'relative', zIndex: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, letterSpacing: 0.5 }}>
            TAGESPROTOKOLL
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {sessionTitle}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {formatDisplayDate(sessionDate)}
            {teacherName ? ` · ${teacherName}` : ''}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ maxWidth: '100%', minWidth: 0, flex: '0 1 auto', position: 'relative', zIndex: 1 }}
        >
          {progressSteps.map((s, i) => (
            <Chip key={s.label} size="small" label={s.label} sx={protocolProgressChipSx(s.done, i)} />
          ))}
        </Stack>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{
          ...determinateLinearProgressSx(
            'linear-gradient(90deg, #66bb6a 0%, #43a047 48%, #2e7d32 100%)',
            { height: 8, barGlow: 'rgba(46, 125, 50, 0.3)' }
          ),
          width: '100%',
        }}
      />

      {submitError && (
        <Alert severity="error" sx={{ borderRadius: 1.5, py: 0.25 }}>
          {submitError}
        </Alert>
      )}

      {/* 1 Aktivitäten */}
      <Card sx={sectionCardSx}>
        <Box sx={protocolSectionHeadSx(0)}>
          <Chip label="1" size="small" sx={protocolStepBadgeSx(0)} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: protocolPalette.deep }}>
            Aktivitäten, Fotos & Vibe
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
          <Box sx={fullGrid2}>
            {activities.map((activity, index) => (
              <Box key={`act-${index}`} sx={protocolActivityCardSx(index)}>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', minWidth: 0, width: '100%' }}>
                  {activity.imageDataUrl ? (
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                      <Box component="img" src={activity.imageDataUrl} alt="" sx={activityThumbSx} />
                      <Tooltip title="Foto entfernen">
                        <IconButton
                          onClick={() => updateActivity(index, { imageDataUrl: undefined })}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            ...compactIconBtnSx,
                            width: 24,
                            height: 24,
                            minWidth: 24,
                            bgcolor: 'rgba(255,255,255,0.95)',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Tooltip title="Foto">
                      <IconButton
                        component="label"
                        aria-label="Foto hinzufügen"
                        sx={{
                          ...compactIconBtnSx,
                          width: 88,
                          height: 66,
                          minWidth: 88,
                          borderRadius: 1,
                          border: '1px dashed',
                          borderColor: 'divider',
                          bgcolor: 'rgba(25, 118, 210, 0.06)',
                          color: protocolPalette.accent1,
                          flexShrink: 0,
                          '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.12)' },
                        }}
                      >
                        <PhotoCameraIcon sx={{ fontSize: 22 }} />
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(e) => onPickImage(index, e.target.files?.[0])}
                        />
                      </IconButton>
                    </Tooltip>
                  )}
                  <TextField
                    value={activity.content}
                    onChange={(e) => updateActivity(index, { content: e.target.value })}
                    multiline
                    minRows={2}
                    fullWidth
                    size="small"
                    placeholder={`Aktivität ${index + 1} …`}
                    sx={{ flex: 1, minWidth: 0, ...protocolFieldSx }}
                  />
                  {activities.length > 1 && (
                    <Tooltip title="Entfernen">
                      <IconButton
                        onClick={() => onActivitiesChange(activities.filter((_, i) => i !== index))}
                        aria-label="Aktivität entfernen"
                        sx={{ ...compactIconBtnSx, border: '1px solid', borderColor: 'divider', bgcolor: 'white', flexShrink: 0 }}
                      >
                        <DeleteOutlineIcon sx={compactIconSx} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {activity.content.trim() && (
                  <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: protocolPalette.textPrimary, display: 'block', mb: 0.5 }}>
                      {ACTIVITY_RATING_PROMPTS[index % ACTIVITY_RATING_PROMPTS.length]}
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(3, minmax(0, 1fr))',
                          sm: 'repeat(5, minmax(0, 1fr))',
                        },
                        gap: 0.5,
                        width: '100%',
                      }}
                    >
                      {ACTIVITY_VIBE_OPTIONS.map((vibe) => {
                        const selected = activity.activityRating === vibe.score;
                        return (
                          <Chip
                            key={vibe.score}
                            size="small"
                            label={`${vibe.emoji} ${vibe.label}`}
                            onClick={() => updateActivity(index, { activityRating: vibe.score })}
                            sx={protocolVibeChipSx(selected, vibe.score)}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
          <Tooltip title="Weitere Aktivität">
            <IconButton
              onClick={() => onActivitiesChange([...activities, emptyActivity()])}
              sx={{
                mt: 1,
                ...compactIconBtnSx,
                border: '1px dashed',
                borderColor: 'divider',
                color: protocolPalette.primary,
              }}
            >
              <AddIcon sx={compactIconSx} />
            </IconButton>
          </Tooltip>
        </CardContent>
      </Card>

      {/* 2 Reflexion */}
      <Card sx={sectionCardSx}>
        <Box sx={protocolSectionHeadSx(1)}>
          <Chip label="2" size="small" sx={protocolStepBadgeSx(1)} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: protocolPalette.deep }}>
            Drei-Fragen-Methode
          </Typography>
        </Box>
        <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
          <Box sx={fullGrid3}>
            {(
              [
                ['learned', reflectionQuestions[0]],
                ['highlight', reflectionQuestions[1]],
                ['openQuestion', reflectionQuestions[2]],
              ] as const
            ).map(([key, question], i) => (
              <Box key={key}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: protocolPalette.textPrimary, display: 'block', mb: 0.5 }}>
                  Frage {i + 1}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, lineHeight: 1.35 }}>
                  {question}
                </Typography>
                <TextField
                  value={reflection[key]}
                  onChange={(e) => onReflectionChange({ ...reflection, [key]: e.target.value })}
                  multiline
                  minRows={3}
                  fullWidth
                  size="small"
                  placeholder="Antwort …"
                  sx={protocolFieldSx}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* 3 Bewertung */}
      <Card sx={sectionCardSx}>
        <Box sx={protocolSectionHeadSx(2)}>
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
            {ratings.map((rating, index) => (
              <Box
                key={rating.criterion}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: rating.score >= 1 ? 'rgba(141,110,99,0.4)' : 'rgba(141,110,99,0.15)',
                  bgcolor: rating.score >= 1 ? 'rgba(141,110,99,0.06)' : 'rgba(255,253,249,0.9)',
                  boxShadow: rating.score >= 1 ? '0 2px 8px rgba(93,64,55,0.08)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  minHeight: 72,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                  {rating.criterion}
                </Typography>
                <Rating
                  size="small"
                  value={rating.score}
                  onChange={(_, value) => {
                    const next = [...ratings];
                    next[index] = { ...next[index], score: value ?? 0 };
                    onRatingsChange(next);
                  }}
                  max={5}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        fullWidth
        disabled={submitting || !activitiesComplete || !reflectionFilled || !ratingsComplete}
        onClick={onSubmit}
        sx={protocolBtnSubmitSx}
      >
        {submitting ? 'Speichert…' : isResubmit ? 'Änderungen speichern' : 'Abgeben'}
      </Button>
    </Stack>
  );
}
