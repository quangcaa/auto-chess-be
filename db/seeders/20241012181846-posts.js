'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('posts', [
      {
        topic_id: 1,
        user_id: '1',
        content: 'Welcome to the General Chess Discussion forum!',
        created_at: new Date()
      },
      {
        topic_id: 1,
        user_id: '2',
        content: 'Thank you! Excited to be here.',
        created_at: new Date()
      },
      {
        topic_id: 2,
        user_id: '1',
        content: 'Here are some tips for improving your chess strategy.',
        created_at: new Date()
      },
      {
        topic_id: 3,
        user_id: '2',
        content: 'I found a bug in the Lichess app.',
        created_at: new Date()
      },
      {
        topic_id: 4,
        user_id: '1',
        content: 'Can we have a dark mode feature?',
        created_at: new Date()
      },
      {
        topic_id: 5,
        user_id: '2',
        content: 'Please analyze my recent game.',
        created_at: new Date()
      },
      {
        topic_id: 6,
        user_id: '1',
        content: 'What are the best opening moves?',
        created_at: new Date()
      },
      {
        topic_id: 7,
        user_id: '2',
        content: 'What are your favorite chess movies?',
        created_at: new Date()
      },
      {
        topic_id: 8,
        user_id: '1',
        content: 'Check out these chess memes!',
        created_at: new Date()
      },
      {
        topic_id: 9,
        user_id: '2',
        content: 'Let\'s discuss upcoming chess tournaments.',
        created_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('posts', null, {});
  }
};
