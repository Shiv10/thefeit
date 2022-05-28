const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');
const Redis = require('redis');
const redisClient = Redis.createClient()
const company = require('../models/company');

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_ACCOUNT_AUTHKEY
const client = require('twilio')(accountSid, authToken);

const SMS_TEMPLATE = 'The OTP token for your Feit Account is <token>. Please enter the OTP to create your account';
const OTP_ALIVE_TIME = 15 * 60;

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
        let currentOtpRetries = await redisClient.hGet(`retries-${phone}`, 'otpRetries');
        if (currentOtpRetries != null) {
            // I am converting it to number here because one of the output is null and I don't want to convert null to number
            currentOtpRetries = +currentOtpRetries;
            if (currentOtpRetries > 2) {
              await redisClient.del(phone);
              await redisClient.del(`retries-${phone}`);
              return res.status(403).json({success: false, message: 'Max OTP retries reached'})
            }

            await redisClient.hIncrBy(`retries-${phone}`, 'otpRetries', 1);
            const otp = await redisClient.hGet(phone, 'otp');
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
        await redisClient.hSet(phone, 'otp', otp);
        await redisClient.hSet(`retries-${phone}`, 'otpRetries', 0);
        await redisClient.expire(phone, OTP_ALIVE_TIME);
        await redisClient.expire(`retries-${phone}`, OTP_ALIVE_TIME);
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
