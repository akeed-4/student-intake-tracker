/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal, AfterViewInit, ElementRef, ViewChild, effect, OnDestroy } from '@angular/core';
import { PickupStateService } from '../../services/pickup-state.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

declare var d3: any;

interface ChartData {
  label: string;
  value: number;
}

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsDashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('barChartContainer') barChartContainer!: ElementRef;
  @ViewChild('donutChartContainer') donutChartContainer!: ElementRef;

  private readonly pickupStateService = inject(PickupStateService);
  private readonly authService = inject(AuthService);
  readonly translationService = inject(TranslationService);
  
  private viewInitialized = signal(false);
  private resizeObserver?: ResizeObserver;

  private readonly allSchoolRequests = computed(() => {
    const schoolId = this.authService.currentUserSchool()?.id;
    const allRequests = this.pickupStateService.allRequests();
    if (!schoolId) return [];
    return allRequests.filter(req => req.schoolId === schoolId);
  });
  
  private readonly completedToday = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.allSchoolRequests().filter(req => 
      req.status === 'completed' && req.completed_at?.startsWith(today)
    );
  });
  
  readonly activeToday = computed(() => this.pickupStateService.activeRequests());

  private readonly absencesToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    return this.pickupStateService.schoolAbsenceReports().filter(
      report => report.date === todayStr
    );
  });
  
  readonly totalPickups = computed(() => this.completedToday().length);
  readonly totalAbsences = computed(() => this.absencesToday().length);

  readonly avgPickupTime = computed(() => {
    const completed = this.completedToday();
    if (completed.length === 0) return 0;
    
    const totalMinutes = completed.reduce((acc, req) => {
      if (req.created_at && req.completed_at) {
        const start = new Date(req.created_at).getTime();
        const end = new Date(req.completed_at).getTime();
        return acc + ((end - start) / 60000); // ms to minutes
      }
      return acc;
    }, 0);
    
    return Math.round(totalMinutes / completed.length);
  });
  
  readonly peakHour = computed(() => {
    const completed = this.completedToday();
    if (completed.length === 0) return 'N/A';
    
    const hours = completed.map(req => new Date(req.completed_at!).getHours());
    // Fix: Explicitly handle object keys as strings during reduction.
    // The original use of `Record<number, number>` for an object whose keys are
    // implicitly converted to strings can lead to type inference issues with
    // strict compiler settings, causing the arithmetic error in the sort function.
    const hourCounts = hours.reduce((acc, hour) => {
      const hourKey = String(hour);
      acc[hourKey] = (acc[hourKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Fix: Explicitly cast values to Number during sort to ensure type safety.
    const peak = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const peakHour24 = parseInt(peak[0], 10);
    const ampm = peakHour24 >= 12 ? 'PM' : 'AM';
    const peakHour12 = peakHour24 % 12 || 12;
    return `${peakHour12} ${ampm}`;
  });

  private readonly pickupsByHourData = computed(() => {
    const data = Array.from({ length: 10 }, (_, i) => ({ hour: 8 + i, count: 0 })); // 8 AM to 5 PM
    this.completedToday().forEach(req => {
      const hour = new Date(req.completed_at!).getHours();
      const bucket = data.find(d => d.hour === hour);
      if (bucket) bucket.count++;
    });
    return data.map(d => {
        const ampm = d.hour >= 12 ? 'PM' : 'AM';
        const hour12 = d.hour % 12 || 12;
        return { label: `${hour12}${ampm}`, value: d.count };
    });
  });

  private readonly statusDistributionData = computed(() => {
    const statuses = this.activeToday().reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statuses).map(([key, value]) => ({
      label: this.translationService.translate(`statuses.${key}`),
      value: value
    }));
  });

  constructor() {
    effect(() => {
      if (this.viewInitialized()) {
        this.drawCharts();
      }
    });
  }

  ngAfterViewInit() {
    this.viewInitialized.set(true);
    this.setupResizeObserver();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.drawCharts();
    });
    if (this.barChartContainer) this.resizeObserver.observe(this.barChartContainer.nativeElement);
    if (this.donutChartContainer) this.resizeObserver.observe(this.donutChartContainer.nativeElement);
  }

  private drawCharts() {
    if (this.totalPickups() > 0) this.drawBarChart(this.pickupsByHourData());
    if (this.activeToday().length > 0) this.drawDonutChart(this.statusDistributionData());
  }

  private drawBarChart(data: ChartData[]) {
    const element = this.barChartContainer.nativeElement;
    d3.select(element).select('svg').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = element.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(element).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${element.clientWidth} ${element.clientHeight}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().range([0, width]).padding(0.4).domain(data.map(d => d.label));
    const y = d3.scaleLinear().range([height, 0]).domain([0, d3.max(data, d => d.value) || 10]);

    const tooltip = d3.select('body').append('div').attr('class', 'bar-tooltip');

    svg.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label))
      .attr('width', x.bandwidth())
      .attr('y', d => y(d.value))
      .attr('height', d => height - y(d.value))
      .attr('fill', 'var(--color-cyan-500)')
      .attr('rx', 4)
      .on('mouseover', (event, d) => {
        tooltip.style('opacity', 1).html(`${d.label}: ${d.value} pickups`);
      })
      .on('mousemove', (event) => {
        tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append('g').call(d3.axisLeft(y).ticks(5));
  }

  private drawDonutChart(data: ChartData[]) {
    const element = this.donutChartContainer.nativeElement;
    d3.select(element).select('svg').remove();

    const width = element.clientWidth;
    const height = element.clientHeight;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(element).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(['var(--color-amber-400)', 'var(--color-sky-400)', 'var(--color-green-400)']);

    const pie = d3.pie().value(d => d.value);
    const data_ready = pie(data);

    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.8);
    
    const tooltip = d3.select('body').append('div').attr('class', 'donut-tooltip');

    svg.selectAll('path')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.label))
      .attr('stroke', 'var(--color-slate-800)')
      .style('stroke-width', '2px')
      .on('mouseover', (event, d) => {
        tooltip.style('opacity', 1).html(`${d.data.label}: ${d.data.value}`);
      })
      .on('mousemove', (event) => {
        tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });
  }
}