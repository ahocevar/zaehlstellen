	
	//------------ Funktion initMap() für die Karte--------------------------------------------------------------------- -->
		var map;
		var viewpoint;
	
		function initMap() {	
			map = new ol.Map({target: "map"});

			var background = new ol.layer.Tile({
				source: new ol.source.OSM()
			});
			
			map.addLayer(background);
			
			viewpoint = new ol.View({ center: ol.proj.fromLonLat([14.82719, 47.21595]), zoom: 9 });	
			map.setView(viewpoint);	

			//vectorLayer = new ol.layer.Vector({
			//	source: new ol.source.Vector()
			//});
			add_zaehlstellen(); // adds the Points of Zählstellen			
		}
			
//---- Zählstellenpunkte für Karte --------------------------------------------------------------------------->
function add_zaehlstellen()	
		{		
			ZaehlstellenPoints = new ol.layer.Vector({
				source: new ol.source.Vector({
					url: "http://robertorthofer.github.io/zaehlstellen/test_coords.json",
					format: new ol.format.GeoJSON()
					}),
				style: function(feature, resolution){ 
					var geom = feature.getGeometry().getType();
					var zaehlstelle = feature.values_.zaehlstelle; 
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
		}
//------- Change Style of Points according to Value of Zählstelle --------->
	function updateStyle(y){  // y = integer of current day

		ZaehlstellenPoints.setStyle(function(feature, resolution){
			var geom = feature.getGeometry().getType();  // geom = point
			var zaehlstelle = feature.values_.zaehlstelle;  // zaehlstelle = z.B. b0251
			var amount = zaehlstellen_data[y][zaehlstelle]; // amount = z.B. 1055

			var color_hue = 110 - Math.round((amount/max_amount)*110) // 110 = green, 0 = red, yellow = yellow
			var feature_color = 'hsl('+ color_hue +', 99%, 99%)';

				var styles = {
					'Point': [new ol.style.Style({
						image: new ol.style.Circle({
							radius: 15,
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
		var dropZone = document.getElementById('drop_zone');
		dropZone.addEventListener('dragover', handleDragOver, false);
		dropZone.addEventListener('drop', handleFileSelect, false);
	}
	
	//---------- Get File Reference ---------->
	function handleFileSelect(evt) {
			evt.stopPropagation();
			evt.preventDefault();

		var files = evt.dataTransfer.files; // FileList object.

			// files is a FileList of File objects. List some properties.
			var output = [];
		//for (var i = 0, f; f = files[i]; i++) {
			f = files[0];
			output.push('<li><strong>', escape(f.name), '</strong>  - ',
			f.size, ' bytes, last modified: ',
			f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a','</li>');
					
			var reader = new FileReader(); // to read the FileList object
			reader.onload = function(event){  // Reader ist asynchron, wenn reader mit operation fertig ist, soll das hier (JSON.parse) ausgeführt werden, sonst ist es noch 
null				
				zaehlstellen_data = JSON.parse(reader.result);  // global, unsauber?
				init_timeslider(zaehlstellen_data);
				find_dataRange(zaehlstellen_data);
			};
			reader.readAsText(f);	
		//}
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
		document.getElementById("sliderDiv").style.display= 'block';		
		changeRange(data.length-1);
	}
	//---------- Button one step left/right ---------->
	function changeDateOneStep(step){    // takes -1 or 1 from left/right-Buttons and updates the current Date
		var x = document.getElementById("time_slider").value;
		var y = parseInt(x) + parseInt(step);
		document.getElementById("time_slider").value = y;
		updateInput(y);
	}
	//---------- Find min and max Data Values for Visualization ---------->
	function find_dataRange(data){
		min_amount = Infinity;
		max_amount = -Infinity;
		
		for (i = 1; i < data.length; i++) {  // loops through dates (i=0 would be streetname)
			var arr = Object.keys( data[i] ).map(function ( key ) { return data[i][key]; });  // creates array of Values
			arr.shift(); // removes first item of arr, which is name of Column (string)
			var min_temp = Math.min.apply( null, arr );  // min and max of current date
			var max_temp = Math.max.apply( null, arr );
			
			if (min_temp < min_amount) {min_amount = min_temp}; 
			if (max_temp > max_amount) {max_amount = max_temp};
		}
		//alert('minimum Value: ' + min_amount + '   maximum Value: ' + max_amount);
		updateInput(0); // initiate timeslider to first day of data 
		document.getElementById("time_slider").value = 0;
	}
	
	//---- Update des Timeslider  ----------------->
		// Set max of Timeslider -->
	function changeRange(dataRange) {
		document.getElementById("time_slider").setAttribute("max", dataRange);
	}
		//  Update of Shown Value   -->
	function updateInput(val) {
		var currentDate = zaehlstellen_data[val].datum;
		document.getElementById('currentDate').innerHTML=currentDate; 
		updateStyle(val);
	}
