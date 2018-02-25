const EventEmitter = require('eventemitter3');
const axios = require('axios');
const { token } = require('../../config/bot_token');

class Bot extends EventEmitter {
  constructor() {
    super();
    this._token = token;
    this._offset = 0;
  }

  /**
   * Метод отправки сообщения
   * @param {Number} chat_id - id чата
   * @param {String} text - текст отправляемого сообщения
   * @param {Object} optionalParams - параметры сообщения
   */
  sendMessage(chat_id, text, optionalParams) {
    const params = {
      chat_id,
      text,
    };

    Object.assign(params, optionalParams);

    return this._request('sendMessage', params);
  }

  /**
   * Метод изменения сообщения
   * @param {Number} chat_id - id чата
   * @param {Number} message_id - id изменяемого сообщения
   * @param {String} text - текст отправляемого сообщения
   */
  editMessage(chat_id, message_id, text) {
    const params = {
      chat_id,
      message_id,
    };

    Object.assign(params, text);

    return this._request('editMessageText', params);
  }

  /**
   * Метод обращающийся к API
   * @param {String} method - метод, на который нужно сделать запрос
   * @param {Object} params - параметры запроса
   */
  _request(method, params) {
    const options = {
      url: `https://api.telegram.org/bot${token}/${method}`,
    };

    return axios.get(options.url, { params });
  }

  /**
   * Метод запрашивающий обновления
   * @param {Number} offset - id первого обновления, которое нужно вернуть
   */
  _getUpdates(offset) {
    const params = {
      offset,
      timeout: 10,
    };

    return this._request('getUpdates', params);
  }

  /**
   * Метод вызывающий EventEmmiter при обработке запроса
   * @param {Array} updates 
   */
  _handleUpdates(updates) {
    updates.forEach((update) => {
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
    });
  }

  /**
   * Метод посылающий запросы с заданной периодичностью
   */
  start() {
    this._offset++;
    return this._getUpdates(this._offset)
      .then((updates) => {
        if (updates !== undefined) {
          this._handleUpdates(updates.data.result);
        }
        return null;
      })
      .catch((error) => {
        if (error) {
          throw (error);
        }
      })
      .then(() => {
        setTimeout(() => this.start(), 100);
      });
  }
}

module.exports = Bot;
