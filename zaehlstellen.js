
//------------ Funktion initMap() für die Karte--------------------------------------------------------------------- -->
	var map;
	var viewpoint;
	function initMap() {
		map = new ol.Map({target: "map"});

		viewpoint = new ol.View({ center: ol.proj.fromLonLat([14.82719, 47.21595]), zoom: 9 });
		map.setView(viewpoint);

		//-------------------  Basemap  -------------------------------
		var background_grey = new ol.layer.Tile();
		background_grey.set('visible', true);
		background_grey.set('name', 'grau');
		map.addLayer(background_grey);

		// Topographic Layer
		var background_ortho = new ol.layer.Group();
		background_ortho.set('visible', false);
		background_ortho.set('name', 'ortho');
		var background_img = new ol.layer.Tile();
		var background_labels = new ol.layer.Tile();
		background_ortho.setLayers(new ol.Collection([background_img, background_labels]));
		map.addLayer(background_ortho);

		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://www.basemap.at/wmts/1.0.0/WMTSCapabilities.xml');
		xhr.onload = function() {
			var caps = new ol.format.WMTSCapabilities().read(xhr.responseText);
			var options = ol.source.WMTS.optionsFromCapabilities(caps, {
				layer: 'bmapgrau',
				matrixSet: 'google3857',
				requestEncoding: 'REST',
				style: 'normal'
			});
			background_grey.setSource(new ol.source.WMTS(options));
			options = ol.source.WMTS.optionsFromCapabilities(caps, {
				layer: "bmaporthofoto30cm",
				matrixSet: 'google3857',
				requestEncoding: 'REST',
				style: 'normal'
			});
			background_img.setSource(new ol.source.WMTS(options));
			options = ol.source.WMTS.optionsFromCapabilities(caps, {
				layer: "bmapoverlay",
				matrixSet: 'google3857',
				requestEncoding: 'REST',
				style: 'normal'
			});
			background_labels.setSource(new ol.source.WMTS(options))
		};
		xhr.send();
	}


//---- Zählstellenpunkte für Karte --------------------------------------------------------------------------->
function add_zaehlstellen(coords_json)
{
	ZaehlstellenPoints = new ol.layer.Vector({
		source: new ol.source.Vector({
			features: (new ol.format.GeoJSON()).readFeatures(coords_json, { featureProjection: 'EPSG:3857' })
			//url: coords_json,
			//format: new ol.format.GeoJSON()
		}),
		style: function(feature, resolution){
			var geom = feature.getGeometry().getType();
			var zaehlstelle = feature.get('zaehlstelle');
			return styles[geom];
		}
	});
	var styles = {   // initial style
		'Point': [new ol.style.Style({
			image: new ol.style.Circle({
				radius: 15,
				fill: new ol.style.Fill({color: 'black'})
			})
		})]
		,
	};
	map.addLayer(ZaehlstellenPoints);
	ZaehlstellenPoints.set('name', 'zaehlstellen');
	if (typeof(zaehlstellen_data)!== "undefined"){
		updateStyle(0);
		updateInput(0, false, false);
		document.getElementById("sliderDiv").style.display= 'block';
	}

}


	//------- Change Style of Points according to Value of Zählstelle --------->
	function updateStyle(y){  // y = integer of current day
		//console.log(window.radiustest);
		//window.radiustest = 0;
		// calculate min and max values for current day (for radius)
		var max_thisDay = -Infinity;
		for (var k in zaehlstellen_data[y]) { // of for every zaehlstelle
			if (typeof zaehlstellen_data[y][k] == 'number') { // only numbers, one item is the date
				var amount = zaehlstellen_data[y][k];
				if (amount > max_thisDay) {max_thisDay = amount}; // maximum
			}
		}
		// write values into size-legend
		document.getElementById("size_image_max").innerHTML = max_thisDay; // biggest circle (d=70px) = maximum value
		var middle_value = Math.round(max_thisDay/4); // Circle with half diameter (35px) = 1/4 Area
		document.getElementById("size_image_mid").innerHTML = middle_value;
		var small_value = Math.round(max_thisDay*0.07854); // Circle with 1/7 diameter (10px)
		document.getElementById("size_image_min").innerHTML = small_value;

		ZaehlstellenPoints.setStyle(function(feature, resolution){
			var geom = feature.getGeometry().getType();  // geom = point
			var zaehlstelle = feature.get('zaehlstelle');  // zaehlstelle = z.B. b0251
			var amount = zaehlstellen_data[y][zaehlstelle]; // amount = z.B. 1055
			//example: min_max_zaehlstelle["b02501"][1] = maximum of b02501 of all days

			var color_hue = 110 - Math.round((amount/min_max_zaehlstelle[zaehlstelle][1])*110) // 110 = green, 0 = red, between = yellow
			var feature_color = 'hsl('+ color_hue +', 99%, 99%)';
			var radius_size = Math.sqrt((amount/(2*Math.PI)))/Math.sqrt((max_thisDay/(2*Math.PI)))*35;

		//if (radius_size > window.radiustest) {window.radiustest = radius_size}; // maximum TEST



			var styles = {
				'Point': [new ol.style.Style({
				image: new ol.style.Circle({
				radius: radius_size,
				fill: new ol.style.Fill({color: 'hsl('+color_hue+', 100%, 50%)'}),
				stroke: new ol.style.Stroke({color: 'hsl('+color_hue+', 100%, 20%)', width: 3})
				})
				})]
				,
			};
			return styles[geom];
		});
	};


	//------- Drag and Drop -------------------->
	// Initiate the Dropzone
	function init_dropzone(){
		var dropZone1 = document.getElementById('drop_zone1');
		dropZone1.addEventListener('dragover', handleDragOver, false);
		dropZone1.addEventListener('drop', handleFileSelect1, false);

		var dropZone2 = document.getElementById('drop_zone2');
		dropZone2.addEventListener('dragover', handleDragOver, false);
		dropZone2.addEventListener('drop', handleFileSelect2, false);
	}

	//---------- Get File Reference ---------->
	function handleFileSelect1(evt) {
		evt.stopPropagation();
		evt.preventDefault();

		var files = evt.dataTransfer.files; // FileList object.

		// files is a FileList of File objects. List some properties.
		var output = [];
		f = files[0];
		output.push('<li><strong>', escape(f.name), '</strong>  - ',
		f.size, ' bytes, last modified: ',
		f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a','</li>');

		var reader = new FileReader(); // to read the FileList object
		reader.onload = function(event){  // Reader ist asynchron, wenn reader mit operation fertig ist, soll das hier (JSON.parse) ausgeführt werden, sonst ist es noch null
			var coords_json = JSON.parse(reader.result);
			add_zaehlstellen(coords_json);
		};
		reader.readAsText(f);

		document.getElementById('list_coords').innerHTML = '<ul>' + output.join('') + '</ul>';
	}

	function handleFileSelect2(evt) {
		evt.stopPropagation();
		evt.preventDefault();

		var files = evt.dataTransfer.files; // FileList object.

		// files is a FileList of File objects. List some properties.
		var output = [];
		f = files[0];
		output.push('<li><strong>', escape(f.name), '</strong>  - ',
		f.size, ' bytes, last modified: ',
		f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a','</li>');

		var reader = new FileReader(); // to read the FileList object
		reader.onload = function(event){  // Reader ist asynchron, wenn reader mit operation fertig ist, soll das hier (JSON.parse) ausgeführt werden, sonst ist es noch null
			zaehlstellen_data = JSON.parse(reader.result);  // global, unsauber?
			makeDateObjects(zaehlstellen_data);
			selectedWeekdays = [0,1,2,3,4,5,6]; // select all weekdays before timeslider gets initialized
			init_timeslider(zaehlstellen_data);
			find_dataRange(zaehlstellen_data);

			map.getLayers().forEach(function(layer) {
				if (layer.get('name') == 'zaehlstellen') {
				  updateStyle(0);
				  updateInput(0, false, false);
				  document.getElementById("sliderDiv").style.display= 'block';
				}
			});
		};
		reader.readAsText(f);

		// global variable for selection
		oldSelectedStreetNames = [] // Array for street names, if same amount of points are selected, but different streetnames -> redraw chart completely
		document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
	}


	//---------- Drag Over ------------------->
	function handleDragOver(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	}
	//---------- Fill Timeslider with min and max Values ---------->
	function init_timeslider(data){
		var minDatum = data[0].datum;
		var maxDatum = data[data.length-1].datum;
		document.getElementById("time_slider").setAttribute("max", data.length-1);
	}
	//---------- Button one step left/right ---------->
	function changeDateOneStep(step, loop){    // takes -1 or 1 from left/right-Buttons and updates the current Date, loop is true when auto-play is on, so it starts at 0 when end of data is reached
		var x = document.getElementById("time_slider").value;
		var thisDate = parseInt(x) + parseInt(step); // thisDate = integer of Timestep (e.g. 0 = first Date in Data)
		var goLeft = (step == -1) ? true : false;
		updateInput(thisDate, goLeft, loop);
	}
	//---------- Find min and max Data Values for Visualization ---------->
	function find_dataRange(data){
		min_max_zaehlstelle ={};
		for (k = 1; k < Object.keys(data[0]).length; k++){  // name of zaehlstelle
			var name_zaehlstelle = Object.keys(zaehlstellen_data[0])[k];
			var min_max = [Infinity, -Infinity];

			for (i = 1; i < data.length; i++){  // also via keys? // value of zaehlstelle at certain date
				var amount = data[i][name_zaehlstelle];

				if (amount < min_max[0]) {min_max[0] = amount};
				if (amount > min_max[1]) {min_max[1] = amount};

			}
			min_max_zaehlstelle[name_zaehlstelle] = min_max; // assign min/max-Values to Object
		}
	}
	//--------- Parse Date-Strings into JS Date Objects -------------------->
	function makeDateObjects(data){
		for (i = 0; i < data.length; i++){
			var datestring = data[i].datum
			var thisYear   = parseInt(datestring.substring(0,4));
			var thisMonth  = parseInt(datestring.substring(5,7));
			var thisDay   = parseInt(datestring.substring(8,10));
			var thisDateComplete = new Date(thisYear, thisMonth-1, thisDay);  // JS-Date Month begins at 0
			zaehlstellen_data[i].datum = thisDateComplete;
		}
	}
//-------- Function for Checkboxes of Weekday-Selection (visuals) ------------>
function change_state(obj){
		selectedWeekdays = [];
		var weekdays = document.querySelectorAll('input[name=weekday]:checked');
		for (i = 0; i < weekdays.length; i++){
			selectedWeekdays.push(parseInt(weekdays[i].value));
		}
  }

	//  Update of Shown Value   -->
	function updateInput(thisDate, goLeft, loop) { // go left: true if going left. loop: true to start at 0 when max x time is reached
		// Create Arrays for Printing the Date
		var d_names = new Array("Sunday", "Monday", "Tuesday",
		"Wednesday", "Thursday", "Friday", "Saturday");

		var m_names = new Array("January", "February", "March",
		"April", "May", "June", "July", "August", "September",
		"October", "November", "December");

		//check if day of week is selected
		var foundNextWeekday = false;
		// repeat until selected weekday is found
		while (foundNextWeekday == false){
			thisDate = parseInt(thisDate);

			if(thisDate >= zaehlstellen_data.length-1){ // if maximum time is reached
				if (loop === true){
					thisDate = 0;
				}
				else{
					break;
				}
			};

			if (thisDate < 0){
				break;
			};

			var d = zaehlstellen_data[thisDate].datum;
			if (typeof(selectedWeekdays) != "undefined" && selectedWeekdays.indexOf(d.getDay()) >= 0){
				var curr_day = d.getDay();
				var curr_date = d.getDate();
				var sup = "";
				if (curr_date == 1 || curr_date == 21 || curr_date ==31)
				   {
				   sup = "st";
				   }
				else if (curr_date == 2 || curr_date == 22)
				   {
				   sup = "nd";
				   }
				else if (curr_date == 3 || curr_date == 23)
				   {
				   sup = "rd";
				   }
				else
				   {
				   sup = "th";
				   }
				var curr_month = d.getMonth();
				var curr_year = d.getFullYear();
				var shownDate = d_names[curr_day] + ", "+ m_names[curr_month] + " " + curr_date + "<SUP>" + sup + "</SUP>" + ", "  + curr_year;

				document.getElementById('currentDate').innerHTML = shownDate;

				updateStyle(thisDate);
				foundNextWeekday = true;
				document.getElementById("time_slider").value = thisDate; // Update of Timeslider
				if (typeof selectedFeatures !== "undefined"  && selectedFeatures.length > 0){createPolyChart(selectedFeatures)}
			}
			else if (selectedWeekdays.length == 0){
				alert("No Weekday Selected");
				break;
				foundNextWeekday = true;
				} // Break while when end of Data is reached
			else{
				thisDate = (goLeft == true) ? thisDate-1 : thisDate+1;
			}
		}
	}



//--------------------- Select By Polygon (copypasta) ---------------->
	var draw; // global so we can remove it later
	function SelectByPolygon(){
		// remove point selection
		if (typeof(select) !== "undefined") {
			select.getFeatures().item(0).setStyle(null)
			map.removeInteraction(select);
		};
		if(typeof(drawingSource) !== "undefined"){
			drawingSource.clear();
		}
		drawingSource = new ol.source.Vector(); // global, unsauber?

		var drawingLayer = new ol.layer.Vector({
				source: drawingSource,
				style: new ol.style.Style({
				fill: new ol.style.Fill({
					  color: 'rgba(191, 214, 239, 0.4)'
					}),
					stroke: new ol.style.Stroke({
					  color: '#4A74AA',
					  width: 2
					}),
					image: new ol.style.Circle({
					  radius: 70,
					  fill: new ol.style.Fill({
						color: '#000000'
					  })
					})
				})
			});
		map.addLayer(drawingLayer);

		draw = new ol.interaction.Draw({
			  source: drawingSource,
			  type: 'Polygon'
			  //geometryFunction: geometryFunction,  //Function that is called when a geometry's coordinates are updated.
			});

		draw.on('drawstart', function(e) {
			drawingSource.clear();
			});

		draw.on('drawend', function(e){
				var polygonGeometry = e.feature.getGeometry();
				selectedFeatures = []; // Array for Point Features  // global because used when timeslider changes, not safe?
				oldSelectedStreetNames = [] // Array for street names, if same amount of points are selected, but different streetnames -> redraw chart completely

				for (i = 0; i < ZaehlstellenPoints.getSource().getFeatures().length; i++){ // for every Point (zaehlstelle)...
					var pointExtent = ZaehlstellenPoints.getSource().getFeatures()[i].getGeometry().getExtent();
					if (polygonGeometry.intersectsExtent(pointExtent)==true){ //returns true when Polygon intersects with Extent of Point (= Point itself)
						selectedFeatures.push(ZaehlstellenPoints.getSource().getFeatures()[i]);
					}
				}
				createPolyChart(selectedFeatures);
			});
	map.addInteraction(draw);
	}

//------------------------ Create Charts ---------------------------->
function createPolyChart(selectedFeatures){
	// Get Sreet Names
	var selectedStreetNames = [];
		for (i = 0; i < selectedFeatures.length; i++){
			selectedStreetNames.push(selectedFeatures[i].getProperties().zaehlstelle);  // get all streetnames (= zaehlstellen) from selection
		};


	// Get corresponding Data
	var time = document.getElementById("time_slider").value;
	var currentData = zaehlstellen_data[time]; // zaehlstellen-Data from all the Features at current time
	var selectedData = [];
		for (i = 0; i < selectedStreetNames.length; i++){
			selectedData.push(currentData[selectedStreetNames[i]]); // Data from selected Streets
		};

	// get maximum of selected features at all times (to set maximum of scale)
	var dataMax = 0;
	for (var i = 0; i < selectedStreetNames.length; i++) {
		if (min_max_zaehlstelle[selectedStreetNames[i]][1] > dataMax){dataMax = min_max_zaehlstelle[selectedStreetNames[i]][1];}; // if maximum value of selected zaehlstelle is bigger than current maximum value, replace it
	}
	dataMax = Math.ceil(dataMax/1000)*1000; // round up to next 1000



	// Make Multi-Feature Chart
	// Destroy existing Chart if number of selected Elements differs
	var chartDestroyed = false;

	// JS Magic for comparing scalar arrays
	//var SameStreetNames = selectedStreetNames.length!==oldSelectedStreetNames.length && selectedStreetNames.every(function(v,i) { return v === oldSelectedStreetNames[i]});
	var SameStreetNames = selectedStreetNames.equals(oldSelectedStreetNames);
	if (myChart.id !== "myChart" && (selectedFeatures.length !== myChart.data.datasets[0].data.length || !SameStreetNames )){
		myChart.destroy();
		chartDestroyed = true;
		}
	// overwrite the old selected Street Names, so if e.g. 1 point is selected both times, but its a different point, the chart is getting destroyed and remade
	oldSelectedStreetNames = selectedStreetNames.slice() // global, not referenced

	// hide snapshot button if no point is selected (chart is invisible anyways, because no redraw)
	if (selectedFeatures.length === 0){document.getElementById("snapshot_button").style.display="none";};

	// if Chart already exists, update it with new values and labels (e.g. only time changed)
	if (myChart.id !== "myChart" && chartDestroyed == false && selectedFeatures.length !== 0){
		//alert ("update");
		myChart.labels = selectedStreetNames;
		myChart.data.datasets[0].data = selectedData;
		myChart.update();
		myChart.render();
		myChart.resize();
	}

	else if (selectedFeatures.length !== 0){	 // If Chart didnt exist before...
		var ctx = document.getElementById("myChart");
			myChart = new Chart(ctx, {  // global, unsauber?
			type: 'bar',
			data: {
				labels: selectedStreetNames,
				datasets: [{
					label: 'Traffic Amount',
					data: selectedData,
					backgroundColor: 'rgba(164, 196, 232, 0.7)',
					borderColor: 'rgba(	74, 116, 170, 0.7)',
					borderWidth: 1
				}]
			},
			options: {
				//animation : false,
				scales: {
					yAxes: [{
						ticks: {
							min: 0,
							max: dataMax,
							beginAtZero:true
						}
					}]
				}
			}
		});
	// make snapshot_button visible again
	document.getElementById("snapshot_button").style.display="block";
	}
	// make div visible if something is in it
	if (selectedFeatures.length > 0 || (typeof(snapshotArray) != "undefined" && snapshotArray.length >0)){
		document.getElementById("canvas_div").style.visibility = 'visible';
	}
};

// ---------------------------------------- Snapshot function --------------------------------------------------------------
function snapshot(){
	// create empty snapshot array
	if (typeof(snapshotArray) == "undefined"){
			snapshotArray = [];
	};

	// create array with parameters of this snapshot
	var thisSnapshot = [];
	thisSnapshot[0] = parseInt(document.getElementById("time_slider").value); // Save Current date
	thisSnapshot[1] = selectedFeatures; // Save Current Selected Features
	snapshotArray.push(thisSnapshot);

	// append row to the HTML table
	var tbl = document.getElementById('snapshot_table') // table reference
    var row = tbl.insertRow(tbl.rows.length)      // append table row
    var eyeButtonCell = row.insertCell(0);
	//var snapshotNameCell = row.insertCell(1);
	//var deleteRowButtonCell = row.insertCell(2);

	var buttonText = "Snapshot " + tbl.rows.length;
	// create button with value of index of array (of this snapshot)
	var btn = document.createElement('input');
	btn.type = "button";
	btn.className = "other_button";
	btn.setAttribute("id", "showSnapshot");
	btn.value = buttonText;
	btn.setAttribute('snapshotIndex', tbl.rows.length);
	btn.onclick = function () {showSnapshot(this.getAttribute('snapshotIndex')-1);};

	eyeButtonCell.appendChild(btn);

	document.getElementById("snapshot_div").style.visibility='visible';

};

function showSnapshot(snapshotIndex){
	updateInput(snapshotArray[snapshotIndex][0], false, false);
	createPolyChart(snapshotArray[snapshotIndex][1]);
};

function deleteSnapshots(){
	var tbl = document.getElementById('snapshot_table'), // table reference
        lastRow = tbl.rows.length - 1,             // set the last row index
        i;
    // delete rows with index greater then 0
    for (i = lastRow; i >= 0; i--) {
        tbl.deleteRow(i);
    }
snapshotArray = [];
document.getElementById("snapshot_div").style.visibility = "hidden";
}

function noBackground(){
	map.getLayers().forEach(function(layer) {
		if (layer.get('name') == 'grau') {
		  layer.setVisible(false);
		}
		if (layer.get('name') == 'ortho') {
		  layer.setVisible(false);
		}
	});
}

function viewBasemap(){
	map.getLayers().forEach(function(layer) {
		if (layer.get('name') == 'grau') {
		  layer.setVisible(true);
		}
		if (layer.get('name') == 'ortho') {
		  layer.setVisible(false);
		}
	});
}

function viewAerial(){
	map.getLayers().forEach(function(layer) {
		if (layer.get('name') == 'grau') {
		  layer.setVisible(false);
		}
		if (layer.get('name') == 'ortho') {
		  layer.setVisible(true);
		}
	});
}


/////////  TEST changing array protoype to compare (arr1.equals(arr2)) arrays, not part of a function?
Array.prototype.equals = function (array, strict) {
    if (!array)
        return false;

    if (arguments.length == 1)
        strict = true;

    if (this.length != array.length)
        return false;

    for (var i = 0; i < this.length; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!this[i].equals(array[i], strict))
                return false;
        }
        else if (strict && this[i] != array[i]) {
            return false;
        }
        else if (!strict) {
            return this.sort().equals(array.sort(), true);
        }
    }
    return true;
}


function SelectSinglePoint(){
	// remove polygon selection
	if (typeof(draw) !== "undefined") {
		map.removeInteraction(draw);
		drawingSource.clear();
	};
	select = new ol.interaction.Select(); // Interaktion
	map.addInteraction(select); // Interaktion der Karte hinzufügen

	// single point selection
	var oldStyle;
	select.on('select', function(e) {
		if(typeof(zaehlstellen_data) !== "undefined"){
			var features = select.getFeatures(); // Feature Array
			var feature = features.item(0); //  first element
			var y = parseInt(document.getElementById("time_slider").value);

			var selected = e.selected;
			var deselected = e.deselected;

			if (selected.length) {
				selected.forEach(function(feature){
					var zaehlstelle = feature.get('zaehlstelle');  // zaehlstelle = z.B. b0251
					var amount = zaehlstellen_data[y][zaehlstelle]; // amount = z.B. 1055
					//example: min_max_zaehlstelle["b02501"][1] = maximum of b02501

					//style when selected
					var color_hue = 110 - Math.round((amount/min_max_zaehlstelle[zaehlstelle][1])*110) // 110 = green, 0 = red, between = yellow
					var feature_color = 'hsl('+ color_hue +', 99%, 99%)';

					var radius_size = (Math.round((amount/min_max_zaehlstelle[zaehlstelle][1]))+1)*10;
					oldStyle = feature.getStyle();
					var style_modify = new ol.style.Style({
							image: new ol.style.Circle({
								radius: radius_size,
								fill: new ol.style.Fill({color: 'hsl('+color_hue+', 100%, 80%)'}),
								stroke: new ol.style.Stroke({color: 'hsl('+color_hue+', 100%, 50%)', width: 7})
						})
					});
					feature.setStyle(style_modify);
					});
				}
			if (deselected.length){
				deselected.forEach(function(feature){
					feature.setStyle(null);
				});
			}

			selectedFeatures = selected.length ? [feature] : []	;
			createPolyChart(selectedFeatures);
		}
	});

	// changing cursor when over Feature
	// map.on("pointermove", function (evt) {
        // var hit = this.forEachFeatureAtPixel(evt.pixel,
			// function(feature, layer) {
			// return true;
				// });
			// if (hit) {
				// this.getTarget().style.cursor = 'pointer';
				// } else {
			// this.getTarget().style.cursor = '';
			// }
	// });
};

// functon for changing Time every second
function autoPlay(){
		if (typeof(interval_handle) == "undefined"){
				interval_handle = setInterval(function(){
						changeDateOneStep(1, true); // loop = true
					}, 1000);
			document.getElementById("auto_play_button").innerHTML = "Stop &#10074; &#10074;";
		}
		else{
			clearInterval(interval_handle); // clear Interval
			delete window.interval_handle; // destroy Interval Handle
			document.getElementById("auto_play_button").innerHTML = "Auto-Play &#9658";
		}
};
