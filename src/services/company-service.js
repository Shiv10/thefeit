const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');
const sessionstorage = require('sessionstorage');
const company = require('../models/company');

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
        const {phone, companyName, typeOfBusiness, employeeName, address, otp} = req.body; 
    } catch (e) {
        return res.status(500).json({success: false, message: 'Some error occurred'});
    }
});
