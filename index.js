const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const { ObjectId } = require('mongodb');
require('dotenv').config();
const authenticateToken = require('./middleware/auth');


const app = express();
// Increase payload size limit to handle large image uploads
app.use(express.json({ limit: '10mb' }));  // Adjust the limit as needed
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(express.static('public'));

// User and Meal models
const User = require('./models/User'); // Ensure this file exists with the correct schema
const Meal = require('./models/Meals'); // Create this schema for meals


// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('MongoDB connection error:', err));


// Route สำหรับ API
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: 'User already exists' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// **API Route to Get All Meals**
app.get('/api/meals', authenticateToken, async (req, res) => {
    try {
        const meals = await Meal.find({ userId: req.user.id });
        res.json(meals);
    } catch (error) {
        console.error('Error fetching meals:', error);
        res.status(500).send('Error fetching meals');
    }
});

// **API Route to Add a New Meal**
app.post('/api/meals', authenticateToken, async (req, res) => {
    const { name, image, probability } = req.body;
    if (!name || !image || !probability) {
        return res.status(400).send('Invalid meal data');
    }

    try {
        const newMeal = new Meal({
            name,
            image,
            probability,
            userId: req.user.id
        });
        await newMeal.save();
        res.status(201).send('Meal added successfully');
    } catch (error) {
        console.error('Error adding meal:', error);
        res.status(500).send('Error adding meal');
    }
});

// **Delete Meal history
app.delete('/api/history/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Deleting history item with ID:", id); // Log the ID for debugging

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid history item ID' });
        }

        const result = await mongoose.connection.collection('history').deleteOne({
            _id: new mongoose.Types.ObjectId(id)
        });

        if (result.deletedCount === 1) {
            res.status(200).send('History item deleted successfully');
        } else {
            res.status(404).send('History item not found');
        }
    } catch (error) {
        console.error('Error deleting history item:', error);
        res.status(500).send('Error deleting history item');
    }
});
// **Delete Meal by ID**
app.delete('/api/meals/:id', authenticateToken, async (req, res) => {
    try {
        const mealId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(mealId)) {
            return res.status(400).send('Invalid meal ID');
        }

        const result = await Meal.findByIdAndDelete(mealId);

        if (result) {
            res.status(200).send('Meal deleted successfully');
        } else {
            res.status(404).send('Meal not found');
        }
    } catch (error) {
        console.error('Error deleting meal:', error);
        res.status(500).send('Error deleting meal');
    }
});




// **Add Meal History Entry**
app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const history = { ...req.body, userId: req.user.id, timestamp: new Date().toISOString() };
        await mongoose.connection.collection('history').insertOne(history);
        res.status(201).send('History added successfully');
    } catch (error) {
        console.error('Error adding history:', error);
        res.status(500).send('Error adding history');
    }
});

// **Get Meal History**
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const history = await mongoose.connection.collection('history').find({ userId: req.user.id }).toArray();
        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).send('Error fetching history');
    }
});

// กำหนด Route สำหรับหน้าเว็บ (กรณีเข้าถึงจาก /)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/loginResponsive.html');
});

// **Serve other static pages**
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'loginResponsive.html'));
});


// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000, http://localhost:3000/');
    console.log('MongoDB URI:', process.env.MONGODB_URI);
});