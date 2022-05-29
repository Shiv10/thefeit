const bcrypt = require('bcrypt');

const hashPassword = async (pass) => {
    let salt = process.env.HASH_SALT;
    const saltNum = parseInt(salt);
    const hash = await bcrypt.hash(pass, saltNum);
    return hash;
}

module.exports = hashPassword;