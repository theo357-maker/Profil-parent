// background-sync.js - Synchronisation en arrière-plan
class BackgroundSyncManager {
    constructor() {
        this.syncInterval = 10 * 60 * 1000; // 30 minutes
        this.lastSync = localStorage.getItem('lastBackgroundSync') || 0;
        this.isSyncing = false;
        
        // Événements pour la visibilité de la page
        this.setupVisibilityEvents();
        
        // Synchronisation périodique
        this.setupPeriodicSync();
    }
    
    setupVisibilityEvents() {
        // Synchroniser quand l'app devient visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.syncIfNeeded();
            }
        });
        
        // Synchroniser quand la page se charge
        window.addEventListener('load', () => {
            setTimeout(() => this.syncIfNeeded(), 5000);
        });
    }
    
    setupPeriodicSync() {
        // Synchroniser toutes les 30 minutes
        setInterval(() => this.syncIfNeeded(), this.syncInterval);
        
        // Utiliser Background Sync API si disponible
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            this.setupBackgroundSyncAPI();
        }
    }
    
    async setupBackgroundSyncAPI() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Enregistrer la synchronisation périodique
            if (registration.periodicSync) {
                const status = await navigator.permissions.query({
                    name: 'periodic-background-sync'
                });
                
                if (status.state === 'granted') {
                    try {
                        await registration.periodicSync.register('check-updates', {
                            minInterval: 24 * 60 * 60 * 1000 // 1 jour
                        });
                        console.log('✅ Synchronisation périodique enregistrée');
                    } catch (error) {
                        console.log('⚠️ Synchronisation périodique non supportée');
                    }
                }
            }
            
            // Synchronisation instantanée
            if (registration.sync) {
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'hidden') {
                        registration.sync.register('background-sync');
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Erreur Background Sync API:', error);
        }
    }
    
    async syncIfNeeded() {
        const now = Date.now();
        const timeSinceLastSync = now - this.lastSync;
        
        // Ne pas synchroniser plus d'une fois toutes les 5 minutes
        if (timeSinceLastSync < 5 * 60 * 1000 || this.isSyncing) {
            return;
        }
        
        this.isSyncing = true;
        console.log('🔄 Synchronisation en arrière-plan...');
        
        try {
            await this.performSync();
            this.lastSync = now;
            localStorage.setItem('lastBackgroundSync', now.toString());
            console.log('✅ Synchronisation terminée');
        } catch (error) {
            console.error('❌ Erreur synchronisation:', error);
        } finally {
            this.isSyncing = false;
        }
    }
    
    async performSync() {
        // Vérifier les nouvelles notes
        await this.checkNewGrades();
        
        // Vérifier les nouveaux incidents
        await this.checkNewIncidents();
        
        // Vérifier les nouveaux devoirs
        await this.checkNewHomework();
        
        // Mettre à jour le cache
        await this.updateCache();
    }
    
    async checkNewGrades() {
        if (!window.currentParent || !window.childrenList) return;
        
        for (const child of window.childrenList) {
            if (child.type === 'secondary') {
                try {
                    // Simuler une vérification
                    console.log(`   📊 Vérification notes pour ${child.fullName}`);
                    
                    // En production, vous feriez une requête à Firestore
                    // const grades = await this.fetchNewGrades(child.matricule);
                    
                } catch (error) {
                    console.error(`Erreur vérification notes ${child.fullName}:`, error);
                }
            }
        }
    }
    
    async checkNewIncidents() {
        // Similaire à checkNewGrades
    }
    
    async checkNewHomework() {
        // Similaire à checkNewGrades
    }
    
    async updateCache() {
        try {
            // Mettre à jour le cache du Service Worker
            if ('caches' in window) {
                const cache = await caches.open('background-sync-cache');
                // Ajouter des ressources au cache si nécessaire
            }
        } catch (error) {
            console.error('Erreur mise à jour cache:', error);
        }
    }
    
    // Envoyer des données au Service Worker
    async sendToServiceWorker(data) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage(data);
        }
    }
}

// Initialiser quand la page est prête
document.addEventListener('DOMContentLoaded', () => {
    window.backgroundSyncManager = new BackgroundSyncManager();
});