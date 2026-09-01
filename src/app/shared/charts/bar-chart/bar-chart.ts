import { Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface BarChartDatum {
  label: string;
  value: number;
  color: string;
}

interface BarGeometry extends BarChartDatum {
  x: number;
  barHeight: number;
  barY: number;
}

const BAND_WIDTH = 70;
const BAR_WIDTH = 24;
const BAR_RADIUS = 4;
const PLOT_HEIGHT = 140;
const TOP_PADDING = 24;
const BOTTOM_PADDING = 30;

@Component({
  selector: 'app-bar-chart',
  imports: [TranslatePipe],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
})
export class BarChart {
  readonly data = input<BarChartDatum[]>([]);

  protected readonly hoveredIndex = signal<number | null>(null);
  protected readonly barRadius = BAR_RADIUS;

  protected readonly viewBoxWidth = computed(() => Math.max(this.data().length * BAND_WIDTH, BAND_WIDTH));
  protected readonly viewBoxHeight = TOP_PADDING + PLOT_HEIGHT + BOTTOM_PADDING;
  protected readonly baselineY = TOP_PADDING + PLOT_HEIGHT;

  protected readonly bars = computed<BarGeometry[]>(() => {
    const values = this.data();
    const max = Math.max(...values.map((d) => d.value), 1);

    return values.map((d, i) => {
      const barHeight = (d.value / max) * PLOT_HEIGHT;
      return {
        ...d,
        x: i * BAND_WIDTH + (BAND_WIDTH - BAR_WIDTH) / 2,
        barHeight,
        barY: this.baselineY - barHeight,
      };
    });
  });

  protected bandCenter(i: number): number {
    return i * BAND_WIDTH + BAND_WIDTH / 2;
  }
}
