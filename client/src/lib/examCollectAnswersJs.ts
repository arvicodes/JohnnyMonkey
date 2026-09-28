/** Inline JS for KA/QZ HTML: collect all student answers including Zahlenstrahl hidden fields. */
export function examCollectAnswersJsSource(): string {
  return `
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
