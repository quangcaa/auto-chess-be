'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('topics', [
      {
        category_id: 'GCD',
        user_id: '1',
        subject: 'Welcome to General Chess Discussion',
        created_at: new Date()
      },
      {
        category_id: 'GCD',
        user_id: '2',
        subject: 'Chess Strategies and Tips',
        created_at: new Date()
      },
      {
        category_id: 'LB',
        user_id: '1',
        subject: 'Lichess Bug Report',
        created_at: new Date()
      },
      {
        category_id: 'LB',
        user_id: '2',
        subject: 'Feature Request: Dark Mode',
        created_at: new Date()
      },
      {
        category_id: 'GA',
        user_id: '1',
        subject: 'Analyze My Recent Game',
        created_at: new Date()
      },
      {
        category_id: 'GA',
        user_id: '2',
        subject: 'Best Opening Moves',
        created_at: new Date()
      },
      {
        category_id: 'OTD',
        user_id: '1',
        subject: 'Favorite Chess Movies',
        created_at: new Date()
      },
      {
        category_id: 'OTD',
        user_id: '2',
        subject: 'Chess Memes',
        created_at: new Date()
      },
      {
        category_id: 'GCD',
        user_id: '1',
        subject: 'Chess Tournaments',
        created_at: new Date()
      },
      {
        category_id: 'LB',
        user_id: '2',
        subject: 'Lichess Feedback and Suggestions',
        created_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('topics', null, {});
  }
};
