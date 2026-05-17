import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { QrService } from '../../../../core/services/qr/qr.service';
import { QrDisplay } from './qr-display';

describe('QrDisplay', () => {
  let fixture: ComponentFixture<QrDisplay>;
  const origin = window.location.origin;
  const qrService = {
    generatePngDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrDisplay],
      providers: [{ provide: QrService, useValue: qrService }],
    }).compileComponents();

    fixture = TestBed.createComponent(QrDisplay);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    qrService.generatePngDataUrl.mockResolvedValue('data:image/png;base64,mock');
  });

  it('renders a QR image for a valid value', async () => {
    fixture.componentRef.setInput('title', 'QR da conta');
    fixture.componentRef.setInput('value', 'joao@auronix.com');
    fixture.componentRef.setInput('payload', `${origin}/transfer/key?email=joao%40auronix.com`);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const image = nativeElement.querySelector('.qr-display__image') as HTMLImageElement;
    const button = nativeElement.querySelector('button') as HTMLButtonElement;

    expect(image).not.toBeNull();
    expect(image.src.startsWith('data:image/png;base64,')).toBe(true);
    expect(button.disabled).toBe(false);
    expect(qrService.generatePngDataUrl).toHaveBeenCalledWith(
      `${origin}/transfer/key?email=joao%40auronix.com`,
    );
  });

  it('shows an error for an empty QR value', async () => {
    fixture.componentRef.setInput('title', 'QR da conta');
    fixture.componentRef.setInput('value', '');
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.alert')).not.toBeNull();
  });
});
