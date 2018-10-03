const express = require('express');
const passport = require('passport');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const shortid = require('shortid');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/user.js');
const Token = require('../models/token.js');
const UserConst = require('../constants/userConstants.js');
const UserCreator = require('../services/userCreator.js');


// Methods: AUTH
function createUser(req, res) {
  const userCreator = new UserCreator(req.body);
  console.log('**');
  userCreator.saveUser()
    .then(success => res.status(200).send({
      msg: success
    }))
    .catch(failure => res.status(422).send({
      msg: failure
    }));
}

function forgotPassword(req, res) {
  User.find({ email: req.body.email }, (userFindError, users) => {
    const userNames = [];
    const tokens = [];
    if (users) {
      users.forEach((user) => {
        userNames.push(user.name);
        user.resetPasswordToken = shortid.generate();
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        tokens.push(user.resetPasswordToken);
        user.save((updateUserError, updatedUser) => {
          if (updateUserError) {
            return res.status(422).json({
              msg: UserConst.PASSWORD_RESET_FAILED
            });
          }
        });
      });
      sendResetMail(req.body.email, userNames, tokens, req);
      return res.send({
        msg: UserConst.PASSWORD_RESET_SENT_MAIL
      });
    }

    return res.status(404).send({
      msg: UserConst.PASSWORD_RESET_NO_USER
    });
  });
}

function resetPassword(req, res) {
  User.findOne(
    {
      resetPasswordToken: req.body.token,
      resetPasswordExpires: { $gt: Date.now() }
    },
    (userFindError, user) => {
      if (userFindError || !user) {
        return res.status(422).json({
          error: UserConst.PASSWORD_RESET_TOKEN_EXP
        });
      }
      user.hashPassword(req.body.password);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      return user.save((err) => {
        if (err) {
          return res.status(422).json({
            msg: UserConst.PASSWORD_RESET_FAILED
          });
        }

        sendSuccessfulResetMail(user.email);
        return res.send({
          msg: UserConst.PASSWORD_RESET_SUCCESSFUL,
          user
        });
      });
    }
  );
}

function loginUser(req, res, next) {
  User.find({ email: req.body.name }, (userFindError, users) => {
    if (users.length > 1) {
      return res.status(400).send({
        msg: UserConst.USE_NAME_TO_LOGIN
      });
    }
  });
  return passport.authenticate('local', (passportAuthError, user, info) => {
    if (passportAuthError) {
      return res.send({ msg: passportAuthError }); // will generate a 500 error
    }
    // Generate a JSON response reflecting authentication status
    if (!user) {
      return res.status(401).send({
        msg: UserConst.LOGIN_FAILED
      });
    } if (!user.isVerified) {
      return res.status(401).send({
        msg: UserConst.LOGIN_USER_NOT_VERIFIED
      });
    }

    return req.login(user, (loginError) => {
      if (loginError) {
        return res.send({
          msg: loginError
        });
      }
      return res.send({
        msg: UserConst.LOGIN_SUCCESS,
        user: { name: user.name, type: user.type }
      });
    });
  })(req, res, next);
}

function confirmUser(req, res) {
  if (!req.body.token) {
    return res.status(400).send({
      msg: ''
    });
  }
  return Token.findOne({ token: req.body.token }, (tokenFindError, token) => {
    if (!token) {
      return res.status(400).send({
        msg: UserConst.CONFIRM_TOKEN_EXPIRED
      });
    }

    // If we found a token, find a matching user
    return User.findOne({ _id: token._userId }, (userFindError, user) => {
      if (!user) {
        return res.status(400).send({
          msg: UserConst.CONFIRM_NO_USER
        });
      }
      if (user.isVerified) {
        return res.status(400).send({
          msg: UserConst.CONFIRM_USER_ALREADY_VERIFIED
        });
      }

      // Verify and save the user
      user.isVerified = true;
      return user.save((updateUserError) => {
        if (updateUserError) {
          return res.status(500).send({
            msg: UserConst.SIGN_UP_FAILED
          });
        }
        return res.status(200).send({
          msg: UserConst.CONFIRM_USER_VERIFIED
        });
      });
    });
  });
}

function resendConfirmUser(req, res) {
  User.find({ email: req.body.email }, (userFindError, users) => {
    if (users.length === 0) {
      return res.status(400).send({
        msg: UserConst.CONFIRM_NO_EMAIL
      });
    }

    const userNames = [];
    const tokens = [];
    users.forEach((user) => {
      if (!user.isVerified) {
        userNames.push(user.name);
        // Create a verification token, save it, and send email
        const newToken = shortid.generate();
        tokens.push(newToken);
        const token = new Token({
          _userId: user._id,
          token: newToken
        });

        // Save the token
        token.save((tokenSaveError) => {
          if (tokenSaveError) {
            return res.status(500).send({
              msg: UserConst.SIGN_UP_FAILED
            });
          }
        });
      }
    });
    sendSignUpConfirmationMail(req.body.email, userNames, tokens, req);
    return res.send({
      msg: UserConst.SIGN_UP_CHECK_MAIL
    });
  });
}

function loginWithGoogle(req, res) {
  if (!req.body.google_id_token) {
    return res.status(400).send({ msg: '' });
  }
  const type = req.body.userType;
  const requiresGuardianConsent = req.body.requiresGuardianConsent;
  const guardianEmail = req.body.guardianEmail;
  const guardianConsentedAt = (requiresGuardianConsent === true) ? new Date() : '';
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client.verifyIdToken({
    idToken: req.body.google_id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  }).then((ticket) => {
    const payload = ticket.getPayload();
    const googleId = payload.sub;

    User.findOne({ googleId }, (err, user) => {
      if (err) { return req.send({ msg: err }); }

      let userPromise = Promise.resolve(user);
      if (!user) {
        const newUser = new User({
          googleId,
          type,
          loginType: 'google',
          name: payload.name,
          isVerified: true,
          requiresGuardianConsent,
          guardianEmail,
          guardianConsentedAt
        });
        userPromise = newUser.save();
      }

      return userPromise.then((newRegisteredUser) => {
        req.login(newRegisteredUser, (loginError) => {
          if (loginError) {
            return res.send({ msg: loginError });
          }
          return res.send({
            msg: UserConst.LOGIN_SUCCESS,
            user: { name: newRegisteredUser.name, type: newRegisteredUser.type }
          });
        });
      });
    });
  }).catch(err => res.status(401).send({ msg: UserConst.LOGIN_FAILED }));
}

function updatePreferences(req, res) {
  const name = req.user ? req.user.name : null;
  const key = req.body.key;
  const value = req.body.value;
  if (name) {
    User.findOne({ name }, (err, user) => {
      if (err) {
        res.status(500).json({ error: err });
        return;
      }
      if (!user) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      const preferences = { ...user.preferences };
      preferences[key] = value;
      user.preferences = preferences;
      user.save((saveErr, updatedUser) => {
        if (saveErr) {
          res.status(500).json({ error: saveErr });
          return;
        }
        res.json(updatedUser.preferences);
      });
    });
  } else {
    res.sendStatus(403);
  }
}

function getUserPreferences(req, res) {
  const name = req.user ? req.user.name : null;
  if (name) {
    User.findOne({ name }, (err, user) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).send(user.preferences);
      }
    });
  } else {
    res.sendStatus(403);
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
userRoutes.route('/login').post(loginUser);
userRoutes.route('/signup').post(createUser);
userRoutes.route('/forgot').post(forgotPassword);
userRoutes.route('/reset').post(resetPassword);
userRoutes.route('/confirmation').post(confirmUser);
userRoutes.route('/resendconfirmation').post(resendConfirmUser);
userRoutes.route('/login/google').post(loginWithGoogle);
userRoutes.route('/preferences').post(updatePreferences);
userRoutes.route('/preferences').get(getUserPreferences);
userRoutes.route('/:userName/profile').get(getUserProfile);
module.exports = userRoutes;
