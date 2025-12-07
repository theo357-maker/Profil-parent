// sw.js - Service Worker corrigé pour notifications natives
const APP_VERSION = '2.1.0';
const CACHE_NAME = `colombe-cache-v${APP_VERSION}`;
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Fichiers essentiels
const STATIC_CACHE_URLS = [
  '/',
  'index.html',
  'manifest.json',
  'icon-72x72.png',
  'icon-96x96.png',
  'icon-128x128.png',
  'icon-144x144.png',
  'icon-192x192.png',
  'icon-512x512.png'
];

// Installation
self.addEventListener('install', (event) => {
  console.log(`✅ Service Worker installé - Version ${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activé');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
      initializeBackgroundSync()
    ])
  );
});

// Initialiser la synchronisation en arrière-plan
async function initializeBackgroundSync() {
  console.log('🔄 Initialisation synchronisation arrière-plan');
  
  // Vérifier immédiatement
  setTimeout(checkForUpdates, 10000);
  
  // Puis périodiquement
  setInterval(checkForUpdates, SYNC_INTERVAL);
  
  // Utiliser l'API Periodic Background Sync si disponible
  if ('periodicSync' in self.registration) {
    try {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync'
      });
      
      if (status.state === 'granted') {
        await self.registration.periodicSync.register('background-check', {
          minInterval: 24 * 60 * 60 * 1000 // 1 jour minimum
        });
        console.log('✅ Periodic Background Sync enregistré');
      }
    } catch (error) {
      console.log('⚠️ Periodic Sync non disponible:', error);
    }
  }
}

// Vérifier les mises à jour en arrière-plan
async function checkForUpdates() {
  console.log('🔍 Vérification arrière-plan démarrée');
  
  try {
    // Récupérer les données depuis IndexedDB
    const parentData = await getParentData();
    
    if (!parentData) {
      console.log('❌ Pas de données parent');
      return;
    }
    
    // Récupérer le cache des dernières vérifications
    const cache = await caches.open('notifications-cache');
    const lastCheckResponse = await cache.match('last-check');
    const lastCheck = lastCheckResponse ? 
      await lastCheckResponse.text() : 
      new Date(0).toISOString();
    
    // Simuler la récupération de nouvelles données
    // En production, vous utiliserez Firestore REST API
    const newData = await simulateFetchNewData(parentData, lastCheck);
    
    // Afficher des notifications si nouvelles données
    if (newData && newData.length > 0) {
      console.log(`📨 ${newData.length} nouvelles données trouvées`);
      
      newData.forEach(item => {
        showNativeNotification(item.title, item.body, item.data);
      });
    }
    
    // Mettre à jour l'heure de vérification
    await cache.put('last-check', new Response(new Date().toISOString()));
    
  } catch (error) {
    console.error('❌ Erreur vérification:', error);
  }
}

// Récupérer les données parent depuis IndexedDB
async function getParentData() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ParentAppDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('parent')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transtransaction(['parent'], 'readonly');
      const store = transaction.objectStore('parent');
      const getRequest = store.get('currentParent');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      
      getRequest.onerror = () => {
        resolve(null);
      };
    };
    
    request.onerror = () => {
      resolve(null);
    };
  });
}

// Simuler la récupération de nouvelles données
async function simulateFetchNewData(parentData, lastCheck) {
  // Dans la vraie application, vous utiliserez Firestore REST API
  // Pour l'exemple, on simule des données
  
  const mockData = [
    {
      title: '📊 Nouvelle note publiée',
      body: 'Votre enfant a reçu une nouvelle note en Mathématiques',
      data: {
        type: 'grades',
        page: 'grades',
        childId: parentData?.children?.[0]?.matricule || '',
        timestamp: new Date().toISOString()
      }
    },
    {
      title: '📚 Devoir assigné',
      body: 'Un nouveau devoir a été donné en Français',
      data: {
        type: 'homework',
        page: 'homework',
        timestamp: new Date().toISOString()
      }
    }
  ];
  
  // Filtrer par date (simulation)
  const lastCheckDate = new Date(lastCheck);
  return mockData.filter(item => {
    const itemDate = new Date(item.data.timestamp);
    return itemDate > lastCheckDate;
  });
}

// AFFICHER UNE VRAIE NOTIFICATION NATIVE
function showNativeNotification(title, body, data = {}) {
  console.log('🔔 Affichage notification native:', title);
  
  const options = {
    body: body,
    icon: 'icon-192x192.png',
    badge: 'icon-72x72.png',
    data: data,
    tag: data.type || 'notification-' + Date.now(),
    requireInteraction: true, // IMPORTANT: Notification reste visible
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
    silent: false, // IMPORTANT: Fait du bruit
    vibrate: [200, 100, 200, 100, 200], // Vibration sur mobile
    timestamp: Date.now()
  };
  
  // Ajouter l'image pour les navigateurs qui le supportent
  if ('image' in Notification.prototype) {
    options.image = 'icon-512x512.png';
  }
  
  return self.registration.showNotification(title, options);
}

// Gestion des messages depuis l'application
self.addEventListener('message', async (event) => {
  console.log('📨 Message du client:', event.data);
  
  switch (event.data.type) {
    case 'SHOW_NOTIFICATION':
      const { title, body, options } = event.data.data;
      showNativeNotification(title, body, options);
      break;
      
    case 'SAVE_PARENT_DATA':
      await saveParentData(event.data.data);
      break;
      
    case 'CHECK_NOW':
      checkForUpdates();
      break;
      
    case 'TEST_NOTIFICATION':
      showNativeNotification(
        '🔔 Test Notification',
        'Ceci est un test de notification native depuis le Service Worker',
        {
          type: 'test',
          page: 'dashboard',
          test: true
        }
      );
      break;
  }
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification cliquée:', event.notification.data);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    console.log('Notification ignorée');
    return;
  }
  
  // Ouvrir/Se focaliser sur l'application
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Chercher une fenêtre déjà ouverte
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          // Envoyer un message pour naviguer
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData
          });
          return client.focus();
        }
      }
      
      // Ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        let url = 'index.html';
        if (notificationData.page) {
          url += `#${notificationData.page}`;
        }
        return self.clients.openWindow(url);
      }
    })
  );
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background Sync déclenché');
    event.waitUntil(checkForUpdates());
  }
});

// Gestion des notifications push (pour plus tard)
self.addEventListener('push', (event) => {
  console.log('📨 Push reçu');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'CS La Colombe',
      body: 'Nouvelle notification',
      data: {}
    };
  }
  
  showNativeNotification(
    data.title || 'CS La Colombe',
    data.body || 'Nouvelle notification',
    data.data || {}
  );
});

// Fetch (cache)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
        return new Response('Hors ligne', { status: 503 });
      })
  );
});

console.log('✅ Service Worker chargé - Prêt pour notifications natives');