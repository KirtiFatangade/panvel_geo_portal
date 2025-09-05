
import React from "react";
import Cal from "./Calender_old";
import { useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import { SideBarContext } from "../sidebar";
import { GlobalContext } from "../../../App";
import { helpers, area, convertArea } from "@turf/turf";
import { HOST } from "../../host";
import L from "leaflet";
import { logToServer } from "../../logger";

function ForestFire() {
  const [SDate, setSdate] = useState(null);
  const { setloader } = useContext(SideBarContext);
  const { map, lastRect, drawnItems, layerControls, userInfo, selTab } = useContext(GlobalContext);
  const location = useLocation();

  function CreateFire(data) {
    logToServer("info", "Creating fire layers on the map", { data });

    let layer;
    let total = 0;

    function calculateAndFormatArea(feature) {
      let areaValue = area(feature);
      let convertedArea = convertArea(areaValue, "meters", "kilometers");
      return convertedArea;
    }

    let layers = L.geoJSON(JSON.parse(data.geo[0]), {
      onEachFeature: (feature, layer) => {
        let areaInKm = calculateAndFormatArea(feature);
        let formattedArea = areaInKm.toFixed(2);
        layer.bindPopup(`Area: ${formattedArea} square km`);
      },
      style: function (feature) {
        return { color: "#FF0000", fill: true, fillColor: "#000000" };
      }
    });
    total = calculateAndFormatArea(JSON.parse(data.geo[0])).toFixed(4);
    layers.addTo(map);
    let bounds = layers.getBounds();
    layerControls.addOverlay(layers, `Fire Area Vector - Area : ${total} sq km`, true, bounds, false, false, false, data.geo[1]);

    layers = L.tileLayer(data.norm[0], { zIndex: 1005, maxZoom: 20 });
    layers.addTo(map);
    layerControls.addOverlay(layers, "RGB", false, false, false, false, false, data.norm[1]);

    layers = L.tileLayer(data.fire[0], { zIndex: 1005, maxZoom: 20 });
    layers.addTo(map);
    layerControls.addOverlay(layers, "SWIR", false, false, false, false, false, data.fire[1]);

    logToServer("success", "Fire layers created successfully");
  }

  async function FireVis() {
    logToServer("info", "FireVis function called", { SDate, lastRect });

    let data = {};
    if (!SDate) {
      alert("Please select a date");
      logToServer("warn", "Date not selected for FireVis");
      return;
    }
    setloader(true);
    data["date"] = SDate;

    if (lastRect && drawnItems.hasLayer(lastRect)) {
      data["box"] = [JSON.stringify(
        drawnItems.getLayer(lastRect).toGeoJSON()["geometry"]["coordinates"][0]
      )];
    } else {
      alert("Please draw a Rectangle");
      logToServer("warn", "No valid rectangle drawn for FireVis");
      return;
    }

    if (window.location.pathname.startsWith("/project/")) {
      const projectId = window.location.pathname.split("/")[3];
      data["project"] = projectId;
    } else {
      data["project"] = "global";
    }
    data["memb"] = userInfo.id;
    data["tab"] = selTab;

    try {
      await fetch(`${HOST}/forest-fire`, {
        method: "POST",
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      })
        .then((response) => response.json())
        .then((data) => CreateFire(data));
      logToServer("success", "FireVis request successful", { data });
    } catch (error) {
      alert("Unexpected Error occurred. Please try again");
      logToServer("error", "Error sending POST request for FireVis", { error: error.message });
    }
    setloader(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}>
      <>
     <Cal
                            map={map}
                            selData={"10m Satellite data (Sentinel 2)"}
                            SetSDate={setSdate}
                            SDate={SDate}
                            setloader={setloader}
                            toFetch={"open"}
                            both={false}
                            limit={"2017-03-28"}
                            cloud={true}
                            cloudValue={5}
                        />
      </>
      <>
        <div>
          <button className="mt-2 btn-visualize" style={{ zIndex: '1000' }} onClick={(e) => FireVis()}>
            Detect
          </button>
        </div>
      </>
    </div>
  );
}

export default ForestFire;
