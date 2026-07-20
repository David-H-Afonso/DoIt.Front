import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ThemeMode, ThemePreference, ThemeState } from '@/models/theme'
import { ThemeService } from '@/services'

const initialState: ThemeState = {
	mode: 'light',
	locale: 'es',
	primaryColor: '#6d5df6',
	accentColor: '#16a34a',
	backgroundColor: '#f6efe6',
	surfaceColor: '#fffaf4',
	textColor: '#1f2937',
	backgroundImagePath: null,
	backgroundOverlayColor: '#f6efe6',
	backgroundOverlayOpacity: 0.78,
}

export const fetchThemePreference = createAsyncThunk('theme/fetchPreference', async (_, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null } }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	return ThemeService.get(state.auth.accessToken)
})

export const saveThemePreference = createAsyncThunk('theme/savePreference', async (_, { getState }) => {
	const state = getState() as { auth: { accessToken: string | null }; theme: ThemeState }
	if (!state.auth.accessToken) throw new Error('Missing access token')
	return ThemeService.update(state.auth.accessToken, toPreference(state.theme))
})

const applyPreference = (state: ThemeState, preference: ThemePreference) => {
	state.mode = preference.themeMode
	state.primaryColor = preference.primaryColor
	state.accentColor = preference.accentColor
	state.backgroundColor = preference.backgroundColor
	state.surfaceColor = preference.surfaceColor
	state.textColor = preference.textColor
	state.backgroundImagePath = preference.backgroundImagePath
	state.backgroundOverlayColor = preference.backgroundOverlayColor
	state.backgroundOverlayOpacity = preference.backgroundOverlayOpacity
}

const toPreference = (state: ThemeState): ThemePreference => ({
	themeMode: state.mode,
	primaryColor: state.primaryColor,
	accentColor: state.accentColor,
	backgroundColor: state.backgroundColor,
	surfaceColor: state.surfaceColor,
	textColor: state.textColor,
	backgroundImagePath: state.backgroundImagePath,
	backgroundOverlayColor: state.backgroundOverlayColor,
	backgroundOverlayOpacity: state.backgroundOverlayOpacity,
})

export const themeSlice = createSlice({
	name: 'theme',
	initialState,
		reducers: {
		setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
			state.mode = action.payload
		},
		setLocale: (state, action: PayloadAction<'es' | 'en'>) => {
			state.locale = action.payload
		},
		setPrimaryColor: (state, action: PayloadAction<string>) => {
			state.primaryColor = action.payload
		},
		setAccentColor: (state, action: PayloadAction<string>) => {
			state.accentColor = action.payload
		},
		setBackgroundColor: (state, action: PayloadAction<string>) => {
			state.backgroundColor = action.payload
		},
		setSurfaceColor: (state, action: PayloadAction<string>) => {
			state.surfaceColor = action.payload
		},
		setBackgroundImagePath: (state, action: PayloadAction<string>) => {
			state.backgroundImagePath = action.payload || null
		},
		setBackgroundOverlayOpacity: (state, action: PayloadAction<number>) => {
			state.backgroundOverlayOpacity = Math.min(0.95, Math.max(0.35, action.payload))
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchThemePreference.fulfilled, (state, action: PayloadAction<ThemePreference>) => applyPreference(state, action.payload))
			.addCase(saveThemePreference.fulfilled, (state, action: PayloadAction<ThemePreference>) => applyPreference(state, action.payload))
	},
})

export const { setAccentColor, setBackgroundColor, setBackgroundImagePath, setBackgroundOverlayOpacity, setLocale, setPrimaryColor, setSurfaceColor, setThemeMode } = themeSlice.actions
export const themeReducer = themeSlice.reducer
