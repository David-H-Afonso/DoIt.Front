import type {
	DeletePushSubscriptionRequest,
	NotificationPreferences,
	PushSubscriptionRequest,
	PushSubscriptionStatus,
	TaskNotificationOverride,
	UpdateNotificationPreferencesRequest,
	UpdateTaskNotificationOverrideRequest,
	WebPushConfig,
	NotificationInboxItem,
} from '@/models/notifications'
import { environment } from '@/environments'
import { apiRequest } from './httpClient'

export type NotificationStatus = 'unsupported' | 'disabled' | 'denied' | 'ready' | 'enabled'

export class NotificationServiceError extends Error {
	readonly code: string

	constructor(code: string, message: string) {
		super(message)
		this.code = code
		this.name = 'NotificationServiceError'
	}
}

export function isPushSupported() {
	return typeof window !== 'undefined'
		&& window.isSecureContext
		&& 'Notification' in window
		&& 'serviceWorker' in navigator
		&& 'PushManager' in window
}

export function registerServiceWorker() {
	if (!isPushSupported()) return
	void navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => undefined)
}

export const NotificationService = {
	getConfig: (accessToken: string) =>
		apiRequest<WebPushConfig>(environment.apiRoutes.notifications.config, { accessToken }),

	getPreferences: (accessToken: string) =>
		apiRequest<NotificationPreferences>(environment.apiRoutes.notifications.preferences, { accessToken }),

	updatePreferences: (accessToken: string, request: UpdateNotificationPreferencesRequest) =>
		apiRequest<NotificationPreferences>(environment.apiRoutes.notifications.preferences, {
			method: 'PUT',
			body: request,
			accessToken,
		}),

	getTaskOverride: (accessToken: string, taskId: string) =>
		apiRequest<TaskNotificationOverride>(environment.apiRoutes.notifications.task(taskId), { accessToken }),

	updateTaskOverride: (accessToken: string, taskId: string, request: UpdateTaskNotificationOverrideRequest) =>
		apiRequest<TaskNotificationOverride>(environment.apiRoutes.notifications.task(taskId), {
			method: 'PUT',
			body: request,
			accessToken,
		}),

	deleteTaskOverride: (accessToken: string, taskId: string) =>
		apiRequest<void>(environment.apiRoutes.notifications.task(taskId), {
			method: 'DELETE',
			accessToken,
		}),

	listInbox: (accessToken: string, unreadOnly = false) =>
		apiRequest<NotificationInboxItem[]>(`${environment.apiRoutes.notifications.inbox}${unreadOnly ? '?unreadOnly=true' : ''}`, { accessToken }),

	getInboxItem: (accessToken: string, id: string) =>
		apiRequest<NotificationInboxItem>(environment.apiRoutes.notifications.inboxItem(id), { accessToken }),

	markInboxRead: (accessToken: string, id: string) =>
		apiRequest<void>(environment.apiRoutes.notifications.inboxRead(id), { method: 'POST', accessToken }),

	async getStatus(accessToken: string): Promise<NotificationStatus> {
		if (!isPushSupported()) return 'unsupported'
		if (Notification.permission === 'denied') return 'denied'

		const config = await this.getConfig(accessToken)
		if (!config.enabled || !config.publicKey) return 'disabled'

		const subscription = await getCurrentSubscription()
		return subscription ? 'enabled' : 'ready'
	},

	async enable(accessToken: string): Promise<PushSubscriptionStatus> {
		if (!isPushSupported()) {
			throw new NotificationServiceError('unsupported', 'Push notifications are not supported by this browser.')
		}

		const config = await this.getConfig(accessToken)
		if (!config.enabled || !config.publicKey) {
			throw new NotificationServiceError('disabled', 'Push notifications are not enabled on the server.')
		}

		const permission = await Notification.requestPermission()
		if (permission !== 'granted') {
			throw new NotificationServiceError('permission_denied', 'Notification permission was not granted.')
		}

		const registration = await getServiceWorkerRegistration()
		let subscription = await registration.pushManager.getSubscription()
		if (!subscription) {
			subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: decodeVapidKey(config.publicKey),
			})
		}

		const request = toPushSubscriptionRequest(subscription)
		return apiRequest<PushSubscriptionStatus>(environment.apiRoutes.notifications.subscription, {
			method: 'POST',
			body: request,
			accessToken,
		})
	},

	async disable(accessToken: string) {
		if (!isPushSupported()) return

		const subscription = await getCurrentSubscription()
		if (!subscription) return

		const request: DeletePushSubscriptionRequest = { endpoint: subscription.endpoint }
		await apiRequest<void>(environment.apiRoutes.notifications.subscription, {
			method: 'DELETE',
			body: request,
			accessToken,
		})
		await subscription.unsubscribe()
	},
}

async function getServiceWorkerRegistration() {
	if (!isPushSupported()) {
		throw new NotificationServiceError('unsupported', 'Push notifications are not supported by this browser.')
	}

	await navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
	return navigator.serviceWorker.ready
}

async function getCurrentSubscription() {
	const registration = await getServiceWorkerRegistration()
	return registration.pushManager.getSubscription()
}

function toPushSubscriptionRequest(subscription: PushSubscription): PushSubscriptionRequest {
	const p256dh = subscription.getKey('p256dh')
	const auth = subscription.getKey('auth')
	if (!p256dh || !auth) {
		throw new NotificationServiceError('invalid_subscription', 'The browser returned an incomplete push subscription.')
	}

	return {
		endpoint: subscription.endpoint,
		p256dh: encodeBase64Url(p256dh),
		auth: encodeBase64Url(auth),
		deviceName: getDeviceName(),
	}
}

function decodeVapidKey(value: string) {
	const padding = '='.repeat((4 - (value.length % 4)) % 4)
	const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
	const raw = window.atob(base64)
	const bytes = new Uint8Array(raw.length)
	for (let index = 0; index < raw.length; index += 1) {
		bytes[index] = raw.charCodeAt(index)
	}
	return bytes
}

function encodeBase64Url(value: ArrayBuffer) {
	const bytes = new Uint8Array(value)
	let binary = ''
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function getDeviceName() {
	const platform = navigator.platform
	return platform ? `Web · ${platform}`.slice(0, 200) : 'Web browser'
}
