'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: DataTypes.STRING,
    password: DataTypes.STRING
  }, {});
  User.associate = function(models) {
    models.User.hasMany(models.Post,{as: 'post', foreignKey: 'UserId'})
    // associations can be defined here
  };
  return User;
};
