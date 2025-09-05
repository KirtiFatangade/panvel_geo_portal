import React, { useState } from 'react';
import { scaleLinear } from 'd3-scale';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { DataFilterExtension, _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import { HOST_MEDIA_URL } from './components/host';

const GOOGLE_MAPS_API_KEY = "AIzaSyCCD3BJSkrbr-Zudz0JpHV_oT_i9DxEzXE";
const TILESET_URL = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_MAPS_API_KEY}`;

const LOI_GEOJSON_URL = `${HOST_MEDIA_URL}/media/final_Scheme_/final_Scheme_/LOI.geojson`;

const loiLayer = new GeoJsonLayer({
    id: 'loi-layer',
    data: LOI_GEOJSON_URL,
    filled: true,
    stroked: true,
    lineWidthMinPixels: 1,
    getLineColor: [255, 255, 255], // White border
    getFillColor: [0, 128, 255, 150], // Blue with transparency
    pickable: true,
    getRadius: 10, // For point features
    pointRadiusMinPixels: 5,
    pointRadiusMaxPixels: 10
  });

export const COLORS = [
  [254, 235, 226],
  [251, 180, 185],
  [247, 104, 161],
  [197, 27, 138],
  [122, 1, 119]
];

const colorScale = scaleLinear().clamp(true).domain([0, 50, 100, 200, 300]).range(COLORS);

const INITIAL_VIEW_STATE = {
  latitude: 50.089,
  longitude: 14.42,
  zoom: 16,
  minZoom: 14,
  maxZoom: 16.5,
  bearing: 90,
  pitch: 60
};

const BUILDING_DATA =
  'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/google-3d-tiles/buildings.geojson';

function getTooltip({ object }) {
  return (
    object && {
      html: `\
    <div><b>Distance to nearest tree</b></div>
    <div>${object.properties.distance_to_nearest_tree}</div>
    `
    }
  );
}

const App_3D = ({ data = TILESET_URL, distance = 0, opacity = 0.2 }) => {
  const [credits, setCredits] = useState('');

  const layers = [
    new Tile3DLayer({
      id: 'custom-3d-tiles',
      data: TILESET_URL,
      loadOptions: {
        fetch: {
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      },
      operation: 'terrain+draw'
    }),
    new GeoJsonLayer({
      id: 'buildings',
      data: BUILDING_DATA,
      filled: true,
      getFillColor: [255, 0, 0],
      pickable: true
    }),
    loiLayer // Adding the new layer
  ];

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <DeckGL
        style={{ backgroundColor: '#061714' }}
        initialViewState={INITIAL_VIEW_STATE}
        controller={{ touchRotate: true, inertia: 250 }}
        layers={layers}
        getTooltip={getTooltip}
      />
      <div
        style={{
          position: 'absolute',
          left: '8px',
          bottom: '4px',
          color: 'white',
          fontSize: '10px'
        }}
      >
        {credits}
      </div>
    </div>
  );
};

export default App_3D;
