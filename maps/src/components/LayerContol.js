import { Control } from "leaflet";
import * as Util from "leaflet/src/core/Util";
import * as DomEvent from "leaflet/src/dom/DomEvent";
import * as DomUtil from "leaflet/src/dom/DomUtil";
import files from "./static";
import eventEmitter from "./eventEmitter";
// import { colorsList } from './Main/Actions/satStatic';
export var Layers = Control.extend({
  // @section
  // @aka Control.Layers options
  options: {
    // @option collapsed: Boolean = true
    // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
    collapsed: true,
    position: "topright",

    // @option autoZIndex: Boolean = true
    // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
    autoZIndex: true,

    // @option hideSingleBase: Boolean = false
    // If `true`, the base layers in the control will be hidden when there is only one.
    hideSingleBase: false,

    // @option sortLayers: Boolean = false
    // Whether to sort the layers. When `false`, layers will keep the order
    // in which they were added to the control.
    sortLayers: false,

    // @option sortFunction: Function = *
    // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
    // that will be used for sorting the layers, when `sortLayers` is `true`.
    // The function receives both the `L.Layer` instances and their names, as in
    // `sortFunction(layerA, layerB, nameA, nameB)`.
    // By default, it sorts layers alphabetically by their name.
    sortFunction: function (layerA, layerB, nameA, nameB) {
      return nameA < nameB ? -1 : nameB < nameA ? 1 : 0;
    },
  },

  initialize: function (baseLayers, overlays, options) {
    Util.setOptions(this, options);
    this._layerControlInputs = [];
    this._layers = [];
    this._lastZIndex = 0;
    this._handlingClick = false;
    this._preventClick = false;
    this.vector_att = {};
    this.vector_grad = {};
    for (var i in baseLayers) {
      this._addLayer(baseLayers[i], i);
    }

    for (i in overlays) {
      this._addLayer(overlays[i], i, true);
    }
  },

  onAdd: function (map) {
    this._initLayout();
    this._update();

    this._map = map;
    map.on("zoomend", this._checkDisabledLayers, this);

    for (var i = 0; i < this._layers.length; i++) {
      this._layers[i].layer.on("add remove", this._onLayerChange, this);
    }

    return this._container;
  },

  addTo: function (map) {
    Control.prototype.addTo.call(this, map);
    // Trigger expand after Layers Control has been inserted into DOM so that is now has an actual height.
    return this._expandIfNotCollapsed();
  },

  onRemove: function () {
    this._map.off("zoomend", this._checkDisabledLayers, this);

    for (var i = 0; i < this._layers.length; i++) {
      this._layers[i].layer.off("add remove", this._onLayerChange, this);
    }
  },

  // @method addBaseLayer(layer: Layer, name: String): this
  // Adds a base layer (radio button entry) with the given name to the control.
  addBaseLayer: function (layer, name) {
    this._addLayer(layer, name);
    return this._map ? this._update() : this;
  },

  // @method addOverlay(layer: Layer, name: String): this
  // Adds an overlay (checkbox entry) with the given name to the control.
  addOverlay: function (
    layer,
    name,
    zoom = false,
    zoomto = null,
    upload = null,
    orgname = null,
    draw = null,
    id = null,
    tableOnly = false
  ) {
    this._addLayer(
      layer,
      name,
      true,
      zoom,
      zoomto,
      upload,
      orgname,
      draw,
      id,
      tableOnly
    );
    return this._map ? this._update() : this;
  },

  // @method removeLayer(layer: Layer): this
  // Remove the given layer from the control.
  removeLayer: function (layer, obj = null, send = false) {
    if (obj) {
      console.log(obj.id);
      this._map.fire("decklayercross", { name: obj.orgname, id: obj.id });
      this._layers.forEach((ele, index) => {
        if (ele["orgname"] === obj.orgname) {
          this._layers.splice(index, 1);
        }
      });
    } else {
      layer.off("add remove", this._onLayerChange, this);
      var obj = this._getLayer(Util.stamp(layer));

      if (obj) {
        this._layers.splice(this._layers.indexOf(obj), 1);
      }
      if (this._map.hasLayer(layer)) {
        if (obj.draw && !send) {
          this._map.fire("draw:deleted", { layers: [layer, obj.id] });
        }
        layer.remove();
        this._expandIfNotCollapsed();
        obj.send = true;
        this._map.fire("overlayremove", obj);
		window.dispatchEvent(new Event("layersCleared")); 
      }
    }
    return this._map ? this._update() : this;
  },

  // @method expand(): this
  // Expand the control container if collapsed.

  expand: function () {
    DomUtil.addClass(this._container, "leaflet-control-layers-expanded");
    this._section.style.height = null;
    var acceptableHeight = 250; //Control the height of the layer control
    if (acceptableHeight < this._section.clientHeight) {
      DomUtil.addClass(this._section, "leaflet-control-layers-scrollbar");
      this._section.style.height = acceptableHeight + "px";
      this._section.style.width =
        this.options.type === "Basemap" ? "210px" : "300px";
      this._section.style.position = "static";
    } else {
      DomUtil.removeClass(this._section, "leaflet-control-layers-scrollbar");
    }
    DomEvent.off(this._container, "click", this._expandSafely, this);
    this._checkDisabledLayers();
    document.addEventListener("click", this._closeOutside.bind(this));
    return this;
  },

  // @method collapse(): this
  // Collapse the control container if expanded.
  collapse: function () {
    DomUtil.removeClass(this._container, "leaflet-control-layers-expanded");
    DomEvent.on(
      this._container,
      {
        click: this._expandSafely,
      },
      this
    );
    document.removeEventListener("click", this._closeOutside.bind(this));
    return this;
  },

  _closeOutside: function (event) {
    if (!this._container.contains(event.target)) {
      this.collapse();
    }
  },

  _initLayout: function () {
    let rAdd = false;
    var className = "leaflet-control-layers",
      container = (this._container = DomUtil.create("div", className)),
      collapsed = this.options.collapsed;
    // makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute("aria-haspopup", true);

    DomEvent.disableClickPropagation(container);
    DomEvent.disableScrollPropagation(container);

    var section = (this._section = DomUtil.create(
      "section",
      className + "-list"
    ));
    // Create the remove button
    var removeButton = document.createElement("button");
    removeButton.innerHTML = "&times;";
    removeButton.style.cssText =
      "cursor: pointer; color: white; z-index: 1000; border: none; background-color: transparent; font-size: 18px; padding: 2px; margin-left: auto;"; // Align to the right
    var that = this;
    removeButton.onclick = function () {
      if (
        DomUtil.hasClass(that._container, "leaflet-control-layers-expanded")
      ) {
        DomUtil.removeClass(that._container, "leaflet-control-layers-expanded");
      } else {
        DomUtil.addClass(that._container, "leaflet-control-layers-expanded");
      }
    };
    this._removeButton = removeButton;

    if (this.options.type === "Overlay") {
      // Create a flex container div
      var buttonContainer = document.createElement("div");
      buttonContainer.style.cssText =
        "display: flex; align-items: center; width: 100%;"; // Flexbox styles

      // First Button
      var AddButton1 = document.createElement("button");
      AddButton1.title = "Migrate Layers to Project";
      // AddButton1.innerHTML = '<i class="fa-solid fa-person-walking"></i>';
      AddButton1.innerHTML = "Migrate";
      AddButton1.style.cssText =
        "cursor: pointer; color: white; z-index: 1000; border: none; font-size: 12px; padding: 3px 10px; background: rgb(43, 83, 128);"; // Smaller size and transparent background
      AddButton1.onclick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        const event = new CustomEvent("migrate-layer", {
          detail: this._layers.filter((layer) => layer.id !== null),
        });
        document.dispatchEvent(event);
      };

      this.slider_value = true;
      var sliderContainer = document.createElement("div");
      sliderContainer.style.cssText = "display: flex; align-items: center;";
      sliderContainer.title = "Select All Layers";

      var sliderToggleLabel = document.createElement("label");
      sliderToggleLabel.className = "custom-switch";

      var sliderToggle = document.createElement("input");
      sliderToggle.type = "checkbox";
      sliderToggle.checked = true;
      sliderToggle.style.display = "none";
      var sliderSpan = document.createElement("span");
      sliderSpan.className = "custom-slider round on";

      sliderToggleLabel.appendChild(sliderToggle);
      sliderToggleLabel.appendChild(sliderSpan);

      sliderToggle.onclick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        clickEvent.stopImmediatePropagation();
        this.slider_value = !this.slider_value;
        var inputs = this._layerControlInputs,
          input,
          layer;
        if (this.slider_value) {
          if (!DomUtil.hasClass(sliderSpan, "on")) {
            DomUtil.addClass(sliderSpan, "on");
          }

          var addedLayers = [];
          for (var i = inputs.length - 1; i >= 0; i--) {
            input = inputs[i];
            layer =
              input.ltype === "deck"
                ? input.lname
                : this._getLayer(input.layerId).layer;
            input.ltype === "deck"
              ? this._map.fire("decklayeradd", {
                  id: layer,
                  name: input.orgname,
                })
              : addedLayers.push(layer);
            input.checked = true;
          }
          for (i = 0; i < addedLayers.length; i++) {
            if (!this._map.hasLayer(addedLayers[i])) {
              this._map.addLayer(addedLayers[i]);
            }
          }
        } else {
          if (DomUtil.hasClass(sliderSpan, "on")) {
            DomUtil.removeClass(sliderSpan, "on");
          }

          var removedLayers = [];
          for (var i = inputs.length - 1; i >= 0; i--) {
            input = inputs[i];
            layer =
              input.ltype === "deck"
                ? input.lname
                : this._getLayer(input.layerId).layer;
            input.ltype === "deck"
              ? this._map.fire("decklayerremove", {
                  id: layer,
                  name: input.orgname,
                })
              : removedLayers.push(layer);
            input.checked = false;
          }
          for (i = 0; i < removedLayers.length; i++) {
            if (this._map.hasLayer(removedLayers[i])) {
              this._map.removeLayer(removedLayers[i]);
            }
          }
        }
      };

      sliderContainer.appendChild(sliderToggleLabel);

      buttonContainer.appendChild(sliderContainer);

      buttonContainer.appendChild(AddButton1);

      buttonContainer.appendChild(removeButton);

      // Append the flex container to the section
      section.appendChild(buttonContainer);
    }

    var link = (this._layersLink = DomUtil.create(
      "a",
      className + "-toggle",
      container
    ));
    link.href = "#";
    if (this.options.type === "Basemap") {
      link.title = "Basemaps";
      rAdd = false;
    } else {
      link.title = "Overlays";
      rAdd = true;
    }

    link.setAttribute("role", "button");
    if (this.options.type === "Overlay") {
      if (this.options.type === "Overlay") {
        fetch(`${process.env.PUBLIC_URL}/${files}layers.svg`)
          .then((response) => response.text())
          .then((svgData) => {
            const svgElement = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">${svgData}</svg>`;
            link.innerHTML = svgElement;
            link.style.backgroundImage = "none";
          })
          .catch((error) => {
            console.error("Error fetching SVG file:", error);
          });
      }
    }

    DomEvent.on(
      link,
      {
        keydown: function (e) {
          if (e.keyCode === 13) {
            this._expandSafely();
          }
        },
        // Certain screen readers intercept the key event and instead send a click event
        click: function (e) {
          DomEvent.preventDefault(e);
          this._expandSafely();
        },
      },
      this
    );

    if (!collapsed) {
      this.expand();
    }

    this._baseLayersList = DomUtil.create("div", className + "-base", section);
    this._separator = DomUtil.create("div", className + "-separator", section);
    this._overlaysList = DomUtil.create(
      "div",
      className + "-overlays",
      section
    );

    var clearButton = document.createElement("button");
    clearButton.innerHTML = "Remove All";
    clearButton.style.backgroundColor = "rgb(43, 83, 128)";
    clearButton.style.padding = "5px 20px";
    clearButton.style.color = "white";
    clearButton.style.fontSize = "13px";
    clearButton.style.marginTop = "7px";
    clearButton.onclick = () => {
      this._clearLayers();
    };
    if (rAdd) {
      section.appendChild(clearButton);
    }
    container.appendChild(section);
  },

  _clearLayers: function () {
    const layersCopy = [...this._layers];

    layersCopy.forEach((ele) => {
      if (ele.upload) {
        this.removeLayer(ele.layer, ele);
      } else {
        this.removeLayer(ele.layer);
      }
    });
    this._layers = [];
	window.dispatchEvent(new Event("layersCleared"));  // sends an event that any component can listen.
  },

  _getLayer: function (id) {
    for (var i = 0; i < this._layers.length; i++) {
      if (this._layers[i] && Util.stamp(this._layers[i].layer) === id) {
        return this._layers[i];
      }
    }
  },
  _getLayerId(name) {
    for (var i = 0; i < this._layers.length; i++) {
      if (this._layers[i] && this._layers[i].name === name) {
        return this._layers[i].id;
      }
    }
  },
  _hasLayer(layer) {
    console.log(this._layers);
    for (var i = 0; i < this._layers.length; i++) {
      if (this._layers[i]) {
        console.log(this._layers[i]);
        // if(Util.stamp(this._layers[i].layer) === Util.stamp(layer)){
        // 	return true
        // }
      }
    }
    return false;
  },
  _getFilterLayer: function () {
    let res = [];
    for (var i = 0; i < this._layers.length; i++) {
      if (
        this._layers[i] &&
        this._layers[i].layer._url &&
        this._layers[i].layer._url.includes("earthengine.googleapis.com")
      ) {
        res.push([
          this._layers[i].name,
          this._layers[i].layer._url.split("/")[7],
        ]);
      }
    }
    return res;
  },

  __getNames: function () {
    let res = [];
    for (var i = 0; i < this._layers.length; i++) {
      if (this._layers[i]) {
        res.push(this._layers[i].name);
      }
    }
    return res;
  },

  __editDrawLayer: function (layer, extent, parent) {
    const eLayer = this._layers.filter(
      (layerInfo) => layerInfo.layer === layer
    )[0];
    this.removeLayer(eLayer.layer, false, true);
    this._addLayer(
      eLayer.layer,
      eLayer.name,
      eLayer.overlay,
      eLayer.zoom,
      extent,
      false,
      false,
      true,
      parent,
      false
    );
    eLayer.layer.addTo(this._map);
    this._update();
  },
  __getParent: function (layer) {
    var layerObj = this._layers.find((obj) => obj.layer === layer);
    if (layerObj) {
      return layerObj.id;
    } else {
      return null;
    }
  },
  _addLayer: function (
    layer,
    name,
    overlay,
    zoom = false,
    zoomto = null,
    upload = null,
    orgname = null,
    draw = null,
    id = null,
    tableOnly = false
  ) {
    if (this._map) {
      if (layer) {
        layer.on("add remove", this._onLayerChange, this);
      }
    }

    this._layers.push({
      layer: layer,
      name: name,
      overlay: overlay,
      zoom: zoom,
      zoomto: zoomto,
      upload: upload,
      orgname: orgname,
      draw: draw,
      id: id,
      tableOnly: tableOnly,
    });

    if (this.options.sortLayers) {
      this._layers.sort(
        Util.bind(function (a, b) {
          return this.options.sortFunction(a.layer, b.layer, a.name, b.name);
        }, this)
      );
    }

    if (this.options.autoZIndex && layer.setZIndex) {
      this._lastZIndex++;
      layer.setZIndex(this._lastZIndex);
    }

    this._expandIfNotCollapsed();
  },

  _update: function () {
    if (!this._container) {
      return this;
    }

    DomUtil.empty(this._baseLayersList);
    DomUtil.empty(this._overlaysList);

    this._layerControlInputs = [];
    var baseLayersPresent,
      overlaysPresent,
      i,
      obj,
      baseLayersCount = 0;

    for (i = 0; i < this._layers.length; i++) {
      obj = this._layers[i];
      this._addItem(obj);
      overlaysPresent = overlaysPresent || obj.overlay;
      baseLayersPresent = baseLayersPresent || !obj.overlay;
      baseLayersCount += !obj.overlay ? 1 : 0;
    }

    // Hide base layers section if there's only one layer.
    if (this.options.hideSingleBase) {
      baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
      this._baseLayersList.style.display = baseLayersPresent ? "" : "none";
    }

    this._separator.style.display =
      overlaysPresent && baseLayersPresent ? "" : "none";
    this._container.style.display = this._layers.length ? "block" : "none";
    return this;
  },

  _onLayerChange: function (e) {
    if (!this._handlingClick) {
      this._update();
    }

    var obj = this._getLayer(Util.stamp(e.target));

    // @namespace Map
    // @section Layer events
    // @event baselayerchange: LayersControlEvent
    // Fired when the base layer is changed through the [layers control](#control-layers).
    // @event overlayadd: LayersControlEvent
    // Fired when an overlay is selected through the [layers control](#control-layers).
    // @event overlayremove: LayersControlEvent
    // Fired when an overlay is deselected through the [layers control](#control-layers).
    // @namespace Control.Layers
    var type = obj.overlay
      ? e.type === "add"
        ? "overlayadd"
        : "overlayremove"
      : e.type === "add"
      ? "baselayerchange"
      : null;

    if (type) {
      obj.send = false;
      this._map.fire(type, obj);
    }
  },

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
  _createRadioElement: function (name, checked) {
    var radioHtml =
      '<input type="radio" class="leaflet-control-layers-selector" name="' +
      name +
      '"' +
      (checked ? ' checked="checked"' : "") +
      "/>";

    var radioFragment = document.createElement("div");
    radioFragment.innerHTML = radioHtml;

    return radioFragment.firstChild;
  },
  getPropsVector(name) {
    return new Promise((resolve) => {
      eventEmitter.emit("getProps", { name, resolve });
    });
  },
  _createRemoveButton: function (
    layer,
    upload = false,
    name = null,
    id = null
  ) {
    var removeButton = document.createElement("button");
    removeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    removeButton.style.cssText =
      "cursor: pointer; font-size: 16px; color: red; border: none; background: none; padding: 5px; border-radius: 3px;";
    removeButton.onmouseover = () => {
      removeButton.style.backgroundColor = "#f8d7da";
    };
    removeButton.onmouseout = () => {
      removeButton.style.backgroundColor = "transparent";
    };
    removeButton.onclick = async () => {
      if (!upload) {
        this.removeLayer(layer, null, null);
        this.expand();
      } else {
        this._map.fire("decklayercross", { name: name, id: id });
        this._layers.forEach((ele, index) => {
          if (ele["orgname"] === name) {
            this._layers.splice(index, 1);
          }
        });
        this._update();
      }
    };
    return removeButton;
  },

  _createZoomButton(layer, to) {
    var zoomButton = document.createElement("button");
    zoomButton.innerHTML = '<i class="fa-solid fa-eye"></i>';
    zoomButton.style.cssText =
      "cursor: pointer; font-size: 16px; border: none; background: none; padding: 5px; border-radius: 3px;";
    zoomButton.onmouseover = () => {
      zoomButton.style.backgroundColor = "#e2e6ea";
    };
    zoomButton.onmouseout = () => {
      zoomButton.style.backgroundColor = "transparent";
    };
    zoomButton.onclick = () => this._map.flyToBounds(to);
    return zoomButton;
  },

  _createRangeElement: function (
    layer,
    upload = false,
    name = null,
    checked = null
  ) {
    var sliderContainer = document.createElement("div");
    sliderContainer.style.display = "flex";
    sliderContainer.style.alignItems = "center";
    sliderContainer.style.marginBottom = "10px";

    let input = document.createElement("input");
    input.type = "range";
    input.style.width = "100px";
    input.min = 0.0;
    input.max = 1.0;
    input.step = 0.1;
    input.style.cursor = "pointer";
    input.value = 1.0;
    sliderContainer.appendChild(input);

    var sliderValue = document.createElement("p");
    sliderValue.innerText = Number(input.value).toFixed(1);
    sliderValue.style.marginLeft = "10px";
    sliderValue.style.marginBlockStart = "0px";
    sliderContainer.appendChild(sliderValue);

    input.addEventListener("input", (e) => {
      let value = Number(e.target.value);
      sliderValue.innerText = Number(e.target.value).toFixed(1);
      if (upload) {
        this._map.fire("deckopacitychange", {
          name: name,
          opacity: value,
          checked: checked,
        });
      } else {
        try {
          layer.setOpacity(value);
        } catch (e) {
          try {
            layer.setStyle({ opacity: value });
          } catch (e) {}
        }
      }
    });
    return sliderContainer;
  },

  _createColorElement(name, check) {
    let input = document.createElement("input");
    input.type = "color";
    input.style.width = "30px";
    input.style.height = "30px";
    input.style.border = "none";
    input.style.padding = "0";
    input.style.marginBottom = "5px";
    input.style.cursor = "pointer";
    input.addEventListener("input", (e) => {
      this._map.fire("deckcolorchange", {
        name: name,
        color: e.target.value,
        checked: check.checked,
      });
    });
    return input;
  },

  _createRenameButton: function (obj) {
    var renameButton = document.createElement("button");
    renameButton.innerHTML = '<i class="fa-solid fa-pencil"></i>';
    renameButton.style.cssText =
      "cursor: pointer; font-size: 16px; border: none; background: none; padding: 5px; border-radius: 3px;";
    renameButton.onmouseover = () => {
      renameButton.style.backgroundColor = "#e2e6ea";
    };
    renameButton.onmouseout = () => {
      renameButton.style.backgroundColor = "transparent";
    };
    renameButton.onclick = async () => {
      var newName = prompt("Enter a new name:", obj.name);
      if (newName !== null) {
        if (obj.upload) {
          this._map.fire("decklayerrename", { prev: obj.name, new: newName });
        } else {
          this._map.fire("layerrename", { prev: obj.name, new: newName });
        }
        obj.name = newName;
        this._update();
      }
    };

    return renameButton;
  },

  _createShowAttribute(obj, check, picker) {
    this.vector_att[obj.id] = "No Attribute";
    let isResPopulated = false; // Declare isResPopulated here

    let resDropdown = document.createElement("select");
    resDropdown.style.width = "100px";
    resDropdown.style.marginLeft = "5px";
    resDropdown.style.marginBottom = "5px";

    let ColorDropdown = document.createElement("select");
    ColorDropdown.style.width = "100px";
    ColorDropdown.style.marginLeft = "5px";
    ColorDropdown.style.marginBottom = "5px";
    ColorDropdown.style.display = "none";
    let main = document.createElement("option");
    main.value = "No Attribute";
    main.textContent = "No Attribute";
    ColorDropdown.appendChild(main);
    ColorDropdown.value = "No Attribute";

    let intDropdown = document.createElement("select");
    intDropdown.style.width = "100px";
    intDropdown.style.marginLeft = "5px";
    intDropdown.style.marginBottom = "5px";
    intDropdown.style.display = "none";

    let colorsList = ["Green", "Red", "Red-to-Green", "Green-to-Red", "Random"];
    colorsList.forEach((gradient, index) => {
      let option = document.createElement("option");
      option.value = gradient;
      option.textContent = gradient;
      intDropdown.appendChild(option);
    });
    intDropdown.value = colorsList[0];

    let intInput = document.createElement("input");
    intInput.type = "number";
    intInput.style.width = "60px";
    intInput.style.marginLeft = "5px";
    intInput.style.display = "none";

    let okButton = document.createElement("button");
    okButton.innerHTML = "OK";
    okButton.style.marginLeft = "5px";
    okButton.style.display = "none";

    let colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.style.width = "20px";
    colorPicker.style.height = "20px";
    colorPicker.style.marginLeft = "5px";
    colorPicker.style.display = "none";
    colorPicker.addEventListener("input", (e) => {
      e.preventDefault();
      e.stopPropagation();
      eventEmitter.emit("text-color-change", {
        name: obj.orgname,
        color: e.target.value,
        checked: check.checked,
      });
    });

    let disableIntInputCheckbox = document.createElement("input");
    disableIntInputCheckbox.type = "checkbox";
    disableIntInputCheckbox.style.marginLeft = "5px";
    disableIntInputCheckbox.style.display = "none";
    disableIntInputCheckbox.addEventListener("change", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.checked) {
        intInput.disabled = true;
      } else {
        intInput.disabled = false;
      }
    });
    okButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      let inputValue = intInput.value;
      if (disableIntInputCheckbox.checked) inputValue = "norm";
      if (intDropdown.selectedOptions[0].value !== "Random") {
        if (inputValue) {
          eventEmitter.emit("color-range", {
            name: obj.orgname,
            atr: ColorDropdown.selectedOptions[0].value,
            range: inputValue,
            palette: intDropdown.selectedOptions[0].value,
            checked: check.checked,
          });
        } else {
          alert("Please enter a Value");
        }
      } else {
        eventEmitter.emit("add-random", {
          name: obj.orgname,
          checked: check.checked,
        });
      }
    });

    let checkboxContainer = document.createElement("div");
    checkboxContainer.style.marginTop = "5px";
    checkboxContainer.style.display = "flex";

    let label = document.createElement("label");
    label.textContent = "Symbology";
    label.style.marginRight = "5px";
    checkboxContainer.appendChild(label);

    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.style.display = "inline-block";
    checkboxContainer.appendChild(checkbox);

    checkbox.addEventListener("change", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.target.checked) {
        ColorDropdown.style.display = "inline-block";
        disableIntInputCheckbox.style.display = "inline-block";
        picker.disabled = true;
      } else {
        eventEmitter.emit("reset-layer", {
          name: obj.orgname,
          checked: check.checked,
        });
        ColorDropdown.style.display = "none";
        intDropdown.style.display = "none";
        intInput.style.display = "none";
        okButton.style.display = "none";
        disableIntInputCheckbox.style.display = "none";
        this.vector_grad[obj.id] = "No Attribute";
        picker.disabled = false;
      }
    });

    ColorDropdown.addEventListener("change", async (e) => {
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
      this.vector_grad[obj.id] = e.target.value;
      if (this.vector_grad[obj.id] !== "No Attribute") {
        if (checkbox.checked) {
          if (ColorDropdown.selectedOptions[0].name === "number") {
            eventEmitter.emit("reset-layer", {
              name: obj.orgname,
              checked: check.checked,
            });
            intDropdown.style.display = "inline-block";
            intInput.style.display = "inline-block";
            okButton.style.display = "inline-block";
          } else {
            eventEmitter.emit("add-random", {
              name: obj.orgname,
              checked: check.checked,
            });
            intDropdown.style.display = "none";
            intInput.style.display = "none";
            okButton.style.display = "none";
          }
        } else {
          intDropdown.style.display = "none";
        }
      } else {
        intDropdown.style.display = "none";
        intInput.style.display = "none";
        okButton.style.display = "none";
      }
    });

    resDropdown.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!isResPopulated) {
        try {
          let res = await new Promise((resolve) => {
            eventEmitter.emit("getProps", { name: obj.name, resolve });
          });
          console.log(res);
          resDropdown.innerHTML = "";
          let main = document.createElement("option");
          main.value = "No Attribute";
          main.textContent = "No Attribute";
          main.setAttribute("data-type", "none");
          resDropdown.appendChild(main);

          res.forEach((item) => {
            let option = document.createElement("option");
            option.value = item.key;
            option.textContent = item.key;
            option.name = item.type;
            resDropdown.appendChild(option);
          });
          res.forEach((item) => {
            let option = document.createElement("option");
            option.value = item.key;
            option.textContent = item.key;
            option.name = item.type;
            ColorDropdown.appendChild(option);
          });

          resDropdown.value = this.vector_att[obj.id];

          resDropdown.addEventListener("change", async (e) => {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
            this.vector_att[obj.id] = e.target.value;
            if (this.vector_att[obj.id] !== "No Attribute") {
              colorPicker.style.display = "inline-block";
            } else {
              colorPicker.style.display = "none";
            }

            setTimeout(() => {
              eventEmitter.emit("change-attr", {
                name: obj.orgname,
                atr: e.target.value,
                checked: check.checked,
              });
            }, 100);
          });

          isResPopulated = true;
        } catch (error) {
          console.error("Error fetching props:", error);
        }
      }
    });

    let container = document.createElement("div");
    container.appendChild(resDropdown);
    container.appendChild(colorPicker);
    container.appendChild(checkboxContainer);
    container.appendChild(ColorDropdown);
    container.appendChild(disableIntInputCheckbox);
    container.appendChild(intDropdown);
    container.appendChild(intInput);
    container.appendChild(okButton);

    return container;
  },

  _createDownloadButton: function (name) {
    var downloadButton = document.createElement("button");
    downloadButton.innerHTML = '<i class="fa-solid fa-download"></i>';
    downloadButton.style.cssText = `
			cursor: pointer; font-size: 16px; border: none;
			background: none; padding: 5px; border-radius: 3px;
		`;
    downloadButton.onmouseover = () => {
      downloadButton.style.backgroundColor = "#393939";
    };
    downloadButton.onmouseout = () => {
      downloadButton.style.backgroundColor = "transparent";
    };

    downloadButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      eventEmitter.emit("download-vector", { name: name }); // Clean up the DOM
    };

    return downloadButton;
  },

  _createDownloadButtonCSV: function (name) {
    var downloadButton = document.createElement("button");
    downloadButton.innerHTML = '<i class="fa-solid fa-download"></i>';
    downloadButton.style.cssText = `
			cursor: pointer; font-size: 16px; border: none;
			background: none; padding: 5px; border-radius: 3px;
		`;
    downloadButton.onmouseover = () => {
      downloadButton.style.backgroundColor = "#393939";
    };
    downloadButton.onmouseout = () => {
      downloadButton.style.backgroundColor = "transparent";
    };

    downloadButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      eventEmitter.emit("download-csv", { name: name });
    };

    return downloadButton;
  },

  _createTableButton: function (name) {
    var downloadButton = document.createElement("button");
    downloadButton.innerHTML = '<i class="fa-solid fa-table"></i>';
    downloadButton.style.cssText = `
			cursor: pointer; font-size: 16px; border: none;
			background: none; padding: 5px; border-radius: 3px;
		`;
    downloadButton.onmouseover = () => {
      downloadButton.style.backgroundColor = "#393939swswsw";
    };
    downloadButton.onmouseout = () => {
      downloadButton.style.backgroundColor = "transparent";
    };

    downloadButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      eventEmitter.emit("open-csv", { name: name });
    };

    return downloadButton;
  },

  _addItem: function (obj) {
    var label = document.createElement("label"),
      checked =
        obj.upload || obj.tableOnly ? true : this._map.hasLayer(obj.layer),
      input;

    if (obj.overlay) {
      input = document.createElement("input");
      input.type = "checkbox";
      input.className = "leaflet-control-layers-selector";
      input.defaultChecked = checked;
    } else {
      input = this._createRadioElement(
        "leaflet-base-layers_" + Util.stamp(this),
        checked
      );
    }

    label.style.display = "flex";
    label.style.flexDirection = "column";
    this._layerControlInputs.push(input);
    input.layerId = obj.upload ? null : Util.stamp(obj.layer);
    input.ltype = obj.upload ? "deck" : null;
    input.lname = obj.upload ? obj.name : null;
    input.orgname = obj.upload || obj.tableOnly ? obj.orgname : null;
    DomEvent.on(input, "click", this._onInputClick, this);

    var name = document.createElement("span");
    name.innerHTML = " " + obj.name;
    var holder = document.createElement("span");

    label.appendChild(holder);
    holder.appendChild(input);
    holder.appendChild(name);

    if (obj.overlay) {
      let optionsButton = document.createElement("button");
      optionsButton.innerHTML = '<i class="fa-solid fa-gear"></i>';
      optionsButton.style.marginLeft = "5px";

      // Make the button smaller
      optionsButton.style.fontSize = "15px";
      optionsButton.style.padding = "2px 4px";
      optionsButton.style.border = "none";
      optionsButton.style.background = "transparent";
      holder.appendChild(optionsButton);

      // Create the popup container
      let popupContainer = document.createElement("div");
      popupContainer.style.display = "none";
      popupContainer.style.position = "absolute";
      popupContainer.style.backgroundColor = "black";
      popupContainer.style.border = "1px solid #ccc";
      popupContainer.style.padding = "10px";
      popupContainer.style.zIndex = "1000";
      popupContainer.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
      popupContainer.style.borderRadius = "5px";
      popupContainer.addEventListener("click", (e) => {
        console.log("click");
        e.stopPropagation();
        e.stopImmediatePropagation();
      });
      // Add a close button to the popup container
      let closeButton = document.createElement("button");
      closeButton.innerHTML = "&times;";
      closeButton.style.position = "absolute";
      closeButton.style.top = "5px";
      closeButton.style.right = "5px";
      closeButton.style.background = "transparent";
      closeButton.style.border = "none";
      closeButton.style.fontSize = "16px";
      closeButton.style.cursor = "pointer";
      closeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        popupContainer.style.display = "none";
      });
      popupContainer.appendChild(closeButton);

      // Menu-like structure for the popup elements
      let menuList = document.createElement("ul");
      menuList.style.listStyleType = "none";
      menuList.style.padding = "0";

      // Rename button
      let renameItem = document.createElement("li");
      renameItem.textContent = "Rename";
      let renameButton = this._createRenameButton(obj);
      renameItem.appendChild(renameButton);
      menuList.appendChild(renameItem);

      // Zoom button if available
      if (obj.zoom) {
        let zoomItem = document.createElement("li");
        zoomItem.textContent = "Zoom";
        let zoomButton = this._createZoomButton(obj.layer, obj.zoomto);
        zoomItem.appendChild(zoomButton);
        menuList.appendChild(zoomItem);
      }

      // Color element and show attribute options if upload is true
      if (obj.upload) {
        let colorItem = document.createElement("li");
        colorItem.textContent = "Color  ";
        let colorElement = this._createColorElement(obj.orgname, input);
        colorItem.appendChild(colorElement);
        menuList.appendChild(colorItem);

        let attributeItem = document.createElement("li");
        attributeItem.textContent = "Labels";
        let attributeElement = this._createShowAttribute(
          obj,
          input,
          colorElement
        );
        attributeItem.appendChild(attributeElement);
        menuList.appendChild(attributeItem);

        let DownloadItem = document.createElement("li");
        DownloadItem.textContent = "Download";
        let DownloadElement = this._createDownloadButton(obj.orgname);
        DownloadItem.appendChild(DownloadElement);
        menuList.appendChild(DownloadItem);

        let DownloadItem1 = document.createElement("li");
        DownloadItem1.textContent = "Download CSV";
        let DownloadElement1 = this._createDownloadButtonCSV(obj.orgname);
        DownloadItem1.appendChild(DownloadElement1);
        menuList.appendChild(DownloadItem1);

        let TableItem = document.createElement("li");
        TableItem.textContent = "Open Table";
        let TableElement = this._createTableButton(obj.orgname);
        TableItem.appendChild(TableElement);
        menuList.appendChild(TableItem);
      }

      // if (obj.upload || obj.tableOnly) {
      // 	let TableItem = document.createElement('li');
      // 	TableItem.textContent = 'Open Table';
      // 	let TableElement = this._createTableButton(obj.orgname);
      // 	TableItem.appendChild(TableElement);
      // 	menuList.appendChild(TableItem);

      // }

      // Remove button
      let removeItem = document.createElement("li");
      removeItem.textContent = "Remove";
      let removeButton = this._createRemoveButton(
        obj.layer,
        obj.upload,
        obj.orgname,
        obj.id
      );
      removeItem.appendChild(removeButton);
      menuList.appendChild(removeItem);

      // Range element if applicable
      let rangeItem = document.createElement("li");
      rangeItem.textContent = "Opacity";
      let rangeElement = this._createRangeElement(
        obj.layer,
        obj.upload,
        obj.orgname,
        input.checked
      );
      rangeItem.appendChild(rangeElement);
      menuList.appendChild(rangeItem);

      popupContainer.appendChild(menuList);

      // Append the popup container to the label
      label.appendChild(popupContainer);

      // Add event listener to the options button to toggle the popup visibility
      optionsButton.addEventListener("click", (e) => {
        e.stopPropagation();
        popupContainer.style.display =
          popupContainer.style.display === "none" ? "block" : "none";
      });
    }

    var container = obj.overlay ? this._overlaysList : this._baseLayersList;
    container.appendChild(label);

    this._checkDisabledLayers();
    return label;
  },

  _onInputClick: function () {
    // expanding the control on mobile with a click can cause adding a layer - we don't want this
    if (this._preventClick) {
      return;
    }

    var inputs = this._layerControlInputs,
      input,
      layer;
    var addedLayers = [],
      removedLayers = [];

    this._handlingClick = true;

    for (var i = inputs.length - 1; i >= 0; i--) {
      input = inputs[i];
      layer =
        input.ltype === "deck"
          ? input.lname
          : this._getLayer(input.layerId).layer;
      if (input.checked) {
        input.ltype === "deck"
          ? this._map.fire("decklayeradd", { id: layer, name: input.orgname })
          : addedLayers.push(layer);
      } else if (!input.checked) {
        input.ltype === "deck"
          ? this._map.fire("decklayerremove", {
              id: layer,
              name: input.orgname,
            })
          : removedLayers.push(layer);
      }
    }

    // Bugfix issue 2318: Should remove all old layers before readding new ones
    for (i = 0; i < removedLayers.length; i++) {
      if (this._map.hasLayer(removedLayers[i])) {
        this._map.removeLayer(removedLayers[i]);
      }
    }
    for (i = 0; i < addedLayers.length; i++) {
      if (!this._map.hasLayer(addedLayers[i])) {
        this._map.addLayer(addedLayers[i]);
      }
    }

    this._handlingClick = false;

    this._refocusOnMap();
  },

  _checkDisabledLayers: function () {
    var inputs = this._layerControlInputs,
      input,
      layer,
      zoom = this._map.getZoom();

    for (var i = inputs.length - 1; i >= 0; i--) {
      input = inputs[i];
      if (!input.ltype === "deck") {
        layer = this._getLayer(input.layerId).layer;
        input.disabled =
          (layer.options.minZoom !== undefined &&
            zoom < layer.options.minZoom) ||
          (layer.options.maxZoom !== undefined && zoom > layer.options.maxZoom);
      }
    }
  },

  _expandIfNotCollapsed: function () {
    if (this._map && !this.options.collapsed) {
      this.expand();
    }
    return this;
  },

  _expandSafely: function () {
    var section = this._section;
    this._preventClick = true;
    DomEvent.on(section, "click", DomEvent.preventDefault);
    this.expand();
    var that = this;
    setTimeout(function () {
      DomEvent.off(section, "click", DomEvent.preventDefault);
      that._preventClick = false;
    });
  },
});

// @factory L.control.layers(baselayers?: Object, overlays?: Object, options?: Control.Layers options)
// Creates a layers control with the given layers. Base layers will be switched with radio buttons, while overlays will be switched with checkboxes. Note that all base layers should be passed in the base layers object, but only one should be added to the map during map instantiation.
export function layersControl(baseLayers, overlays, options) {
  return new Layers(baseLayers, overlays, options);
}
