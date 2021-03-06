'use strict';

const _ = require('lodash');
const phrases = require('./phrases');

class Stop {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      stop: {
        usage: 'Ends the current conversation with Davis.',
        phrases,
        lifecycleEvents: [
          'stop',
        ],
        regex: /^stop$/i,
      },

      timeout: {
        usage: 'End the conversation without clearing context.',
        phrases: [],
        lifecycleEvents: [
          'timeout',
        ],
        regex: /^timeout$/,
      },
    };

    this.hooks = {
      'stop:stop': (exchange) => {
        exchange.resetContext();
        this.stop(exchange);
      },
      'timeout:timeout': (exchange) => {
        this.stop(exchange);
      },
    };
  }

  stop(exchange) {
    this.davis.logger.debug('Ending the current conversation.');
    const response = _.sample([
      'Okay, have a good one.',
      'Talk to you later.',
      'Bye!',
      'See you later.',
    ]);
    exchange.response(response).end();
  }
}

module.exports = Stop;
