angular.module('shareroute', ['gservice'])

.controller('ShareController', function ($scope, $location, $stateParams, gservice, $anchorScroll, ShareFactory, mapFactory) {
  // $scope.currentPlayers = prospects;
  $scope.routeNumber = $stateParams.routeid;
  $scope.savedRoutes = []; 
  $scope.places = [];


  var splitLocations = function (places) {
    $scope.places = [];
    //copy the places array before we start splitting things so our original stays in-tact
    var placesCopy = [];
    for (var i = 0; i < places.length; i++) {
      //this apparently is needed for a clean copy...
      placesCopy.push(JSON.parse(JSON.stringify(places[i])));
    }
    placesCopy.forEach(function (place) { //split address for easier formatting
      place.location = place.location.split(', ');
      $scope.places.push(place);
    });
  };

  $scope.getAll = function () {
    ShareFactory.getRoute($scope.routeNumber).then(function (results) {
      $scope.savedRoutes = results;
      $scope.viewSavedRoute(results[0].hash);
    });
  };

  $scope.viewSavedRoute = function (hash) {
    $anchorScroll();
        $scope.savedRoutes[0].stopLocations = [];
        $scope.savedRoutes[0].stopNames = [];
    console.log($scope.savedRoutes);
        for (var j = 0; j < $scope.savedRoutes[0].wayPoints.length; j++) {
          if (j % 2 === 0) {
            $scope.savedRoutes[0].stopNames.push($scope.savedRoutes[0].wayPoints[j]);
          } else {
            $scope.savedRoutes[0].stopLocations.push($scope.savedRoutes[0].wayPoints[j]);
          }
        }
        //set $scope.places to saved stop data so stop data will display on page
        var places = [];
        for (var k = 0; k < $scope.savedRoutes[0].stopNames.length; k++) {
          var location = $scope.savedRoutes[0].stopLocations[k];
          var place = {
            name: $scope.savedRoutes[0].stopNames[k],
            location: location,
            position: k
          };
          places.push(place);
        }
        //add stop locations to stops array, render stops to map
        gservice.render($scope.savedRoutes[0].startPoint, $scope.savedRoutes[0].endPoint, places)
        .then(function (places) { splitLocations(places); });    
  };

  $scope.getAll();
  

})

.factory('ShareFactory', function ($http, $q) {

  var getRoute = function(routeNum) {
      console.log(routeNum);
      var routeObj = { hash: routeNum };
      var deferred = $q.defer();
      $http({
        method: 'POST',
        url: '/api/route',
        data: JSON.stringify(routeObj)
      }).then(function (res) {
        deferred.resolve (res.data);
      }).catch(function (err) {
        deferred.reject (err);
      });
      return deferred.promise;
    };


  return {
    getRoute: getRoute
  };

});
