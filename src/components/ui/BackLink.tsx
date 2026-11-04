import Link from 'next/link';
import MaterialIcon from './MaterialIcon';

/** "Back to <parent>" link at the top of a detail page. */
export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<Link href={href} className="inline-flex min-h-11 max-w-full items-center gap-1 text-sm font-bold text-accent">
			<MaterialIcon name="arrow_back" size={18} className="shrink-0" />
			<span className="truncate">{children}</span>
		</Link>
	);
}
