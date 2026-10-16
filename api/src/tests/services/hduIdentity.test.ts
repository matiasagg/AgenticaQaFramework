import { vi } from 'vitest';
import { allocateHduIdentity, extractSourceHduDisplayId, reserveHduIdentity } from '../../services/hduIdentity';

describe('HDU identity allocator', () => {
  it('reserves the SaaS number independently from the source HDU id', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ nextNumber: 13 }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    } as any;

    await expect(allocateHduIdentity(tx)).resolves.toEqual({
      hduNumber: 13,
      displayId: 'HDU-013',
      resolution: 'ALLOCATED_NEW',
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('extracts an external id only as source metadata', () => {
    expect(extractSourceHduDisplayId('HDU-048 - Importar información', null)).toBe('HDU-048');
    expect(extractSourceHduDisplayId('[HDU_7] Historia externa', null)).toBe('HDU-007');
    expect(extractSourceHduDisplayId('Historia sin identificador', null)).toBeNull();
  });

  it('restores a source SaaS id when that number is free', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ nextNumber: 1 }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      userStory: { findUnique: vi.fn().mockResolvedValue(null) },
    } as any;

    await expect(reserveHduIdentity(tx, 48)).resolves.toMatchObject({
      hduNumber: 48,
      displayId: 'HDU-048',
      resolution: 'RESTORED_SOURCE',
    });
  });

  it('allocates a new id when the source number is already occupied', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ nextNumber: 12 }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      userStory: { findUnique: vi.fn().mockResolvedValue({ id: 'existing-story' }) },
    } as any;

    await expect(reserveHduIdentity(tx, 48)).resolves.toMatchObject({
      hduNumber: 12,
      displayId: 'HDU-012',
      resolution: 'SOURCE_CONFLICT',
    });
  });
});