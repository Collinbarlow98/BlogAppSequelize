const express = require('express')
const app = express()
const models = require('./models')

const dotenv = require('dotenv')
dotenv.config()

// connect to database blogdb on localhost
const pgp = require('pg-promise')();
var connectionString = 'postgres://localhost:5432/template1';
var db = pgp(connectionString);

// setup mustache
const mustacheExpress = require('mustache-express');
app.engine('mustache',mustacheExpress());
app.set('views','./views');
app.set('view engine','mustache');

app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

const session = require('express-session');
app.use(session({
    secret: '2Zo8raCxsyTbgcD06VkubtRwSj1zWXVVYDNkhz4AlxSRQEhsxYmxms49v2KA',
    resave: false,
    saveUninitialized: true
}));

const bcrypt = require('bcrypt');
const BCRYPT_SALT_ROUNDS = 12;

// middleware for user authentication
function authenticate(req,res,next) {
    if(req.session) {
        if(req.session.isAuthenticated) {
            next()
        } else {
            res.redirect('/')
        }
    } else {
        res.redirect('/')
    }
}


// root route shows login page
app.get('/',(req,res) => {
    res.render('login')
})

// login attempt
app.post('/',(req,res) => {
    models.User.findAll({
      where: {
        name: req.body.username
      }
    })
    .then(results => {
        // verify that the username exists
        if (results.length != 1) {
            req.session.destroy()
            res.redirect('/')
        }
        else {

          let users = results[0]
          let data = users.dataValues
            // verify correct password
            bcrypt.compare(req.body.password, data.password)
            .then((samePassword) => {
                if(!samePassword) {
                    // bad password
                    req.session.destroy()
                    res.redirect('/')
                }
                else {
                    // good password
                    req.session.isAuthenticated = true
                    req.session.username = data.name
                    req.session.user_id = data.id
                    res.redirect('/posts')
                }
            })
            .catch((error) => {
                // authentication error
                req.session.destroy()
                res.redirect('/')
            })
        }
    })
    .catch((error) => {
        console.log(error)
        req.session.destroy()
        res.redirect('/')
    })
})

// register attempt
app.post('/add-user',(req,res) => {
    models.User.findAll()
    .then((results) => {
        // verify that username is not already in users
        let checkName =  results.filter(item => item.name==req.body.username)
        if (checkName.length > 0) {
            req.session.destroy()
            res.redirect('/')
        }
        else {
            bcrypt.hash(req.body.password, BCRYPT_SALT_ROUNDS)
            .then((hashedPassword) => {
              const user = models.User.build({
                name: req.body.username,
                password: hashedPassword
              })
              user.save()
                .then((results) => {
                    req.session.isAuthenticated = true
                    req.session.username = req.body.username
                    req.session.user_id = results.user_id
                    res.redirect('/posts')
                })
                .catch((error) => {
                    console.log(error)
                    req.session.destroy()
                    res.redirect('/')
                })
            })
            .catch((error) => {
                console.log(error)
                req.session.destroy()
                res.redirect('/')
            });
        }
    })
    .catch((error) => {
        console.log(error)
        req.session.destroy()
        res.redirect('/')
    })
})

// user logout route
app.get('/logout',(req,res) => {
    req.session.destroy()
    res.redirect('/')
})

// this is the main view...
app.get('/posts',authenticate,(req,res) => {
    models.Post.findAll({
      where: {
        UserId: req.session.user_id
      }
    })
    .then(result => {
      for(let i = 0; i < result.length; i++){
      if (result[i].isPublished == true) {
        result[i].hidden = 'hidden'
      } else {
        result[i].hidden = ''
      }
    }
      res.render('posts',{username: req.session.username, posts: result}
    )
  })
    .catch((error) => {
        // something went really wrong if I can't read posts - go back to login
        console.log(error)
        req.session.destroy()
        res.redirect('/')
    })
})

// add or update an entry
app.post('/posts',authenticate,(req,res) => {
    // check to see if we are adding or updating based on the title
    models.Post.findAll({
      where: {
        UserId: req.session.user_id
      }
    })
    .then(results => {
        let checkTitle = results.filter(item => item.title==req.body.title)
        if (checkTitle.length > 0) {
            // update an existing post
            models.Post.update({
            body: req.body.body
          }, {
            where: {
              id: 1
            }
          })
            .then(() => res.redirect('/posts'))
            .catch((error) => {
                console.log(error)
                res.redirect('/posts')
            })
        }
        else
        {
          // create a new post
          let post = models.Post.build({
            title: req.body.title,
            body: req.body.body,
            UserId: req.session.user_id
          })
          post.save()
            .then(() => res.redirect('/posts'))
            .catch((error) => {
                console.log(error)
                res.redirect('/posts')
            })
        }
    })
    .catch((error) => {
        console.log(error)
        res.redirect('/posts')
    })
})

// delete an entry
app.post('/delete-post',authenticate,(req,res) => {
    models.Post.destroy({
      where: {
        id: req.body.del_post
      }
    })
    .then(() => res.redirect('/posts'))
    .catch((error) => {
        console.log(error)
        res.redirect('/posts')
    })
})

// view post detail

app.post('/post-detail',authenticate,(req,res) => {
  req.session.postId = req.body.postId

    if (!req.session.postId) {
        res.redirect('/')
    }

    models.Post.findByPk(req.session.postId,{
      include: [
        {
          model: models.Comment,
          as: 'comment'
        },
        {
          model: models.User,
          as: 'user'
        }
      ]
    })
    .then(results => {
      let commentArray = results.comment
      for(let i = 0; i <  commentArray.length; i++){
              if (commentArray[i].UserId == req.session.user_id) {
                commentArray[i].hidden = ''
              } else {
                commentArray[i].hidden = 'hidden'
              }
            }
            if (req.session.isAuthenticated) {
              res.render('post_detail',{username: [req.session.username], user: results.user, post: results, comments: results.comment})
            } else {
              res.render('post_detail',{username: [], post: detail_post, comments: results})
            }

          })
            .catch((error) => {
              console.log(error)
              req.session.destroy()
              res.redirect('/')
            })
    })

app.get('/post-detail',authenticate,(req,res) => {

  if (!req.session.postId) {
      res.redirect('/')
  }

  models.Post.findByPk(req.session.postId,{
    include: [
      {
        model: models.Comment,
        as: 'comment'
      },
      {
        model: models.User,
        as: 'user'
      }
    ]
  })
  .then(results => {
    let commentArray = results.comment
    for(let i = 0; i <  commentArray.length; i++){
            if (commentArray[i].UserId == req.session.user_id) {
              commentArray[i].hidden = ''
            } else {
              commentArray[i].hidden = 'hidden'
            }
          }
          if (req.session.isAuthenticated) {
            res.render('post_detail',{username: [req.session.username], user: results.user, post: results, comments: results.comment})
          } else {
            res.render('post_detail',{username: [], post: detail_post, comments: results})
          }

        })
          .catch((error) => {
            console.log(error)
            req.session.destroy()
            res.redirect('/')
          })
  })

app.get('/home', authenticate,(req,res) => {
  console.log('before')
    models.Post.findAll({
      include: [
        {
          model: models.Comment,
          as: 'comment'
        }
      ]
    })
    .then(result => {
      for(let i = 0; i < result.length; i++){
        result[i].comments = result[i].comment.length
        if (result[i].isPublished == true) {
          result[i].hidden = ''
        } else {
          result[i].hidden = 'hidden'
        }
      }
      console.log(result)
      res.render('home', {posts: result})
    })
  })

app.post('/add-comment', authenticate, (req,res) => {
    // create a new comment
    let comment = models.Comment.build({
      body: req.body.body,
      UserId: req.session.user_id,
      PostId: req.session.postId,
      name: req.session.username
    })
    comment.save()
    .then(() => res.redirect('/post-detail',))
    .catch((error) => {
        console.log(error)
        res.redirect('/post-detail')
    })
})

app.post('/delete-comment', authenticate, (req,res) => {
    models.Comment.destroy({
      where: {
        id: req.body.del_comment
      }
    })
    .then(() => res.redirect('/post-detail'))
    .catch((error) => {
        console.log(error)
        res.redirect('/post-detail')
    })
})

app.post('/update-comment', authenticate, (req,res) => {
    models.Comment.update({
      body: req.body.body
    },{
      where: {
        id: req.body.update_comment
      }
    })
    .then(() => res.redirect('/post-detail'))
    .catch((error) => {
        console.log(error)
        res.redirect('/post-detail')
    })
})

app.post('/publish', authenticate, (req,res) => {
  models.Post.update({
    isPublished: 'TRUE'
  },{
    where: {
      id: req.body.postId
    }
  })
  res.redirect('/home')
})

app.listen(3000, () => {
    console.log("Server is running on localhost:3000")
})
