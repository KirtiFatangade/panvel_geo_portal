import React, { useState, useContext } from "react";
import Cal from "./Calender_old";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar";
import { bbox } from "@turf/turf";
import { useLocation } from "react-router-dom";
import { HOST } from "../../host";
import L from "leaflet";
import { logToServer } from "../../logger";

function Change() {
  const {
    map,
    layerControls,
    lastRect,
    drawnItems,
    setChartType,
    setChart,
    usedShapes,
    once,
    Canvas,
    userInfo,
    selTab,
    userProjects,
    organizationProjects,
    inspect,
    setLBands,
    LayerBands,
    getCsrfToken
  } = useContext(GlobalContext);
  const { setloader } = useContext(SideBarContext);
  const [SDate, SetSDate] = useState(null);
  const [EDate, SetEDate] = useState(null);
  const location = useLocation();

  function create(data) {
    logToServer("info", "Creating change detection layers on the map", { data });

    let layer = L.tileLayer(data.change[0], { maxZoom: 20, zIndex: 1005 });
    layerControls.addOverlay(layer, "Positive Change", false, false, false, false, false, data.change[1]);
    layer.addTo(map);

    layer = L.tileLayer(data.earl[0], { maxZoom: 20, zIndex: 1005 });
    layerControls.addOverlay(layer, `Pre Image `, false, false, false, false, false, data.earl[1]);

    layer = L.tileLayer(data.later[0], { maxZoom: 20, zIndex: 1005 });
    layerControls.addOverlay(layer, `Post Image `, false, false, false, false, false, data.later[1]);

    layer = L.tileLayer(data.virs1, { maxZoom: 20, zIndex: 1005 });
    layerControls.addOverlay(layer, `Virs 1 `, false, false, false, false, false);

    layer = L.tileLayer(data.virs2, { maxZoom: 20, zIndex: 1005 });
    layerControls.addOverlay(layer, `Virs 2 `, false, false, false, false, false);

    logToServer("success", "Change detection layers created successfully");
  }

  async function fetchLayer() {
    logToServer("info", "fetchLayer function called", { SDate, EDate, lastRect });

    if (!SDate || !EDate) {
      alert("Please select Both dates");
      logToServer("warn", "Both dates not selected for fetchLayer");
      return;
    }
    if (SDate >= EDate) {
      alert("Start Date must be less than End date");
      logToServer("warn", "Start Date is not less than End Date");
      return;
    }

    try {
      let data = {
        dates: [SDate, EDate],
      };

      if (lastRect && drawnItems.hasLayer(lastRect)) {
        data["box"] = bbox(drawnItems.getLayer(lastRect).toGeoJSON());
      } else {
        alert("Please draw a Rectangle");
        logToServer("warn", "No valid rectangle drawn for fetchLayer");
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
      setloader(true);

      await fetch(`${HOST}/get-thres-change`, {
        method: "POST",
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      })
        .then((response) => response.json())
        .then((data) => create(data));

      logToServer("success", "fetchLayer request successful", { data });
      setloader(false);
    } catch (error) {
      alert("Unexpected Error occurred. Please try again");
      logToServer("error", "Error sending POST request for fetchLayer", { error: error.message });
      setloader(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column" }} className="select-container d-flex">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "white", marginLeft: '10px !important' }}>
            <p >First Instance :</p>
          </div>
          <div>
            <Cal
              map={map}
              selData={"10m Satellite data (Sentinel 2)"}
              SetSDate={SetSDate}
              SDate={SDate}
              setloader={setloader}
              toFetch={"open"}
              both={false}
              limit={"2017-03-28"}
              cloud={true}
              cloudValue={10}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div>
            <p style={{ color: "white", margin: '0px 0px 0px 15px' }}>Second Instance :</p>
          </div>
          <div>
            <Cal
              map={map}
              selData={"10m Satellite data (Sentinel 2)"}
              SetSDate={SetEDate}
              SDate={EDate}
              setloader={setloader}
              toFetch={"open"}
              both={false}
              limit={"2017-03-28"}
              cloud={true}
              cloudValue={10}
            />
          </div>
        </div>
        <div>
          <button className="mt-2 btn-visualize" style={{ zIndex: '1000' }} onClick={fetchLayer}>
            Find Change
          </button>
        </div>
      </div>
    </>
  );
}

export default Change;
