'use strict';

const ConversationService = require('../../../services/ConversationService'),
    logger = require('../../../utils/logger'),
    Davis = require('../../../core'),
    BbPromise = require('bluebird'),
    _ = require('lodash');

const REQUEST_SOURCE = 'slack';


module.exports = function SlackService(config) {


    /**
     * Responds to Slack using the exchange generated by Davis
     * @param {Object} davis - The fully processed Davis object.
     * @returns {Object} response - The response formatted how Slack expects.
     */
    function formatResponse(davis) {
        logger.info('Generating the response for Slack');
    
        let outputSpeech;
        
        if (davis.exchange.response.visual.card) {
            outputSpeech = {
                type: 'card',
                card: davis.exchange.response.visual.card
            };
        } else {
            outputSpeech = {
                type: 'text',
                text: davis.exchange.response.visual.text
            };
        }
        
        return {
            response: {
                shouldEndSession: _.get(davis, 'exchange.response.finished', true),
                outputSpeech: outputSpeech
            }
        };
    }
    
    /**
     * Strips out emojis
     * 
     * @param {String} str
     * @returns {String} result
     */
    function stripEmojis(str) {
        
        // Allow key emoji, so user can ask what our usage of the key means
        let result = (str.includes(':key:')) ? str : str.replace(/\:.+\:/g, '').trim();
        
        if (result == '') {
            result = 'hey davis';
            logger.warn('Error: Slack stripped emojis and was going to send an empty string to Wit');
        }
        
        if (result !== str.trim()) {
            logger.warn('Emojis stripped from user request: ');
            logger.warn('"' + str + '"');
        }
        
        return result;
        
    }

    return {
        /**
         * Interacts with Davis via Slack
         * 
         * @param {Object} req - The request received from Slack.
         * @param {Object} member - Slack member details
         * 
         * @returns {promise} res - The response formatted for Slack.
         */
        askDavis: (req, member) => {
            
            logger.info('Starting our interaction with Davis');
            
            return new BbPromise((resolve, reject) => {
                
                // Strip emojis
                req.text = stripEmojis(req.text);
        
                // Use Slack user property as id for Davis user 
                // Avoids having to enter Slack user property for each Davis user for association
                let user = {
                    id: member.id, 
                    name: {
                        first: member.profile.first_name, 
                        last: member.profile.last_name
                    },
                    email: member.profile.email,
                    nlp: config.nlp,
                    dynatrace: config.dynatrace,
                    timezone: member.tz
                };
    
                // Starts or continues our conversation
                ConversationService.getConversation(user)
                    .then(conversation => {
                        let davis = new Davis(user, conversation, config);
                        return davis.interact(req.text, REQUEST_SOURCE);
                    })
                    .then(davis => {
                        logger.info('Finished processing request');
                        return resolve(formatResponse(davis));
                    })
                    .catch(err => {
                        logger.error(`Unfortunately, something went wrong.  ${err.message}`);
                        //ToDo Add failure response
                        return reject(err.message);
                    });
            });
            
        },
        
        isOtherUserMentioned: (str) => {
            
            let result = (str.includes('@') && !str.includes('davis')) ? str.match(/(?:^|\W)@(\w+)(?!\w)/g) : str;
        
            if (result !== str) {
                logger.warn('Ending conversation, since this other user was mentioned in the request: ');
                logger.warn('"' + result + '"');
            }
            
            return result !== str;
        }
    };
};