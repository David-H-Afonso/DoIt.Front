import { usersReducer } from './usersSlice'

describe('usersSlice', () => {
	it('starts empty', () => {
		const state = usersReducer(undefined, { type: 'unknown' })

		expect(state.items).toEqual([])
		expect(state.loading).toBe(false)
	})
})
