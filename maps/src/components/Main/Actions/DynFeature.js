import React, { useState, useContext, useRef, useEffect } from "react";
import Cal from "./Calender";
import Options from "./clipComp";
import AdvParam from "./AdvParam";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar";
import { bbox } from "@turf/turf";
import L, { Edit } from "leaflet";
import {
  exc,
  sen2Add,
  lan2Add,
  senBandsList,
  landBandsList,
  landBandsListDis,
  landBandsRev,
  colorsList,
} from "./satStatic";

function DynFeat({
  id,
  name,
  comp_type,
  comp,
  type,
  url,
  url_params,
  visuals,
  add,
  credit,
}) {
  const {
    map,
    mapBox,
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
    setBoxLayers,

    scrollDivRef,
    sidebarRef,
    getCsrfToken,
    isSidebarTabs,
    // mapBoxContainerRef,
  } = useContext(GlobalContext);
  const { setloader } = useContext(SideBarContext);
  const [SDate, SetSDate] = useState(null);
  const [EDate, SetEDate] = useState(null);
  const [cloud, setCloud] = useState(false);
  const [cloudValue, setCloudValue] = useState(50);
  const [clip, setClip] = useState(false);
  const [AddBound, setBound] = useState(false);
  const [clipBox, setClipBox] = useState(false);
  const [clipLayer, setClipLayer] = useState(false);
  const [selCLayer, setCLayer] = useState("");
  const [selCont, setCont] = useState("");
  const [selState, setState] = useState("");
  const [selDis, setDis] = useState("");
  const [both, setBoth] = useState(false);
  const [Advtype, SetType] = useState(null);
  const [selBands, setSelBand] = useState([]);
  const [grad, setGrad] = useState(
    "linear-gradient(to right, #5E5AF2, #EBF3E9, #00441b)"
  );
  const [Visuals, setVisuals] = useState(visuals);
  const [buttonBottom, setButtonBottom] = useState(0);
  const [isAdvancedParameters, setAdvancedParameters] = useState(false);
  const [isAdditionalOptionsOpen, setAdditionalOptionsOpen] = useState(false);
  const urls = useRef(null);

  async function fetchLayer() {
    console.log("selBands", selBands);
    console.log(Advtype);
    try {
      let data = {
        dataset: name,
        dates: [SDate, EDate],
      };

      if (visuals.start) {
        if (!SDate || SDate === "") {
          if (visuals.end) {
            alert("Please select the start date");
          } else {
            alert("Please select a date");
          }
          return;
        }
      }
      if (visuals.end) {
        if (!EDate || EDate === "") {
          alert("Please select the end date");
          return;
        }
      }
      if (visuals.start && visuals.end) {
        if (SDate >= EDate) {
          alert("Invalid date selection");
        }
      }
      if (clip || visuals.req_region) {
        if (selDis && selDis !== "") {
          data["clip"] = ["dis", [selDis, selState, selCont]];
        } else if (selState && selState !== "") {
          data["clip"] = ["state", [selState, selCont]];
        } else if (selCont && selCont !== "") {
          data["clip"] = ["cont", [selCont]];
        }
        if (AddBound) {
          data["bound"] = true;
        }
      }
      if (clipBox || visuals.req_box) {
        if (lastRect && drawnItems.hasLayer(lastRect)) {
          data["box"] = bbox(drawnItems.getLayer(lastRect).toGeoJSON());
        } else {
          alert("Please draw a Rectangle");
          return;
        }
      }
      if (clipLayer || visuals.req_layer) {
        if (selCLayer && selCLayer !== "") {
          console.log("data layer", data);
          data["layer"] = Canvas.getLayerId(selCLayer);

          console.log("data layer", data["layer"]);

          data["layer_name"] = selCLayer;
          console.log("data layer_name", data["layer_name"]);
        } else {
          alert("Please select A Layer");
          return;
        }
      }

      if (Advtype) {
        if (Advtype === "bands") {
          data["bands"] = selBands;
        } else if (Advtype === "indices") {
          data["indices"] = selBands;
          data["grad"] = grad;
        }
      }

      if (cloud) {
        data["cloud_filter"] = cloudValue;
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
      console.log(data);

      await fetch(`${HOST}/sat-geo/${id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      })
        .then((response) => response.json())
        .then((data) => CreateLayer(data));
      setloader(false);
      console.log("sat-geo", data);
     
    } catch (error) {
      alert("Unexpected Error occured Please try again");
      console.log(error);
      setloader(false);
    }
  }

  function CreateLayer(data) {
    console.log("createlayer data ", data);

    if (data.message) {
      console.log("data.message", data.message);
      if (clipLayer) {
        alert("Clipping failed due to invalid Geometry");
      }
      return;
    }

    let layer;
    let name = data.name;
    let layerName = name + " - " + data.date;

    // Build layerName based on bands and indices
    if (data.bands) {
      layerName += `- ${data.bands}`;
    }
    if (data.indices) {
      layerName += `- ${data.indices}`;
    }

    if (data.clip) {
      layerName += "-" + data.clip.join("-");
    }

    if (
      data.name === "Rivers of World" ||
      data.name === "Indian Watersheds and Rivers"
    ) {
      if (data.name === "Indian Watersheds and Rivers") {
        if (window.location.pathname.startsWith("/MapBox") && mapBox) {
          urls.current = data.url; // Assuming data.url contains array of URLs

          // Add GeoJSON source
          mapBox.addSource("watershed-source", {
            type: "geojson",
            data: data.url[0], // Add GeoJSON data from data.geoj
          });

          mapBox.addLayer({
            id: "watershed-source-layer",
            type: "line",
            source: "watershed-source",
            paint: {
              "line-color": "#000",
              "line-width": 3,
            },
          });
        } else {
          // Handle Leaflet case for Indian Watersheds and Rivers
          Canvas.addLayer("waterbody_watershed", "");
          Canvas.addLayer("waterbody_sub_basin", "");
          Canvas.addLayer("waterbody_micro_watershed", "");
        }
      }

      if (!window.location.pathname.startsWith("/MapBox")) {
        try {
          console.log("river port");
          urls.current = data.url; // Expecting data.url to be an array
          let urlIndex = 0;

          if (map.getZoom() <= 5) {
            urlIndex = 0;
          } else if (map.getZoom() <= 8) {
            urlIndex = 1;
          } else if (map.getZoom() <= 10) {
            urlIndex = 2;
          } else {
            urlIndex = 3;
          }

          // Add tile layer
          layer = L.tileLayer(data.url[urlIndex], {
            maxZoom: 20,
            zIndex: 1005,
          });

          if (data.name === "Indian Watersheds and Rivers") {
            Canvas.removeLayer("waterbody_sub_basin", "");
            Canvas.removeLayer("waterbody_micro_watershed", "");
          }

          map.on("zoomend", function () {
            if (urls.current && map.hasLayer(layer)) {
              let zoom = map.getZoom();

              if (zoom <= 5) {
                if (data.name === "Indian Watersheds and Rivers") {
                  Canvas.addLayer("waterbody_watershed", "");
                  Canvas.removeLayer("waterbody_sub_basin", "");
                  Canvas.removeLayer("waterbody_micro_watershed", "");
                }
                layer.setUrl(urls.current[0]);
              } else if (zoom <= 8) {
                if (data.name === "Indian Watersheds and Rivers") {
                  Canvas.addLayer("waterbody_sub_basin", "");
                  Canvas.removeLayer("waterbody_watershed", "");
                  Canvas.removeLayer("waterbody_micro_watershed", "");
                }
                layer.setUrl(urls.current[1]);
              } else if (zoom <= 10) {
                if (data.name === "Indian Watersheds and Rivers") {
                  Canvas.addLayer("waterbody_micro_watershed", "");
                  Canvas.removeLayer("waterbody_sub_basin", "");
                  Canvas.removeLayer("waterbody_watershed", "");
                }
                layer.setUrl(urls.current[2]);
              } else {
                if (data.name === "Indian Watersheds and Rivers") {
                  Canvas.addLayer("waterbody_micro_watershed", "");
                  Canvas.removeLayer("waterbody_sub_basin", "");
                  Canvas.removeLayer("waterbody_watershed", "");
                }
                layer.setUrl(urls.current[3]);
              }
            }
          });

          if (map.getZoom() <= 5) {
            map.flyTo([22.395, 78.768], 5);
          }

          layer.addTo(map);
          layerControls.addOverlay(
            layer,
            layerName,
            false,
            false,
            false,
            false,
            false,
            data.act_id
          );
          return;
        } catch (e) {
          console.log(e);
        }
      } else {
        try {
          console.log("3d river");
          urls.current = data.url; // Expecting data.url to be an array

          // Add sources
          mapBox.addSource(`${layerName}-0`, {
            type: "raster",
            tiles: [data.url[0]],
            tileSize: 256,
          });
          mapBox.addSource(`${layerName}-1`, {
            type: "raster",
            tiles: [data.url[1]],
            tileSize: 256,
          });
          mapBox.addSource(`${layerName}-2`, {
            type: "raster",
            tiles: [data.url[2]],
            tileSize: 256,
          });
          mapBox.addSource(`${layerName}-3`, {
            type: "raster",
            tiles: [data.url[3]],
            tileSize: 256,
          });

          let layerID = `${layerName}-layer`;

          // Add initial layer
          mapBox.addLayer({
            id: layerID,
            type: "raster",
            source: `${layerName}-0`,
          });

          mapBox.on("zoomend", function () {
            const zoom = mapBox.getZoom();

            if (zoom <= 5) {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: "raster",
                source: `${layerName}-0`,
              });
            } else if (zoom <= 8) {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: "raster",
                source: `${layerName}-1`,
              });
            } else if (zoom <= 10) {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: "raster",
                source: `${layerName}-2`,
              });
            } else {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: "raster",
                source: `${layerName}-3`,
              });
            }
          });
        } catch (e) {
          console.log(e);
        }
      }
    }

    if (window.location.pathname.startsWith("/MapBox") && mapBox) {
      if (
        data.name === "Rivers of World" ||
        data.name === "Indian Watersheds and Rivers"
      ) {
        // Already handled earlier for MapBox
      } else {
        mapBox.addSource(layerName, {
          type: "raster",
          tiles: [data.url],
          tileSize: 256,
        });

        mapBox.addLayer({
          type: "raster",
          id: `${layerName}-layer`,
          source: layerName,
        });
      }

      setBoxLayers((prevLayers) => [
        ...prevLayers,
        { name: layerName, visible: true },
      ]);
      return;
    }

    // Leaflet layer creation
    layer = L.tileLayer(data.url, { maxZoom: 20, zIndex: 1005 });

    if (data.name === "Germany High-Res Image (20cm)") {
      map.flyTo([52.507899, 13.386091], 18);
    }

    layerControls.addOverlay(
      layer,
      layerName,
      false,
      false,
      false,
      false,
      false,
      data.act_id
    );

    layer.on("tileload", function (event) {
      const tile = event.tile;
      tile.style.zIndex = "5000";
    });

    layer.addTo(map);

    if (data.geoj) {
      console.log(data.geoj);

      let layerBound = L.geoJSON(data.geoj, {
        zIndex: 1005,
        maxZoom: 20,
        style: { color: "black", fill: false, opacity: 1 },
      });

      layerControls.addOverlay(
        layerBound,
        data.clip,
        true,
        layerBound.getBounds()
      );

      layerBound.addTo(map);
      map.flyToBounds(layerBound.getBounds());
    }
  }

  async function fetchData() {
    console.log("fetch-data");
    try {
      let data = {
        dataset: name,
        dates: [SDate, EDate],
      };
      if (clip || visuals.req_region) {
        if (selDis && selDis !== "") {
          data["clip"] = ["dis", [selDis, selState, selCont]];
        } else if (selState && selState !== "") {
          data["clip"] = ["state", [selState, selCont]];
        } else if (selCont && selCont !== "") {
          data["clip"] = ["cont", [selCont]];
        } else {
          alert("Please select a Region");
          return;
        }
      }
      if (clipBox || visuals.req_box) {
        if (lastRect && drawnItems.hasLayer(lastRect)) {
          data["box"] = bbox(drawnItems.getLayer(lastRect).toGeoJSON());
        } else {
          alert("Please draw a Rectangle");
          return;
        }
      }
      if (clipLayer || visuals.req_layer) {
        if (selCLayer && selCLayer !== "") {
          data["layer"] = Canvas.getLayerId(selCLayer);
          data["layer_name"] = selCLayer;
        } else {
          alert("Please select A Layer");
          return;
        }
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
      await fetch(`${HOST}/${url}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      })
        .then((response) => response.json())
        .then((data) => handleResponse(data.res));
      setloader(false);
      // Handle the response as needed, e.g., updating the state or creating layers
      // handleResponse(data.res);
    } catch (error) {
      setloader(false);
      alert("Failed to fetch data. Please try again.");
    }
  }

  function handleResponse(data) {
    console.log(data);
    // Response : [{type,name,id,data}]
    let i = 0;
    while (i < data.length) {
      let new_data = data[i];
      if (new_data["type"] === "url") {
        let layer = L.tileLayer(new_data["data"], {
          maxZoom: 20,
          zIndex: 1005,
        });
        layerControls.addOverlay(
          layer,
          new_data["name"],
          false,
          false,
          false,
          false,
          false,
          new_data["id"]
        );
        layer.addTo(map);
      } else if (new_data["type"] === "geo") {
        Canvas.addLayerGeo(new_data["name"], new_data["data"]);
        layerControls.addOverlay(
          L.GeoJSON(),
          new_data["name"],
          false,
          false,
          false,
          false,
          false,
          new_data["id"]
        );
      }
      i += 1;
    }
  }

  useEffect(() => {
    if (both) {
      setVisuals((prevVisuals) => ({
        ...prevVisuals,
        end: true,
        range: true,
      }));
    } else {
      setVisuals(visuals);
    }
  }, [both, setVisuals]);

  useEffect(() => {
    if (visuals) {
      setVisuals(visuals);
    }
  }, [visuals]);

  useEffect(() => {
    // Function to update button position based on the content's height
    const updateButtonPosition = () => {
      if (scrollDivRef.current && sidebarRef.current) {
        const sidebarHeight = sidebarRef.current.scrollHeight; // Total height of the sidebar
        const scrollableHeight = scrollDivRef.current.scrollHeight; // Height of the scrollable content
        const scrollableClientHeight = scrollDivRef.current.clientHeight; // Height of the visible area
        console.log(
          sidebarHeight,
          scrollableHeight,
          scrollableClientHeight,
          sidebarRef.current.clientHeight
        );
        const minHeight = Math.min(sidebarHeight, scrollableClientHeight);
        const maxHeight = Math.max(sidebarHeight, scrollableClientHeight);

        console.log(maxHeight - minHeight);
        console.log(sidebarHeight * 0.2);
        if (maxHeight - minHeight <= sidebarHeight * 0.2) {
          setButtonBottom(0);
        } else {
          if (maxHeight - minHeight >= 120) {
            setButtonBottom(maxHeight - minHeight - 126);
          } else {
            setButtonBottom(0);
          }
        }
      }
    };

    // Initial position update
    updateButtonPosition();

    // Set up MutationObserver to listen for changes in the scrollable div
    const observer = new MutationObserver(updateButtonPosition);
    if (sidebarRef.current) {
      observer.observe(sidebarRef.current, { childList: true, subtree: true });
    }

    // Cleanup observer on unmount
    return () => {
      observer.disconnect();
    };
  }, [scrollDivRef, sidebarRef]);

  useEffect(() => {
    if (isAdditionalOptionsOpen) {
      setAdvancedParameters(false);
    }
  }, [isAdditionalOptionsOpen]);
  useEffect(() => {
    if (isAdvancedParameters) {
      setAdditionalOptionsOpen(false);
    }
  }, [isAdvancedParameters]);

  const getModifiedCredit = async (featureId, areaDrawn) => {
    try {
      const response = await fetch(
        `${HOST}/get-credit-sq-km/${featureId}/${areaDrawn}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json(); // Await the JSON conversion
        console.log(data);
        return data.credit; // Assuming 'credit' is in the response data
      } else {
        console.error("Error: ", response.statusText);
      }
    } catch (error) {
      console.log("Error while fetching area", error);
    }

    return null; // Return null or a default value if there's an error
  };

  const getRegionArea = async () => {
    var payload = {};
    if (selDis && selDis !== "") {
      payload["clip"] = ["dis", [selDis, selState, selCont]];
    } else if (selState && selState !== "") {
      payload["clip"] = ["state", [selState, selCont]];
    } else if (selCont && selCont !== "") {
      payload["clip"] = ["cont", [selCont]];
    }
    const response = await fetch(`${HOST}/get-region-area`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ data: payload }),
    });
    const data = await response.json();
    console.log(data);
    return data.area;
  };

  return (
    <>
      {(visuals.start || visuals.end) && (
        <div className="hide-show-container">
          <div
            className={`date-div ${
              Visuals.range ? "row-aligned" : "column-aligned"
            }`}
          >
            <div className="sidepanel-container">
              {Visuals.start && (
                <div>
                  <label
                    htmlFor="start"
                    style={{
                      // marginRight: "10px",
                      // padding: "0px 15px 0px 0px",
                      color: "white",
                      fontSize: "13px",
                      display: "inline-block",
                      marginLeft: "10px",
                    }}
                  >
                    {visuals.end || both ? "Start" : "Select"} Date:
                  </label>
                  {Visuals.range ? (
                    <input
                      style={{
                        fontSize: "13px",
                        padding: "3px 5px",
                        marginBottom: "5px",
                        maxWidth: "80%",
                        borderRadius: "5px",
                      }}
                      id="start"
                      type="date"
                      onChange={(e) => SetSDate(e.target.value)}
                      name="start"
                      min={Visuals["start-min"]}
                      // max='2025-12-31'
                      max={new Date().toISOString().split("T")[0]}
                      defaultValue={SDate}
                    />
                  ) : (
                    <Cal
                      map={map}
                      selData={name}
                      SetSDate={SetSDate}
                      SDate={SDate}
                      setloader={setloader}
                      cloud={cloud}
                      cloudValue={cloudValue}
                      mapBox={mapBox}
                      min={Visuals["start-min"]}
                      // max={Visuals["start-max"]}
                      // max='2025-12-31'
                      max={new Date().toISOString().split("T")[0]}
                      highlight={Visuals.highlight}
                      add={add}
                    />
                  )}
                </div>
              )}
            </div>

            {Visuals.end && (
              <div className="sidepanel-container">
                <div>
                  <label
                    htmlFor="end"
                    style={{
                      marginRight: "10px",
                      marginBottom: "5px",
                      padding: "0px 15px",
                      color: "white",
                      fontSize: "13px",
                      display: "inline-block",
                    }}
                  >
                    End Date:
                  </label>
                  {Visuals.range ? (
                    <input
                      style={{
                        fontSize: "13px",
                        padding: "3px 5px",
                        marginLeft: "5px",
                        mxWidth: "80%",
                        borderRadius: "5px",
                      }}
                      type="date"
                      id="end"
                      onChange={(e) => SetEDate(e.target.value)}
                      name="end"
                      min={Visuals["start-min"]}
                      // max='2025-12-31'
                      max={new Date().toISOString().split("T")[0]}
                      defaultValue={EDate}
                    />
                  ) : (
                    <Cal
                      map={map}
                      selData={name}
                      SetSDate={SetEDate}
                      SDate={EDate}
                      setloader={setloader}
                      cloud={cloud}
                      cloudValue={cloudValue}
                      mapBox={mapBox}
                      min={Visuals["end-min"]}
                      // max={Visuals["end-max"]}
                      // max='2025-12-31'
                      max={new Date().toISOString().split("T")[0]}
                      highlight={Visuals.highlight}
                      add={add}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(Visuals.highlight && Visuals.cloud) ||
      (visuals.start && !visuals.end) ? (
        <div style={{ height: "100%" }} className="hide-show-container">
          <div className="sidepanel-container" id="cloud-date-flex-container">
            {Visuals.highlight && Visuals.cloud && (
              <div
                style={{
                  minWidth: "50%",
                  marginLeft: visuals.start && !visuals.end ? "0px" : "1px",
                }}
              >
                <div className="sidenav" style={{ marginLeft: "7px" }}>
                  <div className="filter-checkbox">
                    <input
                      onChange={(e) => setCloud(e.target.checked)}
                      checked={cloud}
                      id="cloudFilter"
                      type="checkbox"
                    />
                    <label
                      style={{ color: "white", margin: "0 0 0 5px" }}
                      htmlFor="cloudFilter"
                    >
                      Cloud Cover Filter
                    </label>
                  </div>
                  {cloud && (
                    <div className="cloud-slider">
                      <input
                        value={cloudValue}
                        type="range"
                        min={0}
                        max={100}
                        step={10}
                        onChange={(e) => setCloudValue(e.target.value)}
                      />
                      <label style={{ marginLeft: "5px", color: "white" }}>
                        {cloudValue}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {visuals.start && !visuals.end && (
              <div
                style={{
                  minWidth: "50%",
                  marginLeft:
                    Visuals.highlight && Visuals.cloud ? "0px" : "0px",
                  maxHeight: "fit-content",
                }}
              >
                <div className="opts-container">
                  <div className="filter-checkbox">
                    <input
                      onChange={(e) => setBoth(e.target.checked)}
                      checked={both}
                      type="checkbox"
                      id="both"
                    />
                    <label style={{ color: "white" }}>Date Range</label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {visuals.adv_params || visuals.adv_options ? (
        <>
          <div className="hide-show-container">
            <div className="sidepanel-container">
              {visuals.adv_params && (
                <div
                  style={{ paddingLeft: "10px" }}
                  onClick={() => setAdvancedParameters(!isAdvancedParameters)}
                >
                  Advanced Parameters
                </div>
              )}
              {visuals.adv_options && (
                <div
                  style={{ paddingLeft: "5px" }}
                  onClick={() =>
                    setAdditionalOptionsOpen(!isAdditionalOptionsOpen)
                  }
                >
                  Additional Options
                </div>
              )}
            </div>
            {visuals.adv_params && (
              <div style={{ minWidth: visuals.adv_params ? "50%" : "100%" }}>
                <AdvParam
                  add={add}
                  Advtype={Advtype}
                  SetType={SetType}
                  grad={grad}
                  setGrad={setGrad}
                  selBands={selBands}
                  setSelBand={setSelBand}
                  isAdvancedParameters={isAdvancedParameters}
                  setAdvancedParameters={setAdvancedParameters}
                />
              </div>
            )}

            {(Visuals.adv_options ||
              Visuals.req_box ||
              Visuals.req_layer ||
              Visuals.req_region) && (
              <div style={{ minWidth: visuals.adv_options ? "50%" : "100%" }}>
                <Options
                  clip={clip}
                  AddBound={AddBound}
                  clipBox={clipBox}
                  clipLayer={clipLayer}
                  selCont={selCont}
                  selState={selState}
                  setClip={setClip}
                  setBound={setBound}
                  setClipBox={setClipBox}
                  setClipLayer={setClipLayer}
                  setCLayer={setCLayer}
                  setCont={setCont}
                  setState={setState}
                  setDis={setDis}
                  adv_options={Visuals.adv_options}
                  req_box={Visuals.req_box}
                  req_layer={Visuals.req_layer}
                  req_region={Visuals.req_region}
                  isAdditionalOptionsOpen={isAdditionalOptionsOpen}
                  setAdditionalOptionsOpen={setAdditionalOptionsOpen}
                  adv_params={visuals.adv_params}
                />
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* <div style={{ marginLeft: '3px', position: "absolute", bottom: buttonBottom, left: "0px", zIndex: 1000, marginTop: "10px" }}> */}
      <button
        onClick={async () => {
          var areaDrawn = 0;
          if (credit > 0) {
            setloader(true);
            if (clipBox && lastRect) {
              // if (!clipBox) {
              //   setClipBox(true);
              // }
              const box = bbox(drawnItems.getLayer(lastRect).toGeoJSON());
              const [minLng, minLat, maxLng, maxLat] = box;
              const widthInDegrees = maxLng - minLng;
              const heightInDegrees = maxLat - minLat;
              const kmPerDegreeLat = 111.32;
              const midLat = (minLat + maxLat) / 2;
              const kmPerDegreeLng =
                111.32 * Math.cos(midLat * (Math.PI / 180));

              const widthInKm = widthInDegrees * kmPerDegreeLng;
              const heightInKm = heightInDegrees * kmPerDegreeLat;
              areaDrawn = widthInKm * heightInKm;
              console.log(`Bounding Box Area: ${areaDrawn} square km`);
            } else if (clipLayer) {
              areaDrawn = 0;
            } else if (clip) {
              areaDrawn = await getRegionArea();
            } else {
              alert(
                "You need to define boundary to use this feature. Kindly use additional options."
              );
              setloader(false);
              return;
            }
          } else {
            areaDrawn = 0;
          }
          setloader(false);
          credit = await getModifiedCredit(id, areaDrawn);
          console.log("modified credit", credit);

          if (!(credit <= userInfo.credits)) {
            alert(
              `You don't have enough credits to use this feature. Credits required : ${credit}`
            );
            return;
          }
          const confirmUse = window.confirm(
            `This feature uses ${credit} credits. Do you want to proceed?`
          );

          if (confirmUse) {
            if (type) {
              fetchData();
            } else {
              fetchLayer();
            }
          }
        }}
        className={`m-2 visualize-btn ${isSidebarTabs ? "shifted-up" : ""}`}
      >
        {type ? "Analyse" : "Visualize"}
      </button>
      {/* </div> */}
    </>
  );
}

export default DynFeat;
