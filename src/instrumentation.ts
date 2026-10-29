export function register() {
	if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.TTS_SWEEP_ON_BOOT !== '1') return;
	setTimeout(async () => {
		try {
			const { prisma } = await import('@/lib/prisma');
			const { warmSet } = await import('@/services/english/enAudioService');
			const sets = await prisma.enSet.findMany({ where: { status: 'published' }, select: { id: true } });
			for (const set of sets) await warmSet(set.id);
		} catch (error) { console.error('[TTS] boot sweep failed', error); }
	}, 60_000).unref();
}
