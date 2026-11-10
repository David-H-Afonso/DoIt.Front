const paths = {
	bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
	'bell-off': 'm3 3 18 18M6.3 6.3A6 6 0 0 0 6 8c0 7-3 7-3 9h14M9.5 2.5A6 6 0 0 1 18 8c0 1.7.2 3 .5 4M10 21h4',
	search: 'm21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
	filters: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6',
	more: 'M5 12h.01M12 12h.01M19 12h.01',
	check: 'm5 12 4 4L19 6',
	minus: 'M6 12h12',
	spinner: 'M21 12a9 9 0 1 1-9-9',
	close: 'm6 6 12 12M6 18 18 6',
	undo: 'M3 10h11a6 6 0 0 1 0 12M3 10l5-5M3 10l5 5',
	archive: 'M4 9h16v12H4ZM3 3h18v6H3ZM9 13h6',
	trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
	edit: 'm16 3 5 5L8 21H3v-5ZM13 6l5 5',
	list: 'M9 5h12M9 12h12M9 19h8M3 5h.01M3 12h.01M3 19h.01',
	chevron: 'm9 5 7 7-7 7',
	clock: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
} as const

export type TaskIconName = keyof typeof paths

export default function TaskIcon({ name }: { name: TaskIconName }) {
	return <svg className='task-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d={paths[name]} /></svg>
}
