import { Component, computed, input, signal } from '@angular/core';

import { BarChartDatum } from '../bar-chart/bar-chart';

interface DonutSegment extends BarChartDatum {
  dasharray: string;
  dashoffset: number;
  percent: number;
}

const RADIUS = 70;
const STROKE_WIDTH = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 2;

@Component({
  selector: 'app-donut-chart',
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
})
export class DonutChart {
  readonly data = input<BarChartDatum[]>([]);

  protected readonly hoveredLabel = signal<string | null>(null);
  protected readonly radius = RADIUS;
  protected readonly strokeWidth = STROKE_WIDTH;

  protected readonly total = computed(() => this.data().reduce((sum, d) => sum + d.value, 0));

  protected readonly legend = computed(() => {
    const total = this.total();
    return this.data().map((d) => ({
      ...d,
      percent: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  });

  protected readonly segments = computed<DonutSegment[]>(() => {
    const total = this.total();
    if (total === 0) return [];

    let cumulative = 0;
    const result: DonutSegment[] = [];

    for (const d of this.data()) {
      if (d.value <= 0) continue;
      const fraction = d.value / total;
      const rawLength = fraction * CIRCUMFERENCE;
      const drawnLength = Math.max(rawLength - SEGMENT_GAP, 0);

      result.push({
        ...d,
        dasharray: `${drawnLength} ${CIRCUMFERENCE - drawnLength}`,
        dashoffset: -cumulative,
        percent: Math.round(fraction * 100),
      });

      cumulative += rawLength;
    }

    return result;
  });
}
