/**
 * Converts a percentage score to a German grade according to the specified scale
 * @param percentage - The percentage score (0-100)
 * @returns The German grade (1.0 to 6.0)
 */
export function percentageToGrade(percentage: number): number {
  if (percentage >= 95.0) return 1.0;
  if (percentage >= 90.0) return 1.3;
  if (percentage >= 85.0) return 1.7;
  if (percentage >= 80.0) return 2.0;
  if (percentage >= 75.0) return 2.3;
  if (percentage >= 70.0) return 2.7;
  if (percentage >= 65.0) return 3.0;
  if (percentage >= 60.0) return 3.3;
  if (percentage >= 55.0) return 3.7;
  if (percentage >= 50.0) return 4.0;
  if (percentage >= 45.0) return 4.3;
  if (percentage >= 40.0) return 4.7;
  if (percentage >= 35.0) return 5.0;
  if (percentage >= 20.0) return 5.3;
  return 6.0; // unter 20.0%
}

/**
 * Gets the grade range for a given grade
 * @param grade - The German grade
 * @returns The percentage range as a string
 */
export function getGradeRange(grade: number): string {
  switch (grade) {
    case 1.0: return "100,0 – 95,0 %";
    case 1.3: return "94,9 – 90,0 %";
    case 1.7: return "89,9 – 85,0 %";
    case 2.0: return "84,9 – 80,0 %";
    case 2.3: return "79,9 – 75,0 %";
    case 2.7: return "74,9 – 70,0 %";
    case 3.0: return "69,9 – 65,0 %";
    case 3.3: return "64,9 – 60,0 %";
    case 3.7: return "59,9 – 55,0 %";
    case 4.0: return "54,9 – 50,0 %";
    case 4.3: return "49,9 – 45,0 %";
    case 4.7: return "44,9 – 40,0 %";
    case 5.0: return "39,9 – 35,0 %";
    case 5.3: return "34,9 – 20,0 %";
    case 6.0: return "unter 20,0 %";
    default: return "unbekannt";
  }
}
