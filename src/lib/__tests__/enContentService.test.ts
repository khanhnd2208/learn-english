import { beforeEach, expect, it, vi } from 'vitest';
import { sampleEnglishPack } from '@/lib/english/samplePack';
const db = vi.hoisted(() => ({
 enSet: { create: vi.fn() }, enSetItem: { create: vi.fn() }, enWord: { upsert: vi.fn() },
 enSense: { upsert: vi.fn(), create: vi.fn() }, enExample: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: (fn: (tx: typeof db) => Promise<unknown>) => fn(db) } }));
import { saveEnglishPack } from '@/services/english/enContentService';
beforeEach(() => { vi.clearAllMocks(); db.enSet.create.mockResolvedValue({ id: 'set' }); db.enWord.upsert.mockResolvedValue({ id: 'word' }); db.enSense.upsert.mockResolvedValue({ id: 'sense' }); db.enExample.findMany.mockResolvedValue([]); });
it('saves synonyms, notes, and grade eligibility', async () => { const pack = structuredClone(sampleEnglishPack); pack.words[0]!.synonyms = ['take']; pack.words[0]!.noteVi = 'Lưu ý'; await saveEnglishPack(pack); expect(db.enSense.upsert.mock.calls[0]![0].create).toMatchObject({ synonyms: ['take'], noteVi: 'Lưu ý' }); expect(db.enExample.create.mock.calls[0]![0].data.role).toBe('grade'); });
