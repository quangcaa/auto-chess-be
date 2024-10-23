'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Profile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Profile.belongsTo(models.User, { 
        as: 'profile_user_id_fk', 
        foreignKey: 'user_id',
        onUpdate: 'CASCASE',
        onDelete: 'CASCADE'
      });
    }
  }
  Profile.init({
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      real_name: {
        type: DataTypes.STRING
      },
      bio: {
        type: DataTypes.STRING
      },
      flag: {
        type: DataTypes.STRING
      },
      location: {
        type: DataTypes.STRING
      },
  }, {
    sequelize,
    modelName: 'Profile',
    tableName: 'profiles',
    timestamps: false,
  });
  return Profile;
};