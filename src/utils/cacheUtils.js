/**
 * Utilità per il caching dei dati lato client
 * Questo modulo offre funzioni per memorizzare e recuperare dati dalla cache
 * sia in memoria che in localStorage per migliorare le prestazioni dell'app
 */

// Cache in memoria per i dati che cambiano spesso
const memoryCache = {};

// Durata predefinita della cache in minuti
const DEFAULT_CACHE_DURATION = {
  EVENTS: 5,        // 5 minuti per gli eventi
  TICKETS: 10,      // 10 minuti per i biglietti
  USERS: 30,        // 30 minuti per i dati utente
  STATISTICS: 15    // 15 minuti per le statistiche
};

/**
 * Memorizza un dato nella cache in memoria
 * @param {string} key - Chiave univoca per identificare il dato
 * @param {any} data - I dati da memorizzare
 * @param {number} durationMinutes - Durata in minuti (opzionale)
 */
export const setMemoryCache = (key, data, durationMinutes = 5) => {
  memoryCache[key] = {
    data,
    expiry: Date.now() + (durationMinutes * 60 * 1000)
  };
};

/**
 * Recupera un dato dalla cache in memoria
 * @param {string} key - Chiave del dato da recuperare
 * @returns {any|null} - I dati memorizzati o null se non presenti o scaduti
 */
export const getMemoryCache = (key) => {
  const cachedItem = memoryCache[key];
  
  // Verifica se l'elemento esiste ed è ancora valido
  if (cachedItem && cachedItem.expiry > Date.now()) {
    return cachedItem.data;
  }
  
  // Se scaduto, rimuovi dalla cache
  if (cachedItem) {
    delete memoryCache[key];
  }
  
  return null;
};

/**
 * Memorizza un dato nella cache persistente (localStorage)
 * @param {string} key - Chiave univoca per identificare il dato
 * @param {any} data - I dati da memorizzare
 * @param {number} durationMinutes - Durata in minuti (opzionale)
 */
export const setPersistentCache = (key, data, durationMinutes = 60) => {
  try {
    const cacheItem = {
      data,
      expiry: Date.now() + (durationMinutes * 60 * 1000)
    };
    
    localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    return true;
  } catch (error) {
    console.error('Errore durante il salvataggio nella cache:', error);
    return false;
  }
};

/**
 * Recupera un dato dalla cache persistente (localStorage)
 * @param {string} key - Chiave del dato da recuperare
 * @returns {any|null} - I dati memorizzati o null se non presenti o scaduti
 */
export const getPersistentCache = (key) => {
  try {
    const cachedItemString = localStorage.getItem(`cache_${key}`);
    
    if (!cachedItemString) return null;
    
    const cachedItem = JSON.parse(cachedItemString);
    
    // Verifica se l'elemento è ancora valido
    if (cachedItem.expiry > Date.now()) {
      return cachedItem.data;
    } else {
      // Se scaduto, rimuovi dalla cache
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
  } catch (error) {
    console.error('Errore durante il recupero dalla cache:', error);
    return null;
  }
};

/**
 * Pulisce tutti i dati scaduti dalla cache
 */
export const cleanExpiredCache = () => {
  // Pulisci cache in memoria
  Object.keys(memoryCache).forEach(key => {
    if (memoryCache[key].expiry <= Date.now()) {
      delete memoryCache[key];
    }
  });
  
  // Pulisci cache persistente
  try {
    // Trova tutte le chiavi della cache in localStorage
    const cacheKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('cache_')) {
        cacheKeys.push(key);
      }
    }
    
    // Verifica e rimuovi gli elementi scaduti
    cacheKeys.forEach(key => {
      const cachedItemString = localStorage.getItem(key);
      try {
        const cachedItem = JSON.parse(cachedItemString);
        if (cachedItem.expiry <= Date.now()) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // In caso di errore nel parsing, rimuovi l'elemento
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Errore durante la pulizia della cache:', error);
  }
};

/**
 * Genera una chiave di cache per un evento
 * @param {string} eventId - ID dell'evento
 * @returns {string} - Chiave di cache
 */
export const getEventCacheKey = (eventId) => `event_${eventId}`;

/**
 * Genera una chiave di cache per un biglietto
 * @param {string} ticketCode - Codice del biglietto
 * @returns {string} - Chiave di cache
 */
export const getTicketCacheKey = (ticketCode) => `ticket_${ticketCode}`;

/**
 * Genera una chiave di cache per una lista di eventi
 * @param {string} filter - Filtro applicato (opzionale)
 * @returns {string} - Chiave di cache
 */
export const getEventsListCacheKey = (filter = '') => 
  `events_list${filter ? `_${filter}` : ''}`;

/**
 * Invalida (cancella) un elemento specifico dalla cache
 * @param {string} key - Chiave dell'elemento da invalidare
 */
export const invalidateCache = (key) => {
  // Rimuovi dalla cache in memoria
  if (memoryCache[key]) {
    delete memoryCache[key];
  }
  
  // Rimuovi dalla cache persistente
  try {
    localStorage.removeItem(`cache_${key}`);
  } catch (error) {
    console.error('Errore durante l\'invalidazione della cache:', error);
  }
};

// Esporta costanti di durata della cache
export const CACHE_DURATION = DEFAULT_CACHE_DURATION; 