const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');
const sessionstorage = require('sessionstorage');
const company = require('../models/company');
const hashPassword = require('../utils/hash');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorize = require('../middlewares/auth');

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_ACCOUNT_AUTHKEY
const client = require('twilio')(accountSid, authToken);

const SMS_TEMPLATE = 'The OTP token for your Feit Account is <token>. Please enter the OTP to create your account';

const formatMessage = (template, otp) => {
    let result = template.replace('<token>', otp);
    return result;
}

router.post('/sendOtp', async (req, res) => {
    try {
        const {phone, countryCode = '+91'} = req.body;
        const employeeInstance = await company.findOne({ phone });
        if (employeeInstance) {
            return res.status(403).json({success: false, message: 'Same number exists in DB'});
        }
        const mobileNumber = `${countryCode}${phone}`
        let currentOtpRetries =  sessionstorage.getItem(`retries-${phone}`);
        if (currentOtpRetries != null) {
            // I am converting it to number here because one of the output is null and I don't want to convert null to number
            currentOtpRetries = +currentOtpRetries;
            if (currentOtpRetries > 2) {
              sessionstorage.removeItem(phone);
              sessionstorage.removeItem(`retries-${phone}`);
              return res.status(403).json({success: false, message: 'Max OTP retries reached'})
            }

            sessionstorage.setItem(`retries-${phone}`, currentOtpRetries+1);
            const otp = sessionstorage.getItem(phone);
            const otpMessage = formatMessage(SMS_TEMPLATE, otp );

            let msg = await client.messages.create({
                body: otpMessage,
                from: process.env.TWILIO_ACCOUNT_NUMBER,
                to: mobileNumber
            });
            console.log(msg.sid);
            return res.status(200).json({success: true, message: `OTP retries remaining: ${3-currentOtpRetries}`});
        }

        const otp = randomstring.generate({
            charset: '123456789',
            length: 6
        });

        const otpMessage = formatMessage( SMS_TEMPLATE, otp );
        sessionstorage.setItem(phone, otp);
        sessionstorage.setItem(`retries-${phone}`, 0);
        let msg = await client.messages.create({
            body: otpMessage,
            from: process.env.TWILIO_ACCOUNT_NUMBER,
            to: mobileNumber
        });
        console.log(msg.sid);
        return res.status(200).json({success: true, message: 'OTP sent'});

    } catch (e) {
        return res.status(500).json({success: false, message: 'Internal server error '});
    }
});

router.post('/signup', async (req, res) => {
    try {
        const {phone, companyName, typeOfBusiness, employeeName, otp, password} = req.body;
        const sessionOtp = sessionstorage.getItem(phone);
        console.log(sessionOtp);
        console.log(otp);
        if (otp!=sessionOtp) {
            return res.status(401).json({sucess: false, message: 'Invalid OTP'});
        }

        const employeeInstance = await company.findOne({ phone });
        if (employeeInstance) {
            return res.status(403).json({success: false, message: 'Same number exists in DB'});
        }

        const hashedPass = await hashPassword(password);

        let newOrg = new company({
            phone,
            companyName,
            typeOfBusiness,
            employeeName,
            password: hashedPass
        });

        newOrg = await newOrg.save();
        return res.status(200).json({success: true, message: 'Org Created'});

    } catch (e) {
        console.log(e);
        return res.status(500).json({success: false, message: 'Internal server error '});
    }
});

router.post('/login', async (req, res) => {
    try {
        const {phone, password} = req.body;
        const user = await company.findOne({phone});
        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }
    
        let check = await bcrypt.compare(password, user.password);
        if (check) {
            const secret = process.env.JWT_SECRET;
            let id = user._id;
            const token = jwt.sign({id: id}, secret, {
                expiresIn: "30d"
            });
            return res.status(200).json({ success: true, token: token });
        }
    
        return res.status(401).json({ success: false, error: "Invalid credentials" });
    } catch (e) {
        console.log(e);
        return res.status(500).json({success: false, message: 'Internal server error '});
    }
});

router.post('/addProduct',authorize, async (req, res) => {
    const {product, phone} = req.body;
    const org = await company.findOne({phone: phone});
    let products = org.products;
    products.push(product);
    // org.products = products;
    try {
        await org.save();
        return res.status(200).json({ success: true, message: 'Saved successfully' });
    } catch (e) {
        return res.status(500).json({success: false, message: 'Internal server error '});
    }
});

module.exports = router;