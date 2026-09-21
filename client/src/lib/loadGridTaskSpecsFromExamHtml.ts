import {
  createBlankExamGridTask,
  demoNatuerlicheZahlenTask1,
  extractExamTaskHtml,
  listGridTaskNumbersInExamHtml,
  parseExamGridTaskFromExamHtml,
  type ExamGridTaskSpec,
} from './examGridTaskBuilder';

/** Alle Raster-Aufgaben aus der Prüfungs-HTML laden (oder eine leere/Demo-Startaufgabe). */
export function loadGridTaskSpecsFromExamHtml(
  fullHtml: string,
  fallbackTaskNumber: number,
): ExamGridTaskSpec[] {
  const nums = listGridTaskNumbersInExamHtml(fullHtml);
  if (nums.length > 0) {
    const specs = nums
      .map((n) => parseExamGridTaskFromExamHtml(fullHtml, n))
      .filter((s): s is ExamGridTaskSpec => Boolean(s));
    if (specs.length > 0) return specs;
  }

  const single = parseExamGridTaskFromExamHtml(fullHtml, fallbackTaskNumber);
  if (single) return [single];

  if (extractExamTaskHtml(fullHtml, fallbackTaskNumber)?.includes('exam-task-grid')) {
    return [createBlankExamGridTask(fallbackTaskNumber)];
  }

  if (!extractExamTaskHtml(fullHtml, fallbackTaskNumber)) {
    return [{ ...demoNatuerlicheZahlenTask1(), taskNumber: fallbackTaskNumber }];
  }

  return [createBlankExamGridTask(fallbackTaskNumber)];
}
