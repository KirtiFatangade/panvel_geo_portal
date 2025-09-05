import React, { useEffect, useContext, useState, useRef } from 'react';
import M from 'mapbox-gl';
import { Map } from './Utils/Box/mapbox.d.ts';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import ElevationProfile from './elevationProfile';
import SphericalController from '../../Main/sphericalCont';
import Sidebar from '../../Main/sidebar';
import { GlobalContext } from '../../../App';
import MapboxLayerCont from './MapboxLayerCont';
import { lineChunk } from '@turf/turf';
import "./3dMapbox.css";
import Tools from '../../Main/Tools/Tools';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import MapBoxbaseLayer from './MapBoxbaseLayer';
import Chatbot from '../../Main/Chatbot';
import files from '../../static';
import LayerCompare from './Utils/swiper';
// import "../../../mapbox-gl-js/dist/mapbox-gl-dev.js"


class ChatbotControl {
  constructor({ onChatbotOpen }) {
    this._onChatbotOpen = onChatbotOpen;
  }

  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.style.position = 'absolute';
    this._container.style.top = '400px';
    this._container.style.right = '10px';
    this._container.innerHTML = `
            <div class="btn-light chatbot-btn" style="position: relative;">
              <img src="${process.env.PUBLIC_URL}/${files}chatbot.png" style="width: 40px; height: 40px; border-radius: 50%; z-index: 1000;" />
              <div id="chatbot-prompt" class="chatbot-prompt" style="position: absolute; left: -110px; top: -18px;">Ask me something</div>
            </div>`;

    this._container.onclick = () => this._openChatbot();
    setTimeout(() => {
      const prompt = document.getElementById('chatbot-prompt');
      if (prompt) {
        prompt.parentNode.removeChild(prompt);
      }
    }, 5000);
    return this._container;
  }

  onRemove() {
    if (this._container) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = undefined;
  }

  _openChatbot() {
    this._onChatbotOpen();
  }
}



const MapBox = () => {
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [elevationData, setElevationData] = useState([]);
  const [showElevationProfile, setShowElevationProfile] = useState(false);
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [showBaseLayerControl, setShowBaseLayerControl] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [idFetch, setId] = useState(null);
  const beforeMapContainerRef = useRef();
  const afterMapContainerRef = useRef();
  const comparisonContainerRef = useRef();
  const drawRef = useRef(null);
  const { mapBox, SetMapBox, mapBoxContainerRef } = useContext(GlobalContext);

  useEffect(() => {

    M.accessToken = 'pk.eyJ1IjoiYW1pdGt1bWFyLTEyIiwiYSI6ImNseW9ueGcwcTBpajAya3M0d285MnFjZG8ifQ.77ir_rO2wC6Gb1LyVOUcLw';

    if (!mapBox) {
      const initializeMap = new M.Map({
        container: mapBoxContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [77.2090, 28.6139],
        projection: 'globe',
        zoom: 3,
        pitch: 0,
        bearing: 0
      });

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          line_string: true,
          point: true,
          trash: true
        }
      });
      drawRef.current = draw;

      const geocoder = new MapboxGeocoder({
        accessToken: M.accessToken,
        mapboxgl: M,
        marker: false,
        placeholder: 'Search for places',
        proximity: { longitude: 77.2090, latitude: 28.6139 }
      });
      initializeMap.addControl(geocoder, 'top-right');
      initializeMap.addControl(new M.NavigationControl(), 'top-right');
      initializeMap.addControl(draw);

      initializeMap.on('load', () => {
        initializeMap.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 15
        });
        initializeMap.setTerrain({ source: 'mapbox-dem', exaggeration: 1.75 });


        // fetch(`${HOST_MEDIA_URL}/media/dummy.geojson`)
        // .then(response => response.json())
        // .then(geojsonData => {
        //   initializeMap.addSource('buildings', {
        //     type: 'geojson',
        //     data: geojsonData
        //   });

        initializeMap.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': [
              'case',
              ['==', ['get', 'floorstatus'], 'authorized'], '#4CAF50',
              ['==', ['get', 'floorstatus'], 'unauthorized'], '#FF5733',
              '#aaa'
            ],
            'fill-extrusion-height': ['interpolate',['linear'],['zoom'], 15, 0, 15.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate',['linear'],['zoom'],15, 0, 15.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 1
          },
          'layout': { 'visibility': 'none' }
        });

        initializeMap.addControl(new ChatbotControl({ onChatbotOpen: () => setShowChatbot(true) }), 'top-right');

        // addLegend();

      });

      initializeMap.on('error', (e) => {
        console.error('Map error:', e);
      });

      initializeMap.on('draw.create', updateArea);
      initializeMap.on('draw.delete', updateArea);
      initializeMap.on('draw.update', updateArea);

      initializeMap.on('click', '3d-buildings', (e) => {
        const features = initializeMap.queryRenderedFeatures(e.point, {
          layers: ['3d-buildings']
        });

        if (features.length) {
          features.forEach((feature) => {
            const buildingId = feature.id;
            const coordinates = feature.geometry.coordinates;
            feature.properties.height = 36;
            const { height, min_height, floor_status = [] } = feature.properties;

            console.log("Building ID:", buildingId);
            console.log("Coordinates:", coordinates);

            if (initializeMap.getSource(`highlighted-building-${buildingId}`)) {
              initializeMap.removeLayer(`highlighted-building-${buildingId}`);
              initializeMap.removeSource(`highlighted-building-${buildingId}`);
            }

            initializeMap.addSource(`highlighted-building-${buildingId}`, {
              type: 'geojson',
              data: feature
            });

            const num_floors = 3

            const floor_details = floor_status.length
              ? floor_status
              : Array.from({ length: num_floors }, (_, i) => ({
                floor: i + 1,
                status: i % 2 === 0 ? "unauthorized" : "authorized",
              }));

            console.log("Floor details:", floor_details);

            floor_details.forEach((floor, index) => {
              const floorMinHeight = index * 4;
              const floorMaxHeight = floorMinHeight + 3;

              initializeMap.addLayer({
                id: `floor-${buildingId}-${index + 1}`,
                source: `highlighted-building-${buildingId}`,
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                  'fill-extrusion-color': floor.status === 'authorized' ? '#4CAF50' : '#FF5733',
                  'fill-extrusion-height': ['literal', floorMaxHeight],
                  'fill-extrusion-base': ['literal', floorMinHeight],
                  'fill-extrusion-opacity': 0.9
                }
              });
              
            });

            const popupContent = `
                    <ul style="list-style-type: none; padding: 0; margin: 0;">
                        <li><strong>Building ID:</strong> ${buildingId}</li>
                        <li><strong>Height:</strong> ${height}</li>
                        <li><strong>Minimum Height:</strong> ${min_height}</li>
                        <h4>Floor Status</h4>
                        <ul>${floor_details.map(f => `<li>Floor ${f.floor}: <b>${f.status}</b></li>`).join("")}</ul>
                    </ul>
                `;

            new M.Popup()
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(initializeMap);
          });
        }
      });


      // function addLegend() {
      //   const legend = document.createElement("div");
      //   legend.id = "legend";
      //   legend.style.position = "absolute";
      //   legend.style.bottom = "10px";
      //   legend.style.right = "10px";
      //   legend.style.background = "white";
      //   legend.style.padding = "10px";
      //   legend.style.fontSize = "14px";
      //   legend.style.borderRadius = "5px";
      //   legend.style.boxShadow = "0px 0px 5px rgba(0,0,0,0.3)";

      //   legend.innerHTML = `
      //     <strong>Building Status</strong>
      //     <div style="display: flex; align-items: center; margin-top: 5px;">
      //       <div style="width: 20px; height: 20px; background: green; margin-right: 5px;"></div> Authorized
      //     </div>
      //     <div style="display: flex; align-items: center; margin-top: 5px;">
      //       <div style="width: 20px; height: 20px; background: red; margin-right: 5px;"></div> Unauthorized
      //     </div>
      //   `;

      //   document.body.appendChild(legend);
      // }

      SetMapBox(initializeMap);
    }

    return () => {
      if (mapBox) {
        mapBox.remove();
      }
    };
  }, [mapBox, mapBoxContainerRef, SetMapBox]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'R' || event.key === 'r') {
        event.preventDefault();
        if (mapBox) {
          mapBox.setPitch(90);
          mapBox.setBearing(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mapBox]);

  const toggleBuildings = () => {
    if (mapBox) {
      const visibility = mapBox.getLayoutProperty('3d-buildings', 'visibility');
      if (visibility === 'visible') {
        mapBox.setLayoutProperty('3d-buildings', 'visibility', 'none');
        setShow3DBuildings(false);
      } else {
        mapBox.setLayoutProperty('3d-buildings', 'visibility', 'visible');
        setShow3DBuildings(true);
      }
    }
  };

  const updateArea = async () => {
    const data = drawRef.current?.getAll();
    if (data && data.features.length > 0) {
      const lastFeature = data.features[data.features.length - 1];
      if (lastFeature.geometry.type === 'LineString') {
        let chunks = lineChunk(lastFeature, 10).features;
        const elevationData = await Promise.all(
          chunks.map(async (feature, index) => {
            const lat = feature.geometry.coordinates[0][1];
            const lng = feature.geometry.coordinates[0][0];
            console.log("Coordinates:", lat, lng);
            try {
              const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
              const result = await response.json();
              console.log('result', result);

              if (response.ok) {
                return {
                  index,
                  elevation: result["results"][0]["elevation"],
                  longitude: lng,
                  latitude: lat,
                };
              } else {
                throw new Error("Invalid response format or empty elevation data");
              }
            } catch (error) {
              // console.error('Error fetching elevation data:', error);
              return null;
            }
          })
        );
        const validElevationData = elevationData.filter(d => d !== null);
        setElevationData(validElevationData);
      }
    }
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const toggleElevationProfile = () => setShowElevationProfile(prev => !prev);
  const toggleLayerControl = () => setShowLayerControl(prev => !prev);
  const toggleBaseLayerControl = () => setShowBaseLayerControl(prev => !prev);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={toggleSidebar}
        style={{
          height: '40px',
          width: '40px',
          zIndex: '900',
          position: "absolute",
          top: "10px",
          left: "10px",
          borderRadius: "100%",
          border: "none",
          backgroundColor: "rgb(37, 150, 190)",
          color: 'rgb(255, 255, 255)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-label="Open sidebar"
      >
        <i className="fas fa-bars"></i>
      </button>

      <button
        onClick={toggleLayerControl}
        title='Layer Control'
        className='layer-control'
        style={{
          position: 'absolute',
          zIndex: 1000,
          top: '295px',
          right: '7px'
        }}
      >
        <i className="fa-solid fa-layer-group"></i>
      </button>

      <button
        onClick={toggleBaseLayerControl}
        title='Base Layer Control'
        className='base-layer-control'
        style={{
          position: 'absolute',
          zIndex: 1000,
          top: '350px',
          right: '7px'
        }}
      >
        <i className="fas fa-map"></i>
      </button>
      {showBaseLayerControl && <MapBoxbaseLayer mapBox={mapBox} onClose={toggleBaseLayerControl} />}
      {showChatbot && (
        <div className="chatbot-window" style={{ position: 'absolute', zIndex: '1000', top: '45%', left: '50%', boxShadow: '1px 5px 10px 8px #383838', transform: 'translate(-50%, -50%)' }}>
          <Chatbot id={idFetch} setShowChatbot={setShowChatbot} />
        </div>
      )}

      <Sidebar />

      {showLayerControl && <MapboxLayerCont mapBox={mapBox} onClose={toggleLayerControl} />}

      <div ref={mapBoxContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }}></div>
      {mapBox && <SphericalController map={mapBox} />}

      {showElevationProfile && <ElevationProfile elevationData={elevationData} />}

      <Tools toggleBuildings={toggleBuildings} toggleElevationProfile={toggleElevationProfile} />

    </div>

  );
};

export default MapBox;