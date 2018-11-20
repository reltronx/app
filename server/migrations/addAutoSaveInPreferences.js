const mongoose = require('mongoose');

const { User } = require('../models');

mongoose.Promise = Promise;

mongoose
  .connect(process.env.MONGO_DB_PEBLIO, { useMongoClient: true })
  .then(() => User.update(
    {},
    { $set: { 'preferences.editorAutoSave': true } },
    { multi: true },
    (err, result) => {
      if (err) {
        console.error(err);
        return process.exit(1);
      }

      return process.exit(0);
    }
  ).exec());
