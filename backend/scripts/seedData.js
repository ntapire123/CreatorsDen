const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('../config/db');
const User = require('../models/User');
const Account = require('../models/Account');
const Analytics = require('../models/Analytics');

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') });

connectDB();

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Account.deleteMany({});
    await Analytics.deleteMany({});

    console.log('Deleted all Users, Accounts, and Analytics');

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

    // Create example account for the creator
    const exampleAccount = new Account({
      creatorId: creatorUser._id,
      platform: 'YouTube',
      username: 'MrBeast',
      profileUrl: 'https://youtube.com/@mrbeast',
      profileImage: 'https://placehold.co/100'
    });

    await exampleAccount.save();
    console.log('Seeded example account:', exampleAccount.platform, '-', exampleAccount.username);

    // Create 7-day analytics history for the account
    for (let i = 6; i >= 0; i--) {
      const analyticsDate = new Date();
      analyticsDate.setDate(analyticsDate.getDate() - i);
      
      const followers = 100000 + ((6 - i) * 1000); // Growing from 100k to 106k
      const totalViews = 500000 + ((6 - i) * 5000); // Growing from 500k to 530k

      const analyticsEntry = new Analytics({
        accountId: exampleAccount._id,
        date: analyticsDate,
        followers: followers,
        totalViews: totalViews
      });

      await analyticsEntry.save();
      console.log(`Seeded analytics for day ${6 - i}: ${analyticsDate.toDateString()} - Followers: ${followers}, Views: ${totalViews}`);
    }

    console.log('Seeding complete! Users created:');
    console.log('- Admin: hhoossttiinngg@gmail.com / Ck5fGatgTahSZIaX');
    console.log('- Creator: creator@test.com / creator123');
    console.log('- Example Account: YouTube - MrBeast with 7-day analytics history');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
