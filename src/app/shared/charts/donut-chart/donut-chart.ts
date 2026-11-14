import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { BarChartDatum } from '../bar-chart/bar-chart';

interface DonutSegment extends BarChartDatum {
  dasharray: string;
  dashoffset: number;
  focusDasharray: string;
  focusDashoffset: number;
  percent: number;
}

const RADIUS = 70;
const STROKE_WIDTH = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 2;
// The focus arc sits just outside the ring; its dash lengths are the
// segment's own, scaled up to the larger circle.
const FOCUS_RADIUS = RADIUS + STROKE_WIDTH / 2 + 4;
const FOCUS_SCALE = FOCUS_RADIUS / RADIUS;
const FOCUS_CIRCUMFERENCE = CIRCUMFERENCE * FOCUS_SCALE;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-donut-chart',
  imports: [TranslatePipe],
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
})
export class DonutChart {
  readonly data = input<BarChartDatum[]>([]);
  /** Accessible name of the whole chart (its visible heading) - the segments announce their own label and value. */
  readonly label = input<string>('');

  protected readonly hoveredLabel = signal<string | null>(null);
  protected readonly radius = RADIUS;
  protected readonly focusRadius = FOCUS_RADIUS;
  protected readonly strokeWidth = STROKE_WIDTH;

  protected readonly total = computed(() => this.data().reduce((sum, d) => sum + d.value, 0));

  // Largest first, empty entries dropped: the legend and the ring then read
  // in the same order, and a category with no cards takes no row.
  private readonly visible = computed(() =>
    this.data()
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value),
  );

  protected readonly legend = computed(() => {
    const total = this.total();
    return this.visible().map((d) => ({
      ...d,
      percent: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  });

  protected readonly segments = computed<DonutSegment[]>(() => {
    const total = this.total();
    if (total === 0) return [];

    let cumulative = 0;
    const result: DonutSegment[] = [];

    for (const d of this.visible()) {
      const fraction = d.value / total;
      const rawLength = fraction * CIRCUMFERENCE;
      const drawnLength = Math.max(rawLength - SEGMENT_GAP, 0);

      result.push({
        ...d,
        dasharray: `${drawnLength} ${CIRCUMFERENCE - drawnLength}`,
        dashoffset: -cumulative,
        focusDasharray: `${drawnLength * FOCUS_SCALE} ${FOCUS_CIRCUMFERENCE - drawnLength * FOCUS_SCALE}`,
        focusDashoffset: -cumulative * FOCUS_SCALE,
        percent: Math.round(fraction * 100),
      });

      cumulative += rawLength;
    }

    return result;
  });
}
