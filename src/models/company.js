const mongoose = require('mongoose');

const comapany = mongoose.model('company', new mongoose.Schema({
    email: {
        type: String,
        // required: true,
        unique: true,
    },
    phone: {
        type: Number,
        required: true,
        unique: true,
    },
    companyName: {
        type: String,
        trim: true,
    },
    typeOfBusiness: {
        type: String,
    },
    employeeName: {
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

module.exports = comapany;