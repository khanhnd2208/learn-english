import { readdir, stat, rename, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { englishAudioRoot } from '../src/lib/english/audioPath';

async function encode(source: string, target: string) {
	const temp = `${target}.${process.pid}.tmp.ogg`;
	const ok = await new Promise<boolean>((resolve) => {
		const child = spawn(process.env.FFMPEG_BIN || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-ac', '1', '-c:a', 'libopus', '-b:a', '24k', '-application', 'voip', temp], { stdio: 'inherit' });
		child.once('error', () => resolve(false)); child.once('close', (code) => resolve(code === 0));
	});
	try {
		if (!ok || ((await stat(temp).catch(() => null))?.size ?? 0) === 0) throw new Error(`Could not encode ${source}`);
		await rename(temp, target);
	} finally { await rm(temp, { force: true }); }
}

async function main() {
	if (process.argv.length !== 3 || !['--dry-run', '--apply'].includes(process.argv[2]!)) throw new Error('Use --dry-run or --apply');
	const root = englishAudioRoot(); if (!root) throw new Error('ENGLISH_AUDIO_ROOT is required');
	const folder = path.join(root, 'tts');
	const names = (await readdir(folder)).filter((name) => /^[0-9a-f]{32}\.wav$/.test(name));
	let before = 0, after = 0, converted = 0;
	for (const name of names) {
		const source = path.join(folder, name), target = path.join(folder, name.replace(/\.wav$/, '.ogg'));
		const oldSize = (await stat(source)).size; before += oldSize;
		const existing = await stat(target).catch(() => null);
		if (existing) { after += oldSize + existing.size; continue; }
		if (process.argv[2] === '--apply') {
			await encode(source, target);
			const size = (await stat(target)).size;
			if (size <= 0) throw new Error(`Empty result ${target}`);
			await rm(source); after += size; converted++;
		} else after += oldSize;
	}
	console.log(`WAV files: ${names.length}; converted: ${converted}; before: ${before} bytes; after: ${after} bytes`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
