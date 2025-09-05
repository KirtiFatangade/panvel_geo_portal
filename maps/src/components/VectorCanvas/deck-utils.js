import * as L from 'leaflet';
import { Deck,OrbitView } from '@deck.gl/core';
import { MapView } from '@deck.gl/core';
import { GeoJsonLayer,TextLayer } from '@deck.gl/layers';
import {TileLayer} from '@deck.gl/geo-layers';
import {BitmapLayer} from '@deck.gl/layers';
import {_WMSLayer as WMSLayer} from '@deck.gl/geo-layers';
import {Tile3DLayer} from '@deck.gl/geo-layers';
import {CesiumIonLoader} from '@loaders.gl/3d-tiles';
/** @typedef {import('@deck.gl/core/lib/deck').DeckProps} DeckProps */
/** @typedef {import('@deck.gl/core/lib/deck').ViewStateProps} ViewStateProps */

/**
 * @param {L.Map} map
 * @returns {ViewStateProps}
 */

function getViewState(map,angle=0,bearing=0) {
  return {
    longitude: map.getCenter().lng,
    latitude: map.getCenter().lat,
    zoom: map.getZoom() -1,
    pitch: angle,
    bearing: bearing
  };
}

/**
 * @param {L.Map} map
 * @param {HTMLElement} container
 * @param {Deck} deck
 * @param {DeckProps} props
 * @returns {Deck}
 */


export function createDeckInstance(map, container, deck) {
  if (!deck) {
    const viewState = getViewState(map);
    // const layer = new TileLayer({
    //   id: 'THREED',
    //   data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
    //   maxZoom: 19,
    //   minZoom: 0,
      
    //   renderSubLayers: props => {
    //     const {boundingBox} = props.tile;
    
    //     return new BitmapLayer(props, {
    //       data: null,
    //       image: props.data,
    //       bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
    //     });
    //   },
    //   pickable: true
    // });
    // layer.visible=false

    deck = new Deck({
        views: [
                new MapView({
                  repeat: true,
                  // orthographic:true
                })
              ],
      parent: container,
      controller: false,
      style: { zIndex: '2005' },
      viewState:viewState,
      // layers: [layer],
      glOptions: {
        preserveDrawingBuffer: true  
      },
      layerFilter: ({layer, viewport}) => {
        if (layer.visible) {
          return true;
        }
        return false;
      },
      
    });
  }
  return deck;
}

/**
 * @param {Deck} deck
 * @param {L.Map} map
 */
export function updateDeckView(deck, map,angle=0,bearing=0) {
  const viewState = getViewState(map,angle,bearing);
  // console.log(viewState);

  deck.setProps({ viewState });
  deck.redraw(true);
  
}
