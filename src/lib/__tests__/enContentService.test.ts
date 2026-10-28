import { beforeEach, expect, it, vi } from 'vitest';
import { sampleEnglishPack } from '@/lib/english/samplePack';
const db = vi.hoisted(() => ({
 enSet: { create: vi.fn() }, enSetItem: { create: vi.fn() }, enWord: { upsert: vi.fn() },
 enSense: { upsert: vi.fn(), create: vi.fn() }, enExample: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: (fn: (tx: typeof db) => Promise<unknown>) => fn(db) } }));
import { saveEnglishPack } from '@/services/english/enContentService';
beforeEach(() => { vi.clearAllMocks(); db.enSet.create.mockResolvedValue({ id: 'set' }); db.enWord.upsert.mockResolvedValue({ id: 'word' }); db.enSense.upsert.mockResolvedValue({ id: 'sense' }); db.enExample.findMany.mockResolvedValue([]); });
it('saves synonyms, notes, and grade eligibility', async () => { const pack = structuredClone(sampleEnglishPack); pack.words[0]!.synonyms = ['take']; pack.words[0]!.noteVi = 'Lưu ý'; await saveEnglishPack(pack); expect(db.enSense.upsert.mock.calls[0]![0].create).toMatchObject({ synonyms: ['take'], noteVi: 'Lưu ý' }); expect(db.enExample.create.mock.calls.slice(0, 3).map((c) => c[0].data.role)).toEqual(['study', 'grade', 'grade']); expect(db.enSense.upsert.mock.calls[0]![0].create.family).toEqual(pack.words[0]!.family); });
it('suspends sentences dropped from a re-imported sense', async () => { db.enExample.findMany.mockResolvedValueOnce([{ id: 'old', english: 'An old sentence.', status: 'published' }, { id: 'same', english: sampleEnglishPack.words[0]!.cardExample.english, status: 'suspended' }]); await saveEnglishPack(sampleEnglishPack); expect(db.enExample.update.mock.calls[0]![0]).toMatchObject({ where: { id: 'same' }, data: { role: 'study', status: 'draft' } }); expect(db.enExample.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['old'] } }, data: { status: 'suspended' } }); });
