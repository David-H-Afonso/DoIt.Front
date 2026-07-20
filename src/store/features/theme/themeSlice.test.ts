import { setAccentColor, setBackgroundOverlayOpacity, setLocale, setThemeMode, themeReducer } from './themeSlice'

describe('themeSlice', () => {
	it('updates theme mode and locale', () => {
		const themed = themeReducer(undefined, setThemeMode('dark'))
		const localized = themeReducer(themed, setLocale('en'))

		expect(localized.mode).toBe('dark')
		expect(localized.locale).toBe('en')
	})

	it('updates custom theme colors and clamps overlay opacity', () => {
		const accented = themeReducer(undefined, setAccentColor('#f97316'))
		const overlay = themeReducer(accented, setBackgroundOverlayOpacity(2))

		expect(overlay.accentColor).toBe('#f97316')
		expect(overlay.backgroundOverlayOpacity).toBe(0.95)
	})
})
