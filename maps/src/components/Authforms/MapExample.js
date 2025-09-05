import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

const MapboxExample = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();

  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1Ijoia2lydGkwNjAyIiwiYSI6ImNtMHFidnpzdDA5b3MyaXNjaDJiamR1Z3AifQ.oyzGA_HN2lLKzsA7cB-D4w";

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/standard-satellite",
      center: [ 20.0667 , 78.7553],
      zoom:1,
      projection:"globe"
    });
    mapRef.current.on('load', () => {
      mapRef.current.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
    });

    return () => {
      mapRef.current.remove();
    };
  }, []);

  return (
    <div
      style={{ backgroundColor:'#0a0f2c', height: "100%", width: "100%" }}
      ref={mapContainerRef}
      className="map-container"
    />
  );
};

export default MapboxExample;
