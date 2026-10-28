import { z } from 'zod';

/** Reading for higher-level learners (B2–C2): fixed phrases tied to one sense, shown when "Nâng cao" is on. Never graded. */
export const EN_ADVANCED_KINDS = ['collocation', 'preposition', 'pattern', 'phrasal_verb', 'idiom'] as const;
export type AdvancedKind = (typeof EN_ADVANCED_KINDS)[number];
export const EN_MIN_ADVANCED = 2;
export const EN_MAX_ADVANCED = 6;
export const ADVANCED_KIND_LABEL: Record<AdvancedKind, string> = { collocation: 'Kết hợp từ', preposition: 'Giới từ đi kèm', pattern: 'Mẫu câu', phrasal_verb: 'Cụm động từ', idiom: 'Thành ngữ' };

export const advancedNoteSchema = z.object({ kind: z.enum(EN_ADVANCED_KINDS), phrase: z.string().default(''), meaningVi: z.string().default(''), example: z.string().default('') }).strict();
export type AdvancedNote = z.infer<typeof advancedNoteSchema>;

/** Reads the stored JSON column; anything malformed is dropped rather than breaking the card. */
export function parseAdvancedNotes(value: unknown): AdvancedNote[] {
 if (!Array.isArray(value)) return [];
 return value.flatMap((item) => { const parsed = advancedNoteSchema.safeParse(item); return parsed.success && parsed.data.phrase.trim() ? [parsed.data] : []; });
}
