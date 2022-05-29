const mongoose = require('mongoose');

const user = mongoose.model('user', new mongoose.Schema({
    phone: {
        type: Number,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    products: {
        type: Array,
        default: []
    }
}));

module.exports = user;