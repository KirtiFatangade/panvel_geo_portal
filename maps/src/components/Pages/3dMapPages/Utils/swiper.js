import mapboxgl from 'mapbox-gl';
import EventEmitter from 'events';

/**
 * @param {Object} map The Mapbox GL Map instance
 * @param {string} layerA The first layer ID to compare
 * @param {string} layerB The second layer ID to compare
 * @param {string|HTMLElement} container An HTML Element, or an element selector string for the compare container. It should be a wrapper around the map element.
 * @param {Object} options
 * @param {string} [options.orientation=vertical] The orientation of the compare slider. `vertical` creates a vertical slider bar to compare one layer on the left (layer A) with another layer on the right (layer B). `horizontal` creates a horizontal slider bar to compare one layer on the top (layer A) and another layer on the bottom (layer B).
 * @param {boolean} [options.mousemove=false] If `true`, the compare slider will move with the cursor; otherwise, the slider will need to be dragged to move.
 * @example
 * var compare = new mapboxgl.LayerCompare(map, 'sat-1-layer', 'sat-2-layer', '#wrapper', {
 *   orientation: 'vertical',
 *   mousemove: true
 * });
 */
class LayerCompare {
  constructor(map, layerA, layerB, container, options = {}) {
    this.options = options;
    this._map = map;
    this._layerA = layerA;
    this._layerB = layerB;
    this._horizontal = this.options.orientation === 'horizontal';
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._ev = new EventEmitter();
    this._swiper = document.createElement('div');
    this._swiper.className = this._horizontal ? 'compare-swiper-horizontal' : 'compare-swiper-vertical';
  
    // Create control container
    this._controlContainer = document.createElement('div');
    this._controlContainer.className = this._horizontal ? 'mapboxgl-compare mapboxgl-compare-horizontal' : 'mapboxgl-compare mapboxgl-compare-vertical';
    this._controlContainer.appendChild(this._swiper);
  
    if (typeof container === 'string') {
        const appendTarget = document.querySelector(container);
        if (!appendTarget) {
          throw new Error('Cannot find element with specified container selector.');
        }
        appendTarget.appendChild(this._controlContainer);
      } else if (container instanceof Element) {
        container.appendChild(this._controlContainer);
      } else {
        throw new Error('Invalid container specified. Must be CSS selector or HTML element.');
      }
  
    // Add styles directly
    const style = document.createElement('style');
    style.textContent = `
      .compare-swiper-horizontal,
      .compare-swiper-vertical {
        position: absolute;
        background: rgba(0, 0, 0, 1); /* Adjust color as needed */
        cursor: pointer;
        z-index: 2000; /* Ensure it is above other elements */
        pointer-events: auto; /* Ensure it is clickable */
      }
  
      .compare-swiper-horizontal {
        height: 100%;
        width: 10px; /* Adjust width as needed */
        top: 0;
        left: 50%;
      }
  
      .compare-swiper-vertical {
        width: 100%;
        height: 10px; /* Adjust height as needed */
        top: 50%;
        left: 0;
      }
  
      .mapboxgl-compare {
        position: absolute;
        pointer-events: auto; /* Ensure the control container is clickable */
      }
  
      .mapboxgl-compare-horizontal {
        height: 100%;
        width: 100%;
      }
  
      .mapboxgl-compare-vertical {
        height: 100%;
        width: 100%;
      }
    `;
    document.head.appendChild(style);
    
    console.log(map.getSource(this._layerA))
    console.log(map.getSource(this._layerA)._options.bounds)
    

    this._bounds = map.getContainer().getBoundingClientRect();
    const swiperPosition = (this._horizontal ? this._bounds.height : this._bounds.width) / 2;
    console.log(swiperPosition)
    // this._setPosition(swiperPosition);

    this._onResize = () => {
      this._bounds = map.getContainer().getBoundingClientRect();
      if (this.currentPosition) this._setPosition(this.currentPosition);
    };

    map.on('resize', this._onResize);

    // if (this.options.mousemove) {
    //   map.getContainer().addEventListener('mousemove', this._onMove);
    // }

    this._swiper.addEventListener('mousedown', this._onDown);
    this._swiper.addEventListener('touchstart', this._onDown);
  }

  _setPointerEvents(v) {
    this._controlContainer.style.pointerEvents = v;
    this._swiper.style.pointerEvents = v;
  }

  _onDown(e) {
    console.log(e)
    if (e.touches) {
      document.addEventListener('touchmove', this._onMove);
      document.addEventListener('touchend', this._onTouchEnd);
    } else {
      document.addEventListener('mousemove', this._onMove);
      document.addEventListener('mouseup', this._onMouseUp);
    }
  }
  _getLatLngBounds() {
    // Get the bounds in pixels
    var topLeft = this._map.unproject([0, 0]);
    var bottomRight = this._map.unproject([this._bounds.width, this._bounds.height]);
  
    return {
      north: topLeft.lat,
      south: bottomRight.lat,
      west: topLeft.lng,
      east: bottomRight.lng
    };
  }
  _setPosition(x) {
    console.log(x)
    x = Math.min(x, this._horizontal ? this._bounds.height : this._bounds.width);

    // Update the control container position
    // var pos = this._horizontal ? 'translate(0, ' + x + 'px)' : 'translate(' + x + 'px, 0)';
    // this._controlContainer.style.transform = pos;
    // this._controlContainer.style.WebkitTransform = pos;
  
    // Get latitude and longitude bounds
    var bounds = this._getLatLngBounds();
    console.log(bounds)
    var swiperPosition;
    let clipA=null
    let clipB=null
    if (this._horizontal) {
        // Horizontal orientation
        swiperPosition = (x / this._bounds.height) * (bounds.north - bounds.south) + bounds.south;
        clipA = [bounds.west, bounds.south,(bounds.east+bounds.west)/2,bounds.north ]; // Top-left to swiper position
        clipB = [(bounds.east+bounds.west)/2, bounds.south, bounds.east, bounds.north]; // Swiper position to bottom-right
      } else {
        // Vertical orientation
        swiperPosition = (x / this._bounds.width) * (bounds.east - bounds.west) + bounds.west;
        clipA = [bounds.north, bounds.west, bounds.south, swiperPosition]; // Top-left to swiper position
        clipB = [bounds.north, swiperPosition, bounds.south, bounds.east]; // Swiper position to bottom-right
      }
    console.log(clipA,clipB)
    this._map.getSource(this._layerA)._options.bounds=clipA
    this._map.getSource(this._layerB)._options.bounds=clipB
    console.log("changed",this._map.getSource(this._layerA)._options.bounds,this._map.getSource(this._layerB)._options.bounds)
    // this._map.setPaintProperty(this._layerA, 'raster-opacity', 1);
    // this._map.setPaintProperty(this._layerB, 'raster-opacity', 1);
    // this._map.getLayer(this._layerA).implementation = { clip: clipA };
    // this._map.getLayer(this._layerB).implementation = { clip: clipB };


    this.currentPosition = x;
  }

  _onMove(e) {
    if (this.options.mousemove) {
        console.log("called")
      this._setPointerEvents(e.touches ? 'auto' : 'none');
    }
    this._horizontal ? this._setPosition(this._getY(e)) : this._setPosition(this._getX(e));
  }

  _onMouseUp() {
    document.removeEventListener('mousemove', this._onMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.fire('slideend', { currentPosition: this.currentPosition });
  }

  _onTouchEnd() {
    document.removeEventListener('touchmove', this._onMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    this.fire('slideend', { currentPosition: this.currentPosition });
  }

  _getX(e) {
    e = e.touches ? e.touches[0] : e;
    let x = e.clientX - this._bounds.left;
    if (x < 0) x = 0;
    if (x > this._bounds.width) x = this._bounds.width;
    return x;
  }

  _getY(e) {
    e = e.touches ? e.touches[0] : e;
    let y = e.clientY - this._bounds.top;
    if (y < 0) y = 0;
    if (y > this._bounds.height) y = this._bounds.height;
    return y;
  }

  setSlider(x) {
    this._setPosition(x);
  }

  on(type, fn) {
    this._ev.on(type, fn);
    return this;
  }

  fire(type, data) {
    this._ev.emit(type, data);
    return this;
  }

  off(type, fn) {
    this._ev.removeListener(type, fn);
    return this;
  }

  remove() {
    this._map.off('resize', this._onResize);
    const mapContainer = this._map.getContainer();

    if (mapContainer) {
      mapContainer.style.clip = null;
      mapContainer.removeEventListener('mousemove', this._onMove);
    }

    this._swiper.removeEventListener('mousedown', this._onDown);
    this._swiper.removeEventListener('touchstart', this._onDown);
    this._controlContainer.remove();
  }
}

export default LayerCompare;
