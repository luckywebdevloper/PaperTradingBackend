import "dotenv";

const config = {
  JWT_SECRET_KEY: process.env.JWT_SECRET,
  FAST2SMS: process.env.FAST2SMS,
  MONGO_URI: process.env.MONGO_URI,
};

export default config;
