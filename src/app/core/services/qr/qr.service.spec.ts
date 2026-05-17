import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QrService } from './qr.service';

vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

describe('QrService', () => {
  let service: QrService;
  const origin = window.location.origin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrService);
  });

  it('builds an absolute transfer entry url for account qr codes', () => {
    expect(service.buildTransferEntryUrl({ kind: 'email', value: ' Joao@Auronix.com ' })).toBe(
      `${origin}/transfer/key?email=joao%40auronix.com`,
    );
  });

  it('builds a deterministic download file name for payment requests', () => {
    expect(
      service.buildDownloadFileName({
        kind: 'paymentRequest',
        value: '550E8400-E29B-41D4-A716-446655440000',
      }),
    ).toBe('auronix-payment-request-550e8400-e29b-41d4-a716-446655440000');
  });

  it('generates the same png data url for the same payload', async () => {
    const payload = `${origin}/transfer/key?email=joao%40auronix.com`;
    const firstResult = await service.generatePngDataUrl(payload);
    const secondResult = await service.generatePngDataUrl(payload);

    expect(firstResult.startsWith('data:image/png;base64,')).toBe(true);
    expect(secondResult).toBe(firstResult);
  });
});
