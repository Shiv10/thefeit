const mongoose = require('mongoose');

if (!process.env.MONGO_URL) {
	console.info({
		Message: 'DB connection failed',
		error: 'Error: MONGO_URL is not defined, did you create a .env file? Check sample.env for reference',
	});
	process.exit(1);
}

mongoose
	.connect(process.env.MONGO_URL)
	.then(() => console.info({ Message: 'DB connected successfully', error: 'Value: null' }))
	.catch((e) => {
		console.info({ Message: 'DB connection failed', error: e.toString() });
		process.exit(1);
});