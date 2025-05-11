const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { upload } = require('../config/s3');

// Upload a new song
router.post('/', upload.fields([
    { name: 'songFile', maxCount: 1 },
    { name: 'imageFile', maxCount: 1 },
    { name: 'artistImageFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const { title, artist, album } = req.body;
        const songFile = req.files.songFile[0];
        const imageFile = req.files.imageFile[0];
        const artistImageFile = req.files.artistImageFile[0];

        const song = new Song({
            title,
            artist,
            album,
            songUrl: songFile.location,
            imageUrl: imageFile.location,
            artistImageUrl: artistImageFile.location
        });

        await song.save();
        res.status(201).json(song);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all songs
router.get('/', async (req, res) => {
    try {
        const songs = await Song.find().sort({ createdAt: -1 });
        res.json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific song
router.get('/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ message: 'Song not found' });
        }
        res.json(song);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a song
router.delete('/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ message: 'Song not found' });
        }

        // Delete files from S3
        const s3 = require('../config/s3').s3;
        await Promise.all([
            s3.deleteObject({ Bucket: process.env.AWS_BUCKET_NAME, Key: song.songUrl.split('/').pop() }).promise(),
            s3.deleteObject({ Bucket: process.env.AWS_BUCKET_NAME, Key: song.imageUrl.split('/').pop() }).promise(),
            s3.deleteObject({ Bucket: process.env.AWS_BUCKET_NAME, Key: song.artistImageUrl.split('/').pop() }).promise()
        ]);

        await song.remove();
        res.json({ message: 'Song deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 