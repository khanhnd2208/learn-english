export async function englishPost<T>(url: string, body: unknown): Promise<T> {
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const payload = await response.json() as { ok?: boolean; data?: T; error?: string };
	if (!response.ok || !payload.ok || payload.data === undefined) {
		throw new Error(payload.error ?? 'Có lỗi khi gửi');
	}
	return payload.data;
}

export async function englishSend<T>(url: string, method: 'GET' | 'PATCH', body?: unknown): Promise<T> {
	const response = await fetch(url, {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	});
	const payload = await response.json() as { ok?: boolean; data?: T; error?: string };
	if (!response.ok || !payload.ok || payload.data === undefined) {
		throw new Error(payload.error ?? 'Có lỗi khi tải');
	}
	return payload.data;
}
