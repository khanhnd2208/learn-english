import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	test: {
		include: ['src/**/__dbtests__/**/*.dbtest.ts'],
		setupFiles: ['src/lib/__dbtests__/setup.ts'],
		globalSetup: ['src/lib/__dbtests__/migrate.ts'],
		pool: 'forks',
		fileParallelism: false,
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
	resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
