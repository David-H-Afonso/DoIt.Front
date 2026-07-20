import { setXp, xpReducer } from './xpSlice'

describe('xpSlice', () => {
	it('stores current XP profile', () => {
		const state = xpReducer(undefined, setXp({ totalXp: 120, weeklyXp: 40, currentLevel: 2, currentLevelXp: 100, nextLevelXp: 400, progressToNextLevel: 20 }))

		expect(state.value?.totalXp).toBe(120)
		expect(state.value?.currentLevel).toBe(2)
	})
})
