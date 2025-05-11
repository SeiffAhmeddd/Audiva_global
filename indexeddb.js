// indexeddb.js
// Utility for storing songs and images in IndexedDB

const DB_NAME = 'audiva-db';
const DB_VERSION = 1;
const SONG_STORE = 'songs';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => reject('IndexedDB error: ' + event.target.errorCode);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(SONG_STORE)) {
                const store = db.createObjectStore(SONG_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('title', 'title', { unique: false });
            }
        };
    });
}

// Add a song (with blobs for audio, image, artist image)
async function addSongToDB(songMeta, songBlob, imageBlob, artistImageBlob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([SONG_STORE], 'readwrite');
        const store = tx.objectStore(SONG_STORE);
        const songData = {
            ...songMeta,
            songBlob,
            imageBlob,
            artistImageBlob,
            created: Date.now()
        };
        const req = store.add(songData);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject('Failed to add song: ' + e.target.error);
    });
}

// Get all songs (metadata only, blobs are included)
async function getAllSongsFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([SONG_STORE], 'readonly');
        const store = tx.objectStore(SONG_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject('Failed to get songs: ' + e.target.error);
    });
}

// Get a single song by id
async function getSongById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([SONG_STORE], 'readonly');
        const store = tx.objectStore(SONG_STORE);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject('Failed to get song: ' + e.target.error);
    });
}

// Delete a song by id
async function deleteSongFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([SONG_STORE], 'readwrite');
        const store = tx.objectStore(SONG_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject('Failed to delete song: ' + e.target.error);
    });
}

// Export functions for use in script.js
window.audivaDB = {
    addSongToDB,
    getAllSongsFromDB,
    getSongById,
    deleteSongFromDB
}; 