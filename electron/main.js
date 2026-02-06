require('dotenv').config();
const appController = require('./controllers/AppController');
const dataController = require('./controllers/DataController');

// Initialize Controllers
dataController.init();
appController.init();
