const mongoose = require('mongoose');

const User = mongoose.model('User', {
  chatId: {
    type: Number,
    unique: true,
  },
  lastMessageId: {
    type: Number,
  },
  currentValue: {
    type: String,
  },
  previousValue: {
    type: String,
  },
  hasСalculated: {
    type: Boolean,
  },
});

module.exports = User;
