import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import { combineReducers } from '@reduxjs/toolkit'
import storage from 'redux-persist/lib/storage'
import { authReducer, logoutLocal, refreshSession } from './features/auth/authSlice'
import { nowReducer } from './features/now/nowSlice'
import { reviewReducer } from './features/review/reviewSlice'
import { tasksReducer } from './features/tasks/tasksSlice'
import { themeReducer } from './features/theme/themeSlice'
import { uiReducer } from './features/ui/uiSlice'
import { usersReducer } from './features/users/usersSlice'
import { xpReducer } from './features/xp/xpSlice'
import { zonesReducer } from './features/zones/zonesSlice'
import { setUnauthorizedHandler } from '@/services/httpClient'

const persistConfig = {
	key: 'root',
	storage,
	whitelist: ['auth', 'theme'],
}

const combinedReducer = combineReducers({
	auth: authReducer,
	now: nowReducer,
	review: reviewReducer,
	tasks: tasksReducer,
	theme: themeReducer,
	ui: uiReducer,
	users: usersReducer,
	xp: xpReducer,
	zones: zonesReducer,
})

const rootReducer = (state: ReturnType<typeof combinedReducer> | undefined, action: { type: string }) => {
	if (action.type === logoutLocal.type) {
		state = undefined
	}

	return combinedReducer(state, action)
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [
					'persist/FLUSH',
					'persist/REHYDRATE',
					'persist/PAUSE',
					'persist/PERSIST',
					'persist/PURGE',
					'persist/REGISTER',
				],
			},
		}),
	devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

let refreshPromise: Promise<unknown> | null = null

setUnauthorizedHandler(async () => {
	if (!store.getState().auth.refreshToken) {
		store.dispatch(logoutLocal())
		void persistor.flush()
		return false
	}

	if (!refreshPromise) {
		refreshPromise = store.dispatch(refreshSession()).finally(() => {
			refreshPromise = null
		})
	}

	const result = await refreshPromise
	return refreshSession.fulfilled.match(result)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
