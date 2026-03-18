const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db');
const User = require('../models/User');
const Creator = require('../models/Creator');
const Analytics = require('../models/Analytics');

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') });

connectDB();

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Creator.deleteMany({});
    await Analytics.deleteMany({});

    console.log('Deleted all Users, Creators, and Analytics');

    // Create new admin user
    const adminUser = new User({
      email: 'hhoossttiinngg@gmail.com',
      password: 'Ck5fGatgTahSZIaX',
      role: 'admin',
    });

    await adminUser.save(); // will trigger pre-save hook for password hashing
    console.log('Seeded new admin user:', adminUser.email);

    // Create a test creator user
    const creatorUser = new User({
      email: 'creator@test.com',
      password: 'creator123',
      role: 'creator',
    });

    await creatorUser.save();
    console.log('Seeded new creator user:', creatorUser.email);

    // Create creator profile
    const creatorProfile = new Creator({
      userId: creatorUser._id,
      name: 'Test Creator',
      bio: 'A test creator for demonstration purposes',
      accounts: []
    });

    await creatorProfile.save();
    console.log('Seeded creator profile for:', creatorProfile.name);

    console.log('Seeding complete! Users created:');
    console.log('- Admin: hhoossttiinngg@gmail.com / Ck5fGatgTahSZIaX');
    console.log('- Creator: creator@test.com / creator123');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
