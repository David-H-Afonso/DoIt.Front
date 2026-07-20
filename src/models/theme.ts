export type ThemeMode = 'light' | 'dark' | 'system' | 'custom'

export type ThemeState = {
	mode: ThemeMode
	locale: 'es' | 'en'
	primaryColor: string
	accentColor: string
	backgroundColor: string
	surfaceColor: string
	textColor?: string | null
	backgroundImagePath?: string | null
	backgroundOverlayColor: string
	backgroundOverlayOpacity: number
}

export type ThemePreference = {
	themeMode: ThemeMode
	primaryColor: string
	accentColor: string
	backgroundColor: string
	surfaceColor: string
	textColor?: string | null
	backgroundImagePath?: string | null
	backgroundOverlayColor: string
	backgroundOverlayOpacity: number
}
