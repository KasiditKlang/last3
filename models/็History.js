const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    name: String,
    image: String,
    timestamp: Date,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

module.exports = mongoose.model('History', HistorySchema);