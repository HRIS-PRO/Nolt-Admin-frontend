import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    format,
    isSameDay,
    isSameMonth,
    isAfter,
    isBefore,
    isWithinInterval,
    startOfDay,
    endOfDay,
    subDays,
    subWeeks,
    startOfYear,
} from 'date-fns';

interface DateRangePickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (start: Date | null, end: Date | null) => void;
    isDark?: boolean;
}

const PRESET_RANGES = [
    { label: 'Today', getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
    { label: 'Yesterday', getRange: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
    { label: 'This Week', getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfDay(new Date()) }) },
    { label: 'Last 7 Days', getRange: () => ({ start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) }) },
    { label: 'Last 30 Days', getRange: () => ({ start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) }) },
    { label: 'This Month', getRange: () => ({ start: startOfMonth(new Date()), end: endOfDay(new Date()) }) },
    { label: 'Last Month', getRange: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: 'This Year', getRange: () => ({ start: startOfYear(new Date()), end: endOfDay(new Date()) }) },
];

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange, isDark = true }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(startDate || new Date());
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [selectingStart, setSelectingStart] = useState(true);
    const [tempStart, setTempStart] = useState<Date | null>(startDate);
    const [tempEnd, setTempEnd] = useState<Date | null>(endDate);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Sync temp state when props change externally
    useEffect(() => {
        setTempStart(startDate);
        setTempEnd(endDate);
    }, [startDate, endDate]);

    const daysInMonth = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
        const days: Date[] = [];
        let current = start;
        while (!isAfter(current, end)) {
            days.push(current);
            current = addDays(current, 1);
        }
        return days;
    }, [viewMonth]);

    const handleDayClick = (day: Date) => {
        if (selectingStart) {
            setTempStart(day);
            setTempEnd(null);
            setSelectingStart(false);
        } else {
            if (tempStart && isBefore(day, tempStart)) {
                // Swap: clicked before start, so restart
                setTempStart(day);
                setTempEnd(null);
                setSelectingStart(false);
            } else {
                setTempEnd(day);
                setSelectingStart(true);
                // Auto-apply
                onChange(tempStart, day);
                setIsOpen(false);
            }
        }
    };

    const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
        const { start, end } = preset.getRange();
        setTempStart(start);
        setTempEnd(end);
        setViewMonth(start);
        onChange(start, end);
        setIsOpen(false);
    };

    const handleClear = () => {
        setTempStart(null);
        setTempEnd(null);
        setSelectingStart(true);
        onChange(null, null);
        setIsOpen(false);
    };

    const isInRange = (day: Date) => {
        const effectiveEnd = tempEnd || hoverDate;
        if (!tempStart || !effectiveEnd) return false;
        const [rangeStart, rangeEnd] = isBefore(effectiveEnd, tempStart) ? [effectiveEnd, tempStart] : [tempStart, effectiveEnd];
        return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
    };

    const isRangeStart = (day: Date) => tempStart && isSameDay(day, tempStart);
    const isRangeEnd = (day: Date) => {
        const effectiveEnd = tempEnd || (hoverDate && !selectingStart ? hoverDate : null);
        return effectiveEnd && isSameDay(day, effectiveEnd);
    };

    const displayText = startDate && endDate
        ? `${format(startDate, 'dd MMM yyyy')} — ${format(endDate, 'dd MMM yyyy')}`
        : startDate
            ? `${format(startDate, 'dd MMM yyyy')} — Select end`
            : 'Select date range';

    const bg = isDark ? 'bg-[#111827]' : 'bg-white';
    const border = isDark ? 'border-slate-800/60' : 'border-slate-200';
    const textPrimary = isDark ? 'text-white' : 'text-slate-900';
    const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
    const textMuted = isDark ? 'text-slate-600' : 'text-slate-300';
    const hoverBg = isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100';
    const popoverBg = isDark ? 'bg-[#0a101f]' : 'bg-white';
    const dayHoverBg = isDark ? 'hover:bg-[#1e293b]' : 'hover:bg-slate-50';
    const rangeBg = isDark ? 'bg-[#fbbf24]/10' : 'bg-amber-50';

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border transition-all ${bg} ${border} ${hoverBg} group`}
            >
                <span className={`material-symbols-outlined text-lg ${isDark ? 'text-[#fbbf24]' : 'text-amber-500'}`}>
                    calendar_month
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-wide ${startDate ? textPrimary : textSecondary}`}>
                    {displayText}
                </span>
                <span className={`material-symbols-outlined text-sm transition-transform ${isOpen ? 'rotate-180' : ''} ${textSecondary}`}>
                    expand_more
                </span>
            </button>

            {/* Popover */}
            {isOpen && (
                <div className={`absolute right-0 top-full mt-2 z-50 ${popoverBg} border ${border} rounded-2xl shadow-2xl overflow-hidden flex animate-in fade-in slide-in-from-top-2 duration-200`}
                    style={{ minWidth: '580px' }}
                >
                    {/* Presets Panel */}
                    <div className={`w-[160px] p-3 border-r ${border} flex flex-col gap-1 shrink-0`}>
                        <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${textSecondary} px-2 mb-2`}>Quick Ranges</p>
                        {PRESET_RANGES.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => handlePresetClick(preset)}
                                className={`text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${textSecondary} ${dayHoverBg} ${isDark ? 'hover:text-[#fbbf24]' : 'hover:text-amber-600'}`}
                            >
                                {preset.label}
                            </button>
                        ))}
                        <div className="mt-auto pt-2 border-t border-dashed" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                            <button
                                onClick={handleClear}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-rose-400 hover:bg-rose-500/10`}
                            >
                                Clear Dates
                            </button>
                        </div>
                    </div>

                    {/* Calendar Panel */}
                    <div className="flex-1 p-4">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                                className={`size-8 rounded-lg flex items-center justify-center ${hoverBg} ${textSecondary} transition-colors`}
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <h3 className={`text-[11px] font-black uppercase tracking-[0.15em] ${textPrimary}`}>
                                {format(viewMonth, 'MMMM yyyy')}
                            </h3>
                            <button
                                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                                className={`size-8 rounded-lg flex items-center justify-center ${hoverBg} ${textSecondary} transition-colors`}
                            >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                                <div key={d} className={`text-center text-[9px] font-black uppercase tracking-widest py-2 ${textMuted}`}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7">
                            {daysInMonth.map((day, i) => {
                                const isCurrentMonth = isSameMonth(day, viewMonth);
                                const isStart = isRangeStart(day);
                                const isEnd = isRangeEnd(day);
                                const inRange = isInRange(day);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleDayClick(day)}
                                        onMouseEnter={() => !selectingStart && setHoverDate(day)}
                                        onMouseLeave={() => setHoverDate(null)}
                                        className={`
                                            relative size-9 flex items-center justify-center text-[11px] font-bold transition-all rounded-lg
                                            ${!isCurrentMonth ? textMuted + ' opacity-40' : ''}
                                            ${isStart || isEnd
                                                ? `${isDark ? 'bg-[#fbbf24] text-[#060b13]' : 'bg-amber-500 text-white'} font-black shadow-md`
                                                : inRange
                                                    ? `${rangeBg} ${isDark ? 'text-[#fbbf24]' : 'text-amber-700'}`
                                                    : `${isCurrentMonth ? textPrimary : ''} ${dayHoverBg}`
                                            }
                                            ${isToday && !isStart && !isEnd ? `ring-1 ${isDark ? 'ring-[#fbbf24]/30' : 'ring-amber-300'}` : ''}
                                        `}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary}`}>
                                {selectingStart ? '← Pick start date' : '→ Pick end date'}
                            </p>
                            {tempStart && !tempEnd && (
                                <button
                                    onClick={() => {
                                        // Apply single day
                                        onChange(tempStart, tempStart);
                                        setTempEnd(tempStart);
                                        setSelectingStart(true);
                                        setIsOpen(false);
                                    }}
                                    className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${isDark ? 'text-[#fbbf24] bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                                >
                                    Select Single Day
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
