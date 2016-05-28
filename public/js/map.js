  /**
  * @param mapFraction (float): 0.0 to 1.0 ; example: 0.6 means 40% of the map is covered by the sidebar, 60% by the map
  */
  function setBoundsLeftSidebar(points, mapFraction) {
    // first we want to know min and max longitude
    var max = -180;
    var min = 180;
    // We make bounds.  The bounds are the markers + an extra point on the left (we will give it a latitude of point 0), see later
    var bounds = new google.maps.LatLngBounds();
    for (var i=0; i<points.length; i++) {
    	if(points[i][1] > max) {
    		max = points[i][1];
    	}
    	if(points[i][1] < min) {
    		min = points[i][1];
    	}
    	bounds.extend(new google.maps.LatLng(points[i][0], points[i][1]));
    }
    // So now we have min and max.  
    // we add a point to the left of min
    var widthTotal = (max - min) / mapFraction;
    var pointExtremeLeft = max - widthTotal;
    bounds.extend(new google.maps.LatLng(points[0][0], pointExtremeLeft));
    map.fitBounds(bounds);
}