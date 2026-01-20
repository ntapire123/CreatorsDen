const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Creator = require('../models/Creator');
const Analytics = require('../models/Analytics');

dotenv.config({ path: './backend/.env' });

connectDB();

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Creator.deleteMany({});
    await Analytics.deleteMany({});

    // Create users individually to trigger pre-save hook for password hashing
    const user1 = new User({ email: 'creator1@test.com', password: 'password123', role: 'creator' });
    await user1.save();
    const user2 = new User({ email: 'creator2@test.com', password: 'password123', role: 'creator' });
    await user2.save();
    const user3 = new User({ email: 'admin@test.com', password: 'password123', role: 'admin' });
    await user3.save();

    const users = [user1, user2, user3];

    console.log('Seeded 3 users');

    // Create creators
    const creators = await Creator.insertMany([
      { userId: users[0]._id, name: 'Creator One', accounts: [] },
      { userId: users[1]._id, name: 'Creator Two', accounts: [] },
    ]);

    console.log('Seeded 2 creators');

    // Create analytics data
    const analyticsData = [];
    for (let i = 0; i < 200; i++) {
      analyticsData.push({
        creatorId: creators[i % 2]._id,
        accountId: `test_account_${i % 2}`,
        platform: ['YouTube', 'Instagram', 'TikTok'][i % 3],
        metrics: {
          views: Math.floor(Math.random() * 10000),
          followers: Math.floor(Math.random() * 1000),
          engagement: Math.floor(Math.random() * 500),
          likes: Math.floor(Math.random() * 2000),
        },
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      });
    }
    await Analytics.insertMany(analyticsData);

    console.log(`Seeded 200 metrics`);
    console.log('Seeding complete!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
