/* global it, describe, beforeEach */
global.databaseUri = 'mongodb://localhost/sup-dev';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const UrlPattern = require('url-pattern');
const app = require('../server').app;

const User = require('../server/models/user');

const makeSpy = require('./spy');

const should = chai.should();

chai.use(chaiHttp);

describe('User endpoints', function () {
  beforeEach(function (done) {
    // Clear the database
    mongoose.connection.db.dropDatabase(done);
    this.singlePattern = new UrlPattern('/api/v1/users/:username');
    this.listPattern = new UrlPattern('/api/v1/users');
  });

  afterEach(done => mongoose.connection.db.dropDatabase(done));

  describe('/api/v1/users', function () {
    describe('GET', function () {
      it('should return a list of users', function () {
        const user = {
          username: 'joe',
          password: 'pw'
        };

        // Create a user
        return User.createUser(user.username, user.password)
          .then(function () {
            // Get the list of users
            return chai.request(app)
              .get(this.listPattern.stringify())
              .auth('joe', 'pw');
          }.bind(this))
          .then(function (res) {
            // Check that the array contains a user
            res.should.have.status(200);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('array');
            res.body.length.should.equal(1);
            res.body[0].should.be.an('object');
            res.body[0].should.have.property('username');
            res.body[0].username.should.be.a('string');
            res.body[0].username.should.equal(user.username);
            res.body[0].should.have.property('_id');
            res.body[0]._id.should.be.a('string');
          });
      });
    });
    
    describe('POST', function () {
      it('should allow adding a user', function () {
        var user = {
          username: 'joe',
          password: 'pw'
        };

        // Add a user
        return chai.request(app)
          .post(this.listPattern.stringify())
          .send(user)
          .then(function (res) {
            // Check that an empty object is returned
            res.should.have.status(201);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.should.have.header('location');
            res.body.should.be.an('object');
            res.body.should.be.empty;

            var params = this.singlePattern.match(res.headers.location);
            // Fetch the user from the database, using the
            // location header to get the ID
            return User.findOne({username: params.username}).exec();
          }.bind(this))
          .then(function (res) {
            // Check that the user exists in the database
            should.exist(res);
            res.should.have.property('username');
            res.username.should.be.a('string');
            res.username.should.equal(user.username);
          });
      });
      it('should reject users without a username', function () {
        var user = {};
        var spy = makeSpy();
        // Add a user without a username
        return chai.request(app)
          .post(this.listPattern.stringify())
          .send(user)
          .then(spy)
          .catch(function (err) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status(422);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('object');
            res.body.should.have.property('message');
            res.body.message.should.equal('Missing field: username');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });
      it('should reject non-string usernames', function () {
        var user = {
          username: 42
        };
        var spy = makeSpy();
        // Add a user without a non-string username
        return chai.request(app)
          .post(this.listPattern.stringify())
          .send(user)
          .then(spy)
          .catch(function (err) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status(422);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('object');
            res.body.should.have.property('message');
            res.body.message.should.equal('Incorrect field type: username');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });
    });
  });

  describe('/api/v1/users/:username', function () {
    let user;

    beforeEach(done => {
      User.createUser('admin', 'pw')
        .then(newUser => {
          user = newUser;
          done();
        })
        .catch(err => err);
    });

    afterEach(done => {
      User.remove({}).then(() => done());
    });

    describe('GET', function () {

      it('should return unauthorized on unauth request', function () {
        var spy = makeSpy();
        // Request a non-existent user
        return chai.request(app)
          .get(this.singlePattern.stringify({ username: 'johnny' }))
          .then(spy)
          .catch(function (err) {
            const res = err.response;
            res.should.have.status(401);
          });
      });

      it('should 404 on non-existent users', function () {
        var spy = makeSpy();
        // Request a non-existent user
        return chai.request(app)
          .get(this.singlePattern.stringify({ username: 'johnny' }))
          .auth('admin', 'pw')
          .then(spy)
          .catch(function (err) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status(404);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('object');
            res.body.should.have.property('message');
            res.body.message.should.equal('User not found');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });

      it('should return a single user', function () {
        const user = {
          username: 'joe',
          password: 'pw'
        };
        // Add a user to the database
        return User.createUser(user.username, user.password)
          .then(function (res) {
            let username = res.username.toString();
            // Make a request for the user
            return chai.request(app)
              .get(this.singlePattern.stringify({
                username
              }))
              .auth('joe', 'pw');
          }.bind(this))
          .then(function (res) {
            // Check that the user's information is returned
            res.should.have.status(200);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('object');
            res.body.should.have.property('username');
            res.body.username.should.be.a('string');
            res.body.username.should.equal(user.username);
          });
      });
    });

    describe('PUT', function () {
      it('should allow authenticated user to edit self', function () {
        const oldUser = {
          username: 'joe',
          password: 'pw'
        };
        const newUser = {
          username: 'joe2',
          password: 'pw'
        };
        let username;
        // Add a user to the database
        return User.createUser(oldUser.username, oldUser.password)
          .then(function (res) {
            username = oldUser.username;
            // Make a request to modify the user
            return chai.request(app)
              .put(this.singlePattern.stringify({
                username
              }))
              .auth('joe', 'pw')
              .send(newUser);
          }.bind(this))
          .then(function (res) {
            // Check that an empty object was returned
            res.should.have.status(200);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('object');
            res.body.should.be.empty;

            // Fetch the user from the database
            return User.findOne({ username: newUser.username });
          })
          .then(function (user) {
            // Check that the user has been updated
            should.exist(user);
            user.should.have.property('username');
            user.username.should.be.a('string');
            user.username.should.equal(newUser.username);
          });
      });

      it('should prevent authenticated user editing another user', function () {
        const joe = { username: 'joe', password: 'pw' };
        const bill = { username: 'bill', password: 'pw' };
        const spy = makeSpy();

        User.createUser(joe.username, joe.password)
          .then(user => {
            joe._id = user._id;
            return User.createUser(bill.username, bill.password);
          })
          .then(user => {
            bill._id = user._id;
            return chai.request(app)
              .put(this.singlePattern.stringify({ userId: bill._id }))
              .auth(joe.username, joe.password)
              .send({ username: 'dummyuser', password: 'dummypw' });
          })
          .then(spy)
          .then(() => {
            spy.called.should.be.true;
          })
          .catch(err => {
            const res = err.response;
            res.should.have.status(401);
          });
      });
    });

  });
});
