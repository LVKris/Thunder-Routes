var Q = require('q');
var Journey = require('./journeyModel.js');

var findJourney = Q.nbind(Journey.findOne, Journey);
var createJourney = Q.nbind(Journey.create, Journey);

module.exports = {
  saveJourney: function (req, res, next) {
    var start = req.body.start;
    var end = req.body.end;
    var author = req.body.author;
    var waypoints = [];

    for (var i = 0; i < req.body.waypoints.length; i++) {
      waypoints[req.body.waypoints[i].position] = [req.body.waypoints[i].name, req.body.waypoints[i].location];
    }

    var waypointsCopy = [].concat.apply([], waypoints);
    waypoints = waypointsCopy;

    findJourney({wayPoints: waypoints})
      .then(function (waypoint) {
        if (!waypoint) {
          return createJourney({
            startPoint: start,
            endPoint: end,
            wayPoints: waypoints,
            author: author
          });
        } else {
          next(new Error('Journey already exist!'));
        }
      })
      .catch(function (error) {
        next(error);
      });
  },

  getAll: function (req, res, next) {
    Journey.find({})
      .then(function (data) {
        res.status(200).send(data);
      })
      .catch(function(error) {
        next(error);
      });
  },

  getOne: function (req, res, next) {
    Journey.find({hash: req.body.hash})
      .then(function (data) {
        res.status(200).send(data);
      })
      .catch(function(error) {
        next(error);
      });
  },
  
  deleteJourney: function (req, res, next) {
    Journey.findOneAndRemove({hash: req.body.hash})
      .then(function (data) {
        res.status(200).send(data);
      })
      .catch(function(error) {
        next(error);
      });
  }
};





