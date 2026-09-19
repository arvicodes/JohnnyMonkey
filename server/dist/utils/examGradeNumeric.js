"use strict";
/** Notenwert (Dezimal) aus erreichten Punkten — analog client examGradeLabel.ts */
Object.defineProperty(exports, "__esModule", { value: true });
exports.examGradeNumericFromPoints = examGradeNumericFromPoints;
const EXAM_GRADE_NUMERIC_14 = {
    14: 1.0,
    13: 1.3,
    12: 1.7,
    11: 2.0,
    10: 2.3,
    9: 2.7,
    8: 3.0,
    7: 3.3,
    6: 3.7,
    5: 4.0,
    4: 4.3,
    3: 4.7,
    2: 5.0,
    1: 5.3,
    0: 6.0,
};
function examGradeNumericFromPoints(achieved, maxPoints) {
    var _a;
    if (!maxPoints || maxPoints <= 0)
        return 0;
    if (maxPoints === 14) {
        const idx = Math.max(0, Math.min(14, Math.round(achieved)));
        return (_a = EXAM_GRADE_NUMERIC_14[idx]) !== null && _a !== void 0 ? _a : 6.0;
    }
    const percentage = (achieved / maxPoints) * 100;
    if (percentage >= 95.0)
        return 1.0;
    if (percentage >= 90.0)
        return 1.3;
    if (percentage >= 85.0)
        return 1.7;
    if (percentage >= 80.0)
        return 2.0;
    if (percentage >= 75.0)
        return 2.3;
    if (percentage >= 70.0)
        return 2.7;
    if (percentage >= 65.0)
        return 3.0;
    if (percentage >= 60.0)
        return 3.3;
    if (percentage >= 55.0)
        return 3.7;
    if (percentage >= 50.0)
        return 4.0;
    if (percentage >= 45.0)
        return 4.3;
    if (percentage >= 40.0)
        return 4.7;
    if (percentage >= 35.0)
        return 5.0;
    if (percentage >= 20.0)
        return 5.3;
    return 6.0;
}
//# sourceMappingURL=examGradeNumeric.js.map