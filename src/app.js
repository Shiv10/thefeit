require("dotenv").config();
require('./models/dbinit');
const express = require("express");
const rateLimiter = require('express-rate-limit');
const bodyParser = require('body-parser')
const cors = require('cors');
const comapanyService = require('./services/company-service');
const clientService = require('./services/client-service');

const app = express();
const PORT = process.env.PORT || 3001;

//limter will limit our number of requests to 100 requests per minute
const limiter = rateLimiter({
	windowMs: 60*1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false
});

app.use(limiter);
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/org', comapanyService);
app.use('/user', clientService);
app.get("/", (req, res) => {
	res.send("test");
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});