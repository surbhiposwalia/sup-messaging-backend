/* global describe, beforeEach, it */

global.databaseUri = 'mongodb://localhost/sup-dev';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const UrlPattern = require('url-pattern');
const app = require('../server').app;

const User = require('../server/models/user');
const Message = require('../server/models/message');

const makeSpy = require('./spy');

const should = chai.should();

chai.use(chaiHttp);

const alice = { username: 'alice', password: 'pw', _id: 'aaaaaaaaaaaaaaaaaaaaaaaa'};
const bob = { username: 'bob', password: 'pw', _id: 'bbbbbbbbbbbbbbbbbbbbbbbb'};
const chuck = { username: 'chuck', password: 'pw', _id: 'cccccccccccccccccccccccc'};
const listPattern = new UrlPattern('/api/v1/messages');
const singlePattern = new UrlPattern('/api/v1/messages/:messageId');

describe('Message endpoints', function () {
  beforeEach((done) => {
    // Clear the database
    mongoose.connection.db.dropDatabase(function (err, res) {
      // Add three example users
      const promiseA = User.createUser(alice.username, alice.password, alice._id);
      const promiseB = User.createUser(bob.username, bob.password, bob._id);
      const promiseC = User.createUser(chuck.username, chuck.password, chuck._id);
      Promise.all([promiseA, promiseB, promiseC]).then(function () {
        done();
      });
    });
  });

  afterEach(done => mongoose.connection.db.dropDatabase(done));

  describe('/api/v1/messages', function () {
    describe('GET', function () {
      it('should return an empty list of messages initially', function () {
        // Get the list of messages
        return chai.request(app)
          .get(listPattern.stringify())
          .auth('alice', 'pw')
          .then(function (res) {
            // Check that it's an empty array
            res.should.have.status(200);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('array');
            res.body.length.should.equal(0);
          })
          .catch(err => {
            throw new Error(err);
          });
      });

      it('should return a list of messages from or to authenticated user', function () {
        const messageA = {
          from: alice._id,
          to: bob._id,
          text: 'Hi Bob'
        };
        const messageB = {
          from: alice._id,
          to: chuck._id,
          text: 'Hi Chuck'
        };
        const messageC = {
          from: bob._id,
          to: chuck._id,
          text: 'Hi Chuck'
        };
        const messageD = {
          from: bob._id,
          to: alice._id,
          text: 'Hi Alice'
        };

        // Create three messages
        return Message.create(messageA, messageB, messageC, messageD)
          .then(function (res) {
            // Get the list of messages
            return chai.request(app)
              .get(listPattern.stringify())
              .auth('alice', 'pw');
          })
          .then(function (res) {
            // Check that the messages are in the array
            res.should.have.status(200);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('array');
            res.body.length.should.equal(3);

            var message = res.body[0];
            message.should.be.an('object');
            message.should.have.property('text');
            message.text.should.be.a('string');
            message.text.should.equal(messageA.text);
            message.should.have.property('to');
            message.from.should.be.an('object');
            message.from.should.have.property('username');
            message.from.username.should.equal(alice.username);
            message.to.should.be.an('object');
            message.to.should.have.property('username');
            message.to.username.should.equal(bob.username);

          })
          .catch(err => {
            throw new Error(err);
          });
      });

      it('with auth user, should filter by to', function() {
        const message1 = { from: alice._id, to: bob._id, text: 'Hi Bob from Alice' };
        const message2 = { from: bob._id, to: alice._id, text: 'Hi Alice from Bob' };
        const message3 = { from: alice._id, to: chuck._id, text: 'Hi Chuck from Alice' };

        return Message.create([ message1, message2, message3 ])
          .then(() => {
            return chai.request(app)
              .get(listPattern.stringify() + '?to=bbbbbbbbbbbbbbbbbbbbbbbb')
              .auth('alice', 'pw')
              .then(res => {
                res.should.have.status(200);
                res.body.should.be.an('array');
                res.body.length.should.equal(1);
                res.body[0].should.be.an('object');
                res.body[0].should.have.property('text');
                res.body[0].text.should.eq('Hi Bob from Alice');
              });
          })
          .catch(err => { throw new Error(err); });
      });
    });

    describe('POST', function () {
      it('should return 401 for unauthenticated user', () => {
        const message = {
          from: alice._id,
          to: bob._id,
          text: 'Hi Bob'
        };

        return chai.request(app)
          .post(listPattern.stringify())
          .send(message)
          .catch(err => {
            const res = err.response;
            res.should.have.status(401);
          });
      });

      it('with auth user, should allow adding a message', () => {
        const message = {
          to: bob._id,
          text: 'Hi Bob'
        };
        // Add a message
        return chai.request(app)
          .post(listPattern.stringify())
          .send(message)
          .auth('alice', 'pw')
          .then((res) => {
            // Check that an empty object was returned
            res.should.have.status(201);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.should.have.header('location');
            res.body.should.be.an('object');
            res.body.should.be.empty;

            const params = singlePattern.match(res.headers.location);
            // Fetch the message from the database, using the ID
            // from the location header
            return Message.findById(params.messageId).exec();
          })
          .then((res) => {
            // Check that the message has been added to the
            // database
            should.exist(res);
            res.should.have.property('text');
            res.text.should.be.a('string');
            res.text.should.equal(message.text);
            res.should.have.property('from');
            res.from.toString().should.equal(alice._id);
            res.should.have.property('to');
            res.to.toString().should.equal(bob._id);
          });
      });

      it('with auth user, should reject messages without text', function () {
        const message = {
          from: alice._id,
          to: bob._id
        };

        var spy = makeSpy();
        // Add a message without text
        return chai.request(app)
          .post(listPattern.stringify())
          .auth('alice', 'pw')
          .send(message)
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
            res.body.message.should.equal('Missing field: text');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });

      it('with auth user, should reject non-string text', function () {
        const message = {
          to: bob._id,
          text: 42
        };
        const spy = makeSpy();

        // Add a message with non-string text
        return chai.request(app)
          .post(listPattern.stringify())
          .auth('alice', 'pw')
          .send(message)
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
            res.body.message.should.equal('Incorrect field type: text');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });

      it('with auth user, should reject non-string to', function () {
        const message = {
          to: 42,
          text: 'Hi Bob'
        };
        const spy = makeSpy();
        // Add a message with non-string to
        return chai.request(app)
          .post(listPattern.stringify())
          .auth('alice', 'pw')
          .send(message)
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
            res.body.message.should.equal('Incorrect field type: to');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });

      it('with auth user, should reject messages to non-existent users', function () {
        const message = {
          to: 'dddddddddddddddddddddddd',
          text: 'Hi Dan'
        };
        const spy = makeSpy();
        // Add a message to a non-existent user
        return chai.request(app)
          .post(listPattern.stringify())
          .auth('alice', 'pw')
          .send(message)
          .then(spy)
          .catch(function (err) {
            // If the request fails, make sure it contains the
            // error
            const res = err.response;
            res.should.have.status(422);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('object');
            res.body.should.have.property('message');
            res.body.message.should.equal('Incorrect field value: to');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });
    });
  });

  describe('/api/v1/messages/:messageId', function () {
    describe('GET', function () {
      it('should 401 with unauth user', () => {
        const spy = makeSpy();
        return chai.request(app)
          .delete(singlePattern.stringify({ messageId: '1' }))
          .then(spy)
          .then(() => spy.called.should.be.false)
          .catch(err => {
            const res = err.response;
            res.should.have.status(401);
          });
      });
      
      it('with auth user, should 404 on non-existent messages', function () {
        var spy = makeSpy();
        // Get a message which doesn't exist
        return chai.request(app)
          .get(singlePattern.stringify({ messageId: '000000000000000000000000' }))
          .auth('alice', 'pw')
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
            res.body.message.should.equal('Message not found');
          })
          .then(function () {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          });
      });
      
      it('with auth user, should return a single message', function () {
        const message = {
          from: alice._id,
          to: bob._id,
          text: 'Hi Bob'
        };
        let messageId;
        // Add a message to the database
        return new Message(message).save()
          .then(function (res) {
            messageId = res._id.toString();
            // Request the message
            return chai.request(app)
              .get(singlePattern.stringify({
                messageId: messageId
              }))
              .auth('alice', 'pw');
          })
          .then(function (res) {
            // Check that the message is returned
            res.should.have.status(200);
            res.type.should.equal('application/json');
            res.charset.should.equal('utf-8');
            res.body.should.be.an('object');
            res.body.should.be.an('object');
            res.body.should.have.property('text');
            res.body.text.should.be.a('string');
            res.body.text.should.equal(message.text);
            res.body.should.have.property('to');
            res.body.from.should.be.an('object');
            res.body.from.should.have.property('username');
            res.body.from.username.should.equal(alice.username);
            res.body.to.should.be.an('object');
            res.body.to.should.have.property('username');
            res.body.to.username.should.equal(bob.username);
          });
      });
    });
  });
});
