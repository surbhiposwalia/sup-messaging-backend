var runServer = require('../server').runServer;
before(function(done) {
    runServer(function() {
        done()
    });
});

