'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Chat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Chat.belongsTo(models.Game, {
        as: 'chat_game_id_fk',
        foreignKey: 'game_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
      Chat.belongsTo(models.User, {
        as: 'chat_sender_id_fk',
        foreignKey: 'sender_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
      Chat.belongsTo(models.User, {
        as: 'chat_receiver_id_fk',
        foreignKey: 'receiver_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
    }
  }
  Chat.init({
    chat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    game_id: {
      type: DataTypes.STRING,
      references: {
        model: 'games',
        key: 'game_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    sender_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    receiver_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    time: {
      type: DataTypes.DATE,
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'Chat',
    tableName: 'chats',
    timestamps: false,
  });
  return Chat;
};