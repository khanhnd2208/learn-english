import type { SVGProps } from 'react';

type IconName = 'compass' | 'trophy' | 'map' | 'book' | 'search' | 'target' | 'sprout' | 'sword' | 'chest' | 'flag' | 'spark' | 'mountain' | 'shield' | 'star';

const paths: Record<IconName, React.ReactNode> = {
	compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></>,
	trophy: <><path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4" /><path d="m12 6 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 8.3l2-.3 1-2Z" /></>,
	map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /><path d="M12 8.5c1.5 0 2.5 1 2.5 2.4 0 1.8-2.5 4.1-2.5 4.1s-2.5-2.3-2.5-4.1c0-1.4 1-2.4 2.5-2.4Z" /><circle cx="12" cy="11" r=".6" /></>,
	book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 6v15m4-14h8m-8 4h8m-8 4h5" /></>,
	search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5m-10.5-13v5m-2.5-2.5h5" /></>,
	target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="m13 11 6-6m-1 0h1v1" /></>,
	sprout: <><path d="M12 21v-9" /><path d="M12 13c-5 0-8-2.5-8-7 5 0 8 2.5 8 7Zm0-3c0-4 2.5-7 7-7 0 4.5-2.5 7-7 7Z" /><path d="M7 21h10" /></>,
	sword: <><path d="m14 5 5-3 2 2-3 5-9 9-4-4 9-9Z" /><path d="m7 14-4 4m1-7 5 5m-7 4 3 3" /></>,
	chest: <><path d="M3 9h18v11H3zM2 9l2-5h16l2 5" /><path d="M2 9a3 3 0 0 0 6 0 4 4 0 0 0 8 0 3 3 0 0 0 6 0M12 13v3m-1.5-1.5h3" /></>,
	flag: <><path d="M5 21V4m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0" /></>,
	spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
	mountain: <><path d="m2 20 7-13 4 7 2-4 7 10H2Z" /><path d="m7 10 2 2 2-2m3 4 1 1 1-1" /></>,
	shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
	star: <><path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1L12 2Z" /></>,
};

const tones: Record<string, string> = {
	compass: 'text-sky-700 bg-sky-100', trophy: 'text-amber-700 bg-amber-100', map: 'text-emerald-700 bg-emerald-100',
	book: 'text-indigo-700 bg-indigo-100', search: 'text-cyan-700 bg-cyan-100', target: 'text-rose-700 bg-rose-100',
	sprout: 'text-lime-700 bg-lime-100', sword: 'text-orange-700 bg-orange-100', chest: 'text-amber-800 bg-amber-100',
	flag: 'text-violet-700 bg-violet-100', spark: 'text-yellow-700 bg-yellow-100', mountain: 'text-teal-700 bg-teal-100',
	shield: 'text-blue-700 bg-blue-100', star: 'text-amber-700 bg-amber-100',
};

export function AdventureIcon({ name, size = 24, className = '', framed = false, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number; framed?: boolean }) {
	const icon = <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>{paths[name]}</svg>;
	return framed ? <span className={`adventure-icon ${tones[name]}`} aria-hidden="true">{icon}</span> : icon;
}

export function AdventureLandscape() {
	return <svg aria-hidden="true" viewBox="0 0 480 260" preserveAspectRatio="xMidYMax meet" className="adventure-landscape" shapeRendering="crispEdges">
		{/* A tiny stepped landscape keeps the journey art consistent with the pixel-RPG panels. */}
		<g>
			<path fill="#d5c4e3" d="M0 168h48v-18h24v-24h24v-27h24V78h24v23h24v26h24v22h24v-32h24v-23h24v20h24v25h24v20h24v-19h24v-27h24v22h24v20h24v16h48v92H0z" />
			<path fill="#f8f1df" d="M96 99h24V78h24v23h24v26h-24v-16h-24v16H96zm120 18h24V94h24v20h24v18h-24v-15h-24v18h-24z" />
			<path fill="#c7d79e" d="M0 178h60v-14h38v12h42v12h46v-12h42v-15h44v9h48v-16h44v-12h44v21h34v-9h38v106H0z" />
			<path fill="#91b877" d="M0 211h54v-12h47v14h52v15h44v-14h51v-11h48v14h50v-16h52v-9h46v18h36v50H0z" />
			<path fill="#e5bd72" d="M204 260v-24h-27v-20h23v-20h27v-19h27v-19h-25v-19h26v-19h27v-17h-24V82h25V56h23V39h25v20h-13v17h23v20h-26v20h-26v18h-24v19h29v20h-30v20h-24v23h-25v24z" />
			<path fill="#fff1c7" d="M207 260v-24h-19v-8h27v-20h23v-19h27v-8h-25v-8h28v-19h26v-18h-25v-8h26V92h27v-9h-24v-8h26V56h23v-9h8v18h-14v17h23v8h-27v20h-26v18h-24v8h29v8h-30v20h-24v23h-25v23h-25v30z" />
		</g>
		<g fill="#5f8b67">
			<path d="M28 208h10v-18h10v-14h14v14h10v18H60v20H48v-20H28zm51 13h9v-16h10v-14h13v14h10v16h-12v16H91v-16H79zm277-33h12v-18h10v-14h14v14h10v18h-12v21h-22v-21h-12zm52 25h10v-16h10v-13h13v13h10v16h-11v17h-21v-17h-11z" />
		</g>
		<g fill="#fff0bd"><rect x="161" y="142" width="8" height="8"/><rect x="336" y="155" width="8" height="8"/><rect x="394" y="177" width="6" height="6"/></g>
		<g><rect x="368" y="65" width="6" height="53" fill="#54485e"/><path d="M374 68h39v10h-13v10h13v10h-39z" fill="#cf7480" stroke="#54485e" strokeWidth="4"/></g>
		<path d="M72 44h7V30h8v14h14v7h-12v8h10v7H87v14h-8V66H65v-7h12v-8H65v-7z" fill="#f3c95d" stroke="#a7793a" strokeWidth="3"/>
	</svg>;
}
