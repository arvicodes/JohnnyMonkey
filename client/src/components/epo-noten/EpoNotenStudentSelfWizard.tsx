import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { EpoNotenCategoryGrid } from './EpoNotenCategoryGrid';
import { EpoNotenGradeTable } from './EpoNotenGradeTable';
import { epoNotenCardSx, epoNotenPalette } from './epoNotenUi';
import {
  EPO_NOTEN_STUDENT_CATEGORIES,
  gradeFromTotalPoints,
  minPointsThresholdForTotal,
  allCategoriesSelected,
  sumCategoryScores,
} from '../../lib/epoNotenShared';

type WizardStep = 1 | 2 | 3 | 'done';

type Props = {
  locked: boolean;
  submitting: boolean;
  suggestedGrade: string;
  justification: string;
  selfScores: number[];
  selfGradeFromTable: string;
  onSuggestedGradeChange: (v: string) => void;
  onJustificationChange: (v: string) => void;
  onSelfScoresChange: (v: number[]) => void;
  onSelfGradeFromTableChange: (v: string) => void;
  onSubmit: () => Promise<void>;
  startAtDone?: boolean;
};

export function EpoNotenStudentSelfWizard({
  locked,
  submitting,
  suggestedGrade,
  justification,
  selfScores,
  onSuggestedGradeChange,
  onJustificationChange,
  onSelfScoresChange,
  onSelfGradeFromTableChange,
  onSubmit,
  startAtDone,
}: Props) {
  const [step, setStep] = useState<WizardStep>(startAtDone ? 'done' : 1);
  const [showCategories, setShowCategories] = useState(false);
  const [animTotal, setAnimTotal] = useState(0);
  const [highlightMin, setHighlightMin] = useState<number | null>(null);
  const [tableVisible, setTableVisible] = useState(false);
  const [gradeVisible, setGradeVisible] = useState(false);
  const [animRunning, setAnimRunning] = useState(false);
  const submitStarted = useRef(false);

  const totalTarget = sumCategoryScores(selfScores);
  const readOnly = locked || step === 'done' || animRunning;

  const pointsShown =
    step === 'done' ? totalTarget : step === 3 ? animTotal : allCategoriesSelected(selfScores) ? totalTarget : null;

  const gradeForPoints = (pts: number) => gradeFromTotalPoints(pts);

  const applyDoneEvaluation = useCallback(
    (pts: number) => {
      setAnimTotal(pts);
      setTableVisible(true);
      setHighlightMin(minPointsThresholdForTotal(pts));
      setGradeVisible(true);
    },
    [],
  );

  useEffect(() => {
    if (startAtDone || step === 'done') {
      applyDoneEvaluation(totalTarget);
    }
  }, [startAtDone, step, totalTarget, applyDoneEvaluation]);

  useEffect(() => {
    if (startAtDone) {
      setStep('done');
      setShowCategories(true);
      submitStarted.current = true;
    }
  }, [startAtDone]);

  const runCalculationAnimation = useCallback(async () => {
    if (locked) return;
    setAnimRunning(true);
    setAnimTotal(0);
    setHighlightMin(null);
    setTableVisible(false);
    setGradeVisible(false);

    const scores = selfScores.map((s) => Math.min(3, Math.max(0, Math.round(s))));
    let running = 0;
    for (let i = 0; i < scores.length; i += 1) {
      await new Promise((r) => setTimeout(r, 380));
      running += scores[i];
      setAnimTotal(running);
    }
    await new Promise((r) => setTimeout(r, 400));

    setTableVisible(true);
    await new Promise((r) => setTimeout(r, 350));

    const minPts = minPointsThresholdForTotal(running);
    setHighlightMin(minPts);
    await new Promise((r) => setTimeout(r, 700));

    setGradeVisible(true);
    const g = gradeForPoints(running);
    onSelfGradeFromTableChange(g);
    await new Promise((r) => setTimeout(r, 600));

    setAnimRunning(false);
    if (!submitStarted.current) {
      submitStarted.current = true;
      await onSubmit();
    }
    setStep('done');
  }, [locked, onSelfGradeFromTableChange, onSubmit, selfScores]);

  const goNext = async () => {
    if (step === 1) {
      setShowCategories(true);
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      void runCalculationAnimation();
    }
  };

  const goBack = () => {
    if (animRunning) return;
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const canNextStep1 = suggestedGrade.trim().length > 0 && justification.trim().length > 0;
  const canNextStep2 = !animRunning && allCategoriesSelected(selfScores);

  const evaluationPoints = step === 'done' ? totalTarget : animTotal;
  const evaluationGrade = gradeForPoints(evaluationPoints);

  return (
    <Card sx={epoNotenCardSx}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
            Deine Selbsteinschätzung
            {step !== 'done' && step !== 3 && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Schritt {step} von 3
              </Typography>
            )}
          </Typography>

          {(step === 1 || step === 2 || step === 3 || step === 'done') && (
            <Stack spacing={1.25}>
              <TextField
                label="Notenvorschlag für deine aktuelle EPO-Note"
                value={suggestedGrade}
                onChange={(e) => onSuggestedGradeChange(e.target.value)}
                disabled={readOnly}
                fullWidth
                size="small"
              />
              <TextField
                label="Kurze Begründung"
                value={justification}
                onChange={(e) => onJustificationChange(e.target.value)}
                disabled={readOnly}
                multiline
                minRows={2}
                fullWidth
                size="small"
              />
            </Stack>
          )}

          <Collapse in={showCategories || step === 2 || step === 3 || step === 'done'} unmountOnExit={false}>
            <Box sx={{ pt: 1 }}>
              {(step === 2 || step === 3 || step === 'done') && (
                <Stack spacing={0}>
                  <EpoNotenCategoryGrid
                    categories={EPO_NOTEN_STUDENT_CATEGORIES}
                    scores={selfScores}
                    onChange={onSelfScoresChange}
                    readOnly={readOnly || step !== 2}
                  />

                  <Box sx={{ textAlign: 'right', mt: 1.25, pr: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Gesamtpunktzahl
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 900,
                        color: epoNotenPalette.primary,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.1,
                        transition: 'transform 0.2s ease',
                        transform: animRunning ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      {pointsShown === null ? '—' : pointsShown}
                    </Typography>
                    {step === 2 && !allCategoriesSelected(selfScores) && (
                      <Typography variant="caption" color="text.secondary">
                        In jeder Zeile einen Wert wählen
                      </Typography>
                    )}
                  </Box>

                  <Collapse in={tableVisible}>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <EpoNotenGradeTable
                        highlightMinPoints={
                          highlightMin ?? (step === 'done' ? minPointsThresholdForTotal(totalTarget) : null)
                        }
                        pulseGrade={gradeVisible || step === 'done' ? evaluationGrade : null}
                      />
                    </Box>
                  </Collapse>

                  <Collapse in={gradeVisible || step === 'done'}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="flex-end"
                      spacing={0.75}
                      sx={{ mt: 1.5, pr: 0.5 }}
                    >
                      <ArrowDownwardIcon sx={{ color: epoNotenPalette.accent, fontSize: 28 }} />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Note aus Tabelle
                        </Typography>
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 900,
                            color: epoNotenPalette.accent,
                            lineHeight: 1.1,
                            animation: gradeVisible ? 'epoGradePop 0.45s ease' : 'none',
                            '@keyframes epoGradePop': {
                              '0%': { transform: 'scale(0.88)', opacity: 0.35 },
                              '100%': { transform: 'scale(1)', opacity: 1 },
                            },
                          }}
                        >
                          {evaluationGrade}
                        </Typography>
                      </Box>
                    </Stack>
                  </Collapse>
                </Stack>
              )}
            </Box>
          </Collapse>

          {step === 'done' && (
            <Alert severity="success" sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Das ist deine Selbsteinschätzung. Warte auf die Einschätzung deiner Lehrkraft.
              </Typography>
            </Alert>
          )}

          {step !== 'done' && step !== 3 && (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {step > 1 && (
                <Button size="small" onClick={goBack} disabled={animRunning || submitting}>
                  Zurück
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                onClick={() => void goNext()}
                disabled={
                  submitting || animRunning || (step === 1 && !canNextStep1) || (step === 2 && !canNextStep2)
                }
              >
                {step === 2 ? 'Weiter zur Auswertung' : 'Weiter'}
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
