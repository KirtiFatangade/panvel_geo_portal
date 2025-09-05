import React, { useState, useContext } from "react";
import L from "leaflet";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar"
import { logToServer } from "../../logger";


function OD() {
  const {
    map,
    drawnItems,
    layerControls,
    lastRect,
    usedShapes,
  } = useContext(GlobalContext)
  const {
    setloader
  } = useContext(SideBarContext)


  const [name, setname] = useState(null);
  const [legend, setlegend] = useState(null)
  const [showerror, SetError] = useState(false);
  const colors = ["red", "blue", "orange", "pink", "purple", "black", "cyan", "green", "indigo"]
  const labels = ['Emplacement', 'Tank', 'Plane', 'WarShip', 'OilTank', 'Helicopter', 'ArtiGun', 'Vehicle', 'Tent']


  function Detection() {
    var geometry = [];
    if (lastRect && drawnItems.hasLayer(lastRect)) {

      geometry.push(
        JSON.stringify(
          drawnItems.getLayer(lastRect).toGeoJSON()["geometry"]["coordinates"][0]
        )
      );
      logToServer('info', 'Geometry captured for detection');
      sendArray(geometry, name);
    } else {
      logToServer('warn', 'No rectangle drawn for detection');
      SetError(true)
    }


  }


  const sendArray = async (dataArray, name) => {
    try {
      setloader(true);
      logToServer('info', 'Sending array to object detection API');
      await fetch(`${HOST}/object-detection`, {
        method: "POST",
        credentials:'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: dataArray }),
      })
        .then((response) => response.json())
        .then((data) => createLayer(data, name));
      setloader(false);
      logToServer('info', 'Object detection API call successful');
    } catch (error) {
      logToServer('error', 'Error occurred while sending array to object detection API: ' + error.message);
      alert("Unexpected Error occurred. Please try again.");
      setloader(false);
    }
  };
  function createLayer(data, name) {
    let legend_dict = {}

    let layer = L.geoJSON(data.layer, {
      style: function (feature) {
        return ({ color: colors[parseInt(feature.properties.class)], fillOpacity: 0.0, weight: 1 })

      },
      zIndex: 1005,
      onEachFeature: function (feature) {
        if (Object.keys(legend_dict).includes(feature.properties.class)) {
          legend_dict[feature.properties.class] += 1
        } else {
          legend_dict[feature.properties.class] = 1
        }
      }
    })
    layer.addTo(map);
    if (name !== null) {
      document.getElementById("layerName").value = ""
      setname(null);
    } else {
      name = "OD"
    }
    layerControls.addOverlay(layer, name);

    layer.bringToFront();
    drawnItems.removeLayer(lastRect);
    usedShapes.removeLayer(lastRect);
    setlegend(legend_dict);

    logToServer('info', `Layer created and added to map with name: ${name}`);


  }
  return (
    <>
      <div>
        <input className="form-control" id="layerName" onChange={(e) => setname(e.target.value)} style={{ marginBottom: "5px" }} placeholder="Enter Layer name" ></input>
        <button
          className="segment-button"
          onClick={Detection}
        >
          Perform
        </button>
        <div>
          {showerror && (
            <>
              <p>Please draw a rectangle</p>
            </>
          )}
        </div>
      </div>

      {legend && (
        <>
          <div className="legend" style={{ position: "absolute", top: "60%", height: "fit-content", width: "80%", backgroundColor: "white" }}>
            <table style={{ width: "100%", textAlign: "center" }}>
              <thead>
                <tr>
                  <th>Color</th>
                  <th>Object</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(legend).map((classKey) => (
                  <tr key={classKey}>
                    <td><div style={{ height: "25px", width: "25px", backgroundColor: colors[parseInt(classKey)] }}></div></td>
                    <td>{labels[parseInt(classKey)]}</td>
                    <td>{legend[classKey]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>

  )
}
export default OD