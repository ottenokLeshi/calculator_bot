const EventEmitter = require('eventemitter3');
const axios = require('axios');
const token = require('../../config/bot_token').token;

class Bot extends EventEmitter {
    constructor() {
        super();
        this._token = token;
        this._offset = 0;
    }

    sendMessage(chat_id, text, optionalParams) {
        let params = {
          chat_id,
          text
        };
        
        Object.assign(params, optionalParams);
    
        return this._request('sendMessage', params);
    }

    editMessage(chat_id, message_id, text) {
        let params = {
            chat_id,
            message_id
        }

        Object.assign(params, text)

        return this._request('editMessageText', params);
    }

    _request(method, params) {
        const options = {
            url: `https://api.telegram.org/bot${token}/${method}`,
        }

        return axios.get(options.url, {params});
    }

    _getUpdates(offset) {
        let params = {
            offset: offset,
            timeout: 10
        };
    
        return this._request('getUpdates', params);
    }

    _handleUpdates(updates) {
        updates.forEach(update => {
            this._offset = update.update_id;
            const message = update.message;
            const editedMessage = update.edited_message;
            const callbackQuery = update.callback_query;

            if (message) {
                this.emit('message', message);
            } else if (editedMessage) {
                this.emit('edited_message', editedMessage);
            } else if (callbackQuery) {
                this.emit('callback_query', callbackQuery);
            }
        })
    }

    start() {
        this._offset++;
        return this._getUpdates(this._offset)
            .then(updates => {
                if (updates !== undefined) {
                this._handleUpdates(updates.data.result);
                }
                return null;
            })
            .catch(error => {
                if (error) {
                  throw(error);
                }
            })
            .then(() => {
                setTimeout(() => this.start(), 100);
            });
    }
};

module.exports = Bot;