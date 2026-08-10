"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_LABELS = exports.DEFAULT_JOHNNY_PERIOD_TIMES = void 0;
exports.parsePeriodTimes = parsePeriodTimes;
exports.periodTimesToJson = periodTimesToJson;
exports.getBerlinNow = getBerlinNow;
exports.parseTimeToMinutes = parseTimeToMinutes;
exports.berlinDateTime = berlinDateTime;
exports.DEFAULT_JOHNNY_PERIOD_TIMES = [
    { period: 1, start: '08:00', end: '08:45' },
    { period: 2, start: '08:45', end: '09:35' },
    { period: 3, start: '09:40', end: '10:25' },
    { period: 4, start: '10:45', end: '11:30' },
    { period: 5, start: '11:35', end: '12:15' },
    { period: 6, start: '12:15', end: '13:00' },
    { period: 7, start: '13:00', end: '13:45' },
    { period: 8, start: '13:45', end: '14:30' },
    { period: 9, start: '14:30', end: '15:15' },
    { period: 10, start: '15:15', end: '16:00' },
];
function parsePeriodTimes(json) {
    if (!json || json.trim() === '' || json.trim() === '[]') {
        return exports.DEFAULT_JOHNNY_PERIOD_TIMES;
    }
    try {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return exports.DEFAULT_JOHNNY_PERIOD_TIMES;
        }
        return parsed
            .map((p) => ({
            period: Number(p.period),
            start: String(p.start || '').trim(),
            end: String(p.end || '').trim(),
        }))
            .filter((p) => p.period >= 1 && p.start && p.end)
            .sort((a, b) => a.period - b.period);
    }
    catch {
        return exports.DEFAULT_JOHNNY_PERIOD_TIMES;
    }
}
function periodTimesToJson(periods) {
    return JSON.stringify(periods);
}
/** Europe/Berlin wall-clock parts for scheduling */
function getBerlinNow() {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'short',
    });
    const parts = fmt.formatToParts(new Date());
    const get = (type) => { var _a; return ((_a = parts.find((p) => p.type === type)) === null || _a === void 0 ? void 0 : _a.value) || ''; };
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    const weekday = get('weekday');
    const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    const dayOfWeek = weekdayMap[weekday] || 0;
    const hours = parseInt(get('hour'), 10);
    const minutes = parseInt(get('minute'), 10);
    return { date, dayOfWeek, hours, minutes, now: new Date() };
}
function parseTimeToMinutes(time) {
    const [h, m] = time.split(':').map((x) => parseInt(x, 10));
    return h * 60 + (m || 0);
}
function berlinDateTime(date, time) {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const target = `${date} ${time}:00`;
    for (let offsetHours = 0; offsetHours <= 3; offsetHours++) {
        const candidate = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute));
        const berlin = candidate.toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' });
        if (berlin === target)
            return candidate;
    }
    return new Date(`${date}T${time}:00+01:00`);
}
exports.DAY_LABELS = {
    1: 'Montag',
    2: 'Dienstag',
    3: 'Mittwoch',
    4: 'Donnerstag',
    5: 'Freitag',
};
//# sourceMappingURL=periodTimes.js.map