"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.examGradeNumericFromPoints = examGradeNumericFromPoints;
const gradeScale_1 = require("../lib/gradeScale");
/** Notenwert (Dezimal) aus erreichten Punkten — app-weite Prozentregel. */
function examGradeNumericFromPoints(achieved, maxPoints) {
    if (!maxPoints || maxPoints <= 0)
        return 0;
    return (0, gradeScale_1.scoreToGradeNumeric)(achieved, maxPoints);
}
//# sourceMappingURL=examGradeNumeric.js.map