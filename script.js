// Load songs from IndexedDB
window.songs = window.songs || [];

// Queue for the player
class Queue {
    constructor() {
        this.songs = [];
    }

    enqueue(song) {
        // Check if song is already in queue to avoid duplicates
        if (!this.contains(song.title)) {
            this.songs.push(song);
            return true; // Song was added
        }
        return false; // Song was already in queue
    }

    dequeue() {
        return this.songs.shift();
    }

    front() {
        return this.songs[0];
    }

    size() {
        return this.songs.length;
    }

    contains(songTitle) {
        return this.songs.some(song => song.title === songTitle);
    }
}

// Playlist class using LinkedList
class Playlist {
    constructor(name) {
        this.name = name;
        this.songs = new LinkedList();
        this.id = Date.now().toString();
    }

    addSong(song) {
        // Check if song already exists in the playlist by id
        let current = this.songs.head;
        while (current) {
            if (current.song.id === song.id) return false;
            current = current.next;
        }
        this.songs.append(song);
        return true;
    }

    removeSong(songId) {
        return this.songs.removeById(songId);
    }

    getSongs() {
        let arr = [];
        let current = this.songs.head;
        while (current) {
            arr.push(current.song);
            current = current.next;
        }
        return arr;
    }

    playAll() {
        const songs = this.getSongs();
        if (songs.length === 0) {
            showNotification('Playlist is empty!', 'var(--primary)', '<i class="fas fa-exclamation-circle"></i>');
            return;
        }
        
        // Clear current queue
        queue.songs = [];
        
        // Add all songs to queue
        songs.forEach(song => queue.enqueue(song));
        
        // Play first song
        playSongFromQueue();
        
        showNotification(`Playing "${this.name}" playlist`, 'var(--primary)', '<i class="fas fa-play"></i>');
    }
}

// Store playlists in localStorage
let playlists = [];

// Load playlists from API
async function loadPlaylists() {
    try {
        const response = await fetch('http://localhost:5000/api/playlists');
        if (!response.ok) {
            throw new Error('Failed to fetch playlists');
        }
        const playlistsData = await response.json();
        playlists = playlistsData.map(data => {
            const playlist = new Playlist(data.name);
            playlist.id = data._id;
            data.songs.forEach(song => {
                playlist.addSong(song);
            });
            return playlist;
        });
        updatePlaylistsList();
    } catch (error) {
        console.error('Error loading playlists:', error);
        showNotification('Failed to load playlists', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
    }
}

// Save playlists to localStorage
function savePlaylists() {
    const playlistsData = playlists.map(playlist => ({
        name: playlist.name,
        songs: playlist.getSongs()
    }));
    localStorage.setItem('playlists', JSON.stringify(playlistsData));
}

// Create a new playlist
async function createPlaylist(name) {
    try {
        const response = await fetch('http://localhost:5000/api/playlists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            throw new Error('Failed to create playlist');
        }

        const playlistData = await response.json();
        const playlist = new Playlist(name);
        playlist.id = playlistData._id;
        playlists.push(playlist);
        updatePlaylistsList();
        showNotification('Playlist created successfully!');
    } catch (error) {
        console.error('Error creating playlist:', error);
        showNotification('Failed to create playlist', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
    }
}

// Delete a playlist
async function deletePlaylist(index) {
    try {
        const playlist = playlists[index];
        const response = await fetch(`http://localhost:5000/api/playlists/${playlist.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete playlist');
        }

        playlists.splice(index, 1);
        updatePlaylistsList();
        showNotification('Playlist deleted successfully!');
    } catch (error) {
        console.error('Error deleting playlist:', error);
        showNotification('Failed to delete playlist', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
    }
}

// Update playlists list in UI
function updatePlaylistsList() {
    const playlistsList = document.getElementById('playlists-list');
    playlistsList.innerHTML = '';

    if (playlists.length === 0) {
        playlistsList.innerHTML = `
            <div class="sidebar-item">
                <i class="fas fa-music" style="color: var(--primary); margin-right: 12px; font-size: 18px;"></i>
                <div class="sidebar-item-info">
                    <div class="sidebar-item-title">No playlists yet</div>
                    <div class="sidebar-item-subtitle">Click + to create one</div>
                </div>
            </div>
        `;
        return;
    }

    playlists.forEach((playlist, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        playlistItem.innerHTML = `
            <i class="fas fa-music playlist-icon"></i>
            <div class="playlist-info">
                <span class="playlist-name">${playlist.name}</span>
                <span class="playlist-song-count">${playlist.getSongs().length} songs</span>
            </div>
            <div class="playlist-actions">
                <button class="playlist-action-btn" onclick="playlists[${index}].playAll()" title="Play All">
                    <i class="fas fa-play"></i>
                </button>
                <button class="playlist-action-btn" onclick="showPlaylistSongs(${index})" title="View Songs">
                    <i class="fas fa-list"></i>
                </button>
                <button class="playlist-action-btn" onclick="deletePlaylist(${index})" title="Delete Playlist">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        playlistsList.appendChild(playlistItem);
    });
}

// Show songs in a playlist
function showPlaylistSongs(index) {
    const playlist = playlists[index];
    const songs = playlist.getSongs();
    
    const modal = document.createElement('div');
    modal.className = 'playlist-modal';
    modal.innerHTML = `
        <div class="playlist-modal-content">
            <div class="playlist-modal-header">
                <h3 class="playlist-modal-title">${playlist.name}</h3>
                <div class="playlist-modal-actions">
                    <button class="playlist-action-btn play-all-btn" title="Play All">
                        <i class="fas fa-play"></i> Play All
                    </button>
                    <button class="close-playlist-modal">&times;</button>
                </div>
            </div>
            <div class="playlist-songs">
                ${songs.length ? songs.map(song => `
                    <div class="song-item" data-song-id="${song.id}">
                        <img src="${song.image}" alt="${song.title}" class="song-item-image">
                        <div class="song-item-info">
                            <span class="song-title">${song.title}</span>
                            <span class="song-artist">${song.artist}</span>
                        </div>
                        <div class="song-item-actions">
                            <button class="playlist-action-btn play-btn" title="Play">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="playlist-action-btn remove-btn" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `).join('') : '<p class="empty-message">No songs in this playlist</p>'}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Add event listeners
    const closeBtn = modal.querySelector('.close-playlist-modal');
    closeBtn.onclick = () => modal.remove();

    const playAllBtn = modal.querySelector('.play-all-btn');
    playAllBtn.onclick = () => {
        playlist.playAll();
        modal.remove();
    };

    // Add event listeners for each song item
    const songItems = modal.querySelectorAll('.song-item');
    songItems.forEach(item => {
        // Play button
        const playBtn = item.querySelector('.play-btn');
        playBtn.onclick = (e) => {
            e.stopPropagation();
            const songId = item.dataset.songId;
            const song = songs.find(s => String(s.id) === String(songId));
            if (song) {
                // Clear queue and add this song
                queue.songs = [];
                queue.enqueue(song);
                playSongFromQueue();
                modal.remove();
            }
        };

        // Remove button
        const removeBtn = item.querySelector('.remove-btn');
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            const songId = item.dataset.songId;
            if (playlist.removeSong(songId)) {
                savePlaylists();
                item.remove();
                if (playlist.getSongs().length === 0) {
                    modal.querySelector('.playlist-songs').innerHTML = '<p class="empty-message">No songs in this playlist</p>';
                }
                showNotification('Song removed from playlist', 'var(--primary)', '<i class="fas fa-check"></i>');
            }
        };
    });

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Show playlist selection menu
function showPlaylistSelectionMenu(song) {
    // Remove any existing menu
    const existingMenu = document.getElementById('playlist-selection-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'playlist-selection-menu';
    menu.className = 'playlist-selection-menu';
    menu.innerHTML = `
        <div class="playlist-selection-header">Add to Playlist</div>
        <ul class="playlist-selection-list">
            ${playlists.length === 0 ? '<li class="empty">No playlists yet</li>' : playlists.map((playlist, idx) => `
                <li data-idx="${idx}">
                    <i class="fas fa-music"></i> ${playlist.name}
                </li>
            `).join('')}
        </ul>
        <button class="create-playlist-btn">+ Create New Playlist</button>
        <button class="close-playlist-selection">Close</button>
    `;
    document.body.appendChild(menu);

    // Position the menu near the mouse (center of screen fallback)
    menu.style.top = '30vh';
    menu.style.left = '50vw';
    menu.style.position = 'fixed';
    menu.style.zIndex = 2000;

    // Add event listeners
    menu.querySelectorAll('.playlist-selection-list li[data-idx]').forEach(li => {
        li.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-idx'));
            if (addToPlaylist(idx, song)) {
                showNotification('Song added to playlist!');
            } else {
                showNotification('Song already in playlist!');
            }
            menu.remove();
        });
    });
    menu.querySelector('.create-playlist-btn').addEventListener('click', function() {
        menu.remove();
        document.getElementById('add-playlist-btn').click();
    });
    menu.querySelector('.close-playlist-selection').addEventListener('click', function() {
        menu.remove();
    });
    // Remove menu on outside click
    setTimeout(() => {
        document.addEventListener('click', function handler(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', handler);
            }
        });
    }, 0);
}

// Add song to playlist
async function addToPlaylist(playlistIndex, song) {
    try {
        const playlist = playlists[playlistIndex];
        const response = await fetch(`http://localhost:5000/api/playlists/${playlist.id}/songs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ songId: song._id })
        });

        if (!response.ok) {
            throw new Error('Failed to add song to playlist');
        }

        if (playlist.addSong(song)) {
            updatePlaylistsList();
            showNotification('Song added to playlist!');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        showNotification('Failed to add song to playlist', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
        return false;
    }
}

// Initialize playlist functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load saved playlists
    loadPlaylists();
    updatePlaylistsList();
    
    // Add playlist button click handler
    const addPlaylistBtn = document.getElementById('add-playlist-btn');
    const playlistModal = document.getElementById('playlist-modal');
    const closePlaylistModal = document.getElementById('close-playlist-modal');
    const playlistForm = document.getElementById('playlist-form');

    addPlaylistBtn.addEventListener('click', () => {
        playlistModal.style.display = 'block';
    });

    closePlaylistModal.addEventListener('click', () => {
        playlistModal.style.display = 'none';
    });

    playlistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const playlistName = document.getElementById('playlist-name').value.trim();
        if (playlistName) {
            createPlaylist(playlistName);
            playlistModal.style.display = 'none';
            playlistForm.reset();
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === playlistModal) {
            playlistModal.style.display = 'none';
        }
    });
});

const queue = new Queue();

// Linked List for Favorites
class LinkedList {
    constructor() {
        this.head = null;
    }

    append(song) {
        const newNode = { song, next: null };
        if (!this.head) {
            this.head = newNode;
        } else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }
    }

    remove(songTitle) {
        let current = this.head;
        let prev = null;

        while (current) {
            if (current.song.title === songTitle) {
                if (prev) {
                    prev.next = current.next;
                } else {
                    this.head = current.next;
                }
                return true;
            }
            prev = current;
            current = current.next;
        }
        return false;
    }

    removeById(songId) {
        let current = this.head;
        let prev = null;
        while (current) {
            if (String(current.song.id) === String(songId)) {
                if (prev) {
                    prev.next = current.next;
                } else {
                    this.head = current.next;
                }
                return true;
            }
            prev = current;
            current = current.next;
        }
        return false;
    }

    contains(songTitle) {
        let current = this.head;
        while (current) {
            if (current.song.title === songTitle) {
                return true;
            }
            current = current.next;
        }
        return false;
    }
}

const favoritesList = new LinkedList();

let currentSongIndex = 0;
const audioElement = document.getElementById('audio');
const playPauseButton = document.getElementById('play-pause');
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const rewindButton = document.getElementById('rewind');
const forwardButton = document.getElementById('forward');
const songList = document.getElementById('song-list');
const progressBar = document.getElementById('progress');
const currentTimeElement = document.getElementById('current-time');
const durationElement = document.getElementById('duration');
const volumeSlider = document.querySelector('.volume-slider');
const volumeIcon = document.querySelector('.volume-icon');

// Tab system variables
let currentView = 'all'; // 'all', 'albums', 'artists'
const tabButtons = document.querySelectorAll('.tab');

// Initialize tab buttons
tabButtons.forEach(tab => {
    tab.addEventListener('click', function() {
        // Remove active class from all tabs
        tabButtons.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        this.classList.add('active');
        
        // Set current view based on tab text
        const tabText = this.textContent.toLowerCase();
        currentView = tabText;
        
        // Load appropriate view
        loadView(currentView);
    });
});

// Load appropriate view based on selected tab
function loadView(view) {
    songList.innerHTML = "";
    
    switch(view) {
        case 'all':
            loadSongs();
            break;
        case 'albums':
            loadAlbums();
            break;
        case 'artists':
            loadArtists();
            break;
        default:
            loadSongs();
    }
}

// Load albums view
function loadAlbums() {
    const albums = [...new Set(window.songs.map(song => song.album))];
    
    // Display albums
    albums.forEach(album => {
        const albumSongs = window.songs.filter(song => song.album === album);
        const albumImage = albumSongs[0].image; // Use the first song's image as album cover
        
        const albumElement = document.createElement('div');
        albumElement.classList.add('song');
        albumElement.innerHTML = `
            <img src="${albumImage}" alt="${album}">
            <div class="song-title">${album}</div>
        `;
        
        // When album is clicked, show all songs from this album
        albumElement.addEventListener('click', function() {
            showAlbumSongs(album, albumImage);
        });
        
        songList.appendChild(albumElement);
    });
}

// Show songs from a specific album
function showAlbumSongs(albumName, albumImage) {
    // Store the previous view to enable going back
    const previousView = currentView;
    
    // Clear the song list
    songList.innerHTML = "";
    
    // Add back button
    const backButton = document.createElement('div');
    backButton.classList.add('back-button');
    backButton.innerHTML = `
        <div class="library-header" style="cursor: pointer;">
            <div class="library-title">
                <i class="fas fa-arrow-left"></i> Back to ${previousView}
            </div>
            <div class="album-title">${albumName}</div>
        </div>
    `;
    backButton.addEventListener('click', function() {
        loadView(previousView);
    });
    
    songList.appendChild(backButton);
    
    // Show album songs
    const albumSongs = window.songs.filter(song => song.album === albumName);
    albumSongs.forEach((song) => {
        const songElement = document.createElement('div');
        songElement.classList.add('song');
        songElement.innerHTML = `
            <img src="${song.image}" alt="${song.title}">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
        `;
        
        // Modified event handler for song click
        songElement.addEventListener('click', function() {
            if (queue.contains(song.title)) {
                // If song is already in queue, play it
                const indexInQueue = queue.songs.findIndex(queuedSong => queuedSong.title === song.title);
                if (indexInQueue !== -1) {
                    // If it's not the first song in queue, move it to the front
                    if (indexInQueue > 0) {
                        const songToPlay = queue.songs.splice(indexInQueue, 1)[0];
                        queue.songs.unshift(songToPlay);
                    }
                    playSongFromQueue();
                }
            } else {
                // First click - add to queue
                addToQueue(song);
                showNotification(`"${song.title}" added to queue. Click again to play.`, 'var(--primary)', '<i class="fas fa-plus"></i>');
            }
        });
        
        songList.appendChild(songElement);
    });
}

// Load artists view
function loadArtists() {
    const artists = [...new Set(window.songs.map(song => song.artist))];
    
    // Display artists
    artists.forEach(artist => {
        const artistSongs = window.songs.filter(song => song.artist === artist);
        const artistImage = artistSongs[0].artist_image; // Use the first song's image
        
        const artistElement = document.createElement('div');
        artistElement.classList.add('song');
        artistElement.innerHTML = `
            <img src="${artistImage}" alt="${artist}">
            <div class="song-title">${artist}</div>
        `;
        
        // When artist is clicked, show all songs from this artist
        artistElement.addEventListener('click', function() {
            showArtistSongs(artist, artistImage);
        });
        
        songList.appendChild(artistElement);
    });
}

// Show songs from a specific artist
function showArtistSongs(artistName, artistImage) {
    // Store the previous view to enable going back
    const previousView = currentView;
    
    // Clear the song list
    songList.innerHTML = "";
    
    // Add back button
    const backButton = document.createElement('div');
    backButton.classList.add('back-button');
    backButton.innerHTML = `
        <div class="library-header" style="cursor: pointer;">
            <div class="library-title">
                <i class="fas fa-arrow-left"></i> Back to ${previousView}
            </div>
            <div class="artist-title">${artistName}</div>
        </div>
    `;
    backButton.addEventListener('click', function() {
        loadView(previousView);
    });
    
    songList.appendChild(backButton);
    
    // Show artist songs grouped by albums
    const artistSongs = window.songs.filter(song => song.artist === artistName);
    
    // Group songs by album
    const albums = [...new Set(artistSongs.map(song => song.album))];
    
    albums.forEach(album => {
        // Album header
        const albumHeader = document.createElement('div');
        albumHeader.classList.add('album-header');
        albumHeader.innerHTML = `
            <h3 class="album-name">${album}</h3>
        `;
        songList.appendChild(albumHeader);
        
        // Songs in this album
        const albumSongs = artistSongs.filter(song => song.album === album);
        albumSongs.forEach((song) => {
            const songElement = document.createElement('div');
            songElement.classList.add('song');
            songElement.innerHTML = `
                <img src="${song.image}" alt="${song.title}">
                <div class="song-title">${song.title}</div>
            `;
            
            // Modified event handler for song click
            songElement.addEventListener('click', function() {
                if (queue.contains(song.title)) {
                    // If song is already in queue, play it
                    const indexInQueue = queue.songs.findIndex(queuedSong => queuedSong.title === song.title);
                    if (indexInQueue !== -1) {
                        // If it's not the first song in queue, move it to the front
                        if (indexInQueue > 0) {
                            const songToPlay = queue.songs.splice(indexInQueue, 1)[0];
                            queue.songs.unshift(songToPlay);
                        }
                        playSongFromQueue();
                    }
                } else {
                    // First click - add to queue
                    addToQueue(song);
                    showNotification(`"${song.title}" added to queue. Click again to play.`, 'var(--primary)', '<i class="fas fa-plus"></i>');
                }
            });
            
            songList.appendChild(songElement);
        });
    });
}

// Load songs into the UI
function loadSongs() {
    songList.innerHTML = "";
    window.songs.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.classList.add('song');
        songElement.innerHTML = `
            <img src="${song.image}" alt="${song.title}">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}</div>
            <div class="song-actions">
                <button class="add-to-playlist-btn" title="Add to Playlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="delete-song-btn" title="Delete Song">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Play on click (not on action buttons)
        songElement.addEventListener('click', function(e) {
            if (e.target.closest('.song-actions')) return;
            if (queue.contains(song.title)) {
                const indexInQueue = queue.songs.findIndex(queuedSong => queuedSong.title === song.title);
                if (indexInQueue !== -1) {
                    if (indexInQueue > 0) {
                        const songToPlay = queue.songs.splice(indexInQueue, 1)[0];
                        queue.songs.unshift(songToPlay);
                    }
                    playSongFromQueue();
                }
            } else {
                addToQueue(song);
                showNotification(`"${song.title}" added to queue. Click again to play.`, 'var(--primary)', '<i class="fas fa-plus"></i>');
            }
        });

        // Add to playlist button
        const addToPlaylistBtn = songElement.querySelector('.add-to-playlist-btn');
        addToPlaylistBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showPlaylistSelectionMenu(song);
        });

        // Delete button logic
        const deleteBtn = songElement.querySelector('.delete-song-btn');
        deleteBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            if (!confirm(`Are you sure you want to delete "${song.title}"?`)) return;
            try {
                await window.audivaDB.deleteSongFromDB(song.id);
                // Remove from queue
                queue.songs = queue.songs.filter(qs => qs.id !== song.id);
                // Remove from favorites
                favorites = favorites.filter(f => !(f.title === song.title && f.artist === song.artist));
                saveFavorites();
                // Remove from all playlists
                playlists.forEach(playlist => {
                    playlist.removeSong(song.id);
                });
                savePlaylists();
                // If currently playing, stop
                if (window.songs[currentSongIndex] && window.songs[currentSongIndex].id === song.id) {
                    audioElement.pause();
                    audioElement.src = '';
                    document.getElementById('current-song-title').textContent = 'Not Playing';
                    document.getElementById('current-album-art').src = 'Photos/Spotify_icon.png';
                    document.querySelector('.song-info .artist').textContent = 'Select a song to play';
                }
                await loadSongsFromIndexedDB();
                showNotification('Song deleted successfully!', 'var(--primary)', '<i class="fas fa-trash"></i>');
            } catch (err) {
                showNotification(err.message || 'Failed to delete song.', 'var(--primary)', '<i class="fas fa-trash"></i>');
            }
        });
        songList.appendChild(songElement);
    });
}

// Add notification system
function showNotification(message, color, iconHtml) {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.position = 'fixed';
        notification.style.top = '60px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = color || 'var(--primary)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 3000);
        document.body.appendChild(notification);
    }
    // Set message and show
    notification.innerHTML = (iconHtml ? `<span style='margin-right:8px;'>${iconHtml}</span>` : '') + `<span style='font-weight:600;'>${message}</span>`;
    notification.style.opacity = '1';
    notification.style.backgroundColor = color || 'var(--primary)';
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 3000);
}

// Add song to queue
function addToQueue(song) {
    if (queue.enqueue(song)) {
        updateQueue();
        return true;
    }
    return false;
}

// Play song by index - now only used for direct playback controls
function playSong(index) {
    currentSongIndex = index;
    const song = window.songs[index];
    
    // Add to queue if not already there
    addToQueue(song);
    
    // Play it
    audioElement.src = song.url; // This will now be a data URL
    audioElement.load();
    audioElement.play().catch(error => {
        console.error('Error playing audio:', error);
        showNotification('Click the play button to start playback', 'var(--primary)', '<i class="fas fa-play"></i>');
    });
    playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';

    // Update duration text
    audioElement.onloadedmetadata = () => {
        durationElement.textContent = formatTime(audioElement.duration);
    };
    
    // Update now playing display
    updateNowPlaying(song);
    updateQueue();
}

// Play/Pause button
playPauseButton.addEventListener('click', () => {
    if (audioElement.paused) {
        if (audioElement.src) {
            audioElement.play().catch(error => {
                console.error('Error playing audio:', error);
                showNotification('Error playing audio', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
            });
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        } else if (queue.size() > 0) {
            // If nothing is playing but queue has songs, play first song
            playSongFromQueue();
        }
    } else {
        audioElement.pause();
        playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    }
});

// Skip 10 seconds back
rewindButton.addEventListener('click', () => {
    audioElement.currentTime = Math.max(audioElement.currentTime - 10, 0);
});

// Skip 10 seconds forward
forwardButton.addEventListener('click', () => {
    audioElement.currentTime = Math.min(audioElement.currentTime + 10, audioElement.duration);
});

// Next button
nextButton.addEventListener('click', () => {
    // Remove current song from queue
    if (queue.size() > 0) {
        queue.dequeue();
    }
    
    // Play next song in queue or move to next song in library
    if (queue.size() > 0) {
        playSongFromQueue();
    } else {
        currentSongIndex = (currentSongIndex + 1) % window.songs.length;
        playSong(currentSongIndex);
    }
});

// Previous button
prevButton.addEventListener('click', () => {
    currentSongIndex = (currentSongIndex - 1 + window.songs.length) % window.songs.length;
    playSong(currentSongIndex);
});

// Format time as mm:ss
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Update progress bar and green line
audioElement.ontimeupdate = () => {
    const current = audioElement.currentTime;
    const duration = audioElement.duration;
  
    if (!isNaN(duration)) {
      const percent = (current / duration) * 100;
      progressBar.value = percent;
  
      // Update progress bar with green fill
      progressBar.style.background = `linear-gradient(to right, #8A2BE2 ${percent}%, #2d2d2d ${percent}%)`;
  
      // Update time display
      currentTimeElement.textContent = formatTime(current);
    }
};
  
// Handle progress bar input (click or drag)
progressBar.addEventListener('input', (e) => {
    audioElement.currentTime = (e.target.value / 100) * audioElement.duration;
});

// Update now playing information
function updateNowPlaying(song) {
    // Always get the latest song object from window.songs by title
    const freshSong = window.songs.find(s => s.title === song.title && s.artist === song.artist);
    const imageUrl = freshSong ? freshSong.image : song.image;
    document.getElementById('current-song-title').textContent = song.title;
    document.getElementById('current-album-art').src = imageUrl;
    document.querySelector('.song-info .artist').textContent = song.artist;
    // Update favorite button
    updateFavoriteButton(song);
}

// Update favorite button state
function updateFavoriteButton(song) {
    const favoriteButton = document.getElementById('favorite-button');
    const favoriteIcon = favoriteButton.querySelector('i');
    // Check if the song is in favorites
    const isFavorite = favorites.some(f => f.title === song.title && f.artist === song.artist);
    if (isFavorite) {
        favoriteIcon.classList.remove('far');
        favoriteIcon.classList.add('fas');
        favoriteIcon.style.color = '#ff4081'; // red/pink
        favoriteButton.classList.add('active');
    } else {
        favoriteIcon.classList.remove('fas');
        favoriteIcon.classList.add('far');
        favoriteIcon.style.color = '';
        favoriteButton.classList.remove('active');
    }
}

// Favorite button functionality
document.getElementById('favorite-button').addEventListener('click', function() {
    const currentSong = window.songs[currentSongIndex];
    
    if (favoritesList.contains(currentSong.title)) {
        favoritesList.remove(currentSong.title);
        this.innerHTML = '<i class="far fa-heart"></i>';
        this.classList.remove('active');
    } else {
        favoritesList.append(currentSong);
        this.innerHTML = '<i class="fas fa-heart" style="color: #ff4081;"></i>';
        this.classList.add('active');
    }
    
    updateFavorites();
});

// Update favorites list in UI (localStorage version)
function updateFavoritesList() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        favoritesList.innerHTML = `
            <div class="sidebar-item">
                <i class="fas fa-music" style="color: var(--primary); margin-right: 12px; font-size: 18px;"></i>
                <div class="sidebar-item-info">
                    <div class="sidebar-item-title">No favorites yet</div>
                    <div class="sidebar-item-subtitle">Click the heart icon to add</div>
                </div>
            </div>
        `;
        return;
    }
    favorites.forEach(fav => {
        // Find the song in window.songs by title and artist
        const song = window.songs.find(s => s.title === fav.title && s.artist === fav.artist);
        if (!song) return; // skip if not found
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'sidebar-item';
        favoriteItem.setAttribute('data-song-id', fav.id || '');
        favoriteItem.innerHTML = `
            <img src="${song.image}" alt="${song.title}">
            <div class="sidebar-item-info">
                <div class="sidebar-item-title">${song.title}</div>
                <div class="sidebar-item-subtitle">${song.artist}</div>
            </div>
            <button class="favorite-btn active">
                <i class="fas fa-times"></i>
            </button>
        `;
        // Add click event to play the song when clicked
        favoriteItem.addEventListener('click', function() {
            const index = window.songs.findIndex(s => s.title === song.title && s.artist === song.artist);
            if (index !== -1) {
                playSong(index);
            }
        });
        // Remove button
        const removeBtn = favoriteItem.querySelector('.favorite-btn');
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            favorites = favorites.filter(f => !(f.title === song.title && f.artist === song.artist));
            saveFavorites();
            updateFavoritesList();
            if (window.songs[currentSongIndex].title === song.title) {
                document.getElementById('favorite-button').innerHTML = '<i class="far fa-heart"></i>';
            }
        });
        favoritesList.appendChild(favoriteItem);
    });
}

// Update favorite button logic to only store title/artist
function setupFavoriteButton() {
    const favoriteButton = document.getElementById('favorite-button');
    const favoriteIcon = favoriteButton.querySelector('i');
    favoriteButton.addEventListener('click', function() {
        const currentSong = window.songs[currentSongIndex];
        if (!currentSong) return;
        // Check if the song is already in favorites
        const songIndex = favorites.findIndex(f => f.title === currentSong.title && f.artist === currentSong.artist);
        if (songIndex === -1) {
            // Add to favorites (only title/artist)
            favorites.push({
                title: currentSong.title,
                artist: currentSong.artist
            });
            favoriteIcon.classList.remove('far');
            favoriteIcon.classList.add('fas');
            favoriteIcon.style.color = '#ff4081';
            showNotification('Added to Favorites', 'var(--primary)', '<i class="fas fa-heart"></i>');
        } else {
            // Remove from favorites
            favorites.splice(songIndex, 1);
            favoriteIcon.classList.remove('fas');
            favoriteIcon.classList.add('far');
            favoriteIcon.style.color = '';
            showNotification('Removed from Favorites', 'var(--primary)', '<i class="fas fa-heart"></i>');
        }
        saveFavorites();
        updateFavoritesList();
        updateFavoriteButton(currentSong);
    });
}

// Function to save favorites to localStorage
function saveFavorites() {
    localStorage.setItem('soundwave-favorites', JSON.stringify(favorites));
}

// Play the song at the front of the queue
function playSongFromQueue() {
    if (queue.size() > 0) {
        const song = queue.front();
        const index = window.songs.findIndex(s => s.id === song.id);
        if (index !== -1) {
            currentSongIndex = index;
            audioElement.src = song.url;
            audioElement.load();
            audioElement.play().catch(error => {
                console.error('Error playing audio:', error);
                showNotification('Click the play button to start playback', 'var(--primary)', '<i class="fas fa-play"></i>');
            });
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
            
            // Update duration text
            audioElement.onloadedmetadata = () => {
                durationElement.textContent = formatTime(audioElement.duration);
            };
            
            // Update now playing display
            updateNowPlaying(song);
            updateQueue();
        }
    }
}

// Add Song Modal Functionality
const addSongBtn = document.querySelector('.add-song-btn');
const modal = document.getElementById('add-song-modal');
const closeModal = document.querySelector('.close-modal');
const addSongForm = document.getElementById('add-song-form');

// Only open the modal when the Add Song button is clicked
addSongBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

// Close modal when X is clicked
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Update form submission to use API
addSongForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const songFile = songFileInput.files[0];
    const imageFile = imageFileInput.files[0];
    const artistImageFile = artistImageFileInput.files[0];

    if (!songFile || !imageFile || !artistImageFile) {
        showNotification('Please upload all required files', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
        return;
    }

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('title', document.getElementById('song-title').value.trim());
        formData.append('artist', document.getElementById('song-artist').value.trim());
        formData.append('album', document.getElementById('song-album').value.trim());
        formData.append('songFile', songFile);
        formData.append('imageFile', imageFile);
        formData.append('artistImageFile', artistImageFile);

        // Send to API
        const response = await fetch('http://localhost:5000/api/songs', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload song');
        }

        // Reload songs
        await loadSongsFromAPI();

        // Close modal and reset form
        modal.style.display = 'none';
        addSongForm.reset();
        document.getElementById('song-file-name').textContent = '';
        document.getElementById('image-preview').innerHTML = '';
        document.getElementById('artist-image-preview').innerHTML = '';
        
        showNotification('Song added successfully!', 'var(--primary)', '<i class="fas fa-check"></i>');
    } catch (error) {
        console.error('Error adding song:', error);
        showNotification(error.message || 'Error adding song. Please try again.', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
    }
});

// Load songs from API
async function loadSongsFromAPI() {
    try {
        const response = await fetch('http://localhost:5000/api/songs');
        if (!response.ok) {
            throw new Error('Failed to fetch songs');
        }
        const songs = await response.json();
        window.songs = songs.map(song => ({
            ...song,
            url: song.songUrl,
            image: song.imageUrl,
            artist_image: song.artistImageUrl
        }));
        loadPlaylists();
        updatePlaylistsList();
        loadView(currentView);
        updateFavoritesList();
    } catch (error) {
        console.error('Error loading songs:', error);
        showNotification('Failed to load songs', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
    }
}

// Delete song from API
async function deleteSongFromAPI(songId) {
    try {
        const response = await fetch(`http://localhost:5000/api/songs/${songId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete song');
        }
        return true;
    } catch (error) {
        console.error('Error deleting song:', error);
        throw error;
    }
}

// Load songs from IndexedDB and update the UI
async function loadSongsFromIndexedDB() {
    try {
        const dbSongs = await window.audivaDB.getAllSongsFromDB();
        window.songs = dbSongs.map(song => ({
            ...song,
            url: URL.createObjectURL(song.songBlob),
            image: URL.createObjectURL(song.imageBlob),
            artist_image: URL.createObjectURL(song.artistImageBlob)
        }));
        loadPlaylists();
        updatePlaylistsList();
        loadView(currentView);
        updateFavoritesList();
    } catch (error) {
        console.error('Error loading songs from IndexedDB:', error);
    }
}

// On page load, load songs from IndexedDB
window.addEventListener('DOMContentLoaded', () => {
    modal.style.display = 'none';
    loadSongsFromIndexedDB();
});

// Drag and Drop Functionality
const songDropZone = document.getElementById('song-drop-zone');
const imageDropZone = document.getElementById('image-drop-zone');
const artistImageDropZone = document.getElementById('artist-image-drop-zone');
const songFileInput = document.getElementById('song-file');
const imageFileInput = document.getElementById('image-file');
const artistImageFileInput = document.getElementById('artist-image-file');

// Function to handle drag and drop events
function setupDropZone(dropZone, fileInput, previewElement, isImage = false) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener('click', unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('dragover');
    }

    function unhighlight() {
        dropZone.classList.remove('dragover');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (isImage) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        previewElement.innerHTML = '';
                        previewElement.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                } else {
                    showNotification('Please drop an image file', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
                }
            } else {
                if (file.type.startsWith('audio/')) {
                    const fileName = document.getElementById('song-file-name');
                    fileName.textContent = file.name;
                } else {
                    showNotification('Please drop an audio file', 'var(--primary)', '<i class="fas fa-exclamation-triangle"></i>');
                }
            }
            fileInput.files = files;
        }
    }
}

// Setup drop zones
setupDropZone(songDropZone, songFileInput, document.getElementById('song-file-name'));
setupDropZone(imageDropZone, imageFileInput, document.getElementById('image-preview'), true);
setupDropZone(artistImageDropZone, artistImageFileInput, document.getElementById('artist-image-preview'), true);

// Mobile Navigation Bar Functionality
// Add this to the end of your script.js file

// Mobile navigation handler
document.addEventListener('DOMContentLoaded', function() {
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    const sidebar = document.querySelector('.sidebar');
    const library = document.querySelector('.library');
    
    if (mobileNavItems.length > 0) {
        mobileNavItems.forEach(item => {
            item.addEventListener('click', function() {
                // Remove active class from all items
                mobileNavItems.forEach(navItem => navItem.classList.remove('active'));
                
                // Add active class to clicked item
                this.classList.add('active');
                
                // Handle navigation based on which item was clicked
                const itemType = this.querySelector('span').textContent.toLowerCase();
                handleMobileNavigation(itemType);
            });
        });
    }
    
    // Function to handle mobile navigation
    function handleMobileNavigation(navType) {
        switch(navType) {
            case 'home':
                // Show library, hide sidebar sections or show them in compact form
                library.style.display = 'block';
                if (window.innerWidth <= 768) {
                    sidebar.style.maxHeight = '180px';
                }
                break;
                
            case 'search':
                // Focus on search input
                document.getElementById('search').focus();
                break;
                
            case 'favorites':
                // Expand favorites section, collapse others
                if (window.innerWidth <= 480) {
                    // On very small screens, hide library and show only favorites
                    library.style.display = 'none';
                    sidebar.style.maxHeight = 'none';
                    
                    // Hide queue section
                    document.querySelectorAll('.sidebar-section')[1].style.display = 'none';
                    document.querySelectorAll('.sidebar-section')[0].style.display = 'block';
                }
                break;
                
            case 'queue':
                // Expand queue section, collapse others
                if (window.innerWidth <= 480) {
                    // On very small screens, hide library and show only queue
                    library.style.display = 'none';
                    sidebar.style.maxHeight = 'none';
                    
                    // Hide favorites section
                    document.querySelectorAll('.sidebar-section')[0].style.display = 'none';
                    document.querySelectorAll('.sidebar-section')[1].style.display = 'block';
                }
                break;
        }
    }
    
    // Return to normal view when window is resized back to desktop size
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // Reset any mobile-specific styles
            library.style.display = 'block';
            sidebar.style.maxHeight = '';
            document.querySelectorAll('.sidebar-section').forEach(section => {
                section.style.display = 'block';
            });
        }
    });
    
    // Mini-player mode toggle for landscape orientation
    function checkOrientation() {
        if (window.innerHeight < 500 && window.innerWidth < 768) {
            // Landscape mode on a small device - use mini player
            document.body.classList.add('landscape-mode');
        } else {
            document.body.classList.remove('landscape-mode');
        }
    }
    
    // Check orientation on load and resize
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    
    // Double tap to play for mobile
    let lastTap = 0;
    const songElements = document.querySelectorAll('.song');
    
    songElements.forEach(song => {
        song.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                // Double tap detected
                e.preventDefault();
                
                // Extract song information from the element
                const songTitle = this.querySelector('.song-title').textContent;
                const songIndex = window.songs.findIndex(s => s.title === songTitle);
                
                if (songIndex !== -1) {
                    playSong(songIndex);
                }
            }
            
            lastTap = currentTime;
        });
    });
});

// Global variables for favorites
let favorites = [];

// Load favorites from localStorage when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadFavorites();
    setupFavoriteButton();
});

// Function to load favorites from localStorage
function loadFavorites() {
    // Get favorites from localStorage
    const savedFavorites = localStorage.getItem('soundwave-favorites');
    
    // If there are saved favorites, parse them
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
        updateFavoritesList();
    }
}

// Update queue list in UI
function updateQueue() {
    const queueList = document.getElementById('queue-list');
    queueList.innerHTML = '';
    
    if (queue.size() === 0) {
        queueList.innerHTML = `
            <div class="sidebar-item">
                <i class="fas fa-music" style="color: var(--primary); margin-right: 12px; font-size: 18px;"></i>
                <div class="sidebar-item-info">
                    <div class="sidebar-item-title">Queue is empty</div>
                    <div class="sidebar-item-subtitle">Play songs to add to queue</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Create a copy of the queue to display
    const queueCopy = [...queue.songs];
    queueCopy.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.classList.add('sidebar-item');
        songElement.innerHTML = `
            <img src="${song.image}" alt="${song.title}">
            <div class="sidebar-item-info">
                <div class="sidebar-item-title">${song.title}</div>
                <div class="sidebar-item-subtitle">${index === 0 ? 'Now Playing' : 'Coming up'}</div>
            </div>
            <button class="favorite-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add click to play functionality for queue items
        songElement.addEventListener('click', function(e) {
            if (!e.target.closest('.remove-queue-btn')) {
                // Move this song to front of queue if not already there
                if (index > 0) {
                    const songToPlay = queue.songs.splice(index, 1)[0];
                    queue.songs.unshift(songToPlay);
                }
                playSongFromQueue();
            }
        });
        
        // Add remove button functionality
        const removeBtn = songElement.querySelector('.favorite-btn');
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            queue.songs.splice(index, 1);
            updateQueue();
        });
        
        queueList.appendChild(songElement);
    });
}

// Handle end of song - play next in queue
audioElement.addEventListener('ended', () => {
    playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    // Remove current song from queue
    if (queue.size() > 0) {
        queue.dequeue();
    }
    
    // Play next song in queue or stop
    if (queue.size() > 0) {
        playSongFromQueue();
    }
});

// Volume control - fixed to properly update volume
function handleVolumeChange(e) {
    const volumeLevel = e.target.value / 100;
    audioElement.volume = volumeLevel;
    
    // Update volume slider visual
    volumeSlider.style.background = `linear-gradient(to right, #8A2BE2 ${e.target.value}%, #2d2d2d ${e.target.value}%)`;
    
    // Update volume icon based on level
    if (volumeLevel === 0) {
        volumeIcon.className = 'fas fa-volume-mute volume-icon';
    } else if (volumeLevel < 0.5) {
        volumeIcon.className = 'fas fa-volume-down volume-icon';
    } else {
        volumeIcon.className = 'fas fa-volume-up volume-icon';
    }
}

volumeSlider.addEventListener('input', handleVolumeChange);

// Set initial volume
audioElement.volume = volumeSlider.value / 100;
volumeSlider.style.background = `linear-gradient(to right, #8A2BE2 ${volumeSlider.value}%, #2d2d2d ${volumeSlider.value}%)`;

// Search functionality
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    // If we're in a specific view and searching, temporarily show all songs with filtering
    if (searchTerm) {
        const filteredSongs = window.songs.filter(song => 
            song.title.toLowerCase().includes(searchTerm) || 
            song.artist.toLowerCase().includes(searchTerm) || 
            song.album.toLowerCase().includes(searchTerm)
        );
        
        songList.innerHTML = "";
        filteredSongs.forEach((song) => {
            const songElement = document.createElement('div');
            songElement.classList.add('song');
            songElement.innerHTML = `
                <img src="${song.image}" alt="${song.title}">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
                <div class="song-actions">
                    <button class="add-to-playlist-btn" title="Add to Playlist">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="delete-song-btn" title="Delete Song"><i class="fas fa-trash"></i></button>
                </div>
            `;
            // Play on click (not on action buttons)
            songElement.addEventListener('click', function(e) {
                if (e.target.closest('.song-actions')) return;
                if (queue.contains(song.title)) {
                    // If song is already in queue, play it
                    const indexInQueue = queue.songs.findIndex(queuedSong => queuedSong.title === song.title);
                    if (indexInQueue !== -1) {
                        // If it's not the first song in queue, move it to the front
                        if (indexInQueue > 0) {
                            const songToPlay = queue.songs.splice(indexInQueue, 1)[0];
                            queue.songs.unshift(songToPlay);
                        }
                        playSongFromQueue();
                    }
                } else {
                    // First click - add to queue
                    addToQueue(song);
                    showNotification(`"${song.title}" added to queue. Click again to play.`, 'var(--primary)', '<i class="fas fa-plus"></i>');
                }
            });
            // Add to playlist button
            const addToPlaylistBtn = songElement.querySelector('.add-to-playlist-btn');
            addToPlaylistBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showPlaylistSelectionMenu(song);
            });
            // Delete button logic
            const deleteBtn = songElement.querySelector('.delete-song-btn');
            deleteBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                if (!confirm(`Are you sure you want to delete "${song.title}"?`)) return;
                try {
                    await window.audivaDB.deleteSongFromDB(song.id);
                    // Remove from queue
                    queue.songs = queue.songs.filter(qs => qs.id !== song.id);
                    // Remove from favorites
                    favorites = favorites.filter(f => !(f.title === song.title && f.artist === song.artist));
                    saveFavorites();
                    // If currently playing, stop
                    if (window.songs[currentSongIndex] && window.songs[currentSongIndex].id === song.id) {
                        audioElement.pause();
                        audioElement.src = '';
                        document.getElementById('current-song-title').textContent = 'Not Playing';
                        document.getElementById('current-album-art').src = 'Photos/Spotify_icon.png';
                        document.querySelector('.song-info .artist').textContent = 'Select a song to play';
                    }
                    await loadSongsFromIndexedDB();
                    showNotification('Song deleted successfully!', 'var(--primary)', '<i class="fas fa-trash"></i>');
                } catch (err) {
                    showNotification(err.message || 'Failed to delete song.', 'var(--primary)', '<i class="fas fa-trash"></i>');
                }
            });
            songList.appendChild(songElement);
        });
    } else {
        // If search is cleared, return to current view
        loadView(currentView);
    }
});
// Initialize the player
loadSongs();
updateFavorites();
updateQueue();