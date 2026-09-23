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
  /** Bereits abgegeben → direkt Abschlussansicht */
  startAtDone?: boolean;
};

export function EpoNotenStudentSelfWizard({
  locked,
  submitting,
  suggestedGrade,
  justification,
  selfScores,
  selfGradeFromTable,
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
  const [animGrade, setAnimGrade] = useState<string | null>(null);
  const [animRunning, setAnimRunning] = useState(false);
  const submitStarted = useRef(false);

  const totalTarget = sumCategoryScores(selfScores);
  const computedGrade = gradeFromTotalPoints(totalTarget);
  const readOnly = locked || step === 'done' || animRunning;

  useEffect(() => {
    if (step === 3 && locked) {
      setAnimTotal(totalTarget);
      setHighlightMin(minPointsThresholdForTotal(totalTarget));
      setAnimGrade(selfGradeFromTable || computedGrade);
    }
  }, [step, locked, totalTarget, selfGradeFromTable, computedGrade]);

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
    setAnimGrade(null);

    const scores = selfScores.map((s) => Math.min(3, Math.max(0, Math.round(s))));
    let running = 0;
    for (let i = 0; i < scores.length; i += 1) {
      await new Promise((r) => setTimeout(r, 380));
      running += scores[i];
      setAnimTotal(running);
    }
    await new Promise((r) => setTimeout(r, 450));

    const minPts = minPointsThresholdForTotal(running);
    setHighlightMin(minPts);
    await new Promise((r) => setTimeout(r, 600));
    const g = gradeFromTotalPoints(running);
    setAnimGrade(g);
    onSelfGradeFromTableChange(g);
    await new Promise((r) => setTimeout(r, 900));

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
      return;
    }
    if (step === 'done') return;
  };

  const goBack = () => {
    if (animRunning) return;
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 3) setStep(2);
    if (step === 'done' && locked) setStep(2);
  };

  const canNextStep1 = suggestedGrade.trim().length > 0 && justification.trim().length > 0;
  const canNextStep2 = !animRunning && allCategoriesSelected(selfScores);

  return (
    <Card sx={epoNotenCardSx}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
            Deine Selbsteinschätzung
            {step !== 'done' && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Schritt {step === 3 ? 3 : step} von 3
              </Typography>
            )}
          </Typography>

          {(step === 1 || step === 2 || step === 'done') && (
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

          <Collapse
            in={showCategories || step === 2 || step === 3 || step === 'done'}
            unmountOnExit={false}
          >
            <Box sx={{ pt: step === 2 || step === 3 || step === 'done' ? 1 : 0 }}>
              {(step === 2 || step === 3 || step === 'done') && (
                <>
                  <EpoNotenCategoryGrid
                    categories={EPO_NOTEN_STUDENT_CATEGORIES}
                    scores={selfScores}
                    onChange={onSelfScoresChange}
                    readOnly={readOnly || step !== 2}
                  />
                  {step === 2 && (
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>
                      Gesamtpunktzahl:{' '}
                      {allCategoriesSelected(selfScores) ? totalTarget : '—'}{' '}
                      {!allCategoriesSelected(selfScores) && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          (in jeder Zeile einen Wert wählen)
                        </Typography>
                      )}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Collapse>

          {(step === 3 || step === 'done') && (
            <Box sx={{ pt: 0.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Gesamtpunktzahl</Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      color: epoNotenPalette.primary,
                      fontVariantNumeric: 'tabular-nums',
                      transition: 'transform 0.2s ease',
                      transform: animRunning ? 'scale(1.06)' : 'scale(1)',
                    }}
                  >
                    {step === 'done' ? totalTarget : animTotal}
                  </Typography>
                </Box>
                <EpoNotenGradeTable
                  highlightMinPoints={step === 'done' ? minPointsThresholdForTotal(totalTarget) : highlightMin}
                  pulseGrade={step === 'done' ? selfGradeFromTable || computedGrade : animGrade}
                />
                <Box>
                  <Typography variant="body2" color="text.secondary">Note aus Tabelle</Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      color: epoNotenPalette.accent,
                      ...(animGrade && {
                        animation: 'epoGradePop 0.5s ease',
                        '@keyframes epoGradePop': {
                          '0%': { transform: 'scale(0.85)', opacity: 0.3 },
                          '100%': { transform: 'scale(1)', opacity: 1 },
                        },
                      }),
                    }}
                  >
                    {step === 'done' ? selfGradeFromTable || computedGrade : animGrade || '…'}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}

          {step === 'done' && (
            <Alert severity="success" sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Das ist deine Selbsteinschätzung. Warte auf die Einschätzung deiner Lehrkraft.
              </Typography>
            </Alert>
          )}

          {step !== 'done' && (
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
                  submitting ||
                  animRunning ||
                  (step === 1 && !canNextStep1) ||
                  (step === 2 && !canNextStep2)
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
