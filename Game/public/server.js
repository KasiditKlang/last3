const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const { MongoClient, GridFSBucket } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection string
const mongoURI = `mongodb+srv://Admin:${process.env.DB_PASSWORD}@cluster0.jmlk7.mongodb.net/`;

// Connect to MongoDB using Mongoose
mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Connect MongoClient for GridFSBucket
let gfsBucket;
MongoClient.connect(mongoURI)
    .then(client => {
        const db = client.db('mealsDB');
        gfsBucket = new GridFSBucket(db, { bucketName: 'uploads' });
        console.log('Connected to GridFS');
    })
    .catch(err => console.error('Error connecting to MongoDB for GridFS:', err));

// Configure Multer for file uploads (store files in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Meal Schema (stores the meal name only)
const mealSchema = new mongoose.Schema({
    name: String
});

const Meal = mongoose.model('Meal', mealSchema);

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// POST route to add a new meal (with image upload)
app.post('/meals', upload.single('image'), async (req, res) => {
    try {
        // Check if the request has both an image and a name
        if (!req.file || !req.body.name) {
            return res.status(400).json({ message: 'Image and name are required' });
        }

        // Use the menu name as the filename for the image
        const filename = req.body.name + path.extname(req.file.originalname); // e.g., "MenuName.jpg"
        const readableStream = new require('stream').Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null);

        // Upload the image to GridFSBucket
        const uploadStream = gfsBucket.openUploadStream(filename, { contentType: req.file.mimetype });
        readableStream.pipe(uploadStream)
            .on('error', (err) => {
                console.error('Error uploading file:', err);
                res.status(500).json({ message: 'Error uploading file' });
            })
            .on('finish', async () => {
                // Create a new meal document with the menu name (no need for separate imageFilename)
                const newMeal = new Meal({
                    name: req.body.name,
                });
                await newMeal.save();  // Save the meal details in MongoDB
                console.log('Meal saved to MongoDB:', newMeal);  // Log the saved meal
                res.status(201).json({ message: 'Meal added successfully!' });
            });

    } catch (error) {
        console.error('Error adding meal:', error);
        res.status(500).json({ message: 'Error adding meal' });
    }
});

// Route to fetch all meals from MongoDB
app.get('/meals', async (req, res) => {
    try {
        const meals = await Meal.find();  // Get all meals from MongoDB
        res.status(200).json(meals);  // Send the meals to the frontend
    } catch (error) {
        console.error('Error fetching meals:', error);
        res.status(500).json({ message: 'Error fetching meals' });
    }
});

// Route to fetch an image by menu name from GridFS
app.get('/image/:name', (req, res) => {
    const filename = req.params.name; // Use the menu name as the image filename
    gfsBucket.find({ filename: filename }).toArray((err, files) => {
        if (!files || files.length === 0) {
            return res.status(404).json({ err: 'No file exists' });
        }

        const file = files[0];

        // Check if it's an image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            // Stream the image from GridFSBucket
            const downloadStream = gfsBucket.openDownloadStreamByName(filename);
            downloadStream.pipe(res);
        } else {
            res.status(404).json({ err: 'Not an image' });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
