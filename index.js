const express = require('express')
const app = express()
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
const UserRouter = require("./routes/signup-loginRoutes");
// mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});

mongoose.connect('mongodb+srv://sayil:sayil2194@cluster0-knm9b.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log('we are connected')
});

 
// parse application/json
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}));

const port = 2194;

app.get('/', (req, res) => res.send('Hello World!'))
app.post('/t', (req, res) => res.send(req.body))
app.use('/reg', require('./routes/signup-loginRoutes'))

app.listen(process.env.PORT || port, () => console.log(`Example app listening on port ${port}!`))