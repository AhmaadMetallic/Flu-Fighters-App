$( document ).ready(function() {
    var config = {
        apiKey: "AIzaSyB8PyxH26WGIUtkUPRj_6YUGF1Dr2e9BTU",
        authDomain: "red-water-hyenas.firebaseapp.com",
        databaseURL: "https://red-water-hyenas.firebaseio.com",
        projectId: "red-water-hyenas",
        storageBucket: "red-water-hyenas.appspot.com",
        messagingSenderId: "912121318083"
      };
    firebase.initializeApp(config);
    var database = firebase.database();

    var tweetsNum, population //important that these are global! ...maybe try to find a way to make local if time permits
    
    
    //the APIs haven't been called yet
    if(!localStorage.getItem('threatLevel')){
        //user clicks current city button
        if(localStorage.getItem('current-click')){
            latLongToZip();
        }
        //user clicked pre-made city button
        else if(localStorage.getItem('button-click')){
            calculateThreat();
            initMap();
            walgreensAPI();
            medicareInfo();
        }
        //the user entered a city
        else if(localStorage.getItem('city')){
            cityToZLL();
        }
        //user entered zip code
        else if(localStorage.getItem('zipCode')){
            zipToLatLong();
        }
    }
    //the APIs have been called
    else{
        updateDOMthreat();
        initMap();
        createWalgreensMarker();
        createMedicareMarker();
    }

    $('#providers').on('click', 'li', goToMaps)

    //------------FIND MISSUNG GEOGRAPHICAL INFO-------------------
    
    function zipToLatLong(){
        var zipCode = localStorage.getItem('zipCode')
        var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + zipCode + '&key=AIzaSyA6IzOwL3Sg_yNo0COz67cN8b8Xt330qdE'
        
        $.get(url).done(function(response){
            //lat/long
            var info = response.results[0].geometry.location
            var lat = info.lat,
                long = info.lng;

            localStorage.setItem('lat', lat.toString());
            localStorage.setItem('long', long.toString());

            //city/state
            response.results[0].address_components.forEach(updateCityStateZip)
            
            pushToFirebase()

            calculateThreat();
            initMap();
            walgreensAPI();
            medicareInfo();
        })
    }

    function updateCityStateZip(obj){
        //find city
        if(obj.types[0] === 'locality'){
            localStorage.setItem('city', obj.short_name)
        }
        //find state
        else if(obj.types[0] === "administrative_area_level_1"){
            localStorage.setItem('state', obj.short_name)
        }
        //find zip code
        else if(obj.types[0] === 'postal_code'){
            localStorage.setItem('zipCode', obj.short_name)
        }
    }

    function cityToZLL(){
        var city = localStorage.getItem('city');
        var state = localStorage.getItem('state');
        var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + city + ','+ state + '&key=AIzaSyA6IzOwL3Sg_yNo0COz67cN8b8Xt330qdE'

        $.get(url).done(function(response){
            //the city doesn't exist
            if(response.status === 'ZERO_RESULTS'){
                var msg = "No results found! Please search for another city"
                $('#message').text(msg)
                $('#threatLevel').text('?')
            }
            //city exists
            else{
                localStorage.setItem('lat', response.results[0].geometry.location.lat)
                localStorage.setItem('long', response.results[0].geometry.location.lng)
                latLongToZip();
            }
        })

    }

    function latLongToZip(){
        var lat = localStorage.getItem('lat');
        var long = localStorage.getItem('long');
        var latlng = lat + ',' + long;
        var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latlng + '&key=AIzaSyA6IzOwL3Sg_yNo0COz67cN8b8Xt330qdE'

        $.get(url).done(function(response){
            response.results[0].address_components.forEach(updateCityStateZip)
            
            pushToFirebase();

            calculateThreat();
            walgreensAPI();
            medicareInfo();
            initMap();
        })

    }

    //----------CALCULATING THREAT LEVEL-----------------

    function censusData(){
        var zipCode = localStorage.getItem('zipCode');
        var url = 'https://api.census.gov/data/2016/acs/acs5/subject?get=NAME,S0101_C01_001E&for=zip%20code%20tabulation%20area:' + zipCode + '&key=ac21ba4cee033cdd33b527b24debd43baf85c8dd'
        
        $.get(url).done(function(response){
            population = Number(response[1][1]) //global var
        })

        //note: The SSL certificate used to load resources from https://api.census.gov will be distrusted in M70. Once distrusted, users will be prevented from loading these resources. See https://g.co/chrome/symantecpkicerts for more information. (Around April 2018)
    }

    function getFluTweets () {
        var url = 'http://api.flutrack.org/?time=7'
        var herokuUrl = 'https://stark-chamber-44091.herokuapp.com/' + url
        
        $.get(herokuUrl).done(findTweetsInRadius)
    }

    function findTweetsInRadius (response) {

        var userLat = localStorage.getItem('lat');
        var userLong = localStorage.getItem('long');
        var radiusMi = 15
        var radiusDeg = radiusMi/69.172
        var latDist
        var longDist

        var nearbyTweets = response.filter(function(tweet, ind){

            latDist = Number(tweet.latitude) - Number(userLat)
           
            longDist = Number(tweet.longitude) - Number(userLong)
            
            distDeg  = Math.sqrt(latDist*latDist + longDist*longDist)
            
            return distDeg < radiusDeg;
            
        })

        tweetsNum = nearbyTweets.length //global var
    }

    function calculateThreat(){
        getFluTweets()
        censusData()
        //somehow change this to async later, or include in "done" method
        setTimeout(function(){
            var tweetsToPeople = 140
            var percentage = tweetsNum*tweetsToPeople / population
            var threatLevel

            //change limits if necessary
            if(percentage <= .062){
                threatLevel = "Low"
            }else if(percentage >= .23){
                threatLevel = "High"
            }else{
                threatLevel = "Medium"
            }

            localStorage.setItem('threatLevel', threatLevel);

            updateDOMthreat();
        },3500)
    }

    function updateDOMthreat(){
        var threatLevel = localStorage.getItem('threatLevel').toUpperCase();
        var msg,
            color
        $('#threatLevel').text(threatLevel);
        switch (threatLevel){
            case 'HIGH':
                msg = "Go get the flu shot today (if you don't already have flu-like symptoms)!";
                color = '#f7464a';
                break
            case 'MEDIUM':
                msg = 'Flu activity may be above normal in your area, so go get the flu shot as soon as possible!';
                color = '#FFD23F'
                break
            case 'LOW':
                msg = 'But you should still get the flu shot anyway! Remember, flu shots are preventative, so getting one now may stop you from having the flu later.';
                color = '#2EC4B6';
                break
            default:
                msg = 'Unable to calculate threat level'
                break
        }
        $('#message').text(msg);
        $('#threatLevel').css('background-color', color);
    }

    function pushToFirebase () {
        var cityName = localStorage.getItem('city')
        database.ref("locations/").orderByChild('city').equalTo(cityName).once("value", function(snapshot) {

            if(snapshot.val()){
                
                snapshot.forEach(function(data) {
                    var exists = data.key
                    var count = snapshot.val()[exists].count
                    count ++
                    //add 1 to the count if its been searched again
                    
                        database.ref('locations/' + exists).update({
                            count: count++
                        })
                    })
            }else{
                database.ref("locations/").push({
                    city: localStorage.getItem('city'),
                    state: localStorage.getItem('state'),
                    zipCode: localStorage.getItem('zipCode'),
                    lat: localStorage.getItem('lat'),
                    long: localStorage.getItem('long'),
                    count: 1,
                }) 
            }
        })
    }

    //-----------GET THE PROVIDERS--------------------

    function walgreensAPI(){
        var lat = localStorage.getItem('lat');
        var long = localStorage.getItem('long');
        var url = 'https://services-qa.walgreens.com/api/stores/search'
        var herokuUrl = "https://stark-chamber-44091.herokuapp.com/" + url

        var WGobj = 
            {
                "apiKey": "4n8VgBaIAcwfqcxWAQSreiniwZAGXltd",
                "affId": "storesapi",
                "lat": lat,
                "lng": long,
                "srchOpt": 'fs',
                "nxtPrev": '',
                "requestType": "locator",
                "act": "fndStore",
                "view": "fndStoreJSON",
                "devinf": '',
                "appver": '',
            }

        $.ajax({
            type: "POST",
            url: herokuUrl,
            // headers: {
            //     "Access-Control-Allow-Origin": "*",
            // },
            // processData: false,
            contentType: 'application/json',
            data: JSON.stringify(WGobj),
        }).done(function(response){
            localStorage.setItem('walgreens', JSON.stringify(response.stores));
            // updateDOMwalgreens()
            createWalgreensMarker()

        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log('ERROR', errorThrown)
        })
    }

    function medicareInfo (){
        var city = localStorage.getItem('city').toUpperCase()
        var state = localStorage.getItem('state').toUpperCase()
        var url = 'https://data.cms.gov/resource/q3yr-x26f.json?city=' + city + '&state_code=' + state + '&provider_type=Internal%20Medicine'

        $.get(url).done(function(response){
            var docAddresses = []
            //only return 10 addresses
            var docArray = response.filter(function(doctor, ind){
                if(docAddresses.length === 0){
                    docAddresses.push(doctor["street_address_1"])
                    return doctor
                }else if(docAddresses.length < 10){
                    //the address is new
                    if(docAddresses.indexOf(doctor["street_address_1"]) === -1){
                        docAddresses.push(doctor["street_address_1"])
                        return doctor
                    }
                }
            })
            localStorage.setItem('medicare', JSON.stringify(docArray));
            // updateDOMmedicare();
            createMedicareMarker()
        })
    }


    //show list of flu shot providers
    // function updateDOMwalgreens (){
    //     var walgreens = JSON.parse(localStorage.getItem('walgreens'));
    //     walgreens.forEach(function(location){
    //         var wg = $('<li class="wg-location">');
    //         var address = unUppercase(location.stadd + ', ' + location.stct) + ', ' + location.stst;
    //         var phNumber = location.stph.slice(0,5) + ' ' + location.stph.slice(5,8) + '-' + location.stph.slice(8,12);
    //         var hours = 'Store hours: ' + location.storeOpenTime + '-' + location.storeCloseTime;
            
    //         wg.attr('data-link', 'https://www.google.com/maps/search/?q=' + address)
    //         wg.html(address + '</br>' + phNumber + ' ----- ' + hours);
    //         $('#walgreens-list').append(wg);
    //     })
    // }

    // function updateDOMmedicare (){
    //     var medicare = JSON.parse(localStorage.getItem('medicare'));
    //     medicare.forEach(function(doc){
    //         var doctor = unUppercase("Dr. " + doc.first_name + ' ' + doc.last_name_organization_name)
    //         var address = unUppercase(doc.street_address_1 + ', ' + doc.city) + ', ' + doc.state_code
    //         var medicare = $('<li class="medicare-location">')

    //         medicare.html(doctor + '</br>' + address);
    //         medicare.attr('data-link', 'https://www.google.com/maps/search/?q=' + address)
    //         $('#medicare-list').append(medicare);
    //     })
    // }

    //Change words from all-caps to normal
    function unUppercase (string){
        var words = string.split(' ');
        words.forEach(function(word, ind){
            words[ind] = word.charAt(0) + word.slice(1).toLowerCase();
        })
        var newString = words.join(' ');
        return newString;
    }    
    
    //----------CLICK EVENT FUNCTIONS------------

    function goToMaps (){
        var link = $(this).attr('data-link')
        window.open(
            link,
            '_blank' 
          );
    }
})

//-------GOOGLE MAPS-----------------------
//had to put this outside document.ready or it wouldn't work...
var map, directionsService, directionsDisplay;

function initMap() {
   
    var myLatLng = {
        lat: Number(localStorage.getItem('lat')), 
        lng: Number(localStorage.getItem('long'))
    };
    
    directionsService = new google.maps.DirectionsService;
    directionsDisplay = new google.maps.DirectionsRenderer;

    map = new google.maps.Map(document.getElementById('google-map'), {
        zoom: 11,
        center: myLatLng
    });
    
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        title: 'Start!',
        icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
    });

    //create legend
    var icons = {
        walgreens: {
          name: 'Walgreens',
          icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        },
        medicare: {
          name: 'Medicare Provider',
          icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        },
        you: {
          name: 'You',
          icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }
      };

      var legend = document.getElementById('legend');
      for (var key in icons) {
        var type = icons[key];
        var name = type.name;
        var icon = type.icon;
        var div = document.createElement('div');
        div.innerHTML = '<img src="' + icon + '">' + name + ' ';
        legend.appendChild(div);
      }

      map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);

      setTimeout(function(){
          $('#legend').removeClass('invisible')
      }, 500);
    
    
}

function createWalgreensMarker (){
    var walgreens = JSON.parse(localStorage.getItem('walgreens'));
    
    walgreens.forEach(function(location, ind){

        var latLong = {
            lat: Number(location.stlat),
            lng: Number(location.stlng)
        }

        //set up content of infowindow
        var address = unUppercase(location.stadd + ', ' + location.stct) + ', ' + location.stst;
        var phNumber = location.stph.slice(0,5) + ' ' + location.stph.slice(5,8) + '-' + location.stph.slice(8,12);
        var hours = 'Store hours: ' + location.storeOpenTime + '-' + location.storeCloseTime;
        var directionsOptions = '<form class="get-dir" data-latlng=' + JSON.stringify(latLong) + ' action="">' +
                                    '<input type="radio" name="directions" value="DRIVING">Drive ' +
                                    '<input type="radio" name="directions" value="WALKING">Walk '+
                                    '<input type="radio" name="directions" value="TRANSIT">Public Transit'+
                                '</form>'


        var infowindow = new google.maps.InfoWindow({
            content: '<b>Walgreens</b></br>' + address + '</br>' + '<a href="tel:+1' + location.stph + '">' + phNumber + '</a>' + '</br>' + hours + '</br></br>' + directionsOptions
          });
  
        var marker = new google.maps.Marker({
            position: latLong,
            animation: google.maps.Animation.DROP,
            map: map,
            icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            title: 'Walgreens'
          });
        
          marker.addListener('click', function() {
            infowindow.open(map, marker);
          });
    })
}

function createMedicareMarker() {
    var medicare = JSON.parse(localStorage.getItem('medicare'));
    var geocoder = new google.maps.Geocoder();
    medicare.forEach(function(doc){
        var address = unUppercase(doc.street_address_1 + ', ' + doc.city) + ', ' + doc.state_code
        var doctor = unUppercase("Dr. " + doc.first_name + ' ' + doc.last_name_organization_name)
        var directionsOptions = '<form class="get-dir" data-address="' + address + '" action="">' +
                                    '<input type="radio" name="directionsMedicare" value="DRIVING">Drive ' +
                                    '<input type="radio" name="directionsMedicare" value="WALKING">Walk '+
                                    '<input type="radio" name="directionsMedicare" value="TRANSIT">Public Transit'+
                                '</form>'
        
        geocoder.geocode({'address': address}, function(results, status) {
            if (status === 'OK') {

                var infowindow = new google.maps.InfoWindow({
                    content: '<b>' + doctor + '</b></br>' + address + '</br></br>' + directionsOptions
                  });

                var marker = new google.maps.Marker({
                    map: map,
                    position: results[0].geometry.location,
                    animation: google.maps.Animation.DROP,
                    title: doctor,
                    icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'

                });

                marker.addListener('click', function() {
                    infowindow.open(map, marker);
                });
            } else {
              console.log('Geocode was not successful for the following reason: ' + status);
            }
          });

    })
    
  }


  function getDirectionsPath (){
    directionsDisplay.setMap(map)
    directionsDisplay.setPanel(document.getElementById('directions-list'))
    
    var travelMode = $(this).attr('value')
    var destination = JSON.parse($(this).parent().attr('data-latlng'))

    directionsService.route({
        origin: {
            lat: Number(localStorage.getItem('lat')),
            lng: Number(localStorage.getItem('long'))
        },
        destination: destination,
        travelMode: travelMode
      }, function(response, status) {
        if (status === 'OK') {
            $('#directions-list').empty()
          directionsDisplay.setDirections(response);
        } else {
          window.alert('Directions request failed due to ' + status);
          $
          ('#directions-list').html('<div id="directions-error">Unable to find directions at this time. Please try another method or try again later</div>')
        }
      });
  }

  function getDirectionsMedicare (){
    directionsDisplay.setMap(map)
    directionsDisplay.setPanel(document.getElementById('directions-list'))
    
    var travelMode = $(this).attr('value')
    var destination = $(this).parent().attr('data-address')

    directionsService.route({
        origin: {
            lat: Number(localStorage.getItem('lat')),
            lng: Number(localStorage.getItem('long'))
        },
        destination: destination,
        travelMode: travelMode
      }, function(response, status) {
        if (status === 'OK') {
            $('#directions-list').empty()
          directionsDisplay.setDirections(response);
        } else {
          console.log('Directions request failed due to ' + status);
          $('#directions-list').html('<div id="directions-error">Unable to find directions at this time. Please try another method or try again later</div>')
        }
      });
  }

function unUppercase (string){
    var words = string.split(' ');
    words.forEach(function(word, ind){
        words[ind] = word.charAt(0) + word.slice(1).toLowerCase();
    })
    var newString = words.join(' ');
    return newString;
}

// $('#google-map').on('click', '.get-dir', getDirectionsPath);

$('#google-map').on('change', 'input[type=radio][name=directions]', getDirectionsPath);
$('#google-map').on('change', 'input[type=radio][name=directionsMedicare]', getDirectionsMedicare);
