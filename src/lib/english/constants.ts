/** English-only learning rules. The shared ladder lives in `@/lib/srs/schedule`. */
export const EN_NEW_WORDS_DEFAULT = 10;
export const EN_NEW_PATTERNS_DEFAULT = 1;
export const EN_NEW_WORDS_MAX = 10;
export const EN_DAILY_DUE_LIMIT = 50;
export const EN_ROUND_REVIEW_LIMIT = 30;
export const EN_WEEKLY_DAYS_DEFAULT = 4;
export const EN_LEITNER_INTERVALS = [0, 1, 3, 7, 21, 60] as const;
export const EN_NEW_PATTERNS_MAX = 2;
export const EN_LONG_GAP_MS = 7 * 86_400_000;
export const EN_USAGE_MIN_GRADE_EXAMPLES = 2;
export const EN_PATTERN_MIN_EXAMPLES = 2;
export const EN_DISPUTES_PER_DAY = 10;
export const EN_SUSPEND_DISPUTE_USERS = 3;
export const EN_SUSPEND_MIN_ATTEMPTS = 8;
export const EN_SUSPEND_AUDIO_RATE = 0.7;
export const EN_REVIEW_BATCH = 20;
export const EN_QUIZ_MAX_ITEMS = 20;
export const EN_MAX_JSON_BODY_BYTES = 4 * 1024 * 1024;
export const EN_ALTERNATIVES_REQUIRED = 5;
export const EN_MAX_WORDS_PER_PACK = 500;
export const EN_MAX_PATTERNS_PER_PACK = 80;
export const EN_MAX_COLLOCATIONS = 6;
export const EN_MAX_EXAMPLES_PER_WORD = 8;
export const EN_HINTS_REQUIRED = 3;
export const EN_TX_TIMEOUT_MS = 30_000;
export const EN_TX_MAX_WAIT_MS = 10_000;

export const EN_CEFR_LEVELS = ['pre_a1', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const;

export const EN_TOPICS = [
	'daily_life',
	'work',
	'school',
	'travel',
	'food',
	'health',
	'shopping',
	'home',
	'people',
	'feelings',
	'nature',
	'time',
	'money',
	'technology',
	'culture',
	'communication',
] as const;

export const EN_GRAMMAR_TAGS = [
	'countable',
	'uncountable',
	'transitive',
	'intransitive',
	'+to_inf',
	'+-ing',
	'+that_clause',
	'plural_only',
	'singular_only',
] as const;

export const EN_INFLECTION_TAGS = [
	'base',
	'plural',
	'third_person',
	'past',
	'past_participle',
	'ing',
	'comparative',
	'superlative',
] as const;
