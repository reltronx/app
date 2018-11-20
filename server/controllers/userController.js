const express = require('express');
const Folder = require('../models/folder.js');
const Page = require('../models/page.js');
const User = require('../models/user.js');

function getSketches(req, res) {
  // TODO: make the request async
  if (!req.params.user) {
    res.status(403).send({ error: 'Please log in first or specify a user' });
    if (!req.user) {
      res.status(403).send({ error: 'Please log in first or specify a user' });
      return;
    }
  }
  let user = req.user;
  if (user && user.name === req.params.user) {
    Promise.all([
      Page.find({ user: user._id }).exec(),
      Folder.find({ user: user._id }).exec()
    ])
      .then(([pages, folders]) => {
        res.send({ pages, folders });
      })
      .catch(err => res.send(err));
  } else {
    User.findOne({ name: req.params.user }, (userFindError, data) => {
      if (userFindError) {
        res.status(404).send({ error: userFindError });
      } else if (data.type === 'student') {
        res.status(403).send({ error: 'This users data cannot be accessed' });
      } else {
        user = data;
        Promise.all([
          Page.find({ user: user._id }).exec(),
          Folder.find({ user: user._id }).exec()
        ])
          .then(([pages, folders]) => {
            res.send({ pages, folders });
          })
          .catch(err => res.send(err));
      }
    });
  }
}


function getUserProfile(req, res) {
  User.findOne({ name: req.params.userName }, (err, user) => {
    if (err) {
      res.send(err);
    } else {
      res.send({
        name: user.name,
        type: user.type,
        image: user.image,
        blurb: user.blurb,
        isOwner: !!(req.user && req.user.name && req.user.name === user.name)
      });
    }
  });
}

const userRoutes = express.Router();

userRoutes.route('/:user/sketches').get(getSketches);
userRoutes.route('/:userName/profile').get(getUserProfile);
module.exports = userRoutes;
