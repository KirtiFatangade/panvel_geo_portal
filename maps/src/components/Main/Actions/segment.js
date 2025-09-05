import React, { useState, useContext, useEffect } from "react";
import L from "leaflet"
import GeoRasterLayer from "georaster-layer-for-leaflet";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar"
import { logToServer } from "../../logger";


var parse_georaster = require("georaster");
function Segment() {

  const {
    map,
    drawnItems,
    layerControls,
    foreLayers,
    backLayers,
    lastRect,
    usedShapes,
    customMarker
  } = useContext(GlobalContext)
  const {
    setloader
  } = useContext(SideBarContext)
  const [showerror, SetError] = useState(false);
  const [name, setname] = useState(null);
  function callSegment() {
    logToServer("info", "callSegment function called", { name });

    var geometry = [];
    var fc = [];
    var bc = [];
    foreLayers.eachLayer(function (layer) {
      fc.push(JSON.stringify(layer.toGeoJSON()["geometry"]["coordinates"]));
    });
    backLayers.eachLayer(function (layer) {
      bc.push(JSON.stringify(layer.toGeoJSON()["geometry"]["coordinates"]));
    });
    if(fc.length || bc.length){
      geometry.push(fc);
      geometry.push(bc);
    }
    if (lastRect && drawnItems.hasLayer(lastRect)) {
      geometry.push(
        JSON.stringify(
          drawnItems.getLayer(lastRect).toGeoJSON()["geometry"]["coordinates"][0]
        )
      );
      logToServer("info", "Geometry prepared for segmentation", { geometry });
      sendArray(geometry, name);
    } else {
      SetError(true);
      logToServer("warn", "No valid rectangle drawn for segmentation");

    }


  }

  const sendArray = async (dataArray, name) => {
    try {
      setloader(true)
      logToServer("info", "Sending segmentation request", { dataArray });

      await fetch(`${HOST}/segment`, {
        method: "POST",
        credentials:'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: dataArray }),
      })
        .then((response) => response.arrayBuffer())
        .then((data) => {
          parse_georaster(data).then((georaster) => {
            createLayer(georaster, name);
          });
        });
        logToServer("success", "Segmentation request successful");

    } catch (error) {
      alert("Unexpected Error occured Please try again")
      setloader(false)
      logToServer("error", "Error sending POST request for segmentation", { error: error.message });
    }
  }; //Add csrf tokens for production

  function createLayer(data, name) {
    setloader(false)
    logToServer("info", "Creating layer with georaster data", { name });

    var layer = new GeoRasterLayer({
      georaster: data,
      opacity: 0.7,
      resolution: 256,
      pixelValuesToColorFn: function (pixelValues) {
        var pixel = pixelValues[0];
        if (pixel === 0) return "#8B0000";
        else return null;
      },
      zIndex:1005
    });
    layer.addTo(map);
    map.fitBounds(layer.getBounds());
    if (name !== null) {
      document.getElementById("layerName").value = ""
      setname(null);
    } else {
      name = "Segment"
    }
    layerControls.addOverlay(layer, name);
    layer.bringToFront();
    drawnItems.removeLayer(lastRect);
    usedShapes.removeLayer(lastRect);
    foreLayers.clearLayers();
    backLayers.clearLayers();
    logToServer("success", "Layer created and added to map", { name });

  }

  function HandleMarkerChange(e) {
    let draw;
    if (e.target.value === "fm") {
      draw = new L.Draw.Marker(map, {
        icon: new customMarker({
          type: "fm"
        })
      });
    } else {
      draw = new L.Draw.Marker(map, {
        icon: new customMarker({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/8866/8866624.png",
          type: "bm"
        })
      })
    }
    draw.enable();
    logToServer("info", "Marker change handled", { markerType: e.target.value });

  }
  useEffect(() => {
    if (map) {
      const handleDrawCreated = function (e) {
        const layer = e.layer;
        if (e.layerType === "marker") {
          if (layer.options.icon.options.type === "fm") {
            foreLayers.addLayer(layer);
          } else if (layer.options.icon.options.type === "bm") {
            backLayers.addLayer(layer);
          }
        }
        logToServer("info", "Draw created event handled", { layerType: e.layerType });

      };

      map.on('draw:created', handleDrawCreated);

      return () => {
        map.off('draw:created', handleDrawCreated);
      };
    }
  }, [map]);
  return (
<>
        <input placeholder="Enter Layer Name" id="layerName" onChange={(e) => setname(e.target.value)} className="form-control"></input>
        <div className="seg-mark">
          <div className="marker-option">
            <input
              type="checkbox"
              id="fm"
              name="markers"
              value="fm"
              style={{ display: "none" }}
              onChange={(e) => HandleMarkerChange(e)}
            />
            <label htmlFor="fm" className="marker-label marker-foreground">
              Foreground
            </label>
          </div>
          <div className="marker-option">
            <input
              type="checkbox"
              id="bm"
              name="markers"
              value="bm"
              style={{ display: "none" }}
              onChange={(e) => HandleMarkerChange(e)}
            />
            <label htmlFor="bm" className="marker-label marker-background">
              Background
            </label>
          </div>
        </div>
        <div>
          <button
            className="segment-button"
            onClick={callSegment}
          >
            Segment
          </button>
        </div>
        <div>
          {showerror && (
            <>
              <p>Please draw a rectangle</p>
            </>
          )}
        </div>
        </>
  );
}
export default Segment