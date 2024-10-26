const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema({
    name: String,
    image: String,
    probability: Number,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

module.exports = mongoose.model('Meal', MealSchema);