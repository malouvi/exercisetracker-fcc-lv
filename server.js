
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid');
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI,{useNewUrlParser: true })


//to stop DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead. warning
mongoose.set('useCreateIndex', true);
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});






//Schema
const userSchema = new mongoose.Schema({
  _id: {
  'type': String,
  'default': shortid.generate
},
  username:{
    type:String,
    required: true
  },
  exercises:[{type:mongoose.Schema.Types.ObjectId, ref: 'Exercise' }]
});

const exerciseSchema = new mongoose.Schema({
	user:{type: String,
        default: shortid.generate,
  ref: 'User' },
	description:String,
	duration: Number,
	date:{type: Date,
        default: Date.now}
});


//Model
const User=mongoose.model('User',userSchema)
const Exercise=mongoose.model('Exercise',exerciseSchema)
//Post new user
app.post('/api/exercise/new-user',(req,res)=>{
  console.log('POST');
  //verify user does not exist
  User.findOne({username:req.body.username},(err,userFound)=>{
    if(err){
      console.log("error find username "+err);
      return console.log(err);         
    } 
    if(!userFound){
    // create new user
      const newUser = new User({username:req.body.username,exercises:[]});
    //save in db
      newUser.save((err,newUser)=>{
        if(err){
          console.log("error save "+err);
          return console.log(err);         
        }
        res.json({username:newUser.username,_id:newUser._id});
      });
    }
    else{
      res.json({error:"username already exists"});
    }
  });    
});
//Post exercises
app.post('/api/exercise/add',(req,res)=>{
  if(!req.body.userId||!req.body.description||!req.body.date||!req.body.duration){
    console.log(req.body);
    return res.json({error:"missing field"});
  }
  // find user by id
 User.findById(req.body.userId,(err,data)=>{
         if(err){
        console.log("error findone"+err);
        return ;  
      }
   if(data){
     const pattern= /[0-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]/;
     const date=req.body.date;
     console.log(pattern.test(date));
     //if no date provided or date in format demanded
     if (!date || pattern.test(date)){
      const newEx = new Exercise(
       {
       user:data._id,
       description:req.body.description,
       duration: req.body.duration,
       date: req.body.date?new Date(req.body.date):new Date()
       });
       newEx.save((err,result)=>{
             if(err){
          console.log("error save "+err);
          return ;  
        }
              res.json({exercises:result});
       });
     }
     else{
       res.json({error: "date format error"});
     }
  }
  else{
    res.json({error: "userID does not exist" });
  }   
 });
});
//GET  users's exercise log
app.get('/api/exercise/log',(req,res)=>{ 
  if(!req.query.userId){
   return res.json({error: "No userId"}); 
  }
  const userId=req.query.userId;
  const from=(req.query.from)? new Date(req.query.from):new Date(0);
  const to=(req.query.to)?new Date(req.query.to): new Date();
  const limit=(req.query.limit)?parseInt(req.query.limit,10):Number.MAX_SAFE_INTEGER;
  console.log(limit);
  Exercise.find({
          user:userId,
          date:{
           '$gte': from,
           '$lte': to
          }
        }
    ).limit(limit).populate('user').exec((err,data)=>{
    console.log("find  " +data);
    if(err){
      console.log("findOne error "+err);
      return;
    }
    if(data){
      res.json({user:{_id: data[0].user._id,username: data[0].user.username}, count:data.length,  log:data.map(val=>{
        return {description: val.description, duration: val.duration,date: val.date}})
      });
    }
    else{
      console.log(userId+" "+data);
      res.json({username:"unknown"});
    }
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
