const mongoose = require('mongoose');
const Bot = require('./models/telegram_bot');
const Users = require('./models/userModel');
const markup = require('../config/markup');

mongoose.connect('mongodb://localhost/telegram');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('DB connected');
});

const calculatorBot = new Bot();

calculatorBot.on('message', async (message) => {
  if (message.text === '/start') {
    const user = await Users.findOne({ chatId: message.chat.id });
    if (!user) {
      await Users.create({
        chatId: message.chat.id,
        lastMessageId: message.message_id + 1,
        currentValue: '',
        previousValue: '',
        hasСalculated: false,
      });
    }
    await Users.update({ chatId: message.chat.id }, { currentValue: '', previousValue: '0', hasСalculated: false });
    calculatorBot.sendMessage(message.chat.id, '0', markup().markup)
      .then(async (nextMessage) => {
        const chatId = nextMessage.data.result.chat.id;
        const lastMessageId = nextMessage.data.result.message_id;
        await Users.update({ chatId }, { lastMessageId });
      });
  }
});

calculatorBot.on('callback_query', async (message) => {
  let previousValue = '0';
  let currentValue = '';
  const user = await Users.findOne({ chatId: message.message.chat.id });
  let hasСalculated = user.hasСalculated;
  if (Number.isInteger(+message.data)) {
    if (user.hasСalculated === true) {
      currentValue = message.data;
      previousValue = '0'; 
      hasСalculated = false;
    } else {
      currentValue = user.currentValue + message.data;
      previousValue = user.previousValue;
    }
    calculatorBot.editMessage(
      user.chatId,
      user.lastMessageId,
      Object.assign({ text: currentValue }, markup(previousValue).markup),
    );
    await Users.update({ chatId: user.chatId }, { currentValue, previousValue, hasСalculated });
  } else if (['/', '+', '-', '*'].indexOf(message.data) !== -1) {
    if (user.previousValue === 0) {
      previousValue = +user.currentValue;
      currentValue = message.data;
      calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign(
        { text: currentValue },
        markup(user.previousValue).markup,
      ));
      await Users.update({ chatId: user.chatId }, { currentValue, previousValue });
    } else {
      if (['/', '+', '-', '*'].indexOf(user.currentValue) !== -1) {
        try {
          previousValue = eval(`${user.previousValue}`);
          currentValue = message.data;
        } catch (error) {
          console.error(error);
        }
      } else {
        try {
          if (hasСalculated === false) {
            previousValue = eval(`${user.previousValue}${user.currentValue}`);
          } else {
            previousValue = eval(`${user.previousValue}`);
            hasСalculated = false;
          }
        } catch (error) {
          console.error(error);
        }
        currentValue = message.data;
      }
      calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign(
        { text: currentValue },
        markup(previousValue).markup,
      ));
      await Users.update({ chatId: user.chatId }, { currentValue, previousValue, hasСalculated });
    }
  } else if (message.data === '=') {
    if (hasСalculated === false) {
      try {
        if (!hasСalculated) {
          previousValue = eval(`${user.previousValue}${user.currentValue}`);
        } else {
          previousValue = eval(`${user.previousValue}`);
        }
      } catch (error) {
        console.error(error);
      }
      currentValue = '0';
      hasСalculated = true;
      calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign(
        { text: currentValue },
        markup(previousValue).markup,
      ));
      await Users.update({ chatId: user.chatId }, { currentValue, previousValue, hasСalculated });
    }
  } else if (message.data === 'AC') {
    hasСalculated = false;
    calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign(
      { text: '0' },
      markup().markup,
    ));
    await Users.update({ chatId: user.chatId }, { currentValue: '', previousValue: '0', hasСalculated });
  }
});

calculatorBot.start();
