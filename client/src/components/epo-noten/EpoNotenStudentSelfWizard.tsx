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
import {
  epoNotenBigNumberSx,
  epoNotenCardSx,
  epoNotenKidTextFieldSx,
  epoNotenPalette,
  epoNotenSectionTitleSx,
  epoNotenStudentSurfaceSx,
  epoNotenCompactBtnSx,
} from './epoNotenUi';
import {
  EPO_NOTEN_STUDENT_CATEGORIES,
  minPointsThresholdForTotal,
  rasterResultFromTotal,
  epoSummaryHeadline,
  allCategoriesSelected,
  isValidSuggestedGrade,
  sumCategoryScores,
  type EpoNotenAssessmentMode,
} from '../../lib/epoNotenShared';

type WizardStep = 1 | 2 | 3 | 'done';

type Props = {
  locked: boolean;
  submitting: boolean;
  assessmentMode: EpoNotenAssessmentMode;
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
  assessmentMode,
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
  const [evaluationReady, setEvaluationReady] = useState(false);
  const submitStarted = useRef(false);
  const tableAnchorRef = useRef<HTMLDivElement | null>(null);
  const totalTarget = sumCategoryScores(selfScores);
  const readOnly = locked || step === 'done';

  const pointsShown =
    step === 'done' || step === 3 || evaluationReady
      ? totalTarget
      : allCategoriesSelected(selfScores)
        ? totalTarget
        : null;

  const gradeForPoints = (pts: number) => rasterResultFromTotal(assessmentMode, pts);

  const applyDoneEvaluation = useCallback(
    (pts: number) => {
      setEvaluationReady(true);
      onSelfGradeFromTableChange(rasterResultFromTotal(assessmentMode, pts));
    },
    [assessmentMode, onSelfGradeFromTableChange],
  );

  useEffect(() => {
    if (startAtDone || step === 'done') {
      setEvaluationReady(true);
    }
  }, [startAtDone, step]);

  useEffect(() => {
    if (startAtDone) {
      setStep('done');
      setShowCategories(true);
      submitStarted.current = true;
    }
  }, [startAtDone]);

  useEffect(() => {
    if (!evaluationReady) return;
    const t = window.setTimeout(() => {
      tableAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [evaluationReady]);

  const finishEvaluation = useCallback(async () => {
    if (locked) return;
    const pts = sumCategoryScores(selfScores);
    applyDoneEvaluation(pts);
    setStep(3);
    if (!submitStarted.current) {
      submitStarted.current = true;
      await onSubmit();
    }
    setStep('done');
  }, [applyDoneEvaluation, locked, onSubmit, selfScores]);

  const goNext = async () => {
    if (step === 1) {
      setShowCategories(true);
      setStep(2);
      return;
    }
    if (step === 2) {
      void finishEvaluation();
    }
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const canNextStep1 =
    isValidSuggestedGrade(assessmentMode, suggestedGrade) && justification.trim().length > 0;
  const canNextStep2 = allCategoriesSelected(selfScores);

  const evaluationPoints = totalTarget;
  const evaluationGrade = gradeForPoints(evaluationPoints);
  const evaluationPhase = evaluationReady || step === 'done' || step === 3;

  return (
    <Card sx={{ ...epoNotenCardSx, ...epoNotenStudentSurfaceSx }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 }, '&:last-child': { pb: { xs: 2, sm: 2.75 } } }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={epoNotenSectionTitleSx}>
            Deine Selbsteinschätzung
            {step !== 'done' && step !== 3 && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Schritt {step} von 3
              </Typography>
            )}
          </Typography>

          {(step === 1 || step === 2 || step === 3 || step === 'done') && (
            <Stack spacing={0} sx={{ width: '100%' }}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  Noteneinschätzung
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                    ({assessmentMode === 'mss' ? 'MSS 0–15' : 'Note'} — von Lehrkraft festgelegt)
                  </Typography>
                </Typography>
                <TextField
                  label={
                    assessmentMode === 'mss'
                      ? 'Deine Einschätzung in MSS-Punkten'
                      : 'Deine Einschätzung als Note'
                  }
                  placeholder={assessmentMode === 'mss' ? 'z. B. 11' : 'z. B. 2+ oder 3−'}
                  value={suggestedGrade}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (assessmentMode === 'mss') {
                      onSuggestedGradeChange(raw.replace(/[^\d]/g, '').slice(0, 2));
                      return;
                    }
                    onSuggestedGradeChange(raw);
                  }}
                  disabled={readOnly}
                  fullWidth
                  inputMode={assessmentMode === 'mss' ? 'numeric' : 'text'}
                  helperText={
                    assessmentMode === 'mss'
                      ? 'Ganzzahl von 0 bis 15'
                      : 'Schulnote, z. B. 1, 2+, 3−'
                  }
                  error={
                    suggestedGrade.trim().length > 0 && !isValidSuggestedGrade(assessmentMode, suggestedGrade)
                  }
                  sx={epoNotenKidTextFieldSx}
                />
              </Box>
              <TextField
                label="Erkläre deine Einschätzung kurz in ein paar Sätzen"
                value={justification}
                onChange={(e) => onJustificationChange(e.target.value)}
                disabled={readOnly}
                multiline
                minRows={3}
                fullWidth
                sx={{ ...epoNotenKidTextFieldSx, mt: 4 }}
              />
            </Stack>
          )}

          <Collapse in={showCategories || step === 2 || step === 3 || step === 'done'} unmountOnExit={false}>
            <Box sx={{ pt: 1 }}>
              {(step === 2 || step === 3 || step === 'done') && (
                <Stack spacing={0}>
                  <EpoNotenCategoryGrid
                    radioGroupId="self-wizard"
                    categories={EPO_NOTEN_STUDENT_CATEGORIES}
                    scores={selfScores}
                    onChange={onSelfScoresChange}
                    readOnly={readOnly || step !== 2}
                  />

                  {!evaluationPhase && (
                    <Box sx={{ textAlign: 'right', mt: 1.5, pr: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                        Gesamtpunktzahl
                      </Typography>
                      <Typography
                        variant="h2"
                        sx={{
                          ...epoNotenBigNumberSx,
                          fontSize: { xs: '2.35rem', sm: '2.75rem' },
                          transition: 'transform 0.2s ease',
                          transform: 'scale(1)',
                        }}
                      >
                        {pointsShown === null ? '—' : pointsShown}
                      </Typography>
                      {step === 2 && !allCategoriesSelected(selfScores) && (
                        <Typography variant="body2" color="text.secondary">
                          In jeder Zeile einen Wert wählen
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Collapse in={evaluationPhase}>
                    <Box ref={tableAnchorRef} sx={{ mt: 2, width: '100%', scrollMarginTop: 48 }}>
                      <EpoNotenGradeTable
                        mode={assessmentMode}
                        highlightMinPoints={
                          assessmentMode === 'note' ? minPointsThresholdForTotal(totalTarget) : null
                        }
                        highlightExactPoints={assessmentMode === 'mss' ? totalTarget : null}
                      />
                    </Box>
                  </Collapse>

                  <Collapse in={evaluationPhase}>
                    <Box sx={{ mt: 2.5, textAlign: 'right', pr: 0.5, scrollMarginBottom: 100 }}>
                      {assessmentMode === 'note' && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Gesamtpunktzahl (Raster):{' '}
                          <Typography component="span" variant="body2" sx={{ fontWeight: 800, color: epoNotenPalette.textPrimary }}>
                            {evaluationPoints}
                          </Typography>
                        </Typography>
                      )}
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mt: assessmentMode === 'mss' ? 0 : 2, fontWeight: 700, fontSize: '1rem' }}
                      >
                        {assessmentMode === 'mss' ? 'Deine MSS-Punkte' : 'Note aus Tabelle'}
                      </Typography>
                      <Typography
                        component="p"
                        sx={{
                          fontWeight: 900,
                          color: epoNotenPalette.accent,
                          lineHeight: 1.05,
                          fontSize: { xs: '3.25rem', sm: '4rem' },
                          mt: 0.5,
                        }}
                      >
                        {epoSummaryHeadline(assessmentMode, evaluationGrade, evaluationPoints)}
                      </Typography>
                    </Box>
                  </Collapse>
                  {evaluationPhase && <Box sx={{ height: { xs: 80, sm: 100 } }} aria-hidden />}
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
                <Button size="small" onClick={goBack} disabled={submitting} sx={epoNotenCompactBtnSx}>
                  Zurück
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                onClick={() => void goNext()}
                disabled={
                  submitting || (step === 1 && !canNextStep1) || (step === 2 && !canNextStep2)
                }
                sx={epoNotenCompactBtnSx}
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
