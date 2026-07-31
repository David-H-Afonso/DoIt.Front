self.addEventListener('install', (event) => {
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
	let payload = {}
	if (event.data) {
		try {
			payload = event.data.json()
		} catch {
			payload = { body: event.data.text() }
		}
	}

	const title = payload.title || 'DoIt'
	const options = {
		body: payload.body || 'Tienes una notificacion pendiente.',
		icon: '/doit-pwa-192-v2.png',
		badge: '/doit-pwa-192-v2.png',
		tag: payload.tag || `doit-${Date.now()}`,
		data: {
			url: payload.url || '/now',
			...(payload.data || {}),
		},
		renotify: true,
	}

	event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()
	const requestedUrl = event.notification.data?.url || '/now'
	const targetUrl = new URL(requestedUrl, self.location.origin)
	if (targetUrl.origin !== self.location.origin) {
		targetUrl.href = new URL('/now', self.location.origin).href
	}

	event.waitUntil((async () => {
		const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
		const existingClient = clients.find((client) => client.url.startsWith(self.location.origin))
		if (existingClient) {
			await existingClient.navigate(targetUrl.href)
			await existingClient.focus()
			return
		}

		await self.clients.openWindow(targetUrl.href)
	})())
})
