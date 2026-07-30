import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './httpClient'
import { NotificationService, isPushSupported } from './NotificationService'

vi.mock('./httpClient', () => ({
	apiRequest: vi.fn(),
}))

const apiRequestMock = vi.mocked(apiRequest)

describe('NotificationService', () => {
	let permission: NotificationPermission
	let registration: ServiceWorkerRegistration
	let subscription: PushSubscription

	beforeEach(() => {
		permission = 'default'
		const pushSubscription = {
			endpoint: 'https://push.example.test/subscription/one',
			getKey: vi.fn((name: string) => name === 'p256dh' ? new Uint8Array([1, 2, 3]).buffer : new Uint8Array([4, 5]).buffer),
			unsubscribe: vi.fn().mockResolvedValue(true),
		} as unknown as PushSubscription
		subscription = pushSubscription
		const pushManager = {
			getSubscription: vi.fn().mockResolvedValue(null),
			subscribe: vi.fn().mockResolvedValue(pushSubscription),
		}
		registration = { pushManager } as unknown as ServiceWorkerRegistration

		Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
		Object.defineProperty(window, 'Notification', {
			configurable: true,
			value: {
				get permission() { return permission },
				requestPermission: vi.fn(async () => {
					permission = 'granted'
					return permission
				}),
			},
		})
		Object.defineProperty(window, 'PushManager', { configurable: true, value: class PushManager {} })
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable: true,
			value: {
				register: vi.fn().mockResolvedValue(registration),
				ready: Promise.resolve(registration),
			},
		})
		apiRequestMock.mockReset()
	})

	it('reports ready when the server is enabled and no browser subscription exists', async () => {
		apiRequestMock.mockResolvedValue({ enabled: true, publicKey: 'AQID' })

		expect(isPushSupported()).toBe(true)
		expect(await NotificationService.getStatus('access-token')).toBe('ready')
		expect(apiRequestMock).toHaveBeenCalledWith('/api/notifications/config', { accessToken: 'access-token' })
	})

	it('subscribes the browser and sends only the public subscription data to the API', async () => {
		apiRequestMock
			.mockResolvedValueOnce({ enabled: true, publicKey: 'AQID' })
			.mockResolvedValueOnce({ id: 'subscription-id', endpoint: subscription.endpoint, isActive: true })

		await NotificationService.enable('access-token')

		const request = apiRequestMock.mock.calls[1]?.[1]
		expect(request?.method).toBe('POST')
		expect(request?.accessToken).toBe('access-token')
		expect(request?.body).toMatchObject({
			endpoint: subscription.endpoint,
			p256dh: 'AQID',
			auth: 'BAU',
		})
	})

	it('removes the server subscription before unsubscribing the browser', async () => {
		const getSubscription = vi.fn().mockResolvedValue(subscription)
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable: true,
			value: {
				register: vi.fn().mockResolvedValue(registration),
				ready: Promise.resolve({ pushManager: { getSubscription } }),
			},
		})
		apiRequestMock.mockResolvedValue(undefined)

		await NotificationService.disable('access-token')

		expect(apiRequestMock).toHaveBeenCalledWith('/api/notifications/subscription', expect.objectContaining({
			method: 'DELETE',
			accessToken: 'access-token',
			body: { endpoint: subscription.endpoint },
		}))
		expect(subscription.unsubscribe).toHaveBeenCalledOnce()
	})

	it('loads and saves the signed-in user notification preferences', async () => {
		const preferences = {
			availableFromEnabled: true,
			recommendedEnabled: false,
			beforeAvailableUntilEnabled: true,
			taskExpiredEnabled: true,
			taskCompletedEnabled: false,
			beforeAvailableUntilMinutes: 45,
		}
		apiRequestMock.mockResolvedValueOnce(preferences).mockResolvedValueOnce(preferences)

		expect(await NotificationService.getPreferences('access-token')).toEqual(preferences)
		expect(await NotificationService.updatePreferences('access-token', preferences)).toEqual(preferences)
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/api/notifications/preferences', { accessToken: 'access-token' })
		expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/notifications/preferences', {
		method: 'PUT',
		body: preferences,
		accessToken: 'access-token',
	})
	})

	it('reads, updates, and deletes a task notification override', async () => {
		const override = {
			taskId: 'task-id',
			availableFromEnabled: null,
			recommendedEnabled: false,
			beforeAvailableUntilEnabled: true,
			taskExpiredEnabled: null,
			taskCompletedEnabled: null,
			beforeAvailableUntilMinutes: 15,
		}
		apiRequestMock.mockResolvedValueOnce(override).mockResolvedValueOnce(override).mockResolvedValueOnce(undefined)

		expect(await NotificationService.getTaskOverride('access-token', 'task-id')).toEqual(override)
		expect(await NotificationService.updateTaskOverride('access-token', 'task-id', override)).toEqual(override)
		await NotificationService.deleteTaskOverride('access-token', 'task-id')
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/api/notifications/tasks/task-id', { accessToken: 'access-token' })
		expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/notifications/tasks/task-id', {
		method: 'PUT',
		body: override,
		accessToken: 'access-token',
	})
		expect(apiRequestMock).toHaveBeenNthCalledWith(3, '/api/notifications/tasks/task-id', {
		method: 'DELETE',
		accessToken: 'access-token',
	})
	})
})
