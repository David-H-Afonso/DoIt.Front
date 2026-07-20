import { useAppSelector } from '@/store/hooks'
import en from './locales/en.json'
import es from './locales/es.json'

const dictionaries = { es, en } as const
type Locale = keyof typeof dictionaries

export function translate(locale: Locale, key: string): string {
	const dictionary = dictionaries[locale] ?? dictionaries.es
	const value = key.split('.').reduce<unknown>((current, segment) => {
		if (current && typeof current === 'object' && segment in current) {
			return (current as Record<string, unknown>)[segment]
		}
		return undefined
	}, dictionary)

	return typeof value === 'string' ? value : key
}

export function useI18n() {
	const locale = useAppSelector((state) => state.theme.locale)
	return {
		locale,
		t: (key: string) => translate(locale, key),
		formatDate: (date: Date) =>
			capitalize(new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)),
	}
}

function capitalize(value: string) {
	return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}
