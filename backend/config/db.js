const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');

    // Temporary cleanup: remove legacy unique index that enforces one account per platform.
    try {
      await mongoose.connection.collection('accounts').dropIndex('creatorId_1_platform_1');
      console.log('Dropped legacy index: accounts.creatorId_1_platform_1');
    } catch (indexError) {
      // Ignore when index is already removed or does not exist.
      if (indexError.codeName === 'IndexNotFound') {
        console.log('Legacy index not found: accounts.creatorId_1_platform_1');
      } else {
        console.error('Failed to drop legacy accounts index:', indexError.message);
      }
    }
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
