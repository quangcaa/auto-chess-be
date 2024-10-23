'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Topic extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Topic.belongsTo(models.User, {
        as: 'topic_user_id_fk',
        foreignKey: 'user_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
      Topic.belongsTo(models.Forum, {
        as: 'topic_category_id_fk',
        foreignKey: 'category_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
    }
  }
  Topic.init({
    topic_id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    category_id: {
      type: DataTypes.STRING,
      references: {
        model: 'forum',
        key: 'category_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.STRING,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    subject: {
      type: DataTypes.STRING
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  }, {
    sequelize,
    modelName: 'Topic',
    tableName: 'topics',
    timestamps: false
  });
  return Topic;
};