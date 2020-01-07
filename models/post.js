'use strict';
module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    title: DataTypes.STRING,
    body: DataTypes.STRING,
    UserId: DataTypes.INTEGER,
    isPublished: DataTypes.BOOLEAN
  }, {});
  Post.associate = function(models) {
    models.Post.hasMany(models.Comment,{as: 'comment', foreignKey: 'PostId'})
    models.Post.belongsTo(models.User,{as: 'user', foreignKey: 'UserId'})
    // associations can be defined here
  };
  return Post;
};
