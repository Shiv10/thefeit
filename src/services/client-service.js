const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');
const sessionstorage = require('sessionstorage');
const user = require('../models/user');
const hashPassword = require('../tools/hash');
const jwt = require('jsonwebtoken');

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
        const userInstance = await user.findOne({ phone });
        if (userInstance) {
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
            return res.send(200).json({success: true, message: `OTP retries remaining: ${3-currentOtpRetries}`});
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
        return res.send(200).json({success: true, message: 'OTP sent'});

    } catch (e) {
        return res.status(500).json({success: false, message: 'Some error occurred'});
    }
});

router.post('/signup', async (req, res) => {
    try {
        const {phone, name, otp, password} = req.body;
        const sessionOtp = sessionstorage.getItem(phone);
        if (otp!=sessionOtp) {
            return res.send(401).json({sucess: false, message: 'Invalid OTP'});
        }

        const userInstance = await user.findOne({ phone });
        if (userInstance) {
            return res.status(403).json({success: false, message: 'Same number exists in DB'});
        }

        const hashedPass = await hashPassword(password);

        let newUser = new user({
            phone,
            name,
            password: hashPassword
        });

        newUser = await newUser.save();
        return res.status(200).json({success: true, message: 'User Created'});

    } catch (e) {
        return res.status(500).json({success: false, message: 'Some error occurred'});
    }
});

router.post('/login', (req, res) => {
    try {
        const {phone, password} = req.body;
        const user = await user.findOne({phone});
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
        return res.status(500).json({success: false, message: 'Some error occurred'});
    }
});

module.exports = router;