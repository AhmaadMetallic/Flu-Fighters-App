$( document ).ready(function() {

    //APIs haven't run
    if(!localStorage.getItem('walgreens')){
        walgreensAPI();
        medicareInfo();
    }else{
        updateDOMwalgreens()
    }

    function walgreensAPI(){
        var lat = localStorage.getItem('lat');
        var long = localStorage.getItem('long');
        var url = 'https://services-qa.walgreens.com/api/stores/search'
        var herokuUrl = "https://cors-anywhere.herokuapp.com/" + url

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
            console.log(JSON.parse(localStorage.getItem('walgreens')))
            updateDOMwalgreens()

        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log('ERROR', errorThrown)
        })
    }

    function medicareInfo (){
        var city = localStorage.getItem('city').toUpperCase()
        var state = localStorage.getItem('state').toUpperCase()
        var url = 'https://data.cms.gov/resource/q3yr-x26f.json?city=' + city + '&state_code=' + state + '&provider_type=Internal%20Medicine'

        $.get(url).done(function(response){
            console.log(response);
            var docAddresses = []
            //only return 10 addresses
            var docArray = response.filter(function(doctor, ind){
                if(docAddresses.length === 0){
                    console.log(doctor)
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
            console.log(JSON.parse(localStorage.getItem('medicare')))
        })
    }

    function updateDOMwalgreens (){
        var walgreens = JSON.parse(localStorage.getItem('walgreens'));
        walgreens.forEach(function(location){
            var wg = $('<li class="wg-location>"');
            var address = location.stadd + ', ' + location.stct + ', ' + location.stst;
            var phNumber = 	'\u1F4DE '  + location.stph.slice(0,5) + ' ' + location.stph.slice(5,8) + '-' + location.stph.slice(8,12);
            var hours = 'Store hours: ' + location.storeOpenTime + '-' + location.storeCloseTime;
            $('#walgreens-list').text(phNumber);
        })
    }

    function updateDOMmedicare (){
        var medicare = JSON.parse(localStorage.getItem('medicare'));
    }
})