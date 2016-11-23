const express = require('express');
const messagesRouter = express.Router();
const passport = require('../config/passport');
const Message = require('../models/message');
const User = require('../models/user');
const validateMessage = require('./validators').validateMessage;

messagesRouter.use(passport.authenticate('basic', { session: false }));
messagesRouter
  .route('/')
  .get((req, res) => {
    let query = { $or: [
      { from: req.user._id },
      { to: req.user._id }
    ] };

    if (req.query.to) query = { $and: [
      { from: req.user._id },
      { to: req.query.to }
    ] };

    Message
      .find(query)
      .populate('from to', 'username')
      .then(messages => {
        res.json(messages);
      })
      .catch(err => {
        if (err.kind !== 'ObjectId') return res.sendStatus(500);
        
        res.status(400).json({ message: `Invalid '${err.path}' value: '${err.value}'` });
      });
  })

  .post((req, res) => {
    const validatorRes = validateMessage(req.body);
    if (validatorRes.error) return res.status(validatorRes.status).json(validatorRes.body);

    return User.findOne({ _id: req.body.to })
      .then(user => {
        if (!user) throw { status: 422, body: { message: 'Incorrect field value: to' } };
      })
      .then(() => Message.create(Object.assign({ from: req.user._id }, req.body)))
      .then(message => {
        res.set('location', `/api/v1/messages/${message._id}`);
        res.status(201).json({});
      })
      .catch(err => {
        if (err.status === 422) return res.status(422).json(err.body);

        console.error(err);
        return res.sendStatus(500);
      });

  });

messagesRouter
  .route('/:messageId')
  .get((req, res) => {
    Message
      .findOne({ _id: req.params.messageId })
      .populate('from to', 'username')
      .then(message => {
        if (!message) return res.status(404).json({ message: 'Message not found' });
        if ( message.from._id.equals(req.user._id) || message.to._id.equals(req.user._id) ) return res.json(message);

        return res.status(401).json({ message: 'Not Authorized' });
      })
      .catch(() => res.sendStatus(500));
  });

module.exports = messagesRouter;
