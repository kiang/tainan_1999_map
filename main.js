$.ajaxSetup({async: false});

var map, info, bounds, data, currentIndex = -1, loadedData = {}, markers = {}, weekList = [];
var currentFilter = '';
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
        center: {lat: 23.00, lng: 120.30}
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
            $('#requestFilter').trigger('change');
        }
    }, 500);

    $('#requestFilter').change(function () {
        currentFilter = $(this).val();
        loadCsv(weekList[currentIndex]['key']);
    });
}

function loadCsv(key) {
    for (k in weekList) {
        if (key === weekList[k]['key']) {
            currentIndex = k;
        }
    }
    $('#title').html(weekList[currentIndex]['begin'] + ' ~ ' + weekList[currentIndex]['end']);
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
        if (currentFilter !== '' && p[3] !== currentFilter) {
            return;
        }
        var markerIcon = '<span class="map-icon map-icon-health"></span>';
        switch (p[3]) {
            case '違規停車':
                markerIcon = '<span class="map-icon map-icon-car-dealer"></span>';
                break;
            case '路燈故障':
                markerIcon = '<span class="map-icon map-icon-hardware-store"></span>';
                break;
            case '噪音舉發':
                markerIcon = '<span class="map-icon map-icon-liquor-store"></span>';
                break;
            case '騎樓舉發':
                markerIcon = '<span class="map-icon map-icon-place-of-worship"></span>';
                break;
            case '道路維修':
                markerIcon = '<span class="map-icon map-icon-hardware-store"></span>';
                break;
            case '交通運輸':
                markerIcon = '<span class="map-icon map-icon-fire-station"></span>';
                break;
            case '髒亂及汙染':
                markerIcon = '<span class="map-icon map-icon-crosshairs"></span>';
                break;
            case '民生管線':
                markerIcon = '<span class="map-icon map-icon-plumber"></span>';
                break;
            case '動物救援':
                markerIcon = '<span class="map-icon map-icon-pet-store"></span>';
                break;
        }
        var geoPoint = (new google.maps.LatLng(parseFloat(p[7]), parseFloat(p[8])));
        var marker = new Marker({
            position: geoPoint,
            map: map,
            title: p[0],
            icon: {
                path: MAP_PIN,
                fillColor: '#00CCBB',
                fillOpacity: 1,
                strokeColor: '',
                strokeWeight: 0
            },
            map_icon_label: markerIcon
        });
        marker.data = p;
        marker.addListener('click', function () {
            var infoText = '<strong><a href="http://1999.tainan.gov.tw/OpenCaseShow.aspx?FSerialNumber=' + this.data[0] + '" target="_blank">' + this.data[0] + '</a></strong>';
            infoText += '<br />時間: ' + this.data[1];
            infoText += '<br />地區: ' + this.data[2];
            infoText += '<br />分類: ' + this.data[3] + '/' + this.data[4];
            infoText += '<br />地址: ' + this.data[6];
            infoText += '<br />描述: ' + this.data[5];
            info.setContent(infoText);
            info.open(map, this);
            $('#content').html(infoText);
            if(map.getZoom() < 15) {
                map.setZoom(15);
            }
            map.setCenter(this.getPosition());
        });
        markers[p[0]] = marker;
        bounds.extend(geoPoint);
    });
}

google.maps.event.addDomListener(window, 'load', initialize);