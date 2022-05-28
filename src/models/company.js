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
    address: {
        type: String,
        required: true
    }
}));

module.exports = comapany;