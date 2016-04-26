angular.module('gservice', [])
    .factory('gservice', function ($http, $q, mapFactory) {

      var googleMapService = {};

      // Set-up functions
      // --------------------------------------------------------------

      // Initialize the map
      var map, directionsDisplay;
      var directionsService = new google.maps.DirectionsService();

      //Store current trip data so we can access it for saving.
      //Properties will be added to this object every time a route is calculated.
      googleMapService.thisTrip = {};
      //initialize the map if no other instructions are given
      var initialize = function () {
        directionsDisplay = new google.maps.DirectionsRenderer();
        var SF = new google.maps.LatLng(37.7749, -122.4194);
        var mapOptions = {
          zoom: 7,
          center: SF
        };
        map = new google.maps.Map(document.getElementById('map'), mapOptions);
        directionsDisplay.setMap(map);
      };

      // Refresh, to re-initialize the map.
      googleMapService.refresh = function () {
        initialize();
      };

      // Refresh the page upon window load.
      google.maps.event.addDomListener(window, 'load',
        googleMapService.refresh());


      // Navigation functions - Google directions service
      // --------------------------------------------------------------

      //calculate a route (promisified function)
      googleMapService.calcRoute = function (start, end, numStops, typeStop) {
        var deferred = $q.defer();
        // calls to google distance service to get route distance and time
        var service = new google.maps.DistanceMatrixService();
            var request = {
              origins: [start],
              destinations: [end],
              travelMode: google.maps.TravelMode.DRIVING,
              unitSystem: google.maps.UnitSystem.IMPERIAL
            };
          service.getDistanceMatrix(request, function(response, status){
            // save returned data to the thisTrip object for access in controller
              googleMapService.thisTrip.distanceText = response.rows[0].elements[0].distance.text
              googleMapService.thisTrip.distanceValue = response.rows[0].elements[0].distance.value
              googleMapService.thisTrip.timeText = response.rows[0].elements[0].duration.text
              googleMapService.thisTrip.timeValue = response.rows[0].elements[0].duration.value   
            });
        var request = {
          origin: start,
          destination: end,
          travelMode: google.maps.TravelMode.DRIVING
        };
        directionsService.route(request, function (result, status) {
          if (status == google.maps.DirectionsStatus.OK) {
            // grab official start and end points for later use
            var officialStart = result.routes[0].legs[0].start_address;
            var officialEnd = result.routes[0].legs[0].end_address;
            //format and send request for the same trip but with waypoints
            var stops = [];
            var waypoints = getWaypoints(result.routes[0].overview_path, numStops);
            var promise = getNearbyThings(waypoints, typeStop); //testing testing
            promise.then(function (placePoints) {
              googleMapService.render(officialStart, officialEnd, placePoints)
              .then(function () {
                deferred.resolve(googleMapService.thisTrip.waypoints);
              });
            });
          }
        });
        return deferred.promise;
      };

      //render a complete journey (promisified function)
      googleMapService.render = function (start, end, waypoints) {
        var deferred = $q.defer();
        //make route points accessable to other functions
        googleMapService.thisTrip.start = start;
        googleMapService.thisTrip.end = end;
        googleMapService.thisTrip.waypoints = waypoints;
        var stops = []; //format stops for Google request
        waypoints.forEach(function (w) {
          stops.push({
            location: w.location,
            stopover: true
          });
        });
        //format the request for Google
        var wyptRequest = { 
          origin: start,
          destination: end,
          waypoints: stops,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING
        };
        directionsService.route(wyptRequest, function (response, status) {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(response);
            var route = response.routes[0];
            sortWaypoints(response.routes[0].waypoint_order);
            deferred.resolve(waypoints);
          }
        });
        return deferred.promise;
      };


      // Waypoint functions - Google places service
      // --------------------------------------------------------------

      // get waypoints by breaking up trip into even-ish segments
      var getWaypoints = function (waypointArray, numStops) {
        var points = [];
        var stopDistance = Math.floor(waypointArray.length / (numStops + 1));
        for (i = 0; i < numStops; i++) {
          points.push(stopDistance + (stopDistance * i));
        }
        var waypoints = [];
        //retrieve lat/lng data for each wpt
        points.forEach(function (index) { 
          var waypoint = {
            lat: waypointArray[index].lat(),
            lng: waypointArray[index].lng()
          };
          waypoints.push(waypoint);
        });
        return waypoints;
      };

      //get a single nearby attraction for each waypoint (promisified function)
      var getNearbyThings = function (waypointArray, type, distance) {
        var deferred = $q.defer();
        var placesToStop = [];
        //build out an array of requests
        var placeRequests = [];
        waypointArray.forEach(function (w) {
          placeRequests.push({
            location: new google.maps.LatLng(w.lat, w.lng),
            radius: distance || '500',
            query: type || 'restaurant'
          });
        });
        //query the google places service each waypoint
        var doneSoFar = 0; //counter for async for loop
        for (var i = 0; i < placeRequests.length; i++) {
          var placesService = new google.maps.places.PlacesService(document.getElementById('invisible'), placeRequests[i].location);



          placesService.textSearch(placeRequests[i], function (res, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
              var place = {
                location: res[0].formatted_address,
                name: res[0].name,
                placeID: res[0].place_id,
                lat: res[0].geometry.location.lat(),
                long: res[0].geometry.location.lng(),
              };
              // getCurrentLocation();
              placesService.getDetails({placeId:res[0].place_id}, function(res, status){ 
                if (status == google.maps.places.PlacesServiceStatus.OK) {
                    place.url = res.url;
                    place.phoneNumber = res.formatted_phone_number;
                } 
              })
              placesToStop.push(place);
              doneSoFar++;
              if (doneSoFar === placeRequests.length) {
                deferred.resolve(placesToStop);
              }
            } else { //if Google doesn't send an OK status
              deferred.reject('we had a problem');
            }
          });
        }
        return deferred.promise;
      };

      //Record order in 'position' property of each waypoint
      var sortWaypoints = function (waypointOrder) {
        for (var i = 0; i < googleMapService.thisTrip.waypoints.length; i++) {
          var waypoint = googleMapService.thisTrip.waypoints[i];
          var position = waypointOrder[i];
          waypoint.position = position;
        }
        return;
      };

      return googleMapService;
    });
