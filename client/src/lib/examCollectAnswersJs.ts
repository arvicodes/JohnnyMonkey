/** Inline JS for KA/QZ HTML: collect all student answers including Zahlenstrahl hidden fields. */
export function examCollectAnswersJsSource(): string {
  return `
        function examEditableInputs() {
            return Array.from(document.querySelectorAll(
                'input[type="text"]:not([disabled]):not([readonly]), input[type="number"]:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), .exam-nl-fixed-input:not([disabled]):not([readonly])'
            )).filter(function (el) {
                return el.getClientRects && el.getClientRects().length > 0;
            });
        }
        function focusFirstExamInput() {
            var inputs = examEditableInputs();
            if (!inputs.length) return;
            var target = inputs.find(function (el) { return !String(el.value || '').trim(); }) || inputs[0];
            try {
                target.focus({ preventScroll: false });
                if (typeof target.select === 'function') target.select();
            } catch (e) {}
        }
        function setupExamTextInputFocusAndEnter() {
            examEditableInputs().forEach(function (input, index, all) {
                if (input.getAttribute('data-exam-enter-nav') === '1') return;
                input.setAttribute('data-exam-enter-nav', '1');
                input.addEventListener('keydown', function (e) {
                    if (e.key !== 'Enter' || e.isComposing) return;
                    e.preventDefault();
                    var list = examEditableInputs();
                    var i = list.indexOf(input);
                    var next = i >= 0 ? list[i + 1] : null;
                    if (next) {
                        next.focus();
                        if (typeof next.select === 'function') next.select();
                        return;
                    }
                    var btn = document.getElementById('submitBtnBottom');
                    if (btn && !btn.disabled) btn.click();
                });
            });
        }
        function flushExamNumberLineDrafts() {
            document.querySelectorAll('.exam-nl-fixed-input').forEach(function (inp) {
                var id = inp.getAttribute('data-answer-id');
                if (!id) return;
                var hidden = document.getElementById(id);
                if (hidden) hidden.value = (inp.value || '').trim();
            });
        }
        function collectExamAnswers() {
            flushExamNumberLineDrafts();
            const answers = {};
            document.querySelectorAll('input[type="text"], textarea, input[type="number"]').forEach(function (input) {
                const id = input.id;
                if (id) answers[id] = input.value || '';
            });
            document.querySelectorAll('input[type="hidden"][id^="a"]').forEach(function (input) {
                const id = input.id;
                if (id) answers[id] = input.value || '';
            });
            const radioNames = new Set();
            document.querySelectorAll('input[type="radio"]').forEach(function (radio) {
                if (radio.name) radioNames.add(radio.name);
            });
            radioNames.forEach(function (name) {
                const selected = document.querySelector('input[name="' + name + '"]:checked');
                if (selected) answers[name] = selected.value || '';
            });
            document.querySelectorAll('.exam-multi-select[data-answer-id]').forEach(function (wrap) {
                var id = wrap.getAttribute('data-answer-id');
                if (!id) return;
                var vals = [];
                wrap.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
                    vals.push(cb.value || '');
                });
                vals = vals.filter(Boolean).sort();
                var joined = vals.join('|');
                var hidden = document.getElementById(id);
                if (hidden) hidden.value = joined;
                answers[id] = joined;
            });
            return answers;
        }`;
}
