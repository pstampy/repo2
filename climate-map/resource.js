var Main = {

    /*  
        globals
    */
    Map: null,
    startZoom: 5,
    featureCode: '',
    startCentre: new google.maps.LatLng(-25.96374548907491, 133.330078125),
    geocoder: null,
    searchedAddress: null,
    featuresClient: null,        
    selectedZonesCount: 0,
    selectedLayersCount: 0,      
    infowindow: new google.maps.InfoWindow(),
    marker: {
        img: '/Content/images/markers/marker.png',
        selectedimg: '/Content/images/markers/marker-selected.png',
        shadow: '/Content/images/markers/shadow-marker.png',
        height: '63',
        width: '42'       
    },
    autoCompleteOptions: {},
    geocodeResult: null,
    displayException: function(errorMessage) {
        $('#message').html(errorMessage);
        $.colorbox({ href:"#message", inline:true, transition: "none" });
    },
    elevationMode: true,    
    elevationMarker: null,
    selectedPolygonStyle: {
        fillColor: "#FFFFFF",
        fillOpacity: 0.01,
        strokeColor: "#FF0000",
        strokeWeight: 1,
        strokeOpacity: 1
    },

    /*
        getElevation function accepts a lat long and then uses it to get the elevation above sea level from that point.
    */
    getElevation: function (lat, lng) {
        var _SELF = this;
        if(_SELF.elevationMode == true) {
            var infowindow = new google.maps.InfoWindow();
            // Create an ElevationService
            var elevator = new google.maps.ElevationService();
            var locations = [];
            // Retrieve the clicked location and push it on the array
            var clickedLocation = new google.maps.LatLng(lat, lng);
            locations.push(clickedLocation);        
            // Create a LocationElevationRequest object using the array's one value
            var positionalRequest = {
                'locations': locations
            };
            // Initiate the location request
            elevator.getElevationForLocations(positionalRequest, function (results, status) {
                if (status == google.maps.ElevationStatus.OK) { 
                    $('#loading').show();
                    // Retrieve the first result
                    if (results[0]) {
                        
                        //create marker on map at clicked location

                        var settings = {
                            position: new google.maps.LatLng(lat, lng),
                            map: _SELF.Map,
                            title: 'Elevation: ' + (results[0].elevation).toFixed(2) + 'm above sea level.'
                        };                    
                        if(_SELF.elevationMarker != null) _SELF.elevationMarker.setMap(null);
                        _SELF.elevationMarker = new google.maps.Marker(settings);                        
                        google.maps.event.addListener(_SELF.elevationMarker, 'click', function() {	                            
                            if(!$('#elevationTab').hasClass('selected')) {
                                $('#elevationTab').trigger('click');
                            }
                        });
                        _SELF.Map.setCenter(new google.maps.LatLng(lat, lng));

                        //reverse geocode ll & strip out postcode for elevation panel         
                        
                        var request = {
                            latLng: clickedLocation
                        };
                        var geocoder = new google.maps.Geocoder();
                        geocoder.geocode(request, function(results, status) {
                            if (status == google.maps.GeocoderStatus.OK) {                                
                                var postcode = '';
                                var suburb = '';
                                $.each(results[0].address_components, function(k,v) {                                                                                                                                                                            
                                    if($.inArray('postal_code', v.types) > -1) { 
                                        postcode = v.long_name;
                                    }
                                    if($.inArray('locality', v.types) > -1) { 
                                        suburb = v.long_name;
                                    }
                                });
                                if(postcode != '') {
                                    $('#elevationmeasurementarea').html('<div style="font-weight: bold; padding-bottom: 5px; font-size: 16px;">' + suburb + ' ' + postcode + '</div><div style="">' + lat + ', ' + lng + '</div>');
                                    $('#elevationmeasurementarea').show();
                                }
                            }
                        });

                        //create elevation panel HTML content (inc google static map)

                        $('#elevationmeasurement').html('<span><span style="font-weight: normal;">is</span> ' + (results[0].elevation).toFixed(2) + 'm</span> above sea level');
                        // + '&key=AIzaSyDi5fOTYct9-gZR2np0TXHWwNUZBrXz2o0'
                        var elevationMap = 'http://maps.googleapis.com/maps/api/staticmap?center=' + lat + ',' + lng + '&zoom=15&size=267x150&maptype=terrain&sensor=false&markers=color:red%7Clabel:Elevation%7C' + lat + ',' + lng;
                        $('#elevationmeasurementmap').html('<img src="' + elevationMap + '" alt="" onerror="$(\'#elevationmeasurementmap\').hide();" />');
                        $('#elevationmeasurement').css('display', 'block');
                        $('#elevationmeasurementmap').css('display', 'block');
                        
                        //create elevation chart
                        var data = google.visualization.arrayToDataTable([
                            ['', 'Elevation (m) at: ' + lat.toFixed(2).toString()  + ',' + lng.toFixed(2).toString(), 'Max Australian Elevation (m)'],
                            ['', 0, 0],
                            ['', parseFloat(results[0].elevation.toFixed(2)), 2330]                            
                        ]);
                        var options = {
                            title: 'Elevation from sea level (m)',                            
                            width: 267,
                            legend: {
                               position: 'none',
                               alignment: 'start'
                            }
                        };
                        var chart = new google.visualization.AreaChart(document.getElementById('elevationmeasurementchart'));
                        $('#elevationmeasurementchart').show();                        
                        $('#selectedElevationCount').show();
                        chart.draw(data, options);
                        $('#clearSelectedElevation').show();

                        //stop loading

                        setTimeout(function() {
                            $('#loading').hide();
                        }, 1000);

                    } else {
                        //error msg - no elevation results
                    }
                } else {
                    //error msg - elevation service failed
                }
            });
        }
    },

    presentClimateZones: function(postcode, zoneIds, hasMultipleZones) {
                
        var _SELF = this;                

        var where = '';
        for(var i = 0; i < zoneIds.length; i++) {            
            if(where.length > 0) { where += ',' }
            where += zoneIds[i];
        }
        if(where && where.length > 0 ) {
            
            where = 'WHERE ID IN (' + where + ')';

            //only perform query if there are ID's in the selected area

            var sqlQuery = 'SELECT ID, Name, FillColour, Border, Opacity, Latitude, Longitude ' + 
            'FROM 13iKvFf6V8ycP-14IwD05nJDa8fJ9a-XiriXZmYM ' + 
            where + 
            'ORDER BY ID';

            $.ajax({            
                url: 'https://www.googleapis.com/fusiontables/v1/query?sql=' + encodeURIComponent(sqlQuery) + '&key=AIzaSyDi5fOTYct9-gZR2np0TXHWwNUZBrXz2o0&callback=?',            
                dataType: 'jsonp',
                success: function(data) {
                    
                    //setup HTML for climate zones panel
                    _SELF.selectedZonesCount = data.rows.length;
                    var heading = '<tr><th class="tablecatheading" colspan="5">Selected Zones for Postcode ' + postcode + '</th></tr>' + 
                    '<tr class="heading">' + 
                    '<th class="type">Zone Type</th>' + 
                    '<th class="key">Key</th>' + 
                    '<th class="region">Climate Region</th>' + 
                    '<th class="location">Location</th>' + 
                    '<th class="info">Info</th>' + 
                    '</tr>';
                    var rows = '';
                    var row = '';                                        

                    //loop through zoneId's to preserve order
                                        
                    for(var x = 0; x < zoneIds.length; x++) {                        
                                                
                        //find result zone with current zone id

                        for(var i = 0; i < data.rows.length; i++) {                            

                            if(data.rows[i][0] == zoneIds[x]) {
                                var colorSwatch = '<div class="colorSwatch" style="' + 
                                'background:' + data.rows[i][2] + ';' + 
                                'border: solid 1px' + data.rows[i][3] + ';' + 
                                'opacity:' + data.rows[i][4] + ';' + 
                                '"></div>';
                                
                                var type = '';
                                if(x==0) {
                                    type = 'Principal';
                                } else {
                                    type = 'Alternative';
                                }
                                
                                if(hasMultipleZones && hasMultipleZones == true) {
                                    type = 'Option';
                                }                                

                                var moreInfo = '';
                                //if(type == 'Principal') {
                                    moreInfo = '<a target="_blank" href="/files/files/climatezonemaps/pdf/' + data.rows[i][0] + '.pdf"><img style="height: 20px;" src="content/images/dl-pdf.png" alt="Download PDF" /></a>';
                                //}

                                row = '<tr>' +
                                    '<td class="type">' + type + '</td>' + 
                                    '<td class="key">' + colorSwatch + '</td>' + 
                                    '<td class="region">' + data.rows[i][0] + '</td>' + 
                                    '<td class="location">' + data.rows[i][1] + '</td>' +                         
                                    '<td class="info">' + moreInfo + '</td>' +      
                                '</tr>';
                                rows += row;
                            }

                        }

                    }

                    
                    var table = '<table>' + 
                    heading + 
                    rows + 
                    '</table>';
                
                    //set ui up in climate zone panel

                    $('#clearSelectedZones').show();
                    $('#zonesContentInnerSelectedZone').show().html('').append(table);
                    $('#selectedZonesCount').html(_SELF.selectedZonesCount);
                    if(_SELF.selectedZonesCount > 0) {
                        $('#selectedZonesCount').show();
                    } else {
                        $('#selectedZonesCount').hide();
                    }
                    setTimeout(function() {
                        $('#loading').hide();
                    }, 1000);

                    //open climate zones panel

                    _SELF.openClimateZonesPanel();

                }
                       
            });

        } else {
        
            //if there are no ID's in the selected zone.
            var heading = '<tr><th class="tablecatheading" colspan="5">Selected Zones for Postcode ' + postcode + '</th></tr>' + 
                    '<tr class="heading">' + 
                    '<th class="key">Key</th>' + 
                    '<th class="region">Climate Region</th>' + 
                    '<th class="location">Location</th>' + 
                    '<th class="info">Info</th>' + 
                    '</tr>';

            var rows = '<tr><td colspan="4" class="error">No Zones in the selected area.</td></tr>';

            var table = '<table>' + 
                    heading + 
                    rows + 
                    '</table>';
            
            _SELF.selectedZonesCount = 0;
            $('#clearSelectedZones').show();
            $('#zonesContentInnerSelectedZone').show().html('').append(table);
            $('#selectedZonesCount').html(0);
            if(_SELF.selectedZonesCount > 0) {
                $('#selectedZonesCount').show();
            } else {
                $('#selectedZonesCount').hide();
            }
            setTimeout(function() {
                $('#loading').hide();
            }, 1000);

            //open climate zones panel

            _SELF.openClimateZonesPanel();
        
        }


    },

    /*
        postCodeLayerClick function is the main fusion tables polygon layer click handler for the app. All click events on the map
        go through this handler as its attached to a transparent layer thats always shown on the map. This function handles highlighting 
        selected polygon, and also calls the elevation details handler.
    */
    postCodeLayerClick: function(e) {
        
        var _SELF = this;

        //highlight & center on selected polygon using the 
        //postcode to set a dynamic style on the transparent layer

        var postcode = e[0].row.name.value;
        if(e[0].latLng) _SELF.Map.setCenter(e[0].latLng);
        if(postcode && postcode != '') {

            //highlight selected postcode polygon

            _SELF.dataLayers[3].layer.setOptions({
                styles: [
                    {
                        polygonOptions: {
                            fillColor: "#FFFFFF",
                            fillOpacity: 0.01,
                            strokeColor: "#FFFFFF",
                            strokeWeight: 0,
                            strokeOpacity: 0.01
                        }
                    },
                    {
                        where: 'name >= ' + postcode + ' AND name <= ' + postcode,
                        polygonOptions: _SELF.selectedPolygonStyle
                    }
                ]
            });                        
        }
        
        //present elevation details if requested

        _SELF.getElevation(e[0].latLng.lat(), e[0].latLng.lng());

        //get zone id/s and present data in climate zones table  
        var zoneIds = e[0].row.Zone_Ids.value.replace(/ /gi, '').split(',');

        var hasMultipleZones = false;
        if(e[0].row.Option.value != null && e[0].row.Option.value.toLowerCase() == 'y') {
            hasMultipleZones = true;
        }
        _SELF.presentClimateZones(postcode, zoneIds, hasMultipleZones);

           

    },

    /*
        openClimateZonesPanel function will open the climate zones panel and hide the all zones content if the 
        panel is not already open.
    */
    openClimateZonesPanel: function() {    
        //open climate zones panel if the elevation panel isnt open already        
        if(!$('#elevationTab').hasClass('selected')) {            
            if($('#zonesTab').hasClass('selected') != true) {                     
                $('#zonesTab').trigger('click');                    
                $('.contentItem').hide();
                $('#toggleAllZones').html('+');                                                            
            } else {
                $('.contentItem').hide();
                $('#toggleAllZones').html('+');
            }
        }                        
    },


    /*
        dataLayers obj stores all the settings for the layers to be presented in this application
    */
    dataLayers: [
        {
            name: 'Climate Zone Boundaries',
            selected: true,
            showInMenu: true,
            icon: 'climate_zones.png',
            settings: {
                query: {
                    select: 'col2\x3e\x3e0',
                    from: '13iKvFf6V8ycP-14IwD05nJDa8fJ9a-XiriXZmYM'
                },                
                options: {
                    suppressInfoWindows: true,
                    styleId: 2,
                    templateId: 2
                }
            },
            layer: null
        },
        {
            name: 'Post Code Boundaries',
            selected: true,
            showInMenu: true,
            icon: 'post_codes.png',
            settings: {
                query: {
                    select: 'geometry',
                    from: '1l581K_XFIxnhNwqYCjgMEKacMsNwZE4_FzwSqLo'
                },
                options: {
                    suppressInfoWindows: true,
                    styleId: 2,
                    templateId: 2
                }
            },
            layer: null,
            group: 'Boundaries'
        },
        {
            name: 'Suburb Boundaries',
            description: 'Only available for Western Australia',
            selected: false,
            showInMenu: true,
            icon: 'suburbs.png',
            settings: {
                query: {
                    select: 'geometry',
                    from: '1XBv-xeuhE7ZV1Wb1BO2jy87MDj3sgM5SF1d_W8Q'
                },
                options: {
                    suppressInfoWindows: true,
                    styleId: 2,
                    templateId: 2
                }
            },
            layer: null,
            group: 'Boundaries'
        },

        //Transparent Post Code Boundaries is always on the map
        //this is the only layer with a click event associated,
        //the others are just for presentation.

        {
            name: 'Transparent Post Code Boundaries',
            selected: true,
            showInMenu: false,
            settings: {
                query: {
                    select: 'geometry',
                    from: '1LXgzDlLanvylm0evZRyT61GITmdrjLDyMp2kDlM'
                },
                suppressInfoWindows: true,
                styles: [
                    {
                        polygonOptions: {
                            fillColor: "#FFFFFF",
                            fillOpacity: 0.01,
                            strokeColor: "#FFFFFF",
                            strokeWeight: 0,
                            strokeOpacity: 0.01
                        }
                    }
                ]
            },
            layer: null
        }

    ],

    /*
        print function takes the current state of the application and adds the appropriate variables to a 
        HTML hidden form.
    */
    print: function() {
        
    },

     /*
        setDefaultZoneListContent function gets all the Climate Zones stored in the fusion table and presents them in
        a default table.
    */
    setDefaultZoneListContent: function() {        

        var _SELF = this;
        
        //get all zone details and display in the default table

        var sqlQuery = 'SELECT ID, Name, FillColour, Border, Opacity, Latitude, Longitude ' + 
        'FROM 13iKvFf6V8ycP-14IwD05nJDa8fJ9a-XiriXZmYM ' +         
        'ORDER BY ID';

        $.ajax({            
            url: 'https://www.googleapis.com/fusiontables/v1/query?sql=' + encodeURIComponent(sqlQuery) + '&key=AIzaSyDi5fOTYct9-gZR2np0TXHWwNUZBrXz2o0&callback=?',            
            dataType: 'jsonp',
            success: function(data) {                
                var heading = '<tr id="allZonesHeading"><th class="tablecatheading" colspan="4">All Zones<div id="toggleAllZones">-</div></th></tr>' + 
                '<tr class="heading contentItem">' + 
                '<th class="key">Key</th>' + 
                '<th class="region">Climate Region</th>' + 
                '<th class="location">Location</th>' + 
                '</tr>';
                var rows = '';
                var row = '';
                for(var i = 0; i < data.rows.length; i++) {                                        
                    var colorSwatch = 
                    '<div class="colorSwatch" style="' + 
                    'background:' + data.rows[i][2] + ';' + 
                    'border: solid 1px' + data.rows[i][3] + ';' + 
                    'opacity:' + data.rows[i][4] + ';' + 
                    '"></div>'
                    row = '<tr class="contentItem">' +
                        '<td class="key">' + colorSwatch + '</td>' + 
                        '<td class="region">' + data.rows[i][0] + '</td>' + 
                        '<td class="location">' + data.rows[i][1] + '</td>' + 
                        
                    '</tr>';
                    rows += row;
                }
                var table = '<table>' + 
                heading + 
                rows + 
                '</table>';                                
                $('#zonesContentInnerAllZones').show().html('').append(table);                            
                $('#allZonesHeading').click(function() {                    
                    $('#toggleAllZones').html() == '+' ? $('#toggleAllZones').html('-') : $('#toggleAllZones').html('+');
                    $('#zonesContentInnerAllZones table tr.contentItem').toggle();            
                });                    
            }
        });

    },

    /*
        setMapLayersCount function reads the datalayers obj and counts the number of layers marked as shown,
        it then presents this count in the app.
    */
    setMapLayersCount: function() {
        var _SELF = this;
        var count = 0;
        //count the layers in the central datalayers obj 
        for(var i = 0; i < _SELF.dataLayers.length; i++) {            
            if(_SELF.dataLayers[i].selected == true && _SELF.dataLayers[i].showInMenu == true) {
                count++;
            }            
        }
        //set the gloabl count
        _SELF.selectedLayersCount = count;       
        //hide or show the count
        if(count == 0) { 
            $('#clearSelectedLayers').hide(); 
        } 
        else {
            $('#clearSelectedLayers').show(); 
        }
    },

    /*
        presentDataLayers function reads the datalayers obj and adds / removes fusion tables polygon layers
    */
    presentDataLayers: function() {
        var _SELF = this;
        //loop through datalayers and show / hide tehm depending on the layers settings
        for(var i = 0; i < _SELF.dataLayers.length; i++) {            
            if(_SELF.dataLayers[i].selected == true) {                
                if(!_SELF.dataLayers[i].layer) {
                    _SELF.dataLayers[i].layer = new google.maps.FusionTablesLayer(_SELF.dataLayers[i].settings);
                }
                _SELF.dataLayers[i].layer.setMap(_SELF.Map);                
            } else {
                if(_SELF.dataLayers[i].layer) {
                    _SELF.dataLayers[i].layer.setMap(null);                    
                }
            }
        }                        
        _SELF.setMapLayersCount();
        $('#selectedMapLayersCount').html(_SELF.selectedLayersCount);
        if(_SELF.selectedLayersCount > 0) {            
            $('#selectedMapLayersCount').show();
        } else {
            $('#selectedMapLayersCount').hide();
        }

        setTimeout(function() {
            $('#loading').hide();
        }, 1000);
                
    },

    /*
        initDataLayers function sets up the fusion tables polygon layers from the settings stored in the 
        global dataLayers obj. This also initializes the events (click) that are attached to these layers. 
        This is run on load.
    */
    initDataLayers: function() {
        var _SELF = this;        
        _SELF.presentDataLayers();        
        if(_SELF.dataLayers[3].layer != null) {
            //Transparent Post Code Boundaries is always on the map
            //so it has a click event staticly asigned to it.
            //All map clicks come through this event listner.
            google.maps.event.addListener(_SELF.dataLayers[3].layer, 'click', function () {                
                Main.postCodeLayerClick(arguments);
            });
        }        
        for(var i = 0; i < _SELF.dataLayers.length; i++) {                        
            if(_SELF.dataLayers[i].showInMenu == true) { 
                var checked = _SELF.dataLayers[i].selected == true ? 'checked ' : '';                        
                var dataLayerHTMLItem = ''; 
                var description = '';
                if(_SELF.dataLayers[i].hasOwnProperty('description')) {
                    description = '<br /><span class="layer-description">' + _SELF.dataLayers[i].description + '</span>';
                }               
                
                    dataLayerHTMLItem = $('<li></li>').append('<label for="layerToggle' + i + '"><img src="content/images/filtericons/' + _SELF.dataLayers[i].icon + '" alt="" /><span>' + _SELF.dataLayers[i].name + '</span>' + description + '</label><input id="layerToggle' + i + '" type="checkbox" ' + checked + '/>');                
                
                dataLayerHTMLItem.find('input').click(function(event) {                    
                    if($(this).is('input') == true) {                    
                        event.stopPropagation();                        
                        $('#loading').show();
                        var isChecked = false;
                        if($(this).attr('checked') == 'checked') {                            
                            isChecked = true;
                        }                        
                        var layerIndex = $(this).attr('id').replace(/\D/g,'');
                        _SELF.dataLayers[layerIndex].selected = isChecked;                          
                        if(_SELF.dataLayers[layerIndex].hasOwnProperty('group')) {
                            //this is a radio box
                            var x = 0;
                            $('#mapLayersContent ul li').each(function() {
                                var input = $(this).find('input');                                
                                if(input.attr('checked') == 'checked') {
                                    _SELF.dataLayers[x].selected = true;
                                } else {
                                    _SELF.dataLayers[x].selected = false;
                                }
                                x++;
                            });
                        }                                                             
                        _SELF.presentDataLayers();
                        if(isChecked == true) { $('#clearSelectedLayers').show(); }  
                    } else {
                        event.stopPropagation();
                        $('#loading').show();
                        var isChecked = false;
                        if($(this).find('input').attr('checked') == 'checked') {
                            $(this).find('input').attr('checked', false);
                        } else {                   
                            $(this).find('input').attr('checked', true);
                            isChecked = true;
                        }
                        var layerIndex = $(this).find('input').attr('id').replace(/\D/g,'');
                        _SELF.dataLayers[layerIndex].selected = isChecked;
                        if(_SELF.dataLayers[layerIndex].hasOwnProperty('group')) {
                            //this is a radio box
                            var x = 0;
                            $('#mapLayersContent ul li').each(function() {
                                var input = $(this).find('input');
                                if(input.attr('checked') == 'checked') {
                                    _SELF.dataLayers[x].selected = true;
                                } else {
                                    _SELF.dataLayers[x].selected = false;
                                }
                                x++;
                            });
                        }
                        _SELF.presentDataLayers();
                        if(isChecked == true) { $('#clearSelectedLayers').show(); }                    
                    }                 
                });
                $('#mapLayersContent ul').append(dataLayerHTMLItem);
            }
        }
    },        

    /*
        find function is the main search function of the appliciaon. It handles the search form input, geocodes the address, and then
        presents the searched location point and highlights the LGA the point falls inside.
    */
    find: function(address) {
        var _SELF = this;
        if(address != '' && address != null && address != 'Enter Suburb / Postcode') {            
            this.geocode(address, function(location) {
                
                _SELF.geocodeResult = location;
                $('#searchInp').val(_SELF.geocodeResult.formatted_address);
                _SELF.Map.setCenter(new google.maps.LatLng(location.geometry.location.lat(), location.geometry.location.lng()));
                _SELF.Map.setZoom(14);
                _SELF.elevationMode = true;
                _SELF.getElevation(location.geometry.location.lat(), location.geometry.location.lng());                

                //highlight the polygon that the searched location's lat lon is inside
                _SELF.dataLayers[3].layer.setOptions({
                    styles: [
                        {
                            polygonOptions: {
                                fillColor: "#FFFFFF",
                                fillOpacity: 0.01,
                                strokeColor: "#FFFFFF",
                                strokeWeight: 0,
                                strokeOpacity: 0.01
                            }
                        },
                        {
                            where: 'ST_INTERSECTS(geometry, CIRCLE(LATLNG(' + location.geometry.location.lat() + ', ' + location.geometry.location.lng() + '), 1))',
                            polygonOptions: _SELF.selectedPolygonStyle
                        }
                    ]
                });  
                
                //get the zone ids for the polygon the lat long of the searched address falls inside
                var sqlQueryOne = 'SELECT name, description, Zone_Ids, Option ' + 
                'FROM 1LXgzDlLanvylm0evZRyT61GITmdrjLDyMp2kDlM ' + 
                'WHERE ST_INTERSECTS(geometry, CIRCLE(LATLNG(' + location.geometry.location.lat() + ', ' + location.geometry.location.lng() + '), 1))';

                $.ajax({
                    url: 'https://www.googleapis.com/fusiontables/v1/query?sql=' + encodeURIComponent(sqlQueryOne) + '&key=AIzaSyDi5fOTYct9-gZR2np0TXHWwNUZBrXz2o0&callback=?',
                    dataType: 'jsonp',
                    success: function(data) {
                        if(data) {                            
                            //get zone ids for selected zone                            
                            var postcode = null;
                            var zoneIds = '';
                            var hasMultipleZones = false;

                            for(var i = 0; i < data.rows.length; i++) {                              

                                zoneIds = data.rows[i][2];
                                postcode = data.rows[i][0];
                                if(data.rows[i][3] && data.rows[i][3].toLowerCase() == 'y') { 
                                    hasMultipleZones = true;
                                }
                            }
                            if(postcode != null && zoneIds.length > 0) {
                                //query using the zone ids
                                zoneIds = zoneIds.replace(/ /gi, '').split(',');
                                _SELF.presentClimateZones(postcode, zoneIds, hasMultipleZones);
                            }
                        }    
                    }
                });
                                                            
            });
        } else {
            //error msg - input missing
            $('#searchInp').addClass('error');
            $('#searchInp').focus(function() {
                $('#searchInp').removeClass('error');
            });
        }
    },

    /*
        filterAddresses function is used to filter Google Geocoder results, it has a white list
        of allowed result types. 
    */
    filterAddresses: function(results, region) {
        //NT: special filtering rules applied to colloquial_area
        var allowedAddressTypes = [            
            'street_number',
            'street_address',
            'route',
            'intersection',
            'political',
            'country',
            'administrative_area_level_1',
            'administrative_area_level_2',
            'administrative_area_level_3',
            'locality',
            'sublocality',
            'neighborhood',
            'premise',
            'subpremise',
            'postal_code',
            'colloquial_area',
            'natural_feature', 
            'park',
            'establishment'
        ];
        var filtered_values = [];
        if (results != null) {
            //NT: if there is > 1 result then filter out colloquial_area (workaround suggested by Google)
            if(results.length > 1) {
                var newResults = [];
                for(var i = 0; i < results.length; i++) {
                    if($.inArray('colloquial_area', results[i].types) == -1) {
                        newResults.push(results[i]);
                    }
                }
                results = newResults;
            }

            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                var numComponents = result.address_components.length;
                var types = result.types;                                        
                var found = false;
                var addressAllowed = true;
                    
                //check if this is an allowed address
                for(var l = 0; l<types.length; l++) {
                    if($.inArray(types[l], allowedAddressTypes) == -1) {                    
                        addressAllowed = false;
                    }
                }   

                if(addressAllowed) {
                    for (var j = 0; j < numComponents && !found; j++) {
                        var component = result.address_components[j];
                        var types = component.types;                                                                                                                                                                                                          
                        for (var k = 0; k < types.length && !found; k++) {                                                        
                            if (types[k] == 'country') {
                                if (component.long_name == region) {
                                    filtered_values.push(results[i]);
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                //reset
                addressAllowed = true;
            }
        }
        return filtered_values;
    },

    /*
        geocode function is a wrapper for Google's geocoder. It can take trip and point searches. On sucess 
        the resultsCallback function is called.
    */

    geocode: function(address, resultsCallback) {
        var _SELF = this;
        if(!this.geocoder) { this.geocoder = new google.maps.Geocoder(); }
        var requestAddress = address.replace("%25", "");
        if(requestAddress.toLowerCase().indexOf('australia') == -1) {
            requestAddress += ' Australia';
        }
        var request = {
            address: requestAddress,
            region: "AU"
        };

        this.geocoder.geocode(request, function(results, status) {            
            if(status=='OK') {
                results = _SELF.filterAddresses(results, 'Australia');
                _SELF.filteredGeocodeResults = results;
                if(results.length == 1) {                    
                    resultsCallback(results[0]);
                } 
                else {
                    //error msg - search form
                    if(results.length > 1) {

                        //multiple results - search                             
                        $('#ddlMultipleAddresses').html('');
                        $('#multipleAddressDialog').find($('#multipleAddressDialog').find('#ddlMultipleAddresses').html(''));
                        $("<option/>").attr('value', '0').html('Choose an address:').appendTo($('#multipleAddressDialog').find('#ddlMultipleAddresses'));                    
                        if(results.length > 0) {
                            $.each(results, function (i, address) {
                                $("<option/>").html(this.formatted_address).appendTo($('#multipleAddressDialog').find('#ddlMultipleAddresses'));
                            });
                            _SELF.multipleAddressDialog = $.colorbox({ href:"#multipleAddressDialog", inline:true, transition: "none", width: "380px", overlayClose: false, escKey: false, onLoad: function() {  } });
                        } else {
                            //error msg - no results came back
                            _SELF.displayException('No results found');
                            $('#loadingOverlay').hide();
                        }
                    } else {
                        //no results - search                            
                        $('#searchInp').addClass('error');                            
                        $('#searchInp').focus(function() {                                
                            $('#searchInp').removeClass('error');
                                
                        });
                        _SELF.displayException('No results found');
                    }                                         
                }
            }
            else {                
                $('#searchInp').addClass('error');
                $('#searchInp-clear').hide();
                $('#searchInp').focus(function() {                                        
                    $('#searchInp').val('');
                    $('#searchInp').removeClass('error'); 
                });
                _SELF.displayException('No results found');                                                
            }
        });
    },      
        
    /*
        initMap function initalizes the main Google maps map object and its 
        settings: zoom, map types, map events ect...
    */                     
    initMap: function() {
        var _SELF = this;        
        var opt = {
            center: _SELF.startCentre,
            zoom: _SELF.startZoom,
            streetViewControl: false,
            panControl: false,
            minZoom: _SELF.startZoom,
            mapTypeControl: true,      
            zoomControl: true,
            scaleControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.DEFAULT 
            },
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                mapTypeIds: [
                    google.maps.MapTypeId.ROADMAP, 
                    google.maps.MapTypeId.HYBRID, 
                    google.maps.MapTypeId.SATELLITE,
                    google.maps.MapTypeId.TERRAIN 
                    
                ]
            },
            mapTypeId: google.maps.MapTypeId.TERRAIN
        };        
        _SELF.Map = new google.maps.Map(document.getElementById('map'), opt);
        _SELF.initDataLayers();               
        google.maps.event.addListener(_SELF.Map, 'dragstart', function(e) {						
            $('#loading').show();
        });						
        google.maps.event.addListener(_SELF.Map, 'center_changed', function(e) {						
            $('#loading').show();
        });					
        google.maps.event.addListener(_SELF.Map, 'heading_changed', function(e) {						
            $('#loading').show();
        });						
        google.maps.event.addListener(_SELF.Map, 'maptypeid_changed', function(e) {						
            $('#loading').show();
        });						
        google.maps.event.addListener(_SELF.Map, 'projection_changed', function(e) {						
            $('#loading').show();
        });						
        google.maps.event.addListener(_SELF.Map, 'zoom_changed', function(e) {						
            if(_SELF.Map.getZoom() > _SELF.startZoom) {
                $('#loading').show();
            }            
        });	
        					
        google.maps.event.addListener(_SELF.Map, 'tilt_changed', function(e) {						
            $('#loading').show();
        });						

        google.maps.event.addListener(_SELF.Map, 'tilesloaded', function(e) {						            
            $('#loading').hide();
        });
        google.maps.event.addListener(_SELF.Map, 'tilesloaded', function(e) {						
            $('#loading').hide();
            google.maps.event.addListener(_SELF.Map, 'idle', function(e) {
                setTimeout(function() {
                    $('#loading').hide();            
                }, 1000);                
            });
        });        
    },

    /*
        getWindowDimensions function gets the height and width of the browser window
    */
    getWindowDimensions: function() { 
        var myWidth = 0, myHeight = 0;        
        if( typeof( window.innerWidth ) == 'number' ) {
            //Non-IE
            myWidth = window.innerWidth;
            myHeight = window.innerHeight;
        } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
            //IE 6+ in 'standards compliant mode'
            myWidth = document.documentElement.clientWidth;
            myHeight = document.documentElement.clientHeight;
        } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
            //IE 4 compatible
            myWidth = document.body.clientWidth;
            myHeight = document.body.clientHeight;
        }        
        return {
            height: myHeight,
            width: myWidth
        };
    },

    /*
        windowResizeEvent function handles the dynamic sizing of the applicaiton based on the dimentions
        of the browser window it is being viewed in.
    */
    windowResizeEvent: function() {
        var _SELF = this;
        var windowDimensions = _SELF.getWindowDimensions();
        var height = windowDimensions.height;
        var width = windowDimensions.width;
        if(height < 369) {
            height = 369;
        }
        $('#map').height(height-134);

        $('#zonesContentInner').css('max-height', height-250 + 'px');
        //$('#elevationmeasurments').css('max-height', height-250 + 'px');        
        
        $('#loading').css('top', (height/2).toString() + 'px');
        $('#loading').css('left', (width/2).toString() + 'px');

        $('#main-info').css('top', (height/2/2).toString() + 'px');                        
        $('#main-info').css('left', (width-958)/2 + 'px');        
        //$('#main-info').show();

        $('#footer').width(width);

        if(width <= 995 && width > 832) {
            $('#back').addClass('respond');
            $('#title').addClass('respond');
            $('#search').addClass('respond');  
            $('#poweredby').addClass('respond');                                      
            $('#logo .title').removeClass('respond2');
            $('#logo #search').removeClass('respond2');
            $('#logo #topfunctions').removeClass('respond2');                       
        } 
        else if(width <= 832) {
            $('#back').addClass('respond');
            $('#title').addClass('respond');
            $('#search').addClass('respond');  
            $('#poweredby').addClass('respond');
            $('#logo .title').addClass('respond2');
            $('#logo #search').addClass('respond2');
            $('#logo #topfunctions').addClass('respond2');            
        }
        else {
            $('#back').removeClass('respond');
            $('#title').removeClass('respond');
            $('#search').removeClass('respond');   
            $('#poweredby').removeClass('respond');                          
            $('#logo .title').removeClass('respond2');
            $('#logo #search').removeClass('respond2');
            $('#logo #topfunctions').removeClass('respond2');                     
        }
                  
        if(Main.Map != null) {
            google.maps.event.trigger(Main.Map, "resize");
        }

    },

    /*
        initInputEvents function intialises events specific to the form inputs
    */
    initInputEvents: function() {             
        $('input[type="text"]').unbind('keyup');
        $('.clear-input').unbind('click');
        $('input[type="text"]').keyup(function() {        
            var clearSelector = '#' + $(this).attr('id') + '-clear';
            if ($(this).val().length > 0) {
                $(clearSelector).show();
            }
            else {
                $(clearSelector).hide();
            }
        });
        $('.clear-input').click(function() {
            $(this).hide();
            var inputSelector = '#' + $(this).attr('id').replace('-clear', '');
            $(inputSelector).val('');
            $(inputSelector).blur();
        });
    },


    /*
        initEvents function initialises most of the UI events click, change ect... this mainly uses jQuery to 
        bind the event listeners
    */
    initEvents: function() {
        var _SELF = this;
        $('.title').click(function() {
            window.location = 'http://www.nathers.gov.au';
        });
        $('#mainlogo').click(function() {
            window.location = 'http://www.nathers.gov.au';
        });       
        $('#zoneInfo').click(function() {
            $('#infoWindowbg').show();
            $('.help').hide();
            $('.info').show();
            $('#infoWindow').show();
        });
        $('#reset').click(function() {
            $('#loading').show();
        });
        $('#info').click(function() {
            $('#infoWindow').show();
            $('.info').hide();
            $('.help').show();
            $('#infoWindowbg').show();
        });
        $('#infoWindow').click(function() {
            $('#infoWindow').hide();
            $('#infoWindowbg').hide();
        });
        $('#clearSelectedElevation').click(function() {
            if(_SELF.elevationMarker) _SELF.elevationMarker.setMap(null);
            _SELF.elevationMarker = null;
            $('#elevationmeasurementarea').hide();
            $('#elevationmeasurement').html('').css('display', 'none');
            $('#elevationmeasurementmap').html('').css('display', 'none');
            $('#elevationmeasurementchart').html('').css('display', 'none');
            $('#selectedElevationCount').hide();
            $(this).hide();
        });
        $('#clearSelectedLayers').on('click', function() {            
            $('#loading').show();
            $('#mapLayersContent ul li').each(function(key, value) {
                if($(this).find('input').attr('checked') == 'checked') {                                        
                    $(this).find('input').attr('checked', false);                    
                    var layerIndex = $(this).find('input').attr('id').replace(/\D/g,'');
                    _SELF.dataLayers[layerIndex].selected = false;
                }
            });
            _SELF.presentDataLayers();
            $(this).hide();
            $('#loading').hide();
        });
        $('#clearSelectedZones').click(function() {            
            _SELF.dataLayers[3].layer.setOptions({
                styles: [
                    {
                        polygonOptions: {
                            fillColor: "#FFFFFF",
                            fillOpacity: 0.01,
                            strokeColor: "#FFFFFF",
                            strokeWeight: 0,
                            strokeOpacity: 0.01
                        }
                    }
                ]
            });
            $('#zonesContentInnerSelectedZone').html('');
            _SELF.selectedZonesCount = 0;
            $('#selectedZonesCount').html('0');
            $('#selectedZonesCount').hide();
            $('#clearSelectedZones').hide();
        });              
        $('#remove').click(function() {
            _SELF.deleteSelectedShape();
        });
        $('#searchInp').bind('keypress', function(e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if(code == 13) {
                //Enter keycode
                $('#searchBtn').trigger('click');
                return false;
            }
        });
        $('#print').click(function() {
            window.print();
        });
        $('#selectAddress').click(function() {
            var idx = $('#multipleAddressDialog').find('#ddlMultipleAddresses').prop('selectedIndex');
            if (idx != 0) {
                idx--;
                _SELF.currentSearchResult = _SELF.filteredGeocodeResults[idx];
                _SELF.searchedAddress = _SELF.currentSearchResult.formatted_address;
                $('#searchInp').val(_SELF.currentSearchResult.formatted_address);                                                
                _SELF.Map.setCenter(new google.maps.LatLng(
                    _SELF.currentSearchResult.geometry.location.lat(), 
                    _SELF.currentSearchResult.geometry.location.lng()
                ));
                _SELF.Map.setZoom(14);
                google.maps.event.trigger(_SELF.Map, 'bounds_changed');
                $.colorbox.close();


                _SELF.geocodeResult = new google.maps.LatLng(
                    _SELF.currentSearchResult.geometry.location.lat(), 
                    _SELF.currentSearchResult.geometry.location.lng()
                );
                
                _SELF.Map.setCenter(new google.maps.LatLng(
                    _SELF.currentSearchResult.geometry.location.lat(), 
                    _SELF.currentSearchResult.geometry.location.lng()
                ));
                _SELF.Map.setZoom(14);
                _SELF.elevationMode = true;
                _SELF.getElevation(_SELF.currentSearchResult.geometry.location.lat(), _SELF.currentSearchResult.geometry.location.lng());                

                //highlight the polygon that the searched location's lat lon is inside
                _SELF.dataLayers[3].layer.setOptions({
                    styles: [
                        {
                            polygonOptions: {
                                fillColor: "#FFFFFF",
                                fillOpacity: 0.01,
                                strokeColor: "#FFFFFF",
                                strokeWeight: 0,
                                strokeOpacity: 0.01
                            }
                        },
                        {
                            where: 'ST_INTERSECTS(geometry, CIRCLE(LATLNG(' + _SELF.currentSearchResult.geometry.location.lat() + ', ' + _SELF.currentSearchResult.geometry.location.lng() + '), 1))',
                            polygonOptions: _SELF.selectedPolygonStyle
                        }
                    ]
                });   
                                           
                //get the zone ids for the polygon the lat long of the searched address falls inside
                var sqlQueryOne = 'SELECT name, description, Zone_Ids, Option ' + 
                'FROM 1LXgzDlLanvylm0evZRyT61GITmdrjLDyMp2kDlM ' + 
                'WHERE ST_INTERSECTS(geometry, CIRCLE(LATLNG(' + _SELF.currentSearchResult.geometry.location.lat() + ', ' + _SELF.currentSearchResult.geometry.location.lng() + '), 1))';

                $.ajax({
	                url: 'https://www.googleapis.com/fusiontables/v1/query?sql=' + encodeURIComponent(sqlQueryOne) + '&key=AIzaSyDi5fOTYct9-gZR2np0TXHWwNUZBrXz2o0&callback=?',
	                dataType: 'jsonp',
	                success: function(data) {
		                if(data) {                            
			                //get zone ids for selected zone                            
			                var postcode = null;
			                var zoneIds = '';
                            var hasMultipleZones = false;
			                for(var i = 0; i < data.rows.length; i++) {                                        
				                zoneIds = data.rows[i][2];
				                postcode = data.rows[i][0];
                                if(data.rows[i][3] && data.rows[i][3].toLowerCase() == 'y') { 
                                    hasMultipleZones = true;
                                }
			                }                            
			                if(postcode != null && zoneIds.length > 0) {                                
				                //query using the zone ids
				                zoneIds = zoneIds.replace(/ /gi, '').split(',');
				                _SELF.presentClimateZones(postcode, zoneIds, hasMultipleZones);
			                }
		                }    
	                }
                });
                                
            }
        });
        $('#functions').click(function(event) {
            event.stopPropagation();
        });         
        $('#main #functions .funt').click(function() {
            if(!$(this).hasClass('selected')) {
                $('#main #functions .funt').removeClass('selected');
                $(this).addClass('selected');
                $('.functionFieldsPane').hide();
                var contentPane = '#' + $(this).attr('id').replace('Tab', 'Content');
                $(contentPane).show();
                if($('#functionFields').css('display') != 'block') {
                    $('#functionFields').show('slide', { direction: "down" }, 200);                    
                }                                                               
                if($(this).attr('id') == 'elevationTab') {
                    _SELF.elevationMode = true;
                } else {
                    //_SELF.elevationMode = false;                                        
                }
            } else {
                $('#main #functions .funt').removeClass('selected');
                $('#functionFields').hide('slide', { direction: "down" }, 200);
                //_SELF.elevationMode = false;                
            }
        });     
        $('#searchBtn').click(function() {
            _SELF.find($('#searchInp').val());
        });
        $('#searchInp').keypress(function(e) {
            if(e.which == 13) {
                _SELF.find($('#searchInp').val());
            }
        });
        $('#searchInp').blur(function() {
            if($(this).val()=='') {
                $(this).addClass('blur');
                $(this).val('Enter Suburb / Postcode');
            }
        });
        $('#searchInp').focus(function() {
            if($(this).val()=='Enter Suburb / Postcode') {
                $(this).val('');
                $(this).removeClass('blur');
            }
        });
        $(window).resize(function() {
            _SELF.windowResizeEvent();
        });
    },

    /*
        fixBrowsers function detects the browser user agent and 
        adds css classes to HTML items that need to be customized for the current browser
    */
    fixBrowsers: function(onLoad) {
        if(onLoad) {
            if(/chrome/.test(navigator.userAgent.toLowerCase())) {
                $('#header #search #searchBtn').addClass('chrome');
            }
            if(!/chrome/.test(navigator.userAgent.toLowerCase()) && /safari/.test(navigator.userAgent.toLowerCase())) {
                $('#header #search #searchBtn').removeClass('chrome');
                $('#header #search #searchBtn').addClass('safari');
            }
            if (("standalone" in window.navigator) && window.navigator.standalone) {
                $('#header #search #searchBtn').removeClass('chrome');
                $('#header #search #searchBtn').addClass('safari');
            }
        }
    },

    /*
        init function initializes the object and accepts any extentions to the object, it calls initmap 
    */
    init: function() {
        var _SELF = this;

        //Loading spinner
        var opts = {
            lines: 13, // The number of lines to draw
            length: 7, // The length of each line
            width: 4, // The line thickness
            radius: 10, // The radius of the inner circle
            corners: 1, // Corner roundness (0..1)
            rotate: 0, // The rotation offset
            color: '#FFF', // #rgb or #rrggbb
            speed: 2.2, // Rounds per second
            trail: 60, // Afterglow percentage
            shadow: true, // Whether to render a shadow
            hwaccel: true, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: 'auto', // Top position relative to parent in px
            left: 'auto' // Left position relative to parent in px
        };
        var target = document.getElementById('loading');
        var spinner = new Spinner(opts).spin(target);

        _SELF.initEvents();
        autoCompleteFunction.initAutoComplete('#searchInp', _SELF.autoCompleteOptions);        
        _SELF.windowResizeEvent();
        _SELF.fixBrowsers(true);        
        _SELF.initMap();        
        _SELF.initInputEvents();      
        _SELF.setDefaultZoneListContent();
        window.scrollTo(0, 1);
        // Load the Visualization API and the columnchart package.
        google.load("visualization", "1", {packages:["corechart"]});

        
    }
};
Main.init();