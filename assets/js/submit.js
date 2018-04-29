$( document ).ready(function() {

    //start firebase
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

    var tweetsNum, population

    //----DETECT USER LOCATION-------------------
    navigator.geolocation.getCurrentPosition(
        function(position){
            $('#searchNow').removeClass('invisible');
            localStorage.setItem('lat', position.coords.latitude);
            localStorage.setItem('long', position.coords.longitude);
            $('#most-searched').append('<button id="currentLoc-btn">Current Location</button>')
        }
    )
    //------MAKE BLUE BUTTONS-----------------------
    
    mostSearchedCities()
    
    //USER INPUT HERE --------------------------------
    function startSearch(event){
        event.preventDefault();
        var input= $('input').val().trim();
        localStorage.clear();
        
        if(is_usZipCode(input)){
            localStorage.setItem('zipCode', input );
            location.href = 'threatlevel.html';
        }else if(is_cityState(input)){
            var city = input.split(',')[0]
            //get rid of space in front of state
            var state = (input.split(',')[1][0] === ' ') ? input.split(',')[1].slice(1,3) : input.split(',')[1];
            localStorage.setItem('city', city);
            localStorage.setItem('state', state);
            location.href = 'threatlevel.html'
        }else{
            //try to have modal here instead
            $('#launchModal').click();
        }
    }
    
    //-------------------------------------------------

    function is_usZipCode(str){
        regexpZip = /^[0-9]{5}(?:-[0-9]{4})?$/;
        if (regexpZip.test(str)){
            return true;
        }else{
            return false;
        }
    }

    function is_cityState(str){
        regexpCityState = /([^,]+),\s*(\w{2})/;
        if (regexpCityState.test(str)){
            return true;
        }else{
            return false;
        }
    }

    function latLongToZip(){
        var lat = localStorage.getItem('lat');
        var long = localStorage.getItem('long');
        var latlng = lat + ',' + long;
        var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latlng + '&key=AIzaSyA6IzOwL3Sg_yNo0COz67cN8b8Xt330qdE'

        $.get(url).done(function(response){
            console.log(response)

            response.results[0].address_components.forEach(updateCityStateZip)
            
            pushToFirebase()
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

    function pushToFirebase () {
        var cityName = localStorage.getItem('city')
        database.ref("locations/").orderByChild('city').equalTo(cityName).once("value", function(snapshot) {
            console.log(snapshot.val());

            if(snapshot.val()){
                
                snapshot.forEach(function(data) {
                    console.log('Data Key: ' + data.key);
                    var exists = data.key
                    var count = snapshot.val()[exists].count
                    console.log(count)
                    count ++
                    console.log(count)
                    //add 1 to the count if its been searched again
                    
                        console.log('It already exists!')
                        database.ref('locations/' + exists).update({
                            count: count++
                        })
                    })
            }else{
                console.log('Creating new entry')
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

    function mostSearchedCities () {
        database.ref("locations/").orderByChild('count').limitToLast(5).once('value', function(snapshot){
            console.log(snapshot.val())
            var locations = snapshot.val()

            for(var location in locations){
                var city = locations[location].city,
                    state = locations[location].state,
                    cityState = city + ', ' + state,
                    lat = locations[location].lat,
                    long = locations[location].long,
                    zip = locations[location].zipCode;

                var btn = $('<button class="city-btn">');
                btn.text(cityState);
                btn.attr({
                    'data-city': city,
                    'data-state': state,
                    'data-lat': lat,
                    'data-long': long,
                    'data-zipCode': zip
                })
                $('#most-searched').prepend(btn);
            }
        })
    }

    function searchCity (){
        console.log($(this).attr('data-city'))

        localStorage.clear()
        
        localStorage.setItem('button-click', 'true')
        localStorage.setItem('city', $(this).attr('data-city'))
        localStorage.setItem('state', $(this).attr('data-state'))
        localStorage.setItem('lat', $(this).attr('data-lat'))
        localStorage.setItem('long', $(this).attr('data-long'))
        localStorage.setItem('zipCode', $(this).attr('data-zipCode'))

        location.href = 'threatlevel.html'
    }

    function searchCurrent (){
        localStorage.setItem('current-click', 'true');
        localStorage.removeItem('threatLevel');
        location.href = 'threatlevel.html';
    }
    
    
    $('#searchBtn').click(startSearch)
    $('form').submit(startSearch)
    $('#most-searched').on('click', '.city-btn', searchCity)
    $('#most-searched').on('click', '#currentLoc-btn', searchCurrent)
})