require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('URI:', process.env.MONGO_URI ? process.env.MONGO_URI.replace(/:([^@]+)@/, ':***@') : 'NOT SET');

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('✅ MongoDB CONNECTED');
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌ MongoDB FAILED:', err.message);
    process.exit(1);
  });
