'use strict';
module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    body: DataTypes.STRING,
    UserId: DataTypes.INTEGER,
    PostId: DataTypes.INTEGER,
    name: DataTypes.STRING
  }, {});
  Comment.associate = function(models) {
    models.Comment.belongsTo(models.Post,{as: 'post', foreignKey: 'PostId'})
    // associations can be defined here
  };
  return Comment;
};
