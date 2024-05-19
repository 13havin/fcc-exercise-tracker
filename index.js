const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.set('trust proxy', true);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


uri = process.env.MONGO_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, (error) => {
  console.log(error);
});

const exeSchema = mongoose.Schema({
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, requried: true },
  date: Date
});

const userSchema = mongoose.Schema({
  username: { type: String, required: true }
});

let exeModel = mongoose.model('exercise_model', exeSchema);
let userModel = mongoose.model('user_model', userSchema);

app.route("/api/users").post(function (req, res) {
  const username = req.body.username;
  userModel.findOne({ username: username }, (err, data) => {
    if (err) return console.log('err', err)

    if (data) {
      data = { username: data.username, _id: data._id }
      return res.json(data);
    } else {
      const newUser = userModel({ username: username });
      newUser.save((err, data) => {
        if (err) return console.log('err', err);
        data = { username: data.username, _id: data._id }
        return res.json(data);
      });
    }
  });
}).get(function (req, res) {
  userModel.find({}, (err, data) => {
    if (err) return console.log('err', err)
    return res.json(data);
  });
});

app.post("/api/users/:_id/exercises", function (req, res) {
  const id = req.params._id;
  const description = req.body.description.trim();
  const duration = parseInt(req.body.duration);
  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();

  if (description == '') {
    return res.json({ error: ' description is required ' });
  } else if (isNaN(duration)) {
    return res.json({ error: ' valid duration is required ' });
  } else {
    userModel.findById({ _id: id }, (err, data) => {
      if (err) {
        return res.status(500).json(err);
      } else if (data) {
        newExercise = exeModel({ username: data.username, date: date, duration: duration, description: description });

        newExercise.save((err, data1) => {
          if (err) return console.log(err);
          data = { _id: data._id, username: data.username, date: date, duration: data1.duration, description: data1.description };
          return res.json(data);
        });
      } else {
        res.send("not found")
      }
    });
  }
});

app.get("/api/users/:_id/logs", function (req, res) {
  const id = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  const limit = req.query.limit;
  console.log(id, from, to, limit);
  userModel.findById({ _id: id }, (err, data) => {
    if (err) {
      return res.status(500).json(err);
    } else if (data) {
      exeModel.find({ username: data.username }).sort({ date: -1 }).lean().exec((err, data1) => {
        if (err) return console.log(err);
        data1 = data1.map(log => {
          delete log['__v']
          delete log['_id']
          delete log['username']
          log.date = new Date(log.date).toDateString();
          log = { description: log.description, duration: log.duration, date: log.date }
          return log;
        });

        if(from || to) {
          if (from) {
            data1 = data1.filter(data =>{
              return new Date(from).getTime() <= new Date(data.date).getTime();
            });
            from = new Date(from).toDateString();
          } else if(to) {
            data1 = data1.filter(data =>{
              return new Date(to).getTime() >= new Date(data.date).getTime();
            });
            to = new Date(to).toDateString();
          }

          if(from && to) {
            data1 = data1.filter(data =>{
              return (new Date(to).getTime() >= new Date(data.date).getTime() && new Date(from).getTime() <= new Date(data.date).getTime());
            });
            from = new Date(from).toDateString();
            to = new Date(to).toDateString();
          }
        }

        if (limit) {
          data1 = data1.slice(0, limit);
        }

        count = data1.length;

        data = { _id: data._id, username: data.username, from: from, to: to, count: count, log: data1 };
        return res.json(data);
      });
    } else {
      res.send("not found")
    }
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
