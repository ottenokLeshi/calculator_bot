const axios = require('axios');
var mongoose = require('mongoose');
const Bot = require('./models/telegram_bot');
const Users = require('./models/userModel');
const markup = require('../config/markup');


mongoose.connect('mongodb://localhost/telegram');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('DB connected')
});

const calculatorBot = new Bot();

calculatorBot.on('message', async message => {
    if (message.text === '/start') {
        const user = await Users.findOne({chatId: message.chat.id});
        if (!user) {
            await Users.create({
                chatId: message.chat.id,
                lastMessageId: message.message_id + 1,
                currentValue: '',
                previousValue: ''
            })
        }
        await Users.update({chatId: message.chat.id }, { currentValue: '', previousValue: '' })
        calculatorBot.sendMessage(message.chat.id, '0', markup().markup)
        .then(async message => {
            const chatId = message.data.result.chat.id;
            const lastMessageId = message.data.result.message_id;
            await Users.update({ chatId },{ lastMessageId })
        });
    }
});

calculatorBot.on('callback_query', async message => { 
    let previousValue = '';
    let currentValue = '';
    const user = await Users.findOne({chatId: message.message.chat.id});
    if (Number.isInteger(+message.data)) {
        currentValue = user.currentValue + message.data;    
        calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign({text: currentValue}, markup(user.previousValue).markup));
        await Users.update({ chatId: user.chatId },{ currentValue });
    } else if (message.data === '/' || message.data === '*' || message.data === '-' || message.data === '+'){
        if (user.previousValue === 0) {
            previousValue = +user.currentValue;
            currentValue = message.data;
            calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign({text: currentValue}, markup(user.previousValue).markup));
            await Users.update({ chatId: user.chatId },{ currentValue, previousValue });
        } else {
            try {
                previousValue = eval(`${user.previousValue}${user.currentValue}`);
            } catch (error) {
                console.error(error);
            }
            currentValue = message.data;
            calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign({text: currentValue}, markup(previousValue).markup));                
            await Users.update({ chatId: user.chatId },{ currentValue, previousValue });
        }
    } else if (message.data === '=') {
        try {
            previousValue = eval(`${user.previousValue}${user.currentValue}`);
        } catch (error) {
            console.error(error);
        }    
        currentValue = '';
        calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign({text: previousValue}, markup(previousValue).markup));
        if (previousValue == 'Infinity') {
            previousValue = '';
        }  
        await Users.update({ chatId: user.chatId },{ currentValue, previousValue });
    } else if (message.data === 'AC') {
        calculatorBot.editMessage(user.chatId, user.lastMessageId, Object.assign({text: '0'}, markup().markup));        
        await Users.update({chatId: user.chatId }, { currentValue: '', previousValue: '' })
    }
})

calculatorBot.start();