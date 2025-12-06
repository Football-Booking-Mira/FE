// CẤU HÌNH KHUNG GIỜ
export const START_HOUR = 6;
export const SLOT_DURATION = 60;
export const BREAK_DURATION = 15;
export const END_HOUR = 22;

export const minToTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const timeToMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const generateTimeSlots = () => {
    const slots: { start: string; end: string }[] = [];
    let current = START_HOUR * 60;
    const endDay = END_HOUR * 60;

    while (current + SLOT_DURATION <= endDay) {
        const start = minToTime(current);
        const end = minToTime(current + SLOT_DURATION);
        slots.push({ start, end });
        current += SLOT_DURATION + BREAK_DURATION;
    }
    return slots;
};

export const TIME_SLOTS = generateTimeSlots();

export const countSlotsInRange = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startMin = timeToMin(start);
    const endMin = timeToMin(end);

    return TIME_SLOTS.filter((slot) => {
        const s = timeToMin(slot.start);
        const e = timeToMin(slot.end);
        return s >= startMin && e <= endMin;
    }).length;
};

export const getBreakMinutes = (start: string, end: string) => {
    const slotCount = countSlotsInRange(start, end);
    if (slotCount <= 1) return 0;
    return (slotCount - 1) * BREAK_DURATION;
};
