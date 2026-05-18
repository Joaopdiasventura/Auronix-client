import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from './skeleton';

@Component({
  selector: 'app-skeleton-metric-card',
  imports: [Skeleton],
  template: `
    <article class="skeleton-metric-card" aria-hidden="true">
      <app-skeleton height="0.65rem" width="4.5rem" />
      <app-skeleton height="1.2rem" width="7rem" />
      <app-skeleton height="0.8rem" width="100%" />
      <app-skeleton height="0.8rem" width="74%" />
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton-metric-card {
        display: grid;
        align-content: start;
        gap: var(--stack-xs);
        min-height: 100%;
        padding: 0.875rem 0.9375rem;
        border: 1px solid var(--color-stroke);
        border-radius: var(--radius-md);
        background: var(--color-surface-1);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
  },
})
export class SkeletonMetricCard {}
