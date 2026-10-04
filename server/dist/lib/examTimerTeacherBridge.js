"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAM_TIMER_BRIDGE_MARKER = void 0;
exports.injectExamTimerTeacherBridge = injectExamTimerTeacherBridge;
/** Lehrer: Bearbeitungszeit in der linken Uhr (#timer) anpassen. */
exports.EXAM_TIMER_BRIDGE_MARKER = '__jmExamSetDurationFromMinutes';
function injectExamTimerTeacherBridge(html) {
    if (!html.includes('timeLeft') || html.includes(exports.EXAM_TIMER_BRIDGE_MARKER)) {
        return html;
    }
    let out = html;
    if (/\blet timeLeft = \d+ \* 60/.test(out)) {
        out = out.replace(/\blet timeLeft = (\d+) \* 60;([^\n]*)/, `var timeLeft = $1 * 60;$2
        window.__jmExamSetDurationFromMinutes = function ${exports.EXAM_TIMER_BRIDGE_MARKER}(minutes) {
          var m = Math.max(1, Math.min(599, parseInt(minutes, 10) || 0));
          if (!m) return;
          timeLeft = m * 60;
          var te = document.getElementById('timer');
          if (te) te.textContent = String(m).padStart(2, '0') + ':00';
          var aids = document.getElementById('aidsTime');
          if (aids) aids.textContent = m + ' Min';
        };`);
    }
    if (/\blet timerInterval = null/.test(out)) {
        out = out.replace(/\blet timerInterval = null;/, `var timerInterval = null;
        window.__jmPauseExamTimerForEdit = function() {
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
        };`);
    }
    return out;
}
//# sourceMappingURL=examTimerTeacherBridge.js.map