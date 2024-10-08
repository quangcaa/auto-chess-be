'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Game extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Game.belongsTo(models.User, { 
        as: 'game_white_player_id_fk', 
        foreignKey: 'white_player_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
      Game.belongsTo(models.User, { 
        as: 'game_black_player_id_fk', 
        foreignKey: 'black_player_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
      Game.belongsTo(models.Variant, { 
        as: 'game_variant_id_fk', 
        foreignKey: 'variant_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
      Game.belongsTo(models.TimeControl, { 
        as: 'game_time_control_id_fk', 
        foreignKey: 'time_control_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
    }
  }
  Game.init({
    game_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    variant_id: {
      type: DataTypes.STRING,
      references: {
        model: 'variants',
        key: 'variant_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    time_control_id: {
      type: DataTypes.STRING,
      references: {
        model: 'timeControls',
        key: 'time_control_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    rated: {
      type: DataTypes.BOOLEAN,
    },
    white_player_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    black_player_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
    },
    result: {
      type: DataTypes.ENUM('white_win', 'black_win', 'draw', 'abandoned'),
    },
    pgn: {
      type: DataTypes.TEXT,
    },
    move_number: {
      type: DataTypes.INTEGER,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'Game',
    tableName: 'games',
    timestamps: false,
  });
  return Game;
};