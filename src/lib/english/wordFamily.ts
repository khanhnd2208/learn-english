import { z } from 'zod';

/** Words built on the same root (happy → happiness, happily, unhappy). Shown on every card; never graded. */
export const EN_MAX_FAMILY = 6;
export const EN_FAMILY_PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'phrasal verb'] as const;

export const familyMemberSchema = z.object({ word: z.string().default(''), partOfSpeech: z.string().default(''), meaningVi: z.string().default('') }).strict();
export type FamilyMember = z.infer<typeof familyMemberSchema>;

/** Reads the stored JSON column; anything malformed is dropped rather than breaking the card. */
export function parseWordFamily(value: unknown): FamilyMember[] {
 if (!Array.isArray(value)) return [];
 return value.flatMap((item) => { const parsed = familyMemberSchema.safeParse(item); return parsed.success && parsed.data.word.trim() ? [parsed.data] : []; });
}
