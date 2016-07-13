'use strict';

const Wit = require('./wit'),
    BbPromise = require('bluebird'),
    _ = require('lodash'),
    Ruxit = require('../dynatrace/ruxit'),
    logger = require('../../utils/logger');

const INTENT_CONFIDENCE_THRESHOLD = .60;

class Nlp {
     /**
     * Natural Language Processor
     * @constructs Nlp
     * @param {Object} davis - The davis object containing user, exchange, and conversertion details
     */
    constructor(davis) {
        Object.assign(this, davis);
    }

    /**
     * Process the current exchange
     * @returns {Object} Promise - Returns a promise that resolves to an updated exchange
     */
    process() {
        return new BbPromise((resolve, reject) => {
            let wit = new Wit(this.user.nlp.wit);
            wit.ask(this.exchange.request.text, {timezone: this.user.timezone})
            .then(response => {
                this.exchange.request.analysed = analyseEntities(this, response.entities);
                resolve(this.exchange);
            })
            .catch(err =>{
                if(err) reject(err);
            });
        });
    }
}

/**
 * Returns the processed entities received from WIT
 * @param {Object} davis - The davis object will provide context in case the intent isn't obvious
 * @param {Object} entities - The context in which WIT should process the request.
 * @returns {Object} processed - The processed results from the WIT request
 */
function analyseEntities(davis, entities) {
    let processed = {
        intent: getIntent(davis, entities),
        timeRange: getDateTime(entities),
        appName: _.get(entities, 'app_name[0].value', null)
    };
    return processed;
}

/**
 * Returns the requested time range the user is interested in
 * @param {Object} entities - The context in which WIT should process the request.
 * @returns {Object} timeRange - The time range generated using the graniularity of the request.
 * @private
 */
function getDateTime(entities) {
    let timeRange = null;
    if (_.has(entities, 'datetime')) {
        timeRange = Ruxit.generateTimeRange(entities.datetime[0]);
    }
    return timeRange;
}

/**
 * Returns the intent of the request
 * @param {Object} davis - The davis object will provide context in case the intent isn't obvious
 * @param {Object} entities - The context in which WIT should process the request.
 * @returns {string} intent - The name of the intent requested
 * @private
 */
function getIntent(davis, entities) {
    if (_.has(entities, 'intent')) {
        let intent = entities.intent[0];
        if (intent.confidence > INTENT_CONFIDENCE_THRESHOLD) {
            return intent.value;
        } else {
            logger.warn('I\'m not feeling that confident that this is actually what you want...');
            //ToDo Add additional inference logic
            return intent.value;
        }
    } else {
        //ToDo Add additional inference logic
        return null;
    }
}

module.exports = Nlp;