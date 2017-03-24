var express = require('express');
var app = express();
module.exports = app;

// load configurations
var config = require('../test_config');
for(var key in config) {
    app.set(key, config[key]);
}
require('./tools/signal');
var session = require('express-session');
app.use(session({
	secret: app.get('secret'),
	resave: false,
	saveUninitialized: false
}));
var body_parser = require('body-parser');
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));
app.disable('x-powered-by');

require('./db');
require('./view');
require('./resource');
require('./control');

app.listen(app.get('port'), function(){
    console.log('Buy-Buy is running on port', app.get('port'));
});
