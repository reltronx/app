const shortid = require('shortid');
const Token = require('../models/token.js');
const User = require('../models/user.js');
const UserConst = require('../constants/userConstants.js');
const mailers = require('../services/mailers.js');
/*
function createUser(req, res) {
  userCreator = new UserCreator(req.body);

  if (userCreator.save()) {
    return userCreator.user();
  }
  return userCreator.errors();
}


create the account
  hashing the password
  should the acc be verified?
  if not, generate a verification token
redirect user somewhere based on ^
*/
module.exports = class UserCreator {
  constructor(body) {
    this.email = body.mail;
    this.name = body.name;
    this.type = body.userType;
    this.password = body.password;
    this.requiresGuardianConsent = body.requiresGuardianConsent;
    this.guardianEmail = body.guardianEmail;
    this.guardianConsentedAt = (body.requiresGuardianConsent === true) ? new Date() : '';
    this.user = this.createUser();
    this.token = null;
    this.msg = '';
  }

  createUser() {
    const user = new User({
      email: this.email,
      name: this.name,
      type: this.type,
      password: this.password,
      loginType: 'password',
      requiresGuardianConsent: this.requiresGuardianConsent,
      guardianEmail: this.guardianEmail,
      guardianConsentedAt: this.guardianConsentedAt,
      isVerified: this.verify()
    });
    user.hashPassword(this.password);
    return user;
  }

  saveUser() {
    return new Promise((resolve, reject) => {
      this.user.save((err, user) => {
        if (user) {
          if (this.isVerified) {
            this.msg = UserConst.PROCEED_TO_LOG_IN;
            return resolve(this.msg);
          }
          this.createToken(user._id);
          this.msg = UserConst.SIGN_UP_CHECK_MAIL;
          mailers.sendSignUpConfirmationMail(this.email, [this.name], [this.token]);
          return resolve(this.msg);
        }

        if (err.code === 11000) {
          this.msg = UserConst.SIGN_UP_DUPLICATE_USER;
          return resolve(this.msg);
        }
        this.msg = UserCosnt.SIGN_UP_FAILED;
        return reject(this.msg);
      });
    });
  }

  createToken(id) {
    const tempToken = shortid.generate();
    const token = new Token({
      _userId: id,
      token: tempToken
    });
    token.save((updateTokenError) => {
      if (updateTokenError) {
        return res.status(500).send({
          msg: UserConst.SIGN_UP_FAILED
        });
      }
    });
    this.token = tempToken;
  }

  verify() {
    return (this.type === 'student');
  }
};
