const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect("mongodb://dan:123@ds123124.mlab.com:23124/exercise")

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('public'))

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Db connected!");
});

var personSchema = mongoose.Schema({
    name: String,
    count: Number, 
    exercises:[ 
      {
        description: String,
        duration: Number, 
        date: String
      }]
});

var Person = mongoose.model('Person', personSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  var username = req.body.username
  var count = 0; 
  var newPerson = new Person({ name: username, count: count });
  
  newPerson.save(function (err, newPerson) {
    if (err) return console.error(err);
  });
  
  var name = newPerson.name;
  var id = newPerson.id;
  
  res.send({name, id});
});

app.post('/api/exercise/add', (req, res) => {

  var description = req.body.description;
  var duration = req.body.duration;
  var id = req.body.userId; 
  var date = req.body.date;
  
  if (date == "") {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();

    if(dd<10) {
      dd = '0'+dd
    } 

    if(mm<10) {
      mm = '0'+mm
    } 

    today = yyyy + '/' + dd + '/' + mm;
  
    date = today;    
  } else {
    var date = new Date(date);
    var dd = date.getDate();
    var mm = date.getMonth()+1; //January is 0!
    var yyyy = date.getFullYear();

    if(dd<10) {
      dd = '0'+dd
    } 

    if(mm<10) {
      mm = '0'+mm
    } 
    date = yyyy + '/' + dd + '/' + mm;
 
  }

  
  Person.findByIdAndUpdate(
        id,
        {$push: {"exercises": {description: description, duration: duration, date: date}}},
        {safe: true, upsert: true, new : true},
        function(err, model) {
            console.log(err);
        }
  );
  
  Person.find({_id: id}, {__v: 0, count: 0}, function(err, user) {
    res.send(user);  
  });
  
   
});


app.get('/api/exercise/log', (req, res) => {
  
  var userid = req.query.userid;
  var from = req.query.from; 
  var to = req.query.to; 
  var limit = req.query.limit; 
  
  
  Person.findById(userid, function (err, user) {
    
    var name = user.name;
    var id = user.id;
    var exercises = user.exercises;
    var counting = exercises.length; 
    user.count = counting; 
    var count = user.count; 
    
    if (from === undefined) {  
      res.send({name, id, count, exercises});

    } else {
      
      var sortedExercises = []; 
      
      if (to === undefined && limit === undefined) {
        //do from only logic here
        
        exercises.forEach((exercise)=>{
          if (exercise.date > from) {
            sortedExercises.push(exercise);         
          }  
        });
        
        res.send({name, id, count, sortedExercises});

      } else if (limit === undefined) {
        //do from to logic here
        
        exercises.forEach((exercise)=>{
          if (exercise.date > from && exercise.date < to) {
            sortedExercises.push(exercise);         
          }  
        });
        
        res.send({name, id, count, sortedExercises});

        
      } else {
        //do from limit logic here
        var tally = 0; 
        exercises.forEach((exercise)=>{
          
          if (exercise.date > from && tally < limit) {
            sortedExercises.push(exercise);  
            tally = tally + 1;
          }  
          
          
  
        });
        res.send({name, id, count, sortedExercises});

      } 
    }
    
    
  });
});

app.get('/api/exercise/users', (req, res) => {
  Person.find({}, {exercises: 0, __v: 0}, function(err, users) {
    res.send(users);  
  });
});












// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
