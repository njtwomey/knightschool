import { ScatterChart, type ScatterSeriesOption } from 'echarts/charts';
import {
  CalendarComponent,
  TooltipComponent,
  type CalendarComponentOption,
  type TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { cssColour } from './css-colour';
import { MODE_INFO, MODE_VAR, type ModeId } from './modes';

echarts.use([ScatterChart, CalendarComponent, TooltipComponent, SVGRenderer]);

type Option = echarts.ComposeOption<ScatterSeriesOption | CalendarComponentOption | TooltipComponentOption>;

/** One local day of graded answers (any mode except Learn with every move shown). */
export type ActivityDay = {
  /** The learner's local day, `YYYY-MM-DD`. */
  date: string;
  answers: number;
  right?: number;
  stepsKnown?: number;
  /** The mode answered most that day, for the split view. */
  topMode?: ModeId;
};

export type ActivityCalendarProps = {
  days: ActivityDay[];
  /** 13 (Today, a phone), 26 (Stats), 52 (Stats on a wide screen). */
  weeks?: 13 | 26 | 52;
  /** The learner's today, `YYYY-MM-DD`; the bottom right of the grid. */
  today: string;
  /** Days before this are drawn faintly, never as misses. Defaults to the first day with answers. */
  firstAnswer?: string;
  /** Tint each square with the colour of the mode answered most that day. */
  split?: boolean;
  /** The streak summary under the grid; left out with `progress.showStreak` off. */
  streak?: { days: number; longest: number };
  /** 0 for Sunday, 1 for Monday; from the browser's locale when not given. */
  firstDay?: 0 | 1;
  /** Answers at which a square turns to its second, third and fourth shade. */
  steps?: [number, number, number];
  /** Stats filtered to that day. */
  onSelectDay?: (date: string) => void;
  className?: string;
};

const DAY_MS = 86_400_000;
const STEPS: [number, number, number] = [1, 15, 40];
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Noon, so a change of clocks never moves a day. */
const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12);
};
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const longDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');

function localeFirstDay(): 0 | 1 {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const first = locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay ?? 1;
    return first === 7 ? 0 : 1;
  } catch {
    return 1;
  }
}

function describe(day: ActivityDay | undefined, date: Date, before: boolean): string {
  const when = longDate(date);
  if (before) return `${when}: before your first answer`;
  if (!day?.answers) return `${when}: no practice`;
  const right = day.right !== undefined ? `, ${day.right} right` : '';
  const steps = day.stepsKnown ? `; ${day.stepsKnown} ${day.stepsKnown === 1 ? 'step' : 'steps'} known` : '';
  return `${when}: ${day.answers} ${day.answers === 1 ? 'answer' : 'answers'}${right}${steps}`;
}

/** Watches the theme class on <html>, so the chart's colours follow light and dark. */
function useThemeKey() {
  const [key, setKey] = useState(() => document.documentElement.className);
  useEffect(() => {
    const observer = new MutationObserver(() => setKey(document.documentElement.className));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => observer.disconnect();
  }, []);
  return key;
}

/**
 * The days the learner practised over the past months, a square a day, darker for more answers, in the Review mode's
 * colour (docs/v2/components/activity-calendar.md). Drawn with echarts' calendar; colours read from the CSS tokens.
 */
export function ActivityCalendar({
  days,
  weeks = 26,
  today,
  firstAnswer,
  split = false,
  streak,
  firstDay,
  steps = STEPS,
  onSelectDay,
  className,
}: ActivityCalendarProps) {
  const holder = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const [width, setWidth] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const themeKey = useThemeKey();
  const weekStart = useMemo(() => firstDay ?? localeFirstDay(), [firstDay]);
  const select = useRef(onSelectDay);
  useEffect(() => {
    select.current = onSelectDay;
  }, [onSelectDay]);

  // Every day shown, from the first day of the week `weeks - 1` weeks back, to today.
  const range = useMemo(() => {
    const end = parseDay(today);
    const back = (end.getDay() - weekStart + 7) % 7;
    const start = addDays(end, -back - (weeks - 1) * 7);
    const byDate = new Map(days.map((day) => [day.date, day]));
    const first =
      firstAnswer ?? days.filter((d) => d.answers > 0).sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
    const list: { key: string; date: Date; day?: ActivityDay; before: boolean }[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const key = dayKey(d);
      list.push({ key, date: d, day: byDate.get(key), before: !first || key < first });
    }
    return { start, end, list };
  }, [days, today, weeks, weekStart, firstAnswer]);

  const practised = range.list.filter((entry) => (entry.day?.answers ?? 0) > 0);
  const sinceDate = practised[0]?.date;

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    chart.current = echarts.init(element, null, { renderer: 'svg' });
    chart.current.on('click', (params) => {
      const key = (params.value as [string, number] | undefined)?.[0];
      if (key) select.current?.(key);
    });
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  const cell = Math.max(8, Math.min(22, Math.floor((width - 32) / (weeks + 0.5))));
  const height = cell * 7 + 26;

  useEffect(() => {
    const instance = chart.current;
    if (!instance || !width) return;
    // A day with no practice reads as an empty square; a day before the first answer is fainter still.
    const muted = cssColour('--border');
    const faint = cssColour('--muted', 0.5);
    const background = cssColour('--background');
    const mutedText = cssColour('--muted-foreground');
    const shade = (mode: ModeId, level: number) => cssColour(MODE_VAR[mode], [0, 0.35, 0.65, 1][level]);
    const levelOf = (answers: number) =>
      answers >= steps[2] ? 3 : answers >= steps[1] ? 2 : answers >= steps[0] ? 1 : 0;
    const cache = new Map<string, string>();
    const colourOf = (mode: ModeId, level: number) => {
      const key = `${mode}${level}`;
      if (!cache.has(key)) cache.set(key, shade(mode, level));
      return cache.get(key)!;
    };
    // M, W and F down the side, wherever the week starts.
    const names = ['', 'M', '', 'W', '', 'F', ''];
    const option: Option = {
      animation: false,
      tooltip: {
        trigger: 'item',
        backgroundColor: cssColour('--foreground'),
        borderWidth: 0,
        padding: [6, 10],
        textStyle: { color: background, fontSize: 12, fontFamily: 'inherit' },
        formatter: (params) => {
          const index = (params as { dataIndex: number }).dataIndex;
          const entry = range.list[index];
          return entry ? describe(entry.day, entry.date, entry.before) : '';
        },
      },
      calendar: {
        range: [dayKey(range.start), dayKey(range.end)],
        orient: 'horizontal',
        cellSize: [cell, cell],
        // A left edge and a cell size only: with a right edge too, echarts stretches the cells to fill the width.
        left: 26,
        top: 20,
        splitLine: { show: false },
        itemStyle: { color: 'transparent', borderWidth: 0 },
        yearLabel: { show: false },
        monthLabel: { nameMap: 'EN', color: mutedText, fontSize: 11, margin: 6 },
        dayLabel: { firstDay: weekStart, nameMap: names, color: mutedText, fontSize: 10, margin: 6 },
      },
      series: [
        {
          type: 'scatter',
          coordinateSystem: 'calendar',
          symbol: 'roundRect',
          symbolSize: Math.max(4, cell - 3),
          cursor: onSelectDay ? 'pointer' : 'default',
          emphasis: { scale: false, itemStyle: { borderColor: mutedText, borderWidth: 1.5 } },
          data: range.list.map((entry) => {
            const answers = entry.day?.answers ?? 0;
            const level = levelOf(answers);
            const mode = split ? (entry.day?.topMode ?? 'review') : 'review';
            const color = entry.before && !answers ? faint : level === 0 ? muted : colourOf(mode, level);
            return { value: [entry.key, answers], itemStyle: { color } };
          }),
        },
      ],
    };
    instance.resize({ height });
    instance.setOption(option, true);
  }, [range, width, cell, height, split, steps, weekStart, themeKey, onSelectDay]);

  // The hint follows the keyboard's focus.
  useEffect(() => {
    const instance = chart.current;
    if (!instance || focus === null) return;
    instance.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    instance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: focus });
    instance.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: focus });
  }, [focus]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = range.list.length - 1;
    const moves: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    if (event.key in moves) {
      event.preventDefault();
      setFocus((current) => Math.max(0, Math.min(last, (current ?? last) + moves[event.key]!)));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setFocus(event.key === 'Home' ? 0 : last);
    } else if (event.key === 'Enter' && focus !== null) {
      onSelectDay?.(range.list[focus]!.key);
    }
  };

  const summary = [
    streak && streak.days > 0
      ? `${streak.days} ${streak.days === 1 ? 'day' : 'days'} in a row, longest ${streak.longest}`
      : null,
    sinceDate
      ? `Practised on ${practised.length} ${practised.length === 1 ? 'day' : 'days'} since ${sinceDate.toLocaleDateString('en-GB', { month: 'long' })}`
      : null,
  ].filter(Boolean);

  return (
    <div className={cn('grid gap-2', className)}>
      <div
        ref={holder}
        tabIndex={0}
        role="group"
        aria-label={`Practice over the last ${weeks} weeks. Use the arrow keys to move a day or a week.`}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setFocus(null);
          chart.current?.dispatchAction({ type: 'hideTip' });
          chart.current?.dispatchAction({ type: 'downplay', seriesIndex: 0 });
        }}
        className="w-full rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        style={{ height }}
      />
      {focus !== null ? (
        <p className="sr-only" aria-live="polite">
          {describe(range.list[focus]?.day, range.list[focus]!.date, range.list[focus]!.before)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{practised.length ? summary.join('. ') : 'Your practice will show here, one square a day.'}</span>
        {split ? (
          <span className="flex flex-wrap items-center gap-2">
            {(['learn', 'review', 'drill', 'puzzles'] as ModeId[]).map((mode) => (
              <span key={mode} className="inline-flex items-center gap-1">
                <span className={cn('size-2.5 rounded-sm', MODE_INFO[mode].fill)} aria-hidden />
                {MODE_INFO[mode].name}
              </span>
            ))}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1" aria-hidden>
            Less
            <span className="size-2.5 rounded-sm bg-border" />
            <span className="size-2.5 rounded-sm bg-mode-review/35" />
            <span className="size-2.5 rounded-sm bg-mode-review/65" />
            <span className="size-2.5 rounded-sm bg-mode-review" />
            More
          </span>
        )}
      </div>
    </div>
  );
}
