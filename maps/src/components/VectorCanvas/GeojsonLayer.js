import * as L from "leaflet";
import { createDeckInstance, updateDeckView } from "./deck-utils";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { Feature, Geometry } from "geojson";
import {
  center,
  centroid,
  bbox,
  union,
  intersect,
  difference,
  booleanValid,
  combine,
  collect,
  featureCollection,
  buffer,
  booleanPointInPolygon,
  booleanContains,
} from "@turf/turf";
import * as turf from "@turf/turf";
import {
  EditableGeoJsonLayer,
  DrawPolygonMode,
  ModifyMode,
  ViewMode,
  ExtrudeMode,
  DrawPointMode,
  DrawLineStringMode,
  DrawRectangleMode,
} from "nebula.gl";
import eventEmitter from "../eventEmitter";

import JSZip from "jszip";
const building = [
  "#00FF00",
  "#12FF00",
  "#24FF00",
  "#36FF00",
  "#48FF00",
  "#5AFF00",
  "#6CFF00",
  "#7EFF00",
  "#90FF00",
  "#A2FF00",
  "#B4FF00",
  "#C6FF00",
  "#D8FF00",
  "#EAFF00",
  "#FCFF00",
  "#FF1200",
  "#FF2400",
  "#FF6C00",
  "#FF4800",
  "#FF5A00",
  "#FF3600",
];
const green = [
  "#C8FFC8",
  "#BEFFBE",
  "#B4FFB4",
  "#AAFFAA",
  "#A0FFA0",
  "#96FF96",
  "#8CFF8C",
  "#82FF82",
  "#78FF78",
  "#6EFF6E",
  "#64FF64",
  "#5AFF5A",
  "#50FF50",
  "#46FF46",
  "#3CFF3C",
  "#32FF32",
  "#28FF28",
  "#1EFF1E",
  "#14FF14",
  "#0AFF0A",
  "#00FF00",
];

/** @typedef {import('@deck.gl/core').Deck} Deck */
/** @typedef {import('@deck.gl/core/lib/deck').DeckProps} DeckProps */

export default class VectorCanvas extends L.Layer {
  /** @type {HTMLElement | undefined} */
  _container = undefined;

  /** @type {Deck | undefined} */
  _deck = undefined;

  /** @type {boolean | undefined} */
  _animate = undefined;

  /**
   * @param {DeckProps} props
   */
  constructor(props) {
    super(props);
    this.layers = [];
    this.layers_visible = {};
    this.layers_color = {};
    this.layers_type = {};
    this.layers_type_id = {};
    this.layers_min_max = {};
    this.layers_last_grad = {};
    this.layers_filter = {};
    this.layers_bounds = {};
    this.selectedFeatureIndexes = {};
    this.angle = 0;
    this.bearing = 0;
    this.createMode = false;
    this.editMode = false;
    this.newCollection = {
      type: "FeatureCollection",
      features: [
        /* insert features here */
      ],
    };
    eventEmitter.on("getProps", this.getProp_2.bind(this));
    eventEmitter.on("change-attr", this.LayerShowAtribute.bind(this));
    eventEmitter.on("text-color-change", this.textColorChange.bind(this));
    eventEmitter.on("add-random", this.AddRandom.bind(this));
    eventEmitter.on("reset-layer", this.resetLayerColor.bind(this));
    eventEmitter.on("color-range", this.colorRange.bind(this));
    eventEmitter.on("download-vector", this.downloadVector.bind(this));
    eventEmitter.on("download-csv", this.downloadCSV.bind(this));
  }

  /**
   * @returns {this}
   */

  setMode(type) {
    if (type === "create") {
      this.createMode = !this.createMode;
      this.editMode = false;
      if (!this.createMode) {
        this.newCollection = {
          type: "FeatureCollection",
          features: [
            /* insert features here */
          ],
        };
        this.removeCreateLayer();
        if ("create-draw" in this.layers_visible) {
          this.removeDrawLayer(); // Remove any existing draw layer
        }
      }
    } else {
      this.editMode = !this.editMode;
      this.createMode = false;
      this.newCollection = {
        type: "FeatureCollection",
        features: [
          /* insert features here */
        ],
      };
      this.removeCreateLayer();
      if ("create-draw" in this.layers_visible) {
        this.removeDrawLayer(); // Remove any existing draw layer
      }
    }
  }

  // addDrawLayer(mode) {
  //   if ("create-draw" in this.layers_visible) {
  //     this.removeDrawLayer(); // Remove any existing draw layer
  //   }

  //   const selectedFeatureIndexes = [];
  //   const layer = new EditableGeoJsonLayer({
  //     id: "create-draw",
  //     name: "create-draw",
  //     data: this.newCollection,
  //     mode: mode, // Pass mode dynamically
  //     selectedFeatureIndexes,
  //     getLineWidth: 0.1,
  //     getPointRadius: 1,
  //     pointType: "circle+text",
  //     lineWidthMinPixels: 2,
  //     pointRadiusMinPixels: 5,
  //     pickable: true,
  //     filled: true,
  //     onEdit: ({ updatedData, editType }) => {
  //       if (editType === "addFeature") {
  //         this.newCollection = updatedData; // Store the new collection
  //       }

  //       // Clone and update the layer with new data
  //       const clonedLayer = this._deck.props.layers
  //         .filter((layer) => layer.id === "create-draw")[0]
  //         .clone({ data: updatedData });

  //       clonedLayer.visible = true;

  //       // Update deck.gl layers
  //       this._deck.setProps({
  //         layers: this._deck.props.layers.filter(
  //           (layer) => layer.id !== "create-draw"
  //         ),
  //       });
  //       this._deck.setProps({
  //         layers: [clonedLayer, ...this._deck.props.layers],
  //       });
  //     },
  //   });

  //   // Add the new draw layer to deck.gl
  //   this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
  //   this.layers.push("create-draw");
  //   this.layers_visible["create-draw"] = "create-draw";
  //   this._update();
  // }

  addDrawLayer(mode) {
    if (!mode || typeof mode !== "function") {
      console.error(" Invalid mode passed:", mode);
      return;
    }

    const modeName = mode.name.replace("Mode", "");
    const uniqueId = `${modeName}_${Date.now()}`;

    console.log(`🆕 Creating new draw layer: ${uniqueId}`);

    const selectedFeatureIndexes = [];

    const layer = new EditableGeoJsonLayer({
      id: uniqueId,
      name: uniqueId,
      data: this.newCollection,
      mode: new mode(),
      selectedFeatureIndexes,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: true,
      onEdit: ({ updatedData, editType }) => {
        console.log(`✏ Editing Layer ${uniqueId}: ${editType}`);
        this.newCollection = updatedData;

        const clonedLayer = this._deck.props.layers
          .filter((layer) => layer.id === uniqueId)[0]
          ?.clone({ data: updatedData });

        if (clonedLayer) {
          clonedLayer.visible = true;

          this._deck.setProps({
            layers: this._deck.props.layers.filter(
              (layer) => layer.id !== uniqueId
            ),
          });
          this._deck.setProps({
            layers: [clonedLayer, ...this._deck.props.layers],
          });

          console.log(` Updated layer: ${uniqueId}`);
        } else {
          console.warn(` No existing layer found for ${uniqueId}`);
        }
      },
    });

    this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
    this.layers_visible[uniqueId] = uniqueId;
    console.log(` Added new layer: ${uniqueId}`);
    this._update();
  }

  addPoint() {
    this.addDrawLayer(DrawPointMode);
  }

  addLine() {
    this.addDrawLayer(DrawLineStringMode);
  }

  addRectangle() {
    this.addDrawLayer(DrawRectangleMode);
  }

  addPolygon() {
    this.addDrawLayer(DrawPolygonMode);
  }
  checkDownload() {
    console.log("🔍 Checking features in newCollection:", this.newCollection.features);
    return this.newCollection.features.length;
  }
  saveCreate(name) {
    // Generate a random 4-digit number
    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    this.selectedFeatureIndexes[randomId] = [];
    let layer = new EditableGeoJsonLayer({
      id: randomId,
      name: name,
      data: this.newCollection,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      // extruded:true,
      // getElevation: f => 1000,
      // wireframe:true,
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: true,
      mode: ModifyMode,
      selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
      autoHighlight: true,
      onClick: (info, event) => {
        if (this.editMode) {
          // Initialize selectedFeatureIndexes as a dictionary if not already done

          // Check if a feature is currently selected
          if (
            this.selectedFeatureIndexes[randomId] === null ||
            this.selectedFeatureIndexes[randomId] === undefined
          ) {
            // No feature selected for this layer, so select the current one
            this.selectedFeatureIndexes[randomId] = [info.index];
            this._map.dragging.disable(); // Disable map dragging
          } else {
            // A feature is already selected for this layer
            if (info.index === this.selectedFeatureIndexes[randomId][0]) {
              // Clicked on the same feature, deselect it
              this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
              this._map.dragging.enable();

              const cloned_ = this._deck.props.layers
                .filter((layer) => layer.id === randomId)[0]
                .clone({ selectedFeatureIndexes: [] }); // Clear selection
              cloned_.visible = true;
              this._deck.setProps({
                layers: this._deck.props.layers.filter(
                  (layer) => layer.id !== randomId
                ),
              });
              this._deck.setProps({
                layers: [cloned_, ...this._deck.props.layers],
              });
            } else {
              // Clicked on a different feature, update selection for this layer
              this.selectedFeatureIndexes[randomId][0] = info.index;
              this._map.dragging.disable(); // Keep map dragging disabled

              const cloned_ = this._deck.props.layers
                .filter((layer) => layer.id === randomId)[0]
                .clone({
                  selectedFeatureIndexes: [
                    this.selectedFeatureIndexes[randomId],
                  ],
                });
              cloned_.visible = true;
              this._deck.setProps({
                layers: this._deck.props.layers.filter(
                  (layer) => layer.id !== randomId
                ),
              });
              this._deck.setProps({
                layers: [cloned_, ...this._deck.props.layers],
              });
            }
          }
        }
        // Check if a feature is already selected
      },
      onEdit: ({ updatedData, editType }) => {
        // Set the updated GeoJSON data to the layer
        const cloned_ = this._deck.props.layers
          .filter((layer) => layer.id === randomId)[0]
          .clone({ data: updatedData });
        cloned_.visible = true;
        this._deck.setProps({
          layers: this._deck.props.layers.filter(
            (layer) => layer.id !== randomId
          ),
        });
        this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
      },
    }); // Use random ID for the cloned layer

    layer.visible = true;

    this.removeDrawLayer();

    this._deck.setProps({
      layers: [layer, ...this._deck.props.layers],
    });

    this.layers.push(randomId);
    this.layers_visible[name] = randomId;
    let bounds = bbox(this.newCollection);
    this.layers_bounds[randomId] = [bounds[1], bounds[0], bounds[3], bounds[2]];

    this.newCollection = {
      type: "FeatureCollection",
      features: [
        /* insert features here */
      ],
    };

    // Remove any existing draw layer

    return [randomId, bounds];
    // Map random ID to the layer name
  }
  updateCreateLayer() {
    if ("create" in this.layers_visible) {
      const cloned_ = this._deck.props.layers
        .filter((layer) => layer.id === "create")[0]
        .clone({ data: this.newCollection });
      cloned_.visible = true;
      this._deck.setProps({
        layers: this._deck.props.layers.filter(
          (layer) => layer.id !== "create"
        ),
      });
      this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
    } else {
      let layer = new EditableGeoJsonLayer({
        id: "create",
        name: "create",
        data: this.newCollection,
        getLineWidth: 0.1,
        getPointRadius: 1,
        pointType: "circle+text",
        // extruded:true,
        // getElevation: f => 1000,
        // wireframe:true,
        lineWidthMinPixels: 2,
        pointRadiusMinPixels: 5,
        pickable: true,
        filled: true,
        mode: ViewMode,
        selectedFeatureIndexes: this.selectedFeatureIndexes,
        autoHighlight: true,
      });

      layer.visible = true;
      this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
      this.layers.push("create");
      this.layers_visible["create"] = "create";
      this._update();
    }
  }
  removeDrawLayer() {
    this.removeLayerFromMap("create-draw", "create-draw");
  }
  removeCreateLayer() {
    this.removeLayerFromMap("create", "create");
  }

  downloadVector(data) {
    if (data && data.name) {
      // Get the layer's data
      const layerData = this._deck.props.layers.filter(
        (layer) => layer.id === data.name
      )[0]?.props.data;

      if (layerData) {
        // Convert the data to a JSON string
        const geoJsonStr = JSON.stringify(layerData);

        // Create a Blob with the JSON data
        const blob = new Blob([geoJsonStr], { type: "application/json" });

        // Create a temporary download link
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${data.name}.geojson`; // Set filename

        // Trigger the download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke the object URL to free up memory
        URL.revokeObjectURL(downloadUrl);
      } else {
        console.error("No data found for the layer.");
      }
    } else {
      console.error("Invalid data input.");
    }
  }
  getCsv(name) {
    const layerData = this._deck.props.layers.filter(
      (layer) => layer.id === name
    )[0]?.props.data.features;

    if (layerData && layerData.length > 0) {
      // Extract the keys from the first object for CSV header
      const keys = Object.keys(layerData[0].properties);
      const csvRows = [];

      // Add the header row
      csvRows.push(keys.join(","));

      // Add data rows
      for (const row of layerData) {
        const values = keys.map((key) => {
          const value = row.properties[key];

          if (typeof value === "number") {
            // If the value is a number, add it directly without quotes
            return value;
          } else {
            // Escape string values for CSV and wrap in quotes
            const escapedValue = String(value).replace(/"/g, '""');
            return `"${escapedValue}"`;
          }
        });
        csvRows.push(values.join(","));
      }

      // Convert the rows to a single CSV string
      const csvString = csvRows.join("\n");
      return csvString;
    }
  }
  downloadCSV(data) {
    if (data && data.name) {
      // Get the layer's data
      const layerData = this._deck.props.layers.filter(
        (layer) => layer.id === data.name
      )[0]?.props.data.features;

      if (layerData && layerData.length > 0) {
        // Extract the keys from the first object for CSV header
        const keys = Object.keys(layerData[0].properties);
        const csvRows = [];

        // Add the header row
        csvRows.push(keys.join(","));

        // Add data rows
        for (const row of layerData) {
          const values = keys.map((key) => {
            // Escape values for CSV
            const escapedValue = String(row.properties[key]).replace(
              /"/g,
              '""'
            );
            return `"${escapedValue}"`;
          });
          csvRows.push(values.join(","));
        }

        // Convert the rows to a single CSV string
        const csvString = csvRows.join("\n");

        // Create a Blob with the CSV data
        const blob = new Blob([csvString], { type: "text/csv" });

        // Create a temporary download link
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${data.name}.csv`; // Set filename

        // Trigger the download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke the object URL to free up memory
        URL.revokeObjectURL(downloadUrl);
      } else {
        console.error("No data found for the layer.");
      }
    } else {
      console.error("Invalid data input.");
    }
  }
  splitVector(name, prop) {
    // Get the layer's data using the provided name (layer.id)
    const layer = this._deck.props.layers.find(
      (layer) => layer.id === this.layers_visible[name]
    );

    if (!layer || !layer.props.data || !layer.props.data.features) {
      console.error("Layer not found or has no data.");
      return;
    }

    const layerData = layer.props.data.features;

    // Group data by the specified property
    const groupedData = layerData.reduce((acc, item) => {
      const key = item.properties[prop]; // Access the property under `properties`
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
    let dict = {};

    Object.entries(groupedData).map(([key, data]) => {
      const randomId = Math.random().toString(36).substring(2, 15); // Generate a random ID
      this.selectedFeatureIndexes[randomId] = [];
      // Create a new layer for each group of features
      let layer = new EditableGeoJsonLayer({
        id: randomId, // Generate a unique id for the new layer
        name: `${name}_${prop}_${key}`, // Optionally set a name
        data: {
          type: "FeatureCollection",
          features: data,
        },
        getLineWidth: 0.1,
        getPointRadius: 1,
        pointType: "circle+text",
        lineWidthMinPixels: 2,
        pointRadiusMinPixels: 5,
        pickable: true,
        filled: true,
        mode: ModifyMode,
        selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
        autoHighlight: true,
        onClick: (info, event) => {
          if (this.editMode) {
            // Initialize selectedFeatureIndexes as a dictionary if not already done

            // Check if a feature is currently selected
            if (
              this.selectedFeatureIndexes[randomId] === null ||
              this.selectedFeatureIndexes[randomId] === undefined
            ) {
              // No feature selected for this layer, so select the current one
              this.selectedFeatureIndexes[randomId] = [info.index];
              this._map.dragging.disable(); // Disable map dragging
            } else {
              // A feature is already selected for this layer
              if (info.index === this.selectedFeatureIndexes[randomId][0]) {
                // Clicked on the same feature, deselect it
                this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
                this._map.dragging.enable();

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === randomId)[0]
                  .clone({ selectedFeatureIndexes: [] }); // Clear selection
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              } else {
                // Clicked on a different feature, update selection for this layer
                this.selectedFeatureIndexes[randomId][0] = info.index;
                this._map.dragging.disable(); // Keep map dragging disabled

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === randomId)[0]
                  .clone({
                    selectedFeatureIndexes: [
                      this.selectedFeatureIndexes[randomId],
                    ],
                  });
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              }
            }
          }
          // Check if a feature is already selected
        },
        onEdit: ({ updatedData, editType }) => {
          // Set the updated GeoJSON data to the layer
          const cloned_ = this._deck.props.layers
            .filter((layer) => layer.id === randomId)[0]
            .clone({ data: updatedData });
          cloned_.visible = true;
          this._deck.setProps({
            layers: this._deck.props.layers.filter(
              (layer) => layer.id !== randomId
            ),
          });
          this._deck.setProps({
            layers: [cloned_, ...this._deck.props.layers],
          });
        },
      });
      layer.visible = true;
      this._deck.setProps({
        layers: [layer, ...this._deck.props.layers],
      });

      this.layers.push(randomId);
      this.layers_visible[`${name}_${prop}_${key}`] = randomId;
      let bounds = bbox({
        type: "FeatureCollection",
        features: data,
      });
      this.layers_bounds[randomId] = [
        bounds[1],
        bounds[0],
        bounds[3],
        bounds[2],
      ];
      dict[key] = [randomId, bounds];

      this._update();
    });

    return dict;
  }

  splitVectorDownload(name, prop) {
    // Get the layer's data using the provided name (layer.id)
    const layer = this._deck.props.layers.find(
      (layer) => layer.id === this.layers_visible[name]
    );

    if (!layer || !layer.props.data || !layer.props.data.features) {
      console.error("Layer not found or has no data.");
      return;
    }

    const layerData = layer.props.data.features;

    // Group data by the specified property
    const groupedData = layerData.reduce((acc, item) => {
      const key = item.properties[prop]; // Access the property under `properties`
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    const zip = new JSZip();

    Object.entries(groupedData).forEach(([key, data]) => {
      const geoJsonData = {
        type: "FeatureCollection",
        features: data,
      };

      // Add each GeoJSON dataset as a file in the ZIP archive
      zip.file(
        `${name}_${prop}_${key}.geojson`,
        JSON.stringify(geoJsonData, null, 2)
      );
    });

    // Generate the ZIP and trigger download
    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}_${prop}_data.zip`;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    });
  }
  splitVectorLayer(name1, name2,layername,interse) {
    // Get the layer's data using the provided name (layer.id)
    let data1 = this.getLayerData(name1);
    let data2 = this.getLayerData(name2);
    const validData1 = data1.features.filter((feature) => feature.geometry);
    const validData2 = data2.features.filter((feature) => feature.geometry);

    let dict = {};
    validData2.forEach((feature2, index) => {
      // Filter validData1 to include only the features within feature2
      let featires = [];
      for (const feature1 of validData1) {
        // Compute intersection for each pair of geometries
        const intersection = intersect(feature1.geometry, feature2.geometry);
        if (intersection) {
          // Wrap the intersection geometry in a Feature and add it to the collection
          if (interse) {
            featires.push(intersection);
          } else {
            featires.push(feature1);
          }
        }
      }

      // Create a FeatureCollection from the intersections
      const FeatureCollection = {
        type: "FeatureCollection",
        features: featires,
      };
      console.log(FeatureCollection);
      const randomId = Math.random().toString(36).substring(2, 15);
      this.selectedFeatureIndexes[randomId] = [];
      let layer = new EditableGeoJsonLayer({
        id: randomId, // Generate a unique id for the new layer
        // name: `${name1}_inside_${name2}_${index}`, // Optionally set a name
        name:layername,
        data: FeatureCollection,
        getLineWidth: 0.1,
        getPointRadius: 1,
        pointType: "circle+text",
        lineWidthMinPixels: 2,
        pointRadiusMinPixels: 5,
        pickable: true,
        filled: true,
        mode: ModifyMode,
        selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
        autoHighlight: true,
        onClick: (info, event) => {
          if (this.editMode) {
            // Initialize selectedFeatureIndexes as a dictionary if not already done

            // Check if a feature is currently selected
            if (
              this.selectedFeatureIndexes[randomId] === null ||
              this.selectedFeatureIndexes[randomId] === undefined
            ) {
              // No feature selected for this layer, so select the current one
              this.selectedFeatureIndexes[randomId] = [info.index];
              this._map.dragging.disable(); // Disable map dragging
            } else {
              // A feature is already selected for this layer
              if (info.index === this.selectedFeatureIndexes[randomId][0]) {
                // Clicked on the same feature, deselect it
                this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
                this._map.dragging.enable();

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === randomId)[0]
                  .clone({ selectedFeatureIndexes: [] }); // Clear selection
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              } else {
                // Clicked on a different feature, update selection for this layer
                this.selectedFeatureIndexes[randomId][0] = info.index;
                this._map.dragging.disable(); // Keep map dragging disabled

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === randomId)[0]
                  .clone({
                    selectedFeatureIndexes: [
                      this.selectedFeatureIndexes[randomId],
                    ],
                  });
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              }
            }
          }
          // Check if a feature is already selected
        },
        onEdit: ({ updatedData, editType }) => {
          // Set the updated GeoJSON data to the layer
          const cloned_ = this._deck.props.layers
            .filter((layer) => layer.id === randomId)[0]
            .clone({ data: updatedData });
          cloned_.visible = true;
          this._deck.setProps({
            layers: this._deck.props.layers.filter(
              (layer) => layer.id !== randomId
            ),
          });
          this._deck.setProps({
            layers: [cloned_, ...this._deck.props.layers],
          });
        },
      });
      layer.visible = true;
      // Add each layer to the map for visual separation
      this._deck.setProps({
        layers: [layer, ...this._deck.props.layers],
      });
      this.layers.push(randomId);
      this.layers_visible[`${name1}_inside_${name2}_${index}`] = randomId;
      let bounds = bbox(FeatureCollection);
      this.layers_bounds[randomId] = [
        bounds[1],
        bounds[0],
        bounds[3],
        bounds[2],
      ];
      dict[`${name1}_inside_${name2}_${index}`] = [randomId, bounds];
    });

    // Object.entries(groupedData).map(([key, data]) => {
    //   const randomId = Math.random().toString(36).substring(2, 15); // Generate a random ID
    //   this.selectedFeatureIndexes[randomId]=[]
    //   // Create a new layer for each group of features
    //   let layer = new EditableGeoJsonLayer({
    //     id: randomId, // Generate a unique id for the new layer
    //     name: `${name}_${prop}_${key}`, // Optionally set a name
    //     data: {
    //       type: 'FeatureCollection',
    //       features: data
    //     },
    //     getLineWidth: 0.1,
    //     getPointRadius: 1,
    //     pointType: 'circle+text',
    //     lineWidthMinPixels: 2,
    //     pointRadiusMinPixels: 5,
    //     pickable: true,
    //     filled: true,
    //     mode: ModifyMode,
    //     selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
    //     autoHighlight: true,
    //     onClick: (info, event) => {

    //       if (this.editMode) {
    //         // Initialize selectedFeatureIndexes as a dictionary if not already done

    //         // Check if a feature is currently selected
    //         if (this.selectedFeatureIndexes[randomId] === null || this.selectedFeatureIndexes[randomId] === undefined) {
    //           // No feature selected for this layer, so select the current one
    //           this.selectedFeatureIndexes[randomId] = [info.index];
    //           this._map.dragging.disable(); // Disable map dragging
    //         } else {
    //           // A feature is already selected for this layer
    //           if (info.index === this.selectedFeatureIndexes[randomId][0]) {
    //             // Clicked on the same feature, deselect it
    //              this.selectedFeatureIndexes[randomId]=[]; // Remove selection for this layer
    //             this._map.dragging.enable();

    //             const cloned_ = this._deck.props.layers
    //               .filter(layer => layer.id === randomId)[0]
    //               .clone({ selectedFeatureIndexes: [] }); // Clear selection
    //             cloned_.visible = true;
    //             this._deck.setProps({ layers: this._deck.props.layers.filter(layer => layer.id !== randomId) });
    //             this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
    //           } else {
    //             // Clicked on a different feature, update selection for this layer
    //             this.selectedFeatureIndexes[randomId][0] = info.index;
    //             this._map.dragging.disable(); // Keep map dragging disabled

    //             const cloned_ = this._deck.props.layers
    //               .filter(layer => layer.id === randomId)[0]
    //               .clone({ selectedFeatureIndexes: [this.selectedFeatureIndexes[randomId]] });
    //             cloned_.visible = true;
    //             this._deck.setProps({ layers: this._deck.props.layers.filter(layer => layer.id !== randomId) });
    //             this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
    //           }
    //       }
    //     }
    //       // Check if a feature is already selected

    //     },
    //     onEdit: ({ updatedData, editType }) => {

    //       // Set the updated GeoJSON data to the layer
    //       const cloned_ = this._deck.props.layers.filter(layer => layer.id === randomId)[0].clone({ data: updatedData })
    //       cloned_.visible = true
    //       this._deck.setProps({ layers: this._deck.props.layers.filter(layer => layer.id !== randomId) });
    //       this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] })

    //     },
    //   });
    //   layer.visible = true
    //   this._deck.setProps({
    //     layers: [layer, ...this._deck.props.layers]
    //   });

    //   this.layers.push(randomId);
    //   this.layers_visible[`${name}_${prop}_${key}`] = randomId;
    //   let bounds = bbox({
    //     type: 'FeatureCollection',
    //     features: data
    //   })
    //   this.layers_bounds[randomId]=[bounds[1],bounds[0],bounds[3],bounds[2]]
    //   dict[key] = [randomId, bounds]

    //   this._update()
    // });

    return dict;
  }

  // VectorUnion(name1, name2, LayerName) {
  //   let data1 = this.getLayerData(name1);
  //   let data2 = this.getLayerData(name2);
  //   const validData1 = data1.features.filter((feature) => feature.geometry);
  //   const validData2 = data2.features.filter((feature) => feature.geometry);

  //   if (validData1.length === 0 || validData2.length === 0) {
  //     console.error("One of the FeatureCollections has no valid geometries.");
  //     return;
  //   }

  //   // Perform the union on valid geometries
  //   const allGeometries = [
  //     ...validData1.map((feature) => feature.geometry),
  //     ...validData2.map((feature) => feature.geometry),
  //   ];

  //   // Perform the union iteratively on all geometries
  //   let unionGeometry = allGeometries[0]; // Start with the first geometry

  //   for (let i = 1; i < allGeometries.length; i++) {
  //     unionGeometry = union(unionGeometry, allGeometries[i]);
  //     console.log(unionGeometry);
  //   }

  //   // Wrap the resulting union geometry in a FeatureCollection
  //   const U = unionGeometry;
  //   console.log(U);
  //   const randomId = Math.floor(1000 + Math.random() * 9000).toString();
  //   this.selectedFeatureIndexes[randomId] = [];

  //   let layers = new EditableGeoJsonLayer({
  //     id: randomId,
  //     name: LayerName,
  //     data: U,
  //     getLineWidth: 0.1,
  //     getPointRadius: 1,
  //     pointType: "circle+text",
  //     // extruded:true,
  //     // getElevation: f => 1000,
  //     // wireframe:true,
  //     lineWidthMinPixels: 2,
  //     pointRadiusMinPixels: 5,
  //     pickable: true,
  //     filled: true,
  //     mode: ModifyMode,
  //     selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
  //     autoHighlight: true,
  //     onClick: (info, event) => {
  //       if (this.editMode) {
  //         // Initialize selectedFeatureIndexes as a dictionary if not already done

  //         // Check if a feature is currently selected
  //         if (
  //           this.selectedFeatureIndexes[randomId] === null ||
  //           this.selectedFeatureIndexes[randomId] === undefined
  //         ) {
  //           // No feature selected for this layer, so select the current one
  //           this.selectedFeatureIndexes[randomId] = [info.index];
  //           this._map.dragging.disable(); // Disable map dragging
  //         } else {
  //           // A feature is already selected for this layer
  //           if (info.index === this.selectedFeatureIndexes[randomId][0]) {
  //             // Clicked on the same feature, deselect it
  //             this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
  //             this._map.dragging.enable();

  //             const cloned_ = this._deck.props.layers
  //               .filter((layer) => layer.id === randomId)[0]
  //               .clone({ selectedFeatureIndexes: [] }); // Clear selection
  //             cloned_.visible = true;
  //             this._deck.setProps({
  //               layers: this._deck.props.layers.filter(
  //                 (layer) => layer.id !== randomId
  //               ),
  //             });
  //             this._deck.setProps({
  //               layers: [cloned_, ...this._deck.props.layers],
  //             });
  //           } else {
  //             // Clicked on a different feature, update selection for this layer
  //             this.selectedFeatureIndexes[randomId][0] = info.index;
  //             this._map.dragging.disable(); // Keep map dragging disabled

  //             const cloned_ = this._deck.props.layers
  //               .filter((layer) => layer.id === randomId)[0]
  //               .clone({
  //                 selectedFeatureIndexes: [
  //                   this.selectedFeatureIndexes[randomId],
  //                 ],
  //               });
  //             cloned_.visible = true;
  //             this._deck.setProps({
  //               layers: this._deck.props.layers.filter(
  //                 (layer) => layer.id !== randomId
  //               ),
  //             });
  //             this._deck.setProps({
  //               layers: [cloned_, ...this._deck.props.layers],
  //             });
  //           }
  //         }
  //       }
  //       // Check if a feature is already selected
  //     },
  //     onEdit: ({ updatedData, editType }) => {
  //       // Set the updated GeoJSON data to the layer
  //       const cloned_ = this._deck.props.layers
  //         .filter((layer) => layer.id === randomId)[0]
  //         .clone({ data: updatedData });
  //       cloned_.visible = true;
  //       this._deck.setProps({
  //         layers: this._deck.props.layers.filter(
  //           (layer) => layer.id !== randomId
  //         ),
  //       });
  //       this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
  //     },
  //   });
  //   layers.visible = true;
  //   this._deck.setProps({
  //     layers: [layers, ...this._deck.props.layers],
  //   });

  //   this.layers.push(randomId);
  //   this.layers_visible[LayerName] = randomId;
  //   let bounds = bbox(U);
  //   return [randomId, bounds];
  // }

  // VectorIntersect(name1, name2, layer) {
  //   let data1 = this.getLayerData(name1);
  //   let data2 = this.getLayerData(name2);
  //   const validData1 = data1.features.filter((feature) => feature.geometry);
  //   const validData2 = data2.features.filter((feature) => feature.geometry);

  //   if (validData1.length === 0 || validData2.length === 0) {
  //     console.error("One of the FeatureCollections has no valid geometries.");
  //     return;
  //   }
  //   let intersectionFeatures = [];

  //   // Loop through each feature in validData1 and validData2
  //   for (const feature1 of validData1) {
  //     for (const feature2 of validData2) {
  //       // Compute intersection for each pair of geometries
  //       const intersection = intersect(feature1.geometry, feature2.geometry);
  //       if (intersection) {
  //         // Wrap the intersection geometry in a Feature and add it to the collection
  //         intersectionFeatures.push(intersection);
  //       }
  //     }
  //   }

  //   // Create a FeatureCollection from the intersections
  //   const intersectionFeatureCollection = {
  //     type: "FeatureCollection",
  //     features: intersectionFeatures,
  //   };

  //   const randomId = Math.floor(1000 + Math.random() * 9000).toString();
  //   this.selectedFeatureIndexes[randomId] = [];
  //   let layers = new EditableGeoJsonLayer({
  //     id: randomId,
  //     name: layer,
  //     data: intersectionFeatureCollection,
  //     getLineWidth: 0.1,
  //     getPointRadius: 1,
  //     pointType: "circle+text",
  //     // extruded:true,
  //     // getElevation: f => 1000,
  //     // wireframe:true,
  //     lineWidthMinPixels: 2,
  //     pointRadiusMinPixels: 5,
  //     pickable: true,
  //     filled: true,
  //     mode: ModifyMode,
  //     selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
  //     autoHighlight: true,
  //     onClick: (info, event) => {
  //       if (this.editMode) {
  //         // Initialize selectedFeatureIndexes as a dictionary if not already done

  //         // Check if a feature is currently selected
  //         if (
  //           this.selectedFeatureIndexes[randomId] === null ||
  //           this.selectedFeatureIndexes[randomId] === undefined
  //         ) {
  //           // No feature selected for this layer, so select the current one
  //           this.selectedFeatureIndexes[randomId] = [info.index];
  //           this._map.dragging.disable(); // Disable map dragging
  //         } else {
  //           // A feature is already selected for this layer
  //           if (info.index === this.selectedFeatureIndexes[randomId][0]) {
  //             // Clicked on the same feature, deselect it
  //             this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
  //             this._map.dragging.enable();

  //             const cloned_ = this._deck.props.layers
  //               .filter((layer) => layer.id === randomId)[0]
  //               .clone({ selectedFeatureIndexes: [] }); // Clear selection
  //             cloned_.visible = true;
  //             this._deck.setProps({
  //               layers: this._deck.props.layers.filter(
  //                 (layer) => layer.id !== randomId
  //               ),
  //             });
  //             this._deck.setProps({
  //               layers: [cloned_, ...this._deck.props.layers],
  //             });
  //           } else {
  //             // Clicked on a different feature, update selection for this layer
  //             this.selectedFeatureIndexes[randomId][0] = info.index;
  //             this._map.dragging.disable(); // Keep map dragging disabled

  //             const cloned_ = this._deck.props.layers
  //               .filter((layer) => layer.id === randomId)[0]
  //               .clone({
  //                 selectedFeatureIndexes: [
  //                   this.selectedFeatureIndexes[randomId],
  //                 ],
  //               });
  //             cloned_.visible = true;
  //             this._deck.setProps({
  //               layers: this._deck.props.layers.filter(
  //                 (layer) => layer.id !== randomId
  //               ),
  //             });
  //             this._deck.setProps({
  //               layers: [cloned_, ...this._deck.props.layers],
  //             });
  //           }
  //         }
  //       }
  //       // Check if a feature is already selected
  //     },
  //     onEdit: ({ updatedData, editType }) => {
  //       // Set the updated GeoJSON data to the layer
  //       const cloned_ = this._deck.props.layers
  //         .filter((layer) => layer.id === randomId)[0]
  //         .clone({ data: updatedData });
  //       cloned_.visible = true;
  //       this._deck.setProps({
  //         layers: this._deck.props.layers.filter(
  //           (layer) => layer.id !== randomId
  //         ),
  //       });
  //       this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
  //     },
  //   });
  //   layers.visible = true;
  //   this._deck.setProps({
  //     layers: [layers, ...this._deck.props.layers],
  //   });

  //   this.layers.push(randomId);
  //   this.layers_visible[layer] = randomId;
  //   let bounds = bbox(intersectionFeatureCollection);
  //   return [randomId, bounds];
  // }

  VectorUnion(name1, name2, LayerName) {
    let data1 = this.getLayerData(name1);
    let data2 = this.getLayerData(name2);

    if (!data1 || !data2) {
      console.error("One or both selected layers have no valid data.");
      return;
    }

    if (
      !data1.features ||
      !Array.isArray(data1.features) ||
      !data2.features ||
      !Array.isArray(data2.features)
    ) {
      console.error("One or both layers do not contain valid 'features'.");
      return;
    }

    const validData1 = data1.features.filter((feature) => feature.geometry);
    const validData2 = data2.features.filter((feature) => feature.geometry);

    if (validData1.length === 0 || validData2.length === 0) {
      console.error("One of the FeatureCollections has no valid geometries.");
      return;
    }

    // Store separate features from both layers
    let unionFeatures = [...validData1, ...validData2];

    // Compute intersections
    validData1.forEach((feature1) => {
      validData2.forEach((feature2) => {
        let intersection = turf.intersect(feature1, feature2);
        if (intersection) {
          // Add intersection as a separate feature
          unionFeatures.push({
            type: "Feature",
            geometry: intersection.geometry,
            properties: { name: "Intersection" },
          });
        }
      });
    });

    // Create the final FeatureCollection
    const unionFeatureCollection = {
      type: "FeatureCollection",
      features: unionFeatures, // Contains original features + intersection features
    };

    console.log("Union Result:", unionFeatureCollection);

    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    this.selectedFeatureIndexes[randomId] = [];

    let layers = new EditableGeoJsonLayer({
      id: randomId,
      name: LayerName,
      data: unionFeatureCollection,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: true,
      mode: ModifyMode,
      selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
      autoHighlight: true,
      onEdit: ({ updatedData }) => {
        const cloned_ = this._deck.props.layers
          .find((layer) => layer.id === randomId)
          .clone({ data: updatedData });

        cloned_.visible = true;
        this._deck.setProps({
          layers: this._deck.props.layers.filter(
            (layer) => layer.id !== randomId
          ),
        });
        this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
      },
    });

    layers.visible = true;
    this._deck.setProps({
      layers: [layers, ...this._deck.props.layers],
    });

    this.layers.push(randomId);
    this.layers_visible[LayerName] = randomId;
    let bounds = bbox(unionFeatureCollection);
    return [randomId, bounds];
  }

  VectorIntersect(name1, name2, layer) {
    let data1 = this.getLayerData(name1);
    let data2 = this.getLayerData(name2);

    if (!data1 || !data2) {
      console.error(
        " One or both selected layers have no valid data.",
        data1,
        data2
      );
      return;
    }

    if (
      !data1.features ||
      !Array.isArray(data1.features) ||
      !data2.features ||
      !Array.isArray(data2.features)
    ) {
      console.error(
        " One or both layers do not contain valid 'features'.",
        data1,
        data2
      );
      return;
    }

    const validData1 = data1.features.filter((feature) => feature.geometry);
    const validData2 = data2.features.filter((feature) => feature.geometry);

    if (validData1.length === 0 || validData2.length === 0) {
      console.error(" One of the FeatureCollections has no valid geometries.");
      return;
    }

    let intersectionFeatures = [];

    for (const feature1 of validData1) {
      for (const feature2 of validData2) {
        const intersection = intersect(feature1.geometry, feature2.geometry);
        if (intersection) {
          intersectionFeatures.push(intersection);
        }
      }
    }

    if (intersectionFeatures.length === 0) {
      console.error(" No intersection found between selected layers.");
      return;
    }

    const intersectionFeatureCollection = {
      type: "FeatureCollection",
      features: intersectionFeatures,
    };

    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    this.selectedFeatureIndexes[randomId] = [];

    let layers = new EditableGeoJsonLayer({
      id: randomId,
      name: layer,
      data: intersectionFeatureCollection,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: true,
      mode: ModifyMode,
      selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
      autoHighlight: true,
      onEdit: ({ updatedData }) => {
        const cloned_ = this._deck.props.layers
          .filter((layer) => layer.id === randomId)[0]
          .clone({ data: updatedData });

        cloned_.visible = true;
        this._deck.setProps({
          layers: this._deck.props.layers.filter(
            (layer) => layer.id !== randomId
          ),
        });
        this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
      },
    });

    layers.visible = true;
    this._deck.setProps({ layers: [layers, ...this._deck.props.layers] });

    this.layers.push(randomId);
    this.layers_visible[layer] = randomId;
    let bounds = bbox(intersectionFeatureCollection);
    return [randomId, bounds];
  }

  VectorSD(name1, name2, layer) {
    let data1 = this.getLayerData(name1);
    let data2 = this.getLayerData(name2);
    const validData1 = data1.features.filter((feature) => feature.geometry);
    const validData2 = data2.features.filter((feature) => feature.geometry);

    if (validData1.length === 0 || validData2.length === 0) {
      console.error("One of the FeatureCollections has no valid geometries.");
      return;
    }
    const allGeometries = [
      ...validData1.map((feature) => feature.geometry),
      ...validData2.map((feature) => feature.geometry),
    ];

    // Step 2: Perform the union iteratively on all geometries
    let unionGeometry = allGeometries[0]; // Start with the first geometry

    for (let i = 1; i < allGeometries.length; i++) {
      unionGeometry = union(unionGeometry, allGeometries[i]);
    }

    // Step 3: Compute the intersection of all valid geometries
    let intersectionGeometries = [];

    // Loop through each feature in validData1 and validData2
    for (const feature1 of validData1) {
      for (const feature2 of validData2) {
        // Compute intersection for each pair of geometries
        const intersection = intersect(feature1, feature2);
        if (intersection) {
          // Add the intersection geometry directly (it should be valid GeoJSON)
          intersectionGeometries.push(intersection);
        }
      }
    }

    // Create a FeatureCollection from the intersections

    // Step 4: Compute the difference between the union and the intersection geometries
    let sd = unionGeometry; // Start with the unionGeometry

    // We need to compute the difference for each intersection
    for (const intersection of intersectionGeometries) {
      sd = difference(sd, intersection);
    }

    // Optional: Wrap the resulting geometry in a FeatureCollection if needed
    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    this.selectedFeatureIndexes[randomId] = [];
    let layers = new EditableGeoJsonLayer({
      id: randomId,
      name: layer,
      data: sd,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      // extruded:true,
      // getElevation: f => 1000,
      // wireframe:true,
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: true,
      mode: ModifyMode,
      selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
      autoHighlight: true,
      onClick: (info, event) => {
        if (this.editMode) {
          // Initialize selectedFeatureIndexes as a dictionary if not already done

          // Check if a feature is currently selected
          if (
            this.selectedFeatureIndexes[randomId] === null ||
            this.selectedFeatureIndexes[randomId] === undefined
          ) {
            // No feature selected for this layer, so select the current one
            this.selectedFeatureIndexes[randomId] = [info.index];
            this._map.dragging.disable(); // Disable map dragging
          } else {
            // A feature is already selected for this layer
            if (info.index === this.selectedFeatureIndexes[randomId][0]) {
              // Clicked on the same feature, deselect it
              this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
              this._map.dragging.enable();

              const cloned_ = this._deck.props.layers
                .filter((layer) => layer.id === randomId)[0]
                .clone({ selectedFeatureIndexes: [] }); // Clear selection
              cloned_.visible = true;
              this._deck.setProps({
                layers: this._deck.props.layers.filter(
                  (layer) => layer.id !== randomId
                ),
              });
              this._deck.setProps({
                layers: [cloned_, ...this._deck.props.layers],
              });
            } else {
              // Clicked on a different feature, update selection for this layer
              this.selectedFeatureIndexes[randomId][0] = info.index;
              this._map.dragging.disable(); // Keep map dragging disabled

              const cloned_ = this._deck.props.layers
                .filter((layer) => layer.id === randomId)[0]
                .clone({
                  selectedFeatureIndexes: [
                    this.selectedFeatureIndexes[randomId],
                  ],
                });
              cloned_.visible = true;
              this._deck.setProps({
                layers: this._deck.props.layers.filter(
                  (layer) => layer.id !== randomId
                ),
              });
              this._deck.setProps({
                layers: [cloned_, ...this._deck.props.layers],
              });
            }
          }
        }
        // Check if a feature is already selected
      },
      onEdit: ({ updatedData, editType }) => {
        // Set the updated GeoJSON data to the layer
        const cloned_ = this._deck.props.layers
          .filter((layer) => layer.id === randomId)[0]
          .clone({ data: updatedData });
        cloned_.visible = true;
        this._deck.setProps({
          layers: this._deck.props.layers.filter(
            (layer) => layer.id !== randomId
          ),
        });
        this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
      },
    });
    layers.visible = true;
    this._deck.setProps({
      layers: [layers, ...this._deck.props.layers],
    });

    this.layers.push(randomId);
    this.layers_visible[layer] = randomId;
    let bounds = bbox(sd);
    return [randomId, bounds];
  }
  // VectorMerge(name1, name2, layer) {
  //   let data1 = this.getLayerData(name1);
  //   let data2 = this.getLayerData(name2);
  //   let mergedCollection = {
  //     type: "FeatureCollection",
  //     features: [],
  //   };
  //   if (
  //     data1.type === "FeatureCollection" &&
  //     data2.type === "FeatureCollection"
  //   ) {
  //     // Combine features from both FeatureCollections
  //     let mergedFeatures = [...data1.features, ...data2.features];

  //     // Create a new FeatureCollection from the merged features
  //     mergedCollection = {
  //       type: "FeatureCollection",
  //       features: mergedFeatures,
  //     };
  //   } else {
  //     console.error(
  //       "One or both of the provided data sources are not valid FeatureCollections."
  //     );
  //   }
  //   const randomId = Math.floor(1000 + Math.random() * 9000).toString();
  //   this.selectedFeatureIndexes[randomId] = [];
  //   let layers = new EditableGeoJsonLayer({
  //     id: randomId,
  //     name: layer,
  //     data: mergedCollection,
  //     getLineWidth: 0.1,
  //     getPointRadius: 1,
  //     pointType: "circle+text",
  //     // extruded:true,
  //     // getElevation: f => 1000,
  //     // wireframe:true,
  //     lineWidthMinPixels: 2,
  //     pointRadiusMinPixels: 5,
  //     pickable: true,
  //     filled: true,
  //     mode: ModifyMode,
  //     selectedFeatureIndexes: this.selectedFeatureIndexes,
  //     autoHighlight: true,
  //     onClick: (info, event) => {
  //       if (this.editMode) {
  //         // Initialize selectedFeatureIndexes as a dictionary if not already done

  //         // Check if a feature is currently selected
  //         if (
  //           this.selectedFeatureIndexes[randomId] === null ||
  //           this.selectedFeatureIndexes[randomId] === undefined
  //         ) {
  //           // No feature selected for this layer, so select the current one
  //           this.selectedFeatureIndexes[randomId] = [info.index];
  //           this._map.dragging.disable(); // Disable map dragging
  //         } else {
  //           // A feature is already selected for this layer
  //           if (info.index === this.selectedFeatureIndexes[randomId][0]) {
  //             // Clicked on the same feature, deselect it
  //             this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
  //             this._map.dragging.enable();

  //             const cloned_ = this._deck.props.layers
  //               .filter((layer) => layer.id === randomId)[0]
  //               .clone({ selectedFeatureIndexes: [] }); // Clear selection
  //             cloned_.visible = true;
  //             this._deck.setProps({
  //               layers: this._deck.props.layers.filter(
  //                 (layer) => layer.id !== randomId
  //               ),
  //             });
  //             this._deck.setProps({
  //               layers: [cloned_, ...this._deck.props.layers],
  //             });
  //           } else {
  //             // Clicked on a different feature, update selection for this layer
  //             this.selectedFeatureIndexes[randomId][0] = info.index;
  //             this._map.dragging.disable(); // Keep map dragging disabled

  //             const cloned_ = this._deck.props.layers
  //               .filter((layer) => layer.id === randomId)[0]
  //               .clone({
  //                 selectedFeatureIndexes: [
  //                   this.selectedFeatureIndexes[randomId],
  //                 ],
  //               });
  //             cloned_.visible = true;
  //             this._deck.setProps({
  //               layers: this._deck.props.layers.filter(
  //                 (layer) => layer.id !== randomId
  //               ),
  //             });
  //             this._deck.setProps({
  //               layers: [cloned_, ...this._deck.props.layers],
  //             });
  //           }
  //         }
  //       }
  //       // Check if a feature is already selected
  //     },
  //     onEdit: ({ updatedData, editType }) => {
  //       // Set the updated GeoJSON data to the layer
  //       const cloned_ = this._deck.props.layers
  //         .filter((layer) => layer.id === randomId)[0]
  //         .clone({ data: updatedData });
  //       cloned_.visible = true;
  //       this._deck.setProps({
  //         layers: this._deck.props.layers.filter(
  //           (layer) => layer.id !== randomId
  //         ),
  //       });
  //       this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
  //     },
  //   });
  //   layers.visible = true;
  //   this._deck.setProps({
  //     layers: [layers, ...this._deck.props.layers],
  //   });

  //   this.layers.push(randomId);
  //   this.layers_visible[layer] = randomId;
  //   let bounds = bbox(mergedCollection);
  //   return [randomId, bounds];
  // }

  // VectorClip(name1, name2, layer) {
  //   let data1 = this.getLayerData(name1); // The data you want to clip
  //   let data2 = this.getLayerData(name2); // The clipping data

  //   // Create an array to hold the clipped features
  //   let clippedFeatures = [];

  //   // Iterate through each feature in data1
  //   data1.features.forEach((feature1) => {
  //     // Check if feature1 intersects with any feature in data2
  //     data2.features.forEach((feature2) => {
  //       const intersection = intersect(feature1, feature2);
  //       if (intersection) {
  //         // If there's an intersection, push the intersected feature
  //         clippedFeatures.push(intersection);
  //       }
  //     });
  //   });

  //   // Create a new FeatureCollection from the clipped features
  //   let clippedCollection = featureCollection(clippedFeatures);

  //   // Log the clipped FeatureCollection

  //   const randomId = Math.floor(1000 + Math.random() * 9000).toString();
  //   this.selectedFeatureIndexes[randomId] = [];
  //   const cloned_ = this._deck.props.layers
  //     .filter((layer) => layer.id === this.layers_visible[name1])[0]
  //     .clone({
  //       data: clippedCollection,
  //       id: randomId,
  //       onClick: (info, event) => {
  //         if (this.editMode) {
  //           // Initialize selectedFeatureIndexes as a dictionary if not already done

  //           // Check if a feature is currently selected
  //           if (
  //             this.selectedFeatureIndexes[randomId] === null ||
  //             this.selectedFeatureIndexes[randomId] === undefined
  //           ) {
  //             // No feature selected for this layer, so select the current one
  //             this.selectedFeatureIndexes[randomId] = [info.index];
  //             this._map.dragging.disable(); // Disable map dragging
  //           } else {
  //             // A feature is already selected for this layer
  //             if (info.index === this.selectedFeatureIndexes[randomId][0]) {
  //               // Clicked on the same feature, deselect it
  //               this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
  //               this._map.dragging.enable();

  //               const cloned_ = this._deck.props.layers
  //                 .filter((layer) => layer.id === randomId)[0]
  //                 .clone({ selectedFeatureIndexes: [] }); // Clear selection
  //               cloned_.visible = true;
  //               this._deck.setProps({
  //                 layers: this._deck.props.layers.filter(
  //                   (layer) => layer.id !== randomId
  //                 ),
  //               });
  //               this._deck.setProps({
  //                 layers: [cloned_, ...this._deck.props.layers],
  //               });
  //             } else {
  //               // Clicked on a different feature, update selection for this layer
  //               this.selectedFeatureIndexes[randomId][0] = info.index;
  //               this._map.dragging.disable(); // Keep map dragging disabled

  //               const cloned_ = this._deck.props.layers
  //                 .filter((layer) => layer.id === randomId)[0]
  //                 .clone({
  //                   selectedFeatureIndexes: [
  //                     this.selectedFeatureIndexes[randomId],
  //                   ],
  //                 });
  //               cloned_.visible = true;
  //               this._deck.setProps({
  //                 layers: this._deck.props.layers.filter(
  //                   (layer) => layer.id !== randomId
  //                 ),
  //               });
  //               this._deck.setProps({
  //                 layers: [cloned_, ...this._deck.props.layers],
  //               });
  //             }
  //           }
  //         }
  //         // Check if a feature is already selected
  //       },
  //       onEdit: ({ updatedData, editType }) => {
  //         // Set the updated GeoJSON data to the layer
  //         console.log(editType);
  //         const cloned_ = this._deck.props.layers
  //           .filter((layer) => layer.id === randomId)[0]
  //           .clone({ data: updatedData });
  //         cloned_.visible = true;
  //         this._deck.setProps({
  //           layers: this._deck.props.layers.filter(
  //             (layer) => layer.id !== randomId
  //           ),
  //         });
  //         this._deck.setProps({
  //           layers: [cloned_, ...this._deck.props.layers],
  //         });
  //       },
  //     });
  //   cloned_.visible = true;

  //   this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
  //   // let layers = new EditableGeoJsonLayer({
  //   //   id: randomId,
  //   //   name: layer,
  //   //   data: clippedCollection,
  //   //   getLineWidth: 0.1,
  //   //   getPointRadius: 1,
  //   //   pointType: 'circle+text',
  //   //   // extruded:true,
  //   //   // getElevation: f => 1000,
  //   //   // wireframe:true,
  //   //   lineWidthMinPixels: 2,
  //   //   pointRadiusMinPixels: 5,
  //   //   pickable: true,
  //   //   filled: true,
  //   //   mode: ModifyMode,
  //   //   selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
  //   //   autoHighlight: true,
  //   //   onClick: (info, event) => {

  //   //     if (this.editMode) {
  //   //       // Initialize selectedFeatureIndexes as a dictionary if not already done

  //   //       // Check if a feature is currently selected
  //   //       if (this.selectedFeatureIndexes[randomId] === null || this.selectedFeatureIndexes[randomId] === undefined) {
  //   //         // No feature selected for this layer, so select the current one
  //   //         this.selectedFeatureIndexes[randomId] = [info.index];
  //   //         this._map.dragging.disable(); // Disable map dragging
  //   //       } else {
  //   //         // A feature is already selected for this layer
  //   //         if (info.index === this.selectedFeatureIndexes[randomId][0]) {
  //   //           // Clicked on the same feature, deselect it
  //   //            this.selectedFeatureIndexes[randomId]=[]; // Remove selection for this layer
  //   //           this._map.dragging.enable();

  //   //           const cloned_ = this._deck.props.layers
  //   //             .filter(layer => layer.id === randomId)[0]
  //   //             .clone({ selectedFeatureIndexes: [] }); // Clear selection
  //   //           cloned_.visible = true;
  //   //           this._deck.setProps({ layers: this._deck.props.layers.filter(layer => layer.id !== randomId) });
  //   //           this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
  //   //         } else {
  //   //           // Clicked on a different feature, update selection for this layer
  //   //           this.selectedFeatureIndexes[randomId][0] = info.index;
  //   //           this._map.dragging.disable(); // Keep map dragging disabled

  //   //           const cloned_ = this._deck.props.layers
  //   //             .filter(layer => layer.id === randomId)[0]
  //   //             .clone({ selectedFeatureIndexes: [this.selectedFeatureIndexes[randomId]] });
  //   //           cloned_.visible = true;
  //   //           this._deck.setProps({ layers: this._deck.props.layers.filter(layer => layer.id !== randomId) });
  //   //           this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
  //   //         }
  //   //     }
  //   //   }
  //   //     // Check if a feature is already selected

  //   //   },
  //   //   onEdit: ({ updatedData, editType }) => {

  //   //     // Set the updated GeoJSON data to the layer
  //   //     const cloned_ = this._deck.props.layers.filter(layer => layer.id === randomId)[0].clone({ data: updatedData })
  //   //     cloned_.visible = true
  //   //     this._deck.setProps({ layers: this._deck.props.layers.filter(layer => layer.id !== randomId) });
  //   //     this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] })

  //   //   },

  //   // })
  //   // layers.visible = true
  //   // this._deck.setProps({
  //   //   layers: [layers, ...this._deck.props.layers]
  //   // });

  //   this.layers.push(randomId);
  //   this.layers_visible[layer] = randomId;
  //   let bounds = bbox(clippedCollection);
  //   return [randomId, bounds];
  // }

  VectorMerge(name1, name2, LayerName) {
    let data1 = this.getLayerData(name1);
    let data2 = this.getLayerData(name2);
    const validData1 = data1.features.filter((feature) => feature.geometry);
    const validData2 = data2.features.filter((feature) => feature.geometry);

    if (validData1.length === 0 || validData2.length === 0) {
      console.error("One of the FeatureCollections has no valid geometries.");
      return;
    }

    // Perform the union on valid geometries
    const allGeometries = [
      ...validData1.map((feature) => feature.geometry),
      ...validData2.map((feature) => feature.geometry),
    ];

    // Perform the union iteratively on all geometries
    let unionGeometry = allGeometries[0]; // Start with the first geometry

    for (let i = 1; i < allGeometries.length; i++) {
      unionGeometry = union(unionGeometry, allGeometries[i]);
      console.log(unionGeometry);
    }

    // Wrap the resulting union geometry in a FeatureCollection
    const U = unionGeometry;
    console.log(U);
    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    this.selectedFeatureIndexes[randomId] = [];

    let layers = new EditableGeoJsonLayer({
      id: randomId,
      name: LayerName,
      data: U,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      // extruded:true,
      // getElevation: f => 1000,
      // wireframe:true,
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: true,
      mode: ModifyMode,
      selectedFeatureIndexes: this.selectedFeatureIndexes[randomId],
      autoHighlight: true,
      onClick: (info, event) => {
        if (this.editMode) {
          // Initialize selectedFeatureIndexes as a dictionary if not already done

          // Check if a feature is currently selected
          if (
            this.selectedFeatureIndexes[randomId] === null ||
            this.selectedFeatureIndexes[randomId] === undefined
          ) {
            // No feature selected for this layer, so select the current one
            this.selectedFeatureIndexes[randomId] = [info.index];
            this._map.dragging.disable(); // Disable map dragging
          } else {
            // A feature is already selected for this layer
            if (info.index === this.selectedFeatureIndexes[randomId][0]) {
              // Clicked on the same feature, deselect it
              this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
              this._map.dragging.enable();

              const cloned_ = this._deck.props.layers
                .filter((layer) => layer.id === randomId)[0]
                .clone({ selectedFeatureIndexes: [] }); // Clear selection
              cloned_.visible = true;
              this._deck.setProps({
                layers: this._deck.props.layers.filter(
                  (layer) => layer.id !== randomId
                ),
              });
              this._deck.setProps({
                layers: [cloned_, ...this._deck.props.layers],
              });
            } else {
              // Clicked on a different feature, update selection for this layer
              this.selectedFeatureIndexes[randomId][0] = info.index;
              this._map.dragging.disable(); // Keep map dragging disabled

              const cloned_ = this._deck.props.layers
                .filter((layer) => layer.id === randomId)[0]
                .clone({
                  selectedFeatureIndexes: [
                    this.selectedFeatureIndexes[randomId],
                  ],
                });
              cloned_.visible = true;
              this._deck.setProps({
                layers: this._deck.props.layers.filter(
                  (layer) => layer.id !== randomId
                ),
              });
              this._deck.setProps({
                layers: [cloned_, ...this._deck.props.layers],
              });
            }
          }
        }
        // Check if a feature is already selected
      },
      onEdit: ({ updatedData, editType }) => {
        // Set the updated GeoJSON data to the layer
        const cloned_ = this._deck.props.layers
          .filter((layer) => layer.id === randomId)[0]
          .clone({ data: updatedData });
        cloned_.visible = true;
        this._deck.setProps({
          layers: this._deck.props.layers.filter(
            (layer) => layer.id !== randomId
          ),
        });
        this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
      },
    });
    layers.visible = true;
    this._deck.setProps({
      layers: [layers, ...this._deck.props.layers],
    });

    this.layers.push(randomId);
    this.layers_visible[LayerName] = randomId;
    let bounds = bbox(U);
    return [randomId, bounds];
  }

  VectorClip(name1, name2, layer) {
    let data1 = this.getLayerData(name1); // The data you want to clip
    let data2 = this.getLayerData(name2); // The clipping data

    if (!data1 || !data2) {
      console.error(
        "One or both selected layers have no valid data.",
        data1,
        data2
      );
      return;
    }

    if (
      !data1.features ||
      !Array.isArray(data1.features) ||
      !data2.features ||
      !Array.isArray(data2.features)
    ) {
      console.error(
        "One or both layers do not contain valid 'features'.",
        data1,
        data2
      );
      return;
    }

    let clippedFeatures = [];

    data1.features.forEach((feature1) => {
      data2.features.forEach((feature2) => {
        const intersection = intersect(feature1, feature2);
        if (intersection) {
          clippedFeatures.push(intersection);
        }
      });
    });

    let clippedCollection = featureCollection(clippedFeatures);

    // Generate a random ID for the new clipped layer
    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    this.selectedFeatureIndexes[randomId] = [];

    // 🔹 Validate `this.layers_visible[name1]` before filtering
    if (!this.layers_visible[name1]) {
      console.error(`Layer ID for "${name1}" not found in layers_visible.`);
      return;
    }

    let targetLayerId = this.layers_visible[name1];
    let existingLayer = this._deck.props.layers.find(
      (layer) => layer.id === targetLayerId
    );

    if (!existingLayer) {
      console.error(
        `Layer "${targetLayerId}" not found in _deck.props.layers.`
      );
      return;
    }

    const cloned_ = existingLayer.clone({
      data: clippedCollection,
      id: randomId,
      onClick: (info, event) => {
        if (this.editMode) {
          if (!this.selectedFeatureIndexes[randomId]) {
            this.selectedFeatureIndexes[randomId] = [info.index];
            this._map.dragging.disable();
          } else {
            if (info.index === this.selectedFeatureIndexes[randomId][0]) {
              this.selectedFeatureIndexes[randomId] = [];
              this._map.dragging.enable();

              const cloned_ = this._deck.props.layers
                .find((layer) => layer.id === randomId)
                ?.clone({ selectedFeatureIndexes: [] });

              if (cloned_) {
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              }
            } else {
              this.selectedFeatureIndexes[randomId][0] = info.index;
              this._map.dragging.disable();

              const cloned_ = this._deck.props.layers
                .find((layer) => layer.id === randomId)
                ?.clone({
                  selectedFeatureIndexes: [
                    this.selectedFeatureIndexes[randomId],
                  ],
                });

              if (cloned_) {
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              }
            }
          }
        }
      },
      onEdit: ({ updatedData }) => {
        const cloned_ = this._deck.props.layers
          .find((layer) => layer.id === randomId)
          ?.clone({ data: updatedData });

        if (cloned_) {
          cloned_.visible = true;
          this._deck.setProps({
            layers: this._deck.props.layers.filter(
              (layer) => layer.id !== randomId
            ),
          });
          this._deck.setProps({
            layers: [cloned_, ...this._deck.props.layers],
          });
        }
      },
    });

    cloned_.visible = true;
    this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });

    this.layers.push(randomId);
    this.layers_visible[layer] = randomId;
    let bounds = bbox(clippedCollection);
    return [randomId, bounds];
  }

  VectorBuffer(name1, buff, layer) {
    let data1 = this.getLayerData(name1); // The data you want to clip
    // The clipping data

    // Create an array to hold the clipped features
    let buf = buffer(data1, parseFloat(buff), { units: "meters" });

    // Log the clipped FeatureCollection

    const randomId = Math.floor(1000 + Math.random() * 9000).toString();
    this.selectedFeatureIndexes[randomId] = [];
    const cloned_ = this._deck.props.layers
      .filter((layer) => layer.id === this.layers_visible[name1])[0]
      .clone({
        data: buf,
        id: randomId,
        onClick: (info, event) => {
          if (this.editMode) {
            // Initialize selectedFeatureIndexes as a dictionary if not already done

            // Check if a feature is currently selected
            if (
              this.selectedFeatureIndexes[randomId] === null ||
              this.selectedFeatureIndexes[randomId] === undefined
            ) {
              // No feature selected for this layer, so select the current one
              this.selectedFeatureIndexes[randomId] = [info.index];
              this._map.dragging.disable(); // Disable map dragging
            } else {
              // A feature is already selected for this layer
              if (info.index === this.selectedFeatureIndexes[randomId][0]) {
                // Clicked on the same feature, deselect it
                this.selectedFeatureIndexes[randomId] = []; // Remove selection for this layer
                this._map.dragging.enable();

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === randomId)[0]
                  .clone({ selectedFeatureIndexes: [] }); // Clear selection
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              } else {
                // Clicked on a different feature, update selection for this layer
                this.selectedFeatureIndexes[randomId][0] = info.index;
                this._map.dragging.disable(); // Keep map dragging disabled

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === randomId)[0]
                  .clone({
                    selectedFeatureIndexes: [
                      this.selectedFeatureIndexes[randomId],
                    ],
                  });
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== randomId
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              }
            }
          }
          // Check if a feature is already selected
        },
        onEdit: ({ updatedData, editType }) => {
          // Set the updated GeoJSON data to the layer
          console.log(editType);
          const cloned_ = this._deck.props.layers
            .filter((layer) => layer.id === randomId)[0]
            .clone({ data: updatedData });
          cloned_.visible = true;
          this._deck.setProps({
            layers: this._deck.props.layers.filter(
              (layer) => layer.id !== randomId
            ),
          });
          this._deck.setProps({
            layers: [cloned_, ...this._deck.props.layers],
          });
        },
      });
    cloned_.visible = true;

    this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });

    this.layers.push(randomId);
    this.layers_visible[layer] = randomId;
    let bounds = bbox(buf);
    return [randomId, bounds];
  }

  // VectorBuffer(name1, buff, layer) {
  //   let data1 = this.getLayerData(name1);
  //   if (!data1 || !data1.features || data1.features.length === 0) {
  //     console.error(`No valid data found for layer: ${name1}`);
  //     return;
  //   }

  //   let buf = buffer(data1, parseFloat(buff), { units: "meters" });
  //   if (!buf || !buf.features || buf.features.length === 0) {
  //     console.error("Buffer operation failed or returned empty result.");
  //     return;
  //   }

  //   const randomId = name1; // Keep ID consistent with the original layer name
  //   this.selectedFeatureIndexes[randomId] = [];

  //   // Ensure layers_visible maps the correct ID
  //   this.layers_visible[name1] = randomId;

  //   const layerId = this.getLayerId(name1);
  //   console.log(`Layer ID fetched: ${layerId}`);

  //   if (!layerId) {
  //     console.error(`No visible layer found for ${name1} in layers_visible`);
  //     return;
  //   }

  //   const targetLayer = this._deck.props.layers.find(
  //     (layer) => layer.id === layerId
  //   );
  //   console.log(`Target Layer found:`, targetLayer);

  //   if (!targetLayer) {
  //     console.error(`Layer ${layerId} not found in _deck.props.layers`);
  //     console.error(
  //       `Available layers:`,
  //       this._deck.props.layers.map((l) => l.id)
  //     );
  //     return;
  //   }

  //   const cloned_ = targetLayer.clone({
  //     data: buf,
  //     id: randomId, // Ensure the ID remains consistent
  //     getLineColor: [255, 0, 0], 
  //     // getFillColor: [0, 0, 255, 120], 
  //     getLineWidth:0.1,
  //     getPointRadius: 1,
  //     pickable: true,
  //     filled: true,
  //     onClick: (info, event) => this.handleFeatureClick(info, randomId),
  //     // onEdit: ({ updatedData }) => this.updateLayerData(updatedData, randomId),
  //     onEdit: function ({ updatedData }) {
  //       console.log("this in onEdit:", this);
  //       if (typeof this.updateLayerData === "function") {
  //         this.updateLayerData(updatedData, randomId);
  //       } else {
  //         console.error(
  //           "updateLayerData is not defined in this context!",
  //           this
  //         );
  //       }
  //     }.bind(this),
  //   });

  //   cloned_.visible = true;

  //   this._deck.setProps({
  //     layers: [
  //       cloned_,
  //       ...this._deck.props.layers.filter((layer) => layer.id !== randomId),
  //     ],
  //   });

  //   this.layers.push(randomId);
  //   let bounds = bbox(buf);

  //   return [randomId, bounds];
  // }

  updateLayerData(updatedData, layerId) {
    console.log(`Updating layer ${layerId} with new data:`, updatedData);
  }
  HighlightFeatures(name, rows) {
    // Find the layer by name
    const layer = this._deck.props.layers.find((layer) => layer.id === name);
    let cloned_ = null;
    let first = null;
    try {
      first = this._deck.props.layers.filter(
        (layer) => layer.id === `${name}-highlight`
      )[0];
    } catch (e) {}
    if (first) {
      cloned_ = first.clone({
        getLineColor: (object) => {
          const value = object.properties[Object.keys(object.properties)[0]];

          // Get the original color or default to black if no color is set
          const originalColor = this.layers_color[name]
            ? this.hexToRgbA(this.layers_color[name])
            : [0, 0, 0, 255];

          // Create the highlighted color by adjusting the brightness
          const highlightedColor = originalColor.map(
            (channel, index) => (index < 3 ? 255 - channel : channel) // Increase RGB channels for brightness
          );

          // Return the highlighted color if `rows` has the value, otherwise return the original color
          return rows.has(value) ? highlightedColor : [0, 0, 0, 0];
        },
      });
      this._deck.setProps({
        layers: this._deck.props.layers.filter(
          (layer) => layer.id !== `${name}-highlight`
        ),
      });
      this._update();
    } else {
      cloned_ = layer.clone({
        id: `${name}-highlight`,
        getLineColor: (object) => {
          const value = object.properties[Object.keys(object.properties)[0]];

          // Get the original color or default to black if no color is set
          const originalColor = this.layers_color[name]
            ? this.hexToRgbA(this.layers_color[name])
            : [0, 0, 0, 255];

          // Create the highlighted color by adjusting the brightness
          const highlightedColor = originalColor.map(
            (channel, index) => (index < 3 ? 255 - channel : channel) // Increase RGB channels for brightness
          );

          // Return the highlighted color if `rows` has the value, otherwise return the original color
          return rows.has(value) ? highlightedColor : [0, 0, 0, 0];
        },
      });
    }
    // Clone the layer with modified color properties

    // Update layer visibility based on `checked`
    cloned_.visible = true;

    // Update deck's layers by replacing the target layer

    // Add cloned layer after a short delay to ensure the update

    if (rows.size) {
      setTimeout(() => {
        this._deck.setProps({ layers: [...this._deck.props.layers, cloned_] });
        this._update();
      }, 10);
    }

    // Call update method if necessary
    this._update();
  }

  RemoveHighlight(name) {
    let first = null;
    try {
      first = this._deck.props.layers.filter(
        (layer) => layer.id === `${name}-highlight`
      )[0];
    } catch (e) {}
    if (first) {
      this._deck.setProps({
        layers: this._deck.props.layers.filter(
          (layer) => layer.id !== `${name}-highlight`
        ),
      });
      this._update();
    }
  }

  getProp_2(data) {
    if (data && data.name) {
      const result = this.getProps(data.name, true);
      if (data.resolve && result.length > 0) {
        data.resolve(result);
      } else {
        console.error("Resolve function is missing in data");
      }
    } else {
      console.error("Data or data.name is missing");
    }
  }

  hexToRgbA(hex) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split("");
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = "0x" + c.join("");
      return [(c >> 16) & 255, (c >> 8) & 255, c & 255, 255];
    }
    throw new Error("Bad Hex");
  }
  changeAngle(pos) {
    this.angle += pos;
    updateDeckView(this._deck, this._map, this.angle, this.bearing);
  }
  changeBearing(pos) {
    this.bearing += pos;
    updateDeckView(this._deck, this._map, this.angle, this.bearing);
  }
  threeD(val) {
    try {
      if (val) {
        this._deck.props.layers.filter(
          (layer) => layer.id === "THREED"
        )[0].visible = true;
        var mapPane = document.querySelector(".leaflet-map-pane");
        if (mapPane) {
          mapPane.style.display = `block`;
        }
      } else {
        this.angle = 0;
        this.bearing = 0;
        this._deck.props.layers.filter(
          (layer) => layer.id === "THREED"
        )[0].visible = false;
        var mapPane = document.querySelector(".leaflet-map-pane");
        if (mapPane) {
          mapPane.style.display = `block`;
        }
      }
      this._update();
    } catch (e) {}
  }
  addLayerUrl(name, url) {
    let layer = new GeoJsonLayer({
      id: name,
      data: url,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      getLineColor: [0, 0, 0],
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: false,
      visible: true,
      onDataLoad: (data) => {
        let box = bbox(data);
        let bounds = [
          [box[1], box[0]],
          [box[3], box[2]],
        ];
        this.layers_bounds[name] = [box[1], box[0], box[3], box[2]];
        this._map.flyToBounds(bounds);
      },
    });
    layer.visible = true;
    this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
    this.layers.push(name);
    this.layers_visible[name] = name;
    this.layers_type_id[name] = "polygon";
  }
  addLayerGeo(name, data) {
    let layer = new GeoJsonLayer({
      id: name,
      data: data,
      getLineWidth: 0.1,
      getPointRadius: 1,
      pointType: "circle+text",
      getLineColor: [0, 0, 0, 255],
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: false,
      visible: true,
    });
    layer.visible = true;
    this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
    this.layers.push(name);
    this.layers_visible[name] = name;
    this.layers_type_id[name] = "polygon";
    let box = bbox(data);
    let bounds = [
      [box[1], box[0]],
      [box[3], box[2]],
    ];
    this.layers_bounds[name] = [box[1], box[0], box[3], box[2]];
    this._map.flyToBounds(bounds);
  }
  async addLayer(
    name,
    id,
    color = null,
    fill = null,
    upload = false,
    bounds = null
  ) {
    color = color ? color : "#000000";
    let url = upload
      ? `https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=useruploads:${name}&srsname=EPSG:4326&outputFormat=application/json`
      : `https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT:${name}&srsname=EPSG:4326&outputFormat=application/json`;
    let layer;
    let line;
    let fillColor;
    if (!this.selectedFeatureIndexes[name]) {
      this.selectedFeatureIndexes[name] = [];
    }
    if (this.layers.includes(name)) {
      this._deck.props.layers.filter(
        (layer) => layer.id === name
      )[0].visible = true;
      let first = null;
      try {
        first = this._deck.props.layers.filter(
          (layer) => layer.id === `${name}-text`
        )[0];
      } catch (e) {}
      if (first) {
        this._deck.props.layers.filter(
          (layer) => layer.id === `${name}-text`
        )[0].visible = true;
      }
    } else {
      if (color[1].length === 7) {
        line = this.hexToRgbA(color[1]);
        fillColor = this.hexToRgbA(color[0]);
      } else {
        line = this.hexToRgbA(color);
        fillColor = this.hexToRgbA(color);
      }
      if (fill) {
        fillColor[3] = 70;
      } else {
        fillColor[3] = 0;
      }
      let type = null;
      this.fire("fetching");
      layer = new EditableGeoJsonLayer({
        id: name,
        data: url,
        getLineWidth: 0.1,
        getPointRadius: 1,
        pointType: "circle+text",
        // extruded:true,
        // getElevation: f => 1000,
        // wireframe:true,
        lineWidthMinPixels: 2,
        pointRadiusMinPixels: 5,
        pickable: true,
        filled: true,
        mode: ModifyMode,
        selectedFeatureIndexes: this.selectedFeatureIndexes[name],
        autoHighlight: true,
        onClick: (info, event) => {
          if (this.editMode) {
            // Initialize selectedFeatureIndexes as a dictionary if not already done

            // Check if a feature is currently selected
            if (
              this.selectedFeatureIndexes[name] === null ||
              this.selectedFeatureIndexes[name] === undefined
            ) {
              // No feature selected for this layer, so select the current one
              this.selectedFeatureIndexes[name] = [info.index];
              this._map.dragging.disable(); // Disable map dragging
            } else {
              // A feature is already selected for this layer
              if (info.index === this.selectedFeatureIndexes[name][0]) {
                // Clicked on the same feature, deselect it
                this.selectedFeatureIndexes[name] = []; // Remove selection for this layer
                this._map.dragging.enable();

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === name)[0]
                  .clone({ selectedFeatureIndexes: [] }); // Clear selection
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== name
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              } else {
                // Clicked on a different feature, update selection for this layer
                this.selectedFeatureIndexes[name][0] = info.index;
                this._map.dragging.disable(); // Keep map dragging disabled

                const cloned_ = this._deck.props.layers
                  .filter((layer) => layer.id === name)[0]
                  .clone({
                    selectedFeatureIndexes: [this.selectedFeatureIndexes[name]],
                  });
                cloned_.visible = true;
                this._deck.setProps({
                  layers: this._deck.props.layers.filter(
                    (layer) => layer.id !== name
                  ),
                });
                this._deck.setProps({
                  layers: [cloned_, ...this._deck.props.layers],
                });
              }
            }
          }
          // Check if a feature is already selected
        },
        onEdit: ({ updatedData, editType }) => {
          // Set the updated GeoJSON data to the layer
          const cloned_ = this._deck.props.layers
            .filter((layer) => layer.id === name)[0]
            .clone({ data: updatedData });
          cloned_.visible = true;
          this._deck.setProps({
            layers: this._deck.props.layers.filter(
              (layer) => layer.id !== name
            ),
          });
          this._deck.setProps({
            layers: [cloned_, ...this._deck.props.layers],
          });
        },
        getLineColor: line,
        getFillColor: (object) => {
          if (
            object.geometry.type === "Point" ||
            object.geometry.type === "MultiPoint"
          ) {
            this.layers_type[id] = "point";
            this.layers_type_id[name] = "point";
            try {
              return this.hexToRgbA(color[0]);
            } catch (e) {
              return this.hexToRgbA(color);
            }
          } else {
            this.layers_type[id] = "polygon";
            this.layers_type_id[name] = "polygon";
            if (
              name === "pune_new_green_cover" ||
              name === "pune_new_building_cover" ||
              name === "pune_new_building_density" ||
              name === "pune_new_green_cover"
            ) {
              let toUse = null;
              toUse = name.includes("green") ? green : building;

              let index = Math.round(object.properties.Density / 0.05);
              return this.hexToRgbA(toUse[index]);
            }
            return fillColor;
          }
        },
        visible: true,
        onDataLoad: (data) => {
          if (upload) {
            this.layers_bounds[name] = [
              bounds[0][0],
              bounds[0][1],
              bounds[1][0],
              bounds[1][1],
            ];
          } else {
            let box = bbox(data);
            this.layers_bounds[name] = [box[1], box[0], box[3], box[2]];
          }
          // console.log(layer.props.data)
          if (upload) {
            this._map.flyToBounds(bounds);
          }
          this.fire("fetched");
        },
      });

      layer.visible = true;
      this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
      this.layers.push(name);
      this.layers_color[name] = color;
    }

    this.layers_visible[id] = name;
    this._update();
    this.fire("layerchange");
  }

  async addCsvMarker(id, geojsonMarkers = null) {
    let layer;

    let name = "Smart AI output";
    if (this.layers.includes(name)) {
      this._deck.props.layers.filter(
        (layer) => layer.id === id
      )[0].visible = true;
    } else {
      this.fire("fetching");

      if (geojsonMarkers) {
        layer = new GeoJsonLayer({
          id: id,
          data: geojsonMarkers,
          getLineWidth: 0.1,
          getPointRadius: 1,
          lineWidthMinPixels: 2,
          pointRadiusMinPixels: 5,
          pickable: true,
          visible: true,
          onDataLoad: (data) => {
            this.fire("fetched");
          },
        });

        layer.visible = true;
        this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
        this.layers.push(id);

        this.layers_visible[name] = id;
        let box = bbox(geojsonMarkers);
        this.layers_bounds[id] = [box[1], box[0], box[3], box[2]];
        this._update();
        this.fire("layerchange");
      } else {
        console.error("No geojsonMarkers provided.");
      }
    }
  }

  addFilterLayer(data, name, color, query) {
    let ids = name + query + Math.random().toString(36).substring(2, 5);
    let col = color ? color : "#000000";
    let layer = new GeoJsonLayer({
      id: ids,
      data: data,
      getLineWidth: 0.1,
      getPointRadius: 1,
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 5,
      pickable: true,
      filled: true,
      getLineColor: this.hexToRgbA(col),
      getFillColor: [0, 0, 0, 0],
      visible: true,
    });
    layer.visible = true;
    this._deck.setProps({ layers: [...this._deck.props.layers, layer] });
    if (name in this.layers_filter) {
      this.layers_filter[name].push([ids, col]);
    } else {
      this.layers_filter = { ...this.layers_filter, [name]: [[ids, col]] };
    }
    this._update();
  }

  getLayerGeo(name) {
    let data = this._deck.props.layers.filter(
      (layer) => layer.id === this.getLayerId(name)
    )[0].props.data;
    let box = bbox(data);
    return [data, [box[1], box[0], box[3], box[2]]];
  }
  getLayerData(name) {
    console.log(" Getting ID for layer:", name);  
    let data = this._deck.props.layers.filter(
      (layer) => layer.id === this.getLayerId(name)
    )[0].props.data;

    return data;
  }

  getLayerId(name) {
    console.log("Current layers_visible mapping:", this.layers_visible);
    return this.layers_visible[name];
  }

  // getLayerData(name) {
  //   console.log(" Getting ID for layer:", name);
  //   console.log(
  //     " Existing layers in _deck.props.layers:",
  //     this._deck.props.layers.map((l) => l.id)
  //   );

  //   if (typeof name !== "string") {
  //     console.error(" Layer name must be a string, got:", name);
  //     return null;
  //   }

  //   let layer = this._deck.props.layers.find((layer) => layer.id === name);

  //   if (!layer) {
  //     console.error(` Layer "${name}" not found in _deck.props.layers.`);
  //     return null;
  //   }

  //   if (!layer.props || !layer.props.data) {
  //     console.error(` Layer "${name}" is missing 'props' or 'data'.`);
  //     return null;
  //   }

  //   let data = layer.props.data;
  //   //  Ensure `data` is always a FeatureCollection
  //   if (data.type === "Feature" && data.geometry) {
  //     data = {
  //       type: "FeatureCollection",
  //       features: [data],
  //     };
  //   }

  //   if (!data.features || !Array.isArray(data.features)) {
  //     console.error(
  //       ` Layer "${name}" does not contain valid GeoJSON features.`,
  //       data
  //     );
  //     return null;
  //   }

  //   console.log(` Layer "${name}" found. Returning data.`);
  //   return data;
  // }

  LayerRename(prev, newName) {
    if (Object.keys(this.layers_visible).includes(prev.split("#")[0])) {
      const { [prev.split("#")[0]]: name, ...rest } = this.layers_visible;
      const newData = { [newName.split("#")[0]]: name, ...rest };
      this.layers_visible = newData;
      delete this.layers_visible[prev.split("#")[0]];
    }
    this._update();
  }
  removeFilterLayer(id, name) {
    this._deck.setProps({
      layers: this._deck.props.layers.filter((layer) => layer.id !== id),
    });
    this.layers_filter[name].splice(
      this.layers_filter[name].findIndex((ele) => ele[0] === id),
      1
    );
    this._update();
  }
  getFilterList(name) {
    if (name in this.layers_filter) {
      return this.layers_filter[name];
    } else {
      return [];
    }
  }
  removeLayerFromMap(name, id) {
    let first = null;
    try {
      first = this._deck.props.layers.filter(
        (layer) => layer.id === `${name}-text`
      )[0];
    } catch (e) {}
    if (first) {
      this._deck.setProps({
        layers: this._deck.props.layers.filter(
          (layer) => layer.id !== `${name}-text`
        ),
      });
    }
    this._deck.setProps({
      layers: this._deck.props.layers.filter((layer) => layer.id !== name),
    });
    delete this.layers_visible[id];
    delete this.layers_color[id];
    delete this.layers_type[id];
    delete this.layers_type_id[name];
    this._update();
    this.fire("layerchange");
  }
  removeLayer(name, id) {
    if (this.layers.includes(name)) {
      try {
        delete this.layers_visible[id];
      } catch (e) {}
      let first = null;
      try {
        first = this._deck.props.layers.filter(
          (layer) => layer.id === `${name}-text`
        )[0];
      } catch (e) {}
      if (first) {
        this._deck.props.layers.filter(
          (layer) => layer.id === `${name}-text`
        )[0].visible = false;
      }
      this._deck.props.layers.filter(
        (layer) => layer.id === name
      )[0].visible = false;
      this._update();
      this.fire("layerchange");
    }
  }
  colorRange(data) {
    try {
      const { name, atr, range, palette, checked } = data;

      const layer = this._deck.props.layers.find((layer) => layer.id === name);
      let minValue = null;
      let maxValue = null;
      const length = layer.props.data.features.length;
      if (atr !== this.layers_last_grad[name]) {
        const features = layer.props.data.features;
        minValue = Infinity;
        maxValue = -Infinity;
        features.forEach((feature) => {
          const value = feature.properties[atr];
          if (value < minValue) minValue = value;
          if (value > maxValue) maxValue = value;
        });
        this.layers_min_max[name] = [minValue, maxValue];
        this.layers_last_grad[name] = atr;
      } else {
        minValue = this.layers_min_max[name][0];
        maxValue = this.layers_min_max[name][1];
      }
      let numColors =
        range !== "norm" ? Math.ceil((maxValue - minValue) / range) : length;
      let norm =
        range === "norm" ? Math.ceil((maxValue - minValue) / length) : range; // Adjust norm for 'norm' range calculation

      const generateColors = (numColors, palette) => {
        const colors = [];
        for (let i = 0; i < numColors; i++) {
          const t = numColors > 1 ? i / (numColors - 1) : 0; // Handle single color case
          if (palette === "Green") {
            colors.push([204 * (1 - t), 255 * (1 - t), 204 * (1 - t)]);
          } else if (palette === "Red") {
            colors.push([255 * (1 - t), 204 * (1 - t), 204 * (1 - t)]);
          } else if (palette === "Red-to-Green") {
            colors.push([
              255 * (1 - t) + 0 * t,
              0 * (1 - t) + 255 * t,
              0 * (1 - t) + 0 * t,
            ]);
          } else if (palette === "Green-to-Red") {
            colors.push([
              0 * (1 - t) + 255 * t,
              255 * (1 - t) + 0 * t,
              0 * (1 - t) + 0 * t,
            ]);
          }
        }
        return colors;
      };

      const colors = generateColors(numColors, palette);

      const cloned_ = layer.clone({
        getFillColor: (object) => {
          const value = object.properties[atr];
          const colorIndex =
            range !== "norm"
              ? Math.floor((value - minValue) / range)
              : Math.floor((value - minValue) / norm);
          return colors[colorIndex % colors.length];
        },
      });

      this._deck.setProps({
        layers: this._deck.props.layers.filter((layer) => layer.id !== name),
      });
      setTimeout(() => {
        cloned_.visible = checked ? true : false;
        this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
        this._update();
      }, 10);
    } catch (e) {
      console.log(e);
    }
  }
  textColorChange(data) {
    const { name, color, checked } = data;
    this.LayerColorChange(`${name}-text`, color, checked, true);
  }
  LayerColorChange(name, color, checked, text = false) {
    try {
      const cloned_ = !text
        ? this.layers_type_id[name] === "polygon"
          ? this._deck.props.layers
              .filter((layer) => layer.id === name)[0]
              .clone({ getLineColor: this.hexToRgbA(color) })
          : this._deck.props.layers
              .filter((layer) => layer.id === name)[0]
              .clone({ getFillColor: this.hexToRgbA(color) })
        : this._deck.props.layers
            .filter((layer) => layer.id === name)[0]
            .clone({ getColor: this.hexToRgbA(color) });
      this._deck.setProps({
        layers: this._deck.props.layers.filter((layer) => layer.id !== name),
      });

      setTimeout(() => {
        cloned_.visible = checked ? true : false;
        this._deck.setProps({ layers: [...this._deck.props.layers, cloned_] });
        this._update();
        this.layers_color[name] = color;
      }, 1);
    } catch (e) {
      console.log(e);
    }
  }
  AddRandom(data) {
    try {
      const { name, checked } = data;
      const cloned_ = this._deck.props.layers
        .filter((layer) => layer.id === name)[0]
        .clone({
          getFillColor: (object) => {
            const color = [
              Math.random() * 255,
              Math.random() * 255,
              Math.random() * 255,
            ];
            return color;
          },
        });
      this._deck.setProps({
        layers: this._deck.props.layers.filter((layer) => layer.id !== name),
      });
      setTimeout(() => {
        cloned_.visible = checked ? true : false;
        this._deck.setProps({ layers: [cloned_, ...this._deck.props.layers] });
        this._update();
      }, 10);
    } catch (e) {
      console.log(e);
    }
  }
  resetLayerColor(data) {
    try {
      const { name, checked } = data;
      const cloned_ =
        this.layers_type_id[name] === "point"
          ? this._deck.props.layers
              .filter((layer) => layer.id === name)[0]
              .clone({
                getFillColor: (object) => {
                  return this.hexToRgbA(this.layers_color[name]);
                },
              })
          : this._deck.props.layers
              .filter((layer) => layer.id === name)[0]
              .clone({
                getFillColor: (feature) => {
                  return [0, 0, 0, 0];
                },
              });
      this._deck.setProps({
        layers: this._deck.props.layers.filter((layer) => layer.id !== name),
      });
      setTimeout(() => {
        cloned_.visible = checked ? true : false;
        this._deck.setProps({ layers: [...this._deck.props.layers, cloned_] });
        this._update();
      }, 10);
    } catch (e) {
      console.log(e);
    }
  }
  LayerOpacityChange(name, opacity, checked, text = false) {
    let color = !text
      ? this._deck.props.layers.filter((layer) => layer.id === name)[0].props
          .getLineColor
      : this._deck.props.layers.filter((layer) => layer.id === name)[0].props
          .getColor;
    const cloned_ = !text
      ? this._deck.props.layers
          .filter((layer) => layer.id === name)[0]
          .clone({
            getLineColor: [color[0], color[1], color[2], 255 * opacity],
          })
      : this._deck.props.layers
          .filter((layer) => layer.id === name)[0]
          .clone({ getColor: [color[0], color[1], color[2], 255 * opacity] });
    this._deck.setProps({
      layers: this._deck.props.layers.filter((layer) => layer.id !== name),
    });
    cloned_.visible = checked ? true : false;
    this._deck.setProps({ layers: [...this._deck.props.layers, cloned_] });
    this._update();
    let first = null;
    try {
      first = this._deck.props.layers.filter(
        (layer) => layer.id === `${name}-text`
      )[0];
    } catch (e) {}
    if (first) {
      this.LayerOpacityChange(`${name}-text`, opacity, checked, true);
    }
  }
  getPositions(feature) {
    const { geometry } = feature;
    if (geometry.type === "Point") {
      return geometry.coordinates;
    } else if (geometry.type === "LineString") {
      // Example: Calculate midpoint for LineString
      const coords = geometry.coordinates;
      const midPoint = [
        (coords[0][0] + coords[1][0]) / 2,
        (coords[0][1] + coords[1][1]) / 2,
      ];
      return midPoint;
    } else if (
      geometry.type === "Polygon" ||
      geometry.type === "MultiPolygon"
    ) {
      return centroid(feature).geometry.coordinates;
    }
  }

  LayerShowAtribute(data) {
    const { name, atr, checked } = data;
    let textLayer = null;
    let first = null;
    try {
      const cloned_ = this._deck.props.layers.filter(
        (layer) => layer.id === name
      )[0];
      try {
        first = this._deck.props.layers.filter(
          (layer) => layer.id === `${name}-text`
        )[0];
      } catch (e) {}
      if (first) {
        textLayer = first.clone({
          getText: (d) => {
            if (atr !== "No Attribute") {
              return String(d.properties[atr]);
            }
            return null;
          },
        });

        this._deck.setProps({
          layers: this._deck.props.layers.filter((layer) => layer !== first),
        });
      } else {
        textLayer = new TextLayer({
          id: `${cloned_.id}-text`,
          data: cloned_.props.data.features,
          getPosition: this.getPositions,
          getText: (d) => {
            if (atr !== "No Attribute") {
              return String(d.properties[atr]);
            }
            return null;
          },
          getColor: [0, 0, 0, 255],
          background: true,
          getBackgroundColor: [255, 255, 255, 100],
          getSize: 15,
          maxWidth: 10,
          outlineWidth: 5,
          outlineColor: [255, 255, 255, 255],
          getTextAnchor: "middle",
          getAlignmentBaseline: "bottom",
          fontFamily: "Roboto, sans-serif",
          sdf: true,
          characterSet: "auto",
          pickable: false,
        });
      }

      setTimeout(() => {
        textLayer.visible = checked ? true : false;
        this._deck.setProps({
          layers: [...this._deck.props.layers, textLayer],
        });
        this._update();
      }, 10);
    } catch (e) {
      console.log(e);
    }
  }
  getLayers() {
    return this.layers_visible ? Object.keys(this.layers_visible) : [];
  }
  getLayersColor() {
    let res = [];
    Object.keys(this.layers_visible).forEach((key) => {
      try {
        res.push({
          name: key,
          color: this.layers_color[this.layers_visible[key]],
          type: this.layers_type[key],
        });
      } catch (e) {
        console.log(e);
      }
    });
    return res;
  }

  GetLayerName(id) {
    for (let ele in this.layers_visible) {
      if (this.layers_visible[ele] === id) {
        console.log(ele, id);
        return ele; // return the layer name once found
      }
    }
    return undefined; // return undefined if no match is found
  }
  getProps(name, type = false) {
    if (name in this.layers_visible) {
      const properties = this._deck.props.layers.filter(
        (layer) => layer.id === this.layers_visible[name]
      )[0].props.data.features[0].properties;

      if (type) {
        return Object.keys(properties).map((key) => ({
          key: key,
          type: typeof properties[key],
        }));
      } else {
        return Object.keys(properties);
      }
    } else {
      return [];
    }
  }

  async ValidateQuery(name, query, color, box = null) {
    let queries = query;
    if (box) {
      const bboxCondition = `bbox(the_geom,${box[0]},${box[1]},${box[2]},${box[3]})`;
      if (queries !== "") {
        queries = bboxCondition + " AND " + queries;
      } else {
        queries = bboxCondition;
      }
    }
    this.fire("loading");
    let url = this.layers_visible[name].includes("upload")
      ? `https://geoserver.vasundharaa.in/geoserver/useruploads/ows?service=WFS&version=1.0.0&request=GetFeature&typename=useruploads:${this.layers_visible[name]}&srsname=EPSG:4326&CQL_FILTER=${queries}&outputFormat=application/json`
      : `https://geoserver.vasundharaa.in/geoserver/VGT/ows?service=WFS&version=1.0.0&request=GetFeature&typename=VGT:${this.layers_visible[name]}&srsname=EPSG:4326&CQL_FILTER=${queries}&outputFormat=application/json`;
    const response = await fetch(url);
    if (response.ok) {
      try {
        const data = await response.json();
        if (data.totalFeatures) {
          this.addFilterLayer(data, name, color, query);
          return [1, data.totalFeatures];
        } else {
          return [1, 0];
        }
      } catch (e) {
        return [0];
      }
    } else {
      throw new Error("Network response was not ok");
    }
  }
  clear() {
    this._deck.setProps({ layers: [] });
    this._update();
  }
  isBoundingBoxInView(mapBounds, bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox;

    // Create a LatLngBounds object from the bounding box
    const layerBounds = L.latLngBounds(
      L.latLng(minLng, minLat),
      L.latLng(maxLng, maxLat)
    );
    // Check if the layer bounds intersect with the map bounds
    return mapBounds.intersects(layerBounds);
  }
  onAdd() {
    this._container = L.DomUtil.create("div");
    this._container.className = "leaflet-layer deck-custom";
    this._container.id = "deckgl-custom";
    this._container.style.pointerEvents = "auto";
    this._container.style.cursor = "crosshair";

    if (this._zoomAnimated) {
      L.DomUtil.addClass(this._container, "leaflet-zoom-animated");
    }
    this._map.on("click", async (event) => {
      const viewportPoint = this._map.latLngToContainerPoint(event.latlng);
      let layids = [];
      let mapbounds = this._map.getBounds();

      Object.keys(this.layers_bounds).forEach((ele) => {
        if (
          Object.values(this.layers_visible).includes(ele) &&
          this.isBoundingBoxInView(mapbounds, this.layers_bounds[ele])
        ) {
          layids.push(ele);
        }
      });

      const pickedInfo = this.pickObject({
        x: viewportPoint.x,
        y: viewportPoint.y,
        radius: 15,
        layerIds: layids,
      });
      if (pickedInfo) {
        let content = "";
        let value = "";
        let status = null;
        try {
          status = "Normalised" in pickedInfo.object.properties;
        } catch (e) {}

        for (const key in pickedInfo.object.properties) {
          if (key === "Density" && status) {
            continue;
          }
          if (key === "latitude_longitude_geometry") {
            continue;
          }
          value = pickedInfo.object.properties[key];
          if (value) {
            value = String(value);
            if (value.includes("http://") || value.includes("https://")) {
              value = `<a href="${value}" target="_blank">${value}</a>`;
            }
            content += `${key}: ${value}<br>`;
          }
        }

        L.popup(pickedInfo.coordinate.reverse(), { content: content }).openOn(
          this._map
        );
      }
    });

    this.getPane().appendChild(this._container);
    this._deck = createDeckInstance(this._map, this._container, this._deck);

    return this;
  }

  /**
   * @param {L.Map} _map
   * @returns {this}
   */
  onRemove(_map) {
    L.DomUtil.remove(this._container);
    this._container = undefined;

    this._deck.finalize();
    this._deck = undefined;

    return this;
  }

  /**
   * @returns {Object}
   */
  getEvents() {
    const events = {
      viewreset: this._reset,
      movestart: this._onMoveStart,
      moveend: this._onMoveEnd,
      zoomstart: this._onZoomStart,
      zoom: this._onZoom,
      zoomend: this._onZoomEnd,
    };
    if (this._zoomAnimated) {
      events.zoomanim = this._onAnimZoom;
    }
    return events;
  }

  /**
   * @param {DeckProps} props
   * @returns {void}
   */

  /**
   * @param {any} params
   * @returns {any}
   */
  pickObject(params) {
    return this._deck && this._deck.pickObject(params);
  }

  /**
   * @param {any} params
   * @returns {any}
   */
  pickMultipleObjects(params) {
    return this._deck && this._deck.pickMultipleObjects(params);
  }

  /**
   * @param {any} params
   * @returns {any}
   */
  pickObjects(params) {
    return this._deck && this._deck.pickObjects(params);
  }

  /**
   * @returns {void}
   */
  _update() {
    if (this._map._animatingZoom) {
      return;
    }

    const size = this._map.getSize();
    this._container.style.width = `${size.x}px`;
    this._container.style.height = `${size.y}px`;

    // invert map position
    const offset = this._map._getMapPanePos().multiplyBy(-1);
    L.DomUtil.setPosition(this._container, offset);

    updateDeckView(this._deck, this._map, this.angle, this.bearing);
  }

  /**
   * @returns {void}
   */
  _pauseAnimation() {
    if (this._deck.props._animate) {
      this._animate = this._deck.props._animate;
      this._deck.setProps({ _animate: false });
    }
  }

  /**
   * @returns {void}
   */
  _unpauseAnimation() {
    if (this._animate) {
      this._deck.setProps({ _animate: this._animate });
      this._animate = undefined;
    }
  }

  /**
   * @returns {void}
   */
  _reset() {
    this._updateTransform(this._map.getCenter(), this._map.getZoom());
    this._update();
  }

  /**
   * @returns {void}
   */
  _onMoveStart() {
    this._pauseAnimation();
  }

  /**
   * @returns {void}
   */
  _onMoveEnd() {
    this._update();
    this._unpauseAnimation();
  }

  /**
   * @returns {void}
   */
  _onZoomStart() {
    this._pauseAnimation();
  }

  /**
   * @param {L.ZoomAnimEvent} event
   * @returns {void}
   */
  _onAnimZoom(event) {
    this._updateTransform(event.center, event.zoom);
  }

  /**
   * @returns {void}
   */
  _onZoom() {
    this._update();
    this._updateTransform(this._map.getCenter(), this._map.getZoom());
  }

  /**
   * @returns {void}
   */
  _onZoomEnd() {
    this._unpauseAnimation();
  }

  /**
   * see https://stackoverflow.com/a/67107000/1823988
   * see L.Renderer._updateTransform https://github.com/Leaflet/Leaflet/blob/master/src/layer/vector/Renderer.js#L90-L105
   * @param {L.LatLng} center
   * @param {number} zoom
   */
  _updateTransform(center, zoom) {
    const scale = this._map.getZoomScale(zoom, this._map.getZoom());
    const position = L.DomUtil.getPosition(this._container);
    const viewHalf = this._map.getSize().multiplyBy(0.5);
    const currentCenterPoint = this._map.project(this._map.getCenter(), zoom);
    const destCenterPoint = this._map.project(center, zoom);
    const centerOffset = destCenterPoint.subtract(currentCenterPoint);
    const topLeftOffset = viewHalf
      .multiplyBy(-scale)
      .add(position)
      .add(viewHalf)
      .subtract(centerOffset);

    if (L.Browser.any3d) {
      L.DomUtil.setTransform(this._container, topLeftOffset, scale);
    } else {
      L.DomUtil.setPosition(this._container, topLeftOffset);
    }
  }
}

//IMP Used for getting properties while downloading data

// async function fetchData() {
//   let url ="/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT:Malegaon_Manhole&srsname=EPSG:4326&outputFormat=application/json"
//   try {
//     const response = await fetch(url);
//     const reader = response.body.getReader();

//     let buffer = '';

//     while (true) {
//       const { done, value } = await reader.read();

//       if (done) {
//         // Log or use the complete buffer when the file is done
//         console.log('Complete Buffer:', buffer);
//         break;
//       }

//       const chunk = new TextDecoder().decode(value);
//       buffer += chunk;

//       const regex = /"properties":\s*{([^}]*)}/g;
//       let match;

//       while ((match = regex.exec(chunk)) !== null) {
//         const propertiesContent = match[1];
//         console.log('Properties Content:', propertiesContent);
//       }

//       // Uncomment the line below if you want to log the buffer at each chunk
//       // console.log('Buffer:', buffer);
//     }
//   } catch (error) {
//     console.error('Error fetching data:', error);
//   }
// }

// fetchData();
