'use strict';
const express = require('./app'),
    logger = require('./app/utils/logger');


class DavisServer {
    constructor(config) {
        this.app = express(config);
    }

    run(cb) {
        const davisConfig = this.app.get('davisConfig');
        this.app.listen(davisConfig.port, davisConfig.ip, () => {
            logger.info('Davis server listening at http://' + davisConfig.ip + ':'+ davisConfig.port );
            if(cb) return cb(this.app);
        });
    }
}

module.exports = exports = DavisServer;