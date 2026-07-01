const mongoose = require("mongoose")
const config = require("../utilities/config").config;
const mongoURI = config.uri

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })

        console.log("Connected to mongoDB")
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
};

module.exports = connectDB
