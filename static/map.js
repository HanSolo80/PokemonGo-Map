var map;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: center_lat,
            lng: center_lng
        },
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: true,
        fullscreenControl: true
    });

    var marker = new google.maps.Marker({
        position: {
            lat: center_lat,
            lng: center_lng
        },
        map: map,
        animation: google.maps.Animation.DROP
    });

    // Create the DIV to hold the control and call the CenterControl() constructor
    // passing in this DIV.
    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);
    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);
    // Create the DIV to hold the control and call the RefreshControl() constructor
    // passing in this DIV.
    var refreshControlDiv = document.createElement('div');
    var refreshControl = new RefreshControl(refreshControlDiv, map);
    refreshControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(refreshControlDiv);

}
function pokemonLabel(name, disappear_time, id, disappear_time, latitude, longitude) {
    var disappear_date = new Date(disappear_time);
    var pad = function (number) {
        return number <= 99 ? ("0" + number).slice(-2) : number;
    };

    var contentstring = `
        <div>
            <b>${name}</b>
            <span> - </span>
            <small>
                <a href='http://www.pokemon.com/us/pokedex/${id}' target='_blank' title='View in Pokedex'>#${id}</a>
            </small>
        </div>
        <div>
            Disappears at ${pad(disappear_date.getHours())}:${pad(disappear_date.getMinutes())}:${pad(disappear_date.getSeconds())}
            <span class='label-countdown' disappears-at='${disappear_time}'>(00m00s)</span></div>
        <div>
            <a href='https://www.google.com/maps/dir/Current+Location/${latitude},${longitude}'
                    target='_blank' title='View in Maps'>Get directions</a>
        </div>`;
    return contentstring;
}
function gymLabel(team_name, team_id, gym_points) {
    var gym_color = ["0, 0, 0, .4", "74, 138, 202, .6", "240, 68, 58, .6", "254, 217, 40, .6"];
    var str;
    if (team_name == 0) {
        str = `<div><center>
            <div>
                <b style='color:rgba(${gym_color[team_id]})'>${team_name}</b><br>
            </div>
            </center></div>`;
    } else {
        str = `
            <div><center>
            <div style='padding-bottom: 2px'>Gym owned by:</div>
            <div>
                <b style='color:rgba(${gym_color[team_id]})'>Team ${team_name}</b><br>
                <img height='70px' style='padding: 5px;' src='static/forts/${team_name}_large.png'>
            </div>
            <div>Prestige: ${gym_points}</div>
            </center></div>`;
    }

    return str;
}

// Dicts
map_pokemons = {}; // Pokemon
map_gyms = {}; // Gyms
map_pokestops = {}; // Pokestops
var gym_types = ["Uncontested", "Mystic", "Valor", "Instinct"];

function setupPokemonMarker(item) {
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/icons/' + item.pokemon_id + '.png'
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: pokemonLabel(item.pokemon_name, item.disappear_time, item.pokemon_id, item.disappear_time, item.latitude, item.longitude)
    });

    addListeners(marker);
    return marker;
}
function setupGymMarker(item) {
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/forts/' + gym_types[item.team_id] + '.png'
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
    });

    addListeners(marker);
    return marker;
}
function setupPokestopMarker(item) {
    var imagename = item.lure_expiration ? "PstopLured" : "Pstop";
    var marker = new google.maps.Marker({
        position: {
            lat: item.latitude,
            lng: item.longitude
        },
        map: map,
        icon: 'static/forts/' + imagename + '.png',
    });

    marker.infoWindow = new google.maps.InfoWindow({
        content: "I'm a Pokéstop, and soon enough I'll tell you more things about me."
    });

    addListeners(marker);
    return marker;
}
function addListeners(marker) {
    marker.addListener('click', function () {
        marker.infoWindow.open(map, marker);
        updateLabelDiffTime();
        marker.persist = true;
    });

    google.maps.event.addListener(marker.infoWindow, 'closeclick', function () {
        marker.persist = null;
    });

    marker.addListener('mouseover', function () {
        marker.infoWindow.open(map, marker);
        updateLabelDiffTime();
    });

    marker.addListener('mouseout', function () {
        if (!marker.persist) {
            marker.infoWindow.close();
        }
    });
    return marker
}
function clearStaleMarkers() {
    $.each(map_pokemons, function (key, value) {

        if (map_pokemons[key]['disappear_time'] < new Date().getTime()) {
            map_pokemons[key].marker.setMap(null);
            delete map_pokemons[key];
        }
    });
}
function updateMap() {
    $.ajax({
        url: "raw_data",
        type: 'GET',
        data: {
            'pokemon': document.getElementById('pokemon-switch').checked,
            'pokestops': document.getElementById('pokestops-switch').checked,
            'gyms': document.getElementById('gyms-switch').checked
        },
        dataType: "json"
    }).done(function (result) {

        $.each(result.pokemons, function (i, item) {
            if (!document.getElementById('pokemon-switch').checked) {
                return false;
            } else { // add marker to map and item to dict
                item.marker = setupPokemonMarker(item);
                map_pokemons[item.encounter_id] = item;
            }

        });

        $.each(result.pokestops, function (i, item) {
            if (!document.getElementById('pokestops-switch').checked) {
                return false;
            } else { // add marker to map and item to dict
                if (item.marker)
                    item.marker.setMap(null);
                item.marker = setupPokestopMarker(item);
                map_pokestops[item.pokestop_id] = item;
            }

        });

        $.each(result.gyms, function (i, item) {
            if (!document.getElementById('gyms-switch').checked) {
                return false;
            }

            if (item.gym_id in map_gyms) {
                // if team has changed, create new marker (new icon)
                if (map_gyms[item.gym_id].team_id != item.team_id) {
                    map_gyms[item.gym_id].marker.setMap(null);
                    map_gyms[item.gym_id].marker = setupGymMarker(item);
                } else { // if it hasn't changed generate new label only (in case prestige has changed)
                    map_gyms[item.gym_id].marker.infoWindow = new google.maps.InfoWindow({
                        content: gymLabel(gym_types[item.team_id], item.team_id, item.gym_points)
                    });

                }
            } else { // add marker to map and item to dict
                if (item.marker)
                    item.marker.setMap(null);
                item.marker = setupGymMarker(item);
                map_gyms[item.gym_id] = item;
            }

        });

        clearStaleMarkers();
    });
}

function CenterControl(controlDiv, map) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '22px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to recenter the map to your position';
    controlDiv.appendChild(controlUI);
    // Set CSS for the control interior.
    var controlText = document.createElement('button');
    controlText.setAttribute('style', 'color: rgb(25,25,25) !important');
    controlText.style.cursor = 'pointer';
    controlText.style.background = 'transparent';
    controlText.style.border = '0 none';
    controlText.style.fontSize = '18px';
    controlText.style.lineHeight = '25px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.style.height = 'auto';
    controlText.innerHTML = '&oplus;';
    controlUI.appendChild(controlText);
    // Setup the click event listeners: simply set the map to Chicago.
    controlUI.addEventListener('click', function () {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function (pos) {
            var me = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            map.setCenter(me);
        }, function (error) {
            // ...
        });
    });
}
function RefreshControl(controlDiv, map) {
    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '22px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to refresh the map';
    controlDiv.appendChild(controlUI);
    // Set CSS for the control interior.
    var controlText = document.createElement('button');
    controlText.setAttribute('style', 'color: rgb(25,25,25) !important');
    controlText.style.cursor = 'pointer';
    controlText.style.background = 'transparent';
    controlText.style.border = '0 none';
    controlText.style.fontSize = '18px';
    controlText.style.lineHeight = '25px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.style.height = 'auto';
    controlText.innerHTML = '&#x21bb;';
    controlUI.appendChild(controlText);
    // Setup the click event listeners: simply set the map to Chicago.
    controlUI.addEventListener('click', function () {
        var center = map.getCenter();
        $.post('next_loc', {lat: center.lat(), lon: center.lng()}, function (response) {
            if ('ok' == response) {
                $(controlText).addClass("success");
                setTimeout(function () {
                    $(controlText).removeClass("success");
                }, 1000);	// Timeout must be the same length as the CSS3 transition or longer (or you'll mess up the transition)
            }
        });
    });
}

window.setInterval(updateMap, 5000);
updateMap();

document.getElementById('gyms-switch').onclick = function () {
    if (this.checked) {
        updateMap();
    } else {
        $.each(map_gyms, function (key, value) {
            map_gyms[key].marker.setMap(null);
        });
        map_gyms = {}
    }
};

$('#pokemon-switch').change(function () {
    if (this.checked) {
        updateMap();
    } else {
        $.each(map_pokemons, function (key, value) {
            map_pokemons[key].marker.setMap(null);
        });
        map_pokemons = {}
    }
});

$('#pokestops-switch').change(function () {
    if (this.checked) {
        updateMap();
    } else {
        $.each(map_pokestops, function (key, value) {
            map_pokestops[key].marker.setMap(null);
        });
        map_pokestops = {}
    }
});

var updateLabelDiffTime = function () {
    $('.label-countdown').each(function (index, element) {
        var disappearsAt = new Date(parseInt(element.getAttribute("disappears-at")));
        var now = new Date();

        var difference = Math.abs(disappearsAt - now);
        var hours = Math.floor(difference / 36e5);
        var minutes = Math.floor((difference - (hours * 36e5)) / 6e4);
        var seconds = Math.floor((difference - (hours * 36e5) - (minutes * 6e4)) / 1e3);

        var timestring;
        if (disappearsAt < now) {
            timestring = "(expired)";
        } else {
            timestring = "(";
            if (hours > 0)
                timestring = hours + "h";

            timestring += ("0" + minutes).slice(-2) + "m";
            timestring += ("0" + seconds).slice(-2) + "s";
            timestring += ")";
        }

        $(element).text(timestring)
    });
};

window.setInterval(updateLabelDiffTime, 1000);
