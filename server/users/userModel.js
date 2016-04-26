var Q = require('q');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var SALT_WORK_FACTOR = 10;

var UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  
  password: {
    type: String,
    required: true
  },
  salt: String
});

// Verify password 
UserSchema.methods.comparePasswords = function(attemptedPassword) {
  var savedPassword = this.password;
  return Q.Promise(function(resolve, reject) {
    bcrypt.compare(attemptedPassword, savedPassword, function(err, isMatch) {
      if(err) {
        reject(err);
      } else {
        resolve(isMatch);
      }
    });
  });
};

UserSchema.pre('save', function(next) {
  var user = this;
  // only hash the password if it has been modified(or is new)
  if(!user.isModified('password')) {
    return next();
  }
  
  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if(err) {
      return next(err);
    }
    // has the password with new salt
    bcrypt.hash(user.password, salt, null ,function(err, hash) {
      if(err) {
        return next(err);
      }
      // save hashed password to user
      user.password = hash;
      user.salt = salt;
      next();
    });
  });
});

module.exports = mongoose.model('users', UserSchema);
// var User = mongoose.model('User', UserSchema);

// module.exports = User;