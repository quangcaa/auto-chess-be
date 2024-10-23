'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('users', [
      {
        user_id: '1',
        username: 'lucian123',
        email: 'lucian123123@gmail.com',
        password: '$2a$12$RII1qf4Sm.FjobMJ0IzlYuUiCf8QdrBHgqyvInwxHclUMSC4NT.VC',
        joined_date: new Date(),
        last_login: new Date(),
        is_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
        refresh_token: null
      },
      {
        user_id: '2',
        username: 'lucian234',
        email: 'lucian234234@gmail.com',
        password: '$2a$12$eoGfe8LmhtF9kr5nBMm.MOPE/beTQgJRx6NLGYAyBt.C2ei7JA7dG',
        joined_date: new Date(),
        last_login: new Date(),
        is_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
        refresh_token: null
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
