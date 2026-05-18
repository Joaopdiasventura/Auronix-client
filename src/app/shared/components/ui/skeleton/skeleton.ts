import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    <span
      class="skeleton"
      [class.skeleton--circle]="shape() === 'circle'"
      [style.width]="width()"
      [style.height]="resolvedHeight()"
      [style.border-radius]="resolvedRadius()"
    ></span>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton {
        display: block;
        max-width: 100%;
        background:
          linear-gradient(
            90deg,
            rgb(255 255 255 / 0.03),
            rgb(255 255 255 / 0.07),
            rgb(255 255 255 / 0.03)
          ),
          var(--color-surface-3);
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.3s ease-in-out infinite;
      }

      @keyframes skeleton-shimmer {
        100% {
          background-position: -200% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .skeleton {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
  },
})
export class Skeleton {
  public readonly height = input<string | null>(null);
  public readonly radius = input<string | null>(null);
  public readonly shape = input<'block' | 'circle' | 'line'>('line');
  public readonly width = input('100%');

  protected readonly resolvedHeight = computed(() => {
    if (this.shape() == 'circle') return this.height() || this.width();
    if (this.height()) return this.height();
    return this.shape() == 'line' ? '0.875rem' : '100%';
  });
  protected readonly resolvedRadius = computed(() => {
    if (this.radius()) return this.radius();
    return this.shape() == 'circle' ? '50%' : 'var(--radius-sm)';
  });
}
