express =  require('express');

nodemailer = require('nodemailer');
Account = require('../models/account.js')
Session = require('../models/session.js')
passport = require('passport')

async = require('async');
forEach = require('async-foreach').forEach;
Newsletter = require('../models/newsletter');
CoffeeCups = require('../models/coffeecups');
const Canvas = require('../models/canvas_state')
Bezier = require('../models/bezier');
fs = require('fs');
path = require('path');
const http = require('http')
const axios = require('axios')
const accessControl = require('../middleware/access_control')
const GetNonNamedMap = require('../lib/map_tools')

router = express.Router();

router.get('/', function(req, res){
  return res.render('index', {});
  //res.send('Hello World');
});

router.get('/react-app', function(req, res){
  axios.get(`http://localhost:3000`)
    .then((response) => {
      response.data;
      console.log(response.data)
      return res.send(response.data)
    })
    .catch((err) => {
      console.error.bind(err);
    })
})

router.get('/widget', function(req, res){
  return res.render('widget', {});
});

router.get('/sandbox', function(req, res){
  return res.render('sandbox', {});
});

router.get('/blog/terrium', function(req, res){
  return res.render('blog/post', {});
});

router.get('/ty', function(req, res){
  return res.render('profile', {});
});
router.get('/stats', function(req, res){
  return res.render('profile', {});
});

router.post('/email/add', function(req, res){
  console.log('email is ' + req.body.email);
  Newsletter.add(req, res, function(err, message){
    if(err) return res.send(err);
    res.send(message);
  })

});

router.get('/particles', function(req, res){
  res.render('voronoi', {});
})

router.get('/email/send', function(req, res){
  Newsletter.send(req,res, function(err, info){
    if(err) return res.send(err);
    return res.send('Success!\n' + info.accepted + '\n' + info.response);
  })
})

router.get('/nonsense', function(req, res){
  res.render('nonsense', {});
});

router.get('/bezier', function(req, res){
  res.render('bezier', {});
});

router.get('/bezier/:name', function(req, res){
  res.render('bezier', {});
});

router.get('/watch', function(req, res){
  res.render('watch', {});
});

router.get('/proto', function(req, res){
  res.render('OnTour/proto', {});
});

router.get('/canvas/index', function(req, res){
  Canvas.find({}, function(err, _states){
    if(err)
      console.error(err);
    res.send({list: _states});
  })
})
router.get('/bezier/name/:name', function(req, res){
  Canvas.findOne({name: req.params.name}, function(err, _state){
    if(err)
      console.error(err);
    if(!_state) return GetNonNamedMap((curves) => {
      res.send({canvas_state: curves});
    });
    _state.getCurves(function(curves){
      res.send({canvas_state: curves});
    })
  })
});
router.get('/bezier/load/:id', function(req, res){
  Canvas.findOne({id: req.params.id}, function(err, _state){
    if(err)
      console.error(err);
    _state.getCurves(function(curves){
      res.send({canvas_state: curves});
    })
  })
});
router.post('/bezier/save', function(req, res){
  if(req.body.canvas_state ==  null)
    return res.status(400).send({err: 'No curve data'});
  
  // serialize all curves to canvas_state
  var curves = []; 
  var _name = req.body.name;
  forEach(req.body.canvas_state, function(_item){
    var done = this.async();
    bezier = new Bezier();
    bezier.serialize(_item.curve, function(err, curve){
      if(err){
        console.log(err)
        return res.status(500).send(err);
      }
      console.log('bezier id: ' + curve.id);
      curves.push(curve.id);
      done();
    })
  }, function(){
    canvas = new Canvas();
    canvas.name = _name; 
    canvas.curves = curves;
    canvas.save(function(err){
      if(err)
        console.error(err);
      return res.send('ok');
    });
  })
});
router.get('/login', function(req, res){
  return res.render('login', {});
})
router.post('/login', accessControl, passport.authenticate('local', {
  failureFlash: false
}), function(req, res, next) {
  Session.findOne({user_id: req.user.id}, function(err, session){
    if(err)
      console.error(err);
    if(!session){
      console.error('this should never happen')
    }
    return session.saveSesh(req.session.id, req.user, res);
  });
});
router.get('/register', function(req, res){
  return res.render('register', {});
})
router.post('/register', accessControl, function(req, res, next) {
  username = req.body.username;
  password = req.body.password;
  email = req.body.email;
  console.log(`user: ${username}`);
  if(!username || !password || !email){
    req.session.destroy();
    //res.clearCookie('connect.sid');
    return res.status(400).send('missing field data').end();
  }
    // User by that name already exists
    // if(user)
    //   return res.status(400).send(`user by name: ${user.username} already taken`).end();

  return Account.register(new Account({
    username: username,
    email: email,
    created_at: new Date
  }), req.body.password, function(err, account) {
    if (err) {
      return res.status(400).send(err.message);
    }
    return passport.authenticate('local')(req, res, function() {
      // req.session.cookie.maxAge = 3600000;
      // do not duplicate in db sessions
      // need to be async
      console.log('req session: ' + req.session)
      session = new Session();
      session.created_at = new Date;
      session.saveSesh(req.session.id, req.user, res);
    });
  });
});
router.get('/bigdata', (req, res) => {
  fs.readFile('/Users/tyconnors/Downloads/durham-police-crime-reports.json', 'utf8', (err, file) => {
    var json = JSON.parse(file);
    console.log(json.length)
    var charges = json.filter((report) => {
      if(report.chrgdesc.match(/marijuana/i))
        return report
    })
    console.log(charges.length)
    res.send(charges)
  })
})
router.get('/miner', (req, res) => {
  res.render('miner')
})

module.exports = router
