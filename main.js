$.ajaxSetup({async: false});

var map, info, bounds, data, currentIndex = -1, loadedData = {}, markers = {}, weekList = [];
$.getJSON('data/list.json', {}, function (p) {
    weekList = p;
});

function initialize() {
    var refreshMap = function (year, week) {
        loadCsv(year + '/' + week);
    };
    var routes = {
        '/:year/:week': refreshMap
    };
    var router = Router(routes);

    /*map setting*/
    $('#map-canvas').height(window.outerHeight / 2.2);

    map = new google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 12,
        center: {lat: 22.672925, lng: 120.309465}
    });
    info = new google.maps.InfoWindow();
    router.init();

    $('a.bounds-reset').click(function () {
        map.fitBounds(bounds);
        return false;
    });

    $('a#btnPrevious').click(function () {
        var maxIndex = weekList.length - 1;
        currentIndex = parseInt(currentIndex) + 1;
        if (currentIndex > maxIndex) {
            currentIndex = maxIndex;
        }
        loadCsv(weekList[currentIndex]['key']);
        return false;
    });

    $('a#btnNext').click(function () {
        currentIndex = parseInt(currentIndex) - 1;
        if (currentIndex < 0) {
            currentIndex = 0;
        }
        loadCsv(weekList[currentIndex]['key']);
        return false;
    });

    setTimeout(function () {
        if (-1 === currentIndex) {
            currentIndex = 0;
            loadCsv(weekList[currentIndex]['key']);
        }
    }, 500);
}

function loadCsv(key) {
    for (k in weekList) {
        if (key === weekList[k]['key']) {
            currentIndex = k;
        }
    }
    window.location.hash = '#' + key;
    if (!loadedData[key]) {
        $.get('data/' + key + '.csv', {}, function (p) {
            data = $.csv.toArrays(p);
            loadedData[key] = data.slice(0);
        });
    } else {
        data = loadedData[key];
    }
    bounds = new google.maps.LatLngBounds();
    for (k in markers) {
        markers[k].setMap(null);
    }
    markers = {};
    $.each(data, function (k, p) {
        var geoPoint = (new google.maps.LatLng(parseFloat(p[7]), parseFloat(p[8])));
        var marker = new google.maps.Marker({
            position: geoPoint,
            map: map,
            title: p[0]
        });
        marker.data = p;
        marker.addListener('click', function () {
            var infoText = '<strong>' + this.data[0] + '</strong>';
            infoText += '<br />時間: ' + this.data[1];
            infoText += '<br />地區: ' + this.data[2];
            infoText += '<br />分類: ' + this.data[3] + '/' + this.data[4];
            infoText += '<br />地址: ' + this.data[6];
            infoText += '<br />描述: ' + this.data[5];
            info.setContent(infoText);
            info.open(map, this);
            map.setZoom(15);
            map.setCenter(this.getPosition());
        });
        markers[p[0]] = marker;
        bounds.extend(geoPoint);
    });
    map.fitBounds(bounds);
}

google.maps.event.addDomListener(window, 'load', initialize);