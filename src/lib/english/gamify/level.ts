export function levelFromXp(xp: number): number {
	const safe = Math.max(0, Math.floor(xp));
	return Math.floor((Math.sqrt(1 + (8 * safe) / 100) - 1) / 2) + 1;
}

export function xpIntoLevel(xp: number): number {
	const level = levelFromXp(xp);
	return Math.max(0, xp - 50 * ((level - 1) * level));
}

export function xpToNextLevel(xp: number): number {
	const safe = Math.max(0, Math.floor(xp));
	const currentLevel = levelFromXp(safe);
	const nextLevelTotal = 50 * currentLevel * (currentLevel + 1);
	return Math.max(0, nextLevelTotal - safe);
}

export function titleFromMastered(n: number): string {
	if (n >= 2000) return 'Huyền thoại từ vựng';
	if (n >= 1000) return 'Nhà sưu tập';
	if (n >= 600) return 'Bậc thầy từ vựng';
	if (n >= 300) return 'Người giữ từ';
	if (n >= 150) return 'Nhà thám hiểm';
	if (n >= 50) return 'Người học vững vàng';
	return 'Người bắt đầu';
}
