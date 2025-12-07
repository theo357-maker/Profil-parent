// firebase-messaging-sw.js - Service Worker spécifique pour Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb",
  measurementId: "G-TNSG1XFMDZ"
};

// Initialiser Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[Firebase-Messaging-SW] Firebase initialisé');
} catch (error) {
  console.error('[Firebase-Messaging-SW] Erreur initialisation Firebase:', error);
}

// Initialiser Firebase Messaging
const messaging = firebase.messaging.isSupported() ? firebase.messaging() : null;

if (messaging) {
  console.log('[Firebase-Messaging-SW] Firebase Messaging initialisé');
  
  // Configurer le gestionnaire de messages en arrière-plan
  messaging.onBackgroundMessage((payload) => {
    console.log('[Firebase-Messaging-SW] Message reçu en arrière-plan:', payload);
    
    // Personnaliser la notification
    const notificationTitle = payload.notification?.title || 'CS La Colombe';
    const notificationOptions = {
      body: payload.notification?.body || 'Nouvelle notification',
      icon: 'icon-192x192.png',
      badge: 'icon-72x72.png',
      data: payload.data || {},
      tag: payload.data?.type || 'general',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Ouvrir',
          icon: 'icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Ignorer',
          icon: 'icon-72x72.png'
        }
      ],
      silent: false
    };

    // Afficher la notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[Firebase-Messaging-SW] Firebase Messaging non supporté');
}

// Gestionnaire de clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase-Messaging-SW] Notification cliquée:', event.notification);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  
  // Déterminer l'URL à ouvrir selon le type de notification
  let targetUrl = 'index.html';
  if (notificationData.page) {
    targetUrl = `index.html#${notificationData.page}`;
  }
  
  // Gérer l'action du bouton
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ 
        type: 'window', 
        includeUncontrolled: true 
      }).then((clientList) => {
        // Chercher une fenêtre déjà ouverte
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Naviguer vers la page appropriée
            if (notificationData.page) {
              client.postMessage({
                type: 'NAVIGATE_TO_PAGE',
                page: notificationData.page,
                data: notificationData
              });
            }
            return client.focus();
          }
        }
        // Ouvrir une nouvelle fenêtre si aucune n'est ouverte
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    console.log('[Firebase-Messaging-SW] Notification ignorée');
  }
});

// Message handler pour communication avec l'application
self.addEventListener('message', (event) => {
  console.log('[Firebase-Messaging-SW] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'DEBUG_NOTIFICATION') {
    // Afficher une notification de test
    self.registration.showNotification('Test Notification', {
      body: 'Ceci est un test de notification push',
      icon: 'icon-192x192.png',
      badge: 'icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        page: 'dashboard',
        test: true
      }
    });
  }
});

console.log('[Firebase-Messaging-SW] Service Worker chargé avec succès');