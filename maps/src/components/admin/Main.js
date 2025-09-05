import React, { useEffect, useRef, useState } from "react";
import L, { bounds } from "leaflet";
import "./BoundaryCanvas";
import "./admin.css";
import clip from "turf-clip";
import { HOST } from "../host";
import Nadi from "../Jeevit-Nadi/nadi";
import "leaflet-ajax";
import { useLayerFunc } from "../Main/layerFunc";
import { logToServer } from "../logger";

function Main({
  map,
  UsedLayers,
  SetLayers,
  setFLayers,
  FilterLayers,
  setFilter,
  SetColor,
  setPloader,
  Canvas,
}) {
  // const LayerWorker = wrap(new Worker('./layerWorker.js'));

  async function GetLayer(name, bound, fill) {
    try {
      setPloader(true);
      await fetch(`${HOST}/project-get-layer`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: name }),
      })
        .then((response) => response.json())
        .then((data) => CreateLayer(data, name, bound, fill));
      setPloader(false);
      logToServer("info", `Layer "${name}" fetched successfully.`);
    } catch (error) {
      alert("Unexpected Error occured Please try again");
      setPloader(false);
      logToServer("error", `Error fetching layer "${name}": ${error.message}`);
    }
  }
  function LayerChange(name, ischeck, bound = false, fill = false) {
    if (ischeck) {
      if (name in UsedLayers) {
        if (bound) {
          UsedLayers[name].addTo(map);
          logToServer("info", `Layer "${name}" added to map.`);
        } else {
          createGridLayer(name);
          logToServer("info", `Grid layer "${name}" created.`);
        }
      } else {
        GetLayer(name, bound, fill);
      }
    } else {
      if (name in UsedLayers) {
        if (bound) {
          UsedLayers[name].remove();
          logToServer("info", `Layer "${name}" removed from map.`);
        } else {
          Canvas.removeLayer(name);
          logToServer("info", `Grid layer "${name}" removed.`);
        }

        if (name in FilterLayers) {
          FilterLayers[name].remove();
          logToServer("info", `Filter layer "${name}" removed.`);
        }
      }
    }
  }

  async function createGridLayer(name, color = null, fill = false) {
    Canvas.addLayer(name, color, fill);
    SetLayers((prevDictionary) => ({
      ...prevDictionary,
      [name]: [name],
    }));
    logToServer("info", `Grid layer "${name}" created.`);
  }
  async function CreateLayer(data, name, bound, change, fill) {
    let layer;
    // let geoj=clip(Boundary,data.layer)

    if (bound) {
      layer = L.geoJson.ajax(
        `https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT:${name}&srsname=EPSG:4326&outputFormat=application/json`,
        {
          style: { color: data.color, fillOpacity: 0.0 },
        }
      );
    }
    if (change) {
      layer = L.geoJson.ajax(
        `https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT:${name}&srsname=EPSG:4326&outputFormat=application/json`,
        {
          style: function (feature) {
            let fstyle = {
              color: data.color,
              fillOpacity: 0.0,
            };
            if (feature.properties.Status) {
              if (feature.properties.Status === "Unauthorised") {
                fstyle.fillColor = "red";
                fstyle.fillOpacity = 0.2;
              }
            }
            return fstyle;
          },
          zIndex: 1000,
          onEachFeature: function (feature, layer) {
            const popupContent = `
                      <strong>ID:</strong>${feature.properties.ID}<br>
                      <strong>Jurisdiction:</strong>${feature.properties.Jurisdicti}<br>
                      <strong>Divison:</strong> ${feature.properties.Division}<br>
                      <strong>Village:</strong>${feature.properties.Village}<br>
                      <strong>Prabhag:</strong>${feature.properties.Prabhag}<br>
                      <strong>Sector:</strong>${feature.properties.Sector}<br>
                      <strong>Node:</strong>${feature.properties.Node}<br>
                      <strong>Plot:</strong>${feature.properties.Plot}<br>
                      <strong>Village Gut:</strong>${feature.properties.Village_Gu}<br>
                      <strong>Lattitude:</strong>${feature.properties.Lattitude}<br>
                      <strong>Longitude:</strong>${feature.properties.Longitude}<br>
                      <strong>Area:</strong>${feature.properties.Area}<br>
                      `;
            layer.bindPopup(popupContent);
          },
        }
      );
    } else if (!bound && !change) {
      createGridLayer(name, data.color, fill);
    }

    if (bound || change) {
      layer.addTo(map);
      layer.on("data:loaded", () => {
        map.flyToBounds(layer.getBounds());
      });
      layer.bringToFront();
      SetLayers((prevDictionary) => ({
        ...prevDictionary,
        [name]: layer,
      }));
      if (change) {
        setFilter(true);
        setFLayers((prevDictionary) => ({
          ...prevDictionary,
          [name]: layer,
        }));
        SetColor((prevDictionary) => ({
          ...prevDictionary,
          [name]: data.color,
        }));
      }

      logToServer("info", `Layer "${name}" added to map.`);
    }
  }

  function CreateTileLayer(name) {
    let Boundary;
    let Bounds;
    let layer;
    if (name[0] === "s") {
      Boundary = UsedLayers["Satara_Boundary"].toGeoJSON();
      Bounds = UsedLayers["Satara_Boundary"].getBounds();
      layer = L.TileLayer.boundaryCanvas(
        `${HOST}/project/${name}/{z}/{x}/{y}.png`,
        {
          boundary: Boundary,
          tms: true,
          bounds: Bounds,
          maxZoom: 20,
          minZoom: 12,
        }
      );
    } else if (name[0] === "2") {
      Boundary = UsedLayers["Agrani_Boundary"].toGeoJSON();
      Bounds = UsedLayers["Agrani_Boundary"].getBounds();
      layer = L.TileLayer.boundaryCanvas(
        `https://geoserver.vasundharaa.in/geoserver/VGT/gwc/service/wmts?layer=VGT:${name}&style=&tilematrixset=EPSG%3A900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A900913%3A{z}&TileCol={x}&TileRow={y}`,
        {
          boundary: Boundary,
          zIndex: 1000,
          bounds: Bounds,
          maxZoom: 20,
        }
      );
    } else {
      Boundary = UsedLayers["Shrijab_Bounds"].toGeoJSON();
      Bounds = UsedLayers["Shrijab_Bounds"].getBounds();
      layer = L.TileLayer.boundaryCanvas(
        `${HOST}/project/${name}/{z}/{x}/{y}.png`,
        {
          boundary: Boundary,
          tms: true,
          bounds: Bounds,
          maxZoom: 20,
          minZoom: 12,
        }
      );
    }
    logToServer("info", `Tile layer "${name}" created.`);

    // Boundary=UsedLayers["SRB"].toGeoJSON()
    // Bounds=UsedLayers["SRB"].getBounds()

    // let layer=L.tileLayer(`${HOST}/project/${name}/{z}/{x}/{y}.png`,{tms:true,maxZoom:20,minZoom:12})

    layer.addTo(map);
    layer.bringToFront();
    SetLayers((prevDictionary) => ({
      ...prevDictionary,
      [name]: layer,
    }));
    map.fire("overlayadd", { layer: layer, name: name, overlay: true });
  }

  function TileLayerChange(name, ischeck) {
    if (ischeck) {
      if (name in UsedLayers) {
        UsedLayers[name].addTo(map);
        map.fire("overlayadd", {
          layer: UsedLayers[name],
          name: name,
          overlay: true,
        });
        logToServer("info", `Tile layer "${name}" added to map.`);
      } else {
        CreateTileLayer(name);
      }
    } else {
      if (name in UsedLayers) {
        UsedLayers[name].remove();
        map.fire("overlayremove", {
          layer: UsedLayers[name],
          name: name,
          overlay: true,
        });
        logToServer("info", `Tile layer "${name}" removed from map.`);
      }
    }
  }

  function handleOpen(id) {
    document.getElementById(id).checked = true;

    LayerChange(id, true, true);
    if (Object.keys(UsedLayers).includes(id)) {
      map.flyToBounds(UsedLayers[id].getBounds());
      logToServer("info", `Map centered to bounds of layer "${id}".`);
    }
  }

  return (
    <div
      className="container"
      style={{
        backgroundColor: " #31304D",
        padding: "20px",
        borderRadius: "1%",
        justifyContent: "flex-start",
        width: "100%",
        alignItems: "flex-start",
      }}
    >
      <div
        className="hiddenActionCont"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          height: "auto",
          width: "100%",
          padding: "10px",
        }}
      >
        <details
          className="baseline"
          onToggle={() => handleOpen("Malegaon_Boundary")}
        >
          <summary>Malegaon</summary>
          <div className="baseline-cont">
            <div className="opt-div">
              <input
                value="Malegaon_Boundary"
                id="Malegaon_Boundary"
                className="w3-check check-map"
                type="checkbox"
                onChange={(e) =>
                  LayerChange(e.target.value, e.target.checked, true)
                }
              />
              <label>Boundary</label>
            </div>
            <div className="opt-div">
              <input
                value="Malegaon_Adm_Boundary"
                id="mnab"
                className="w3-check check-map"
                type="checkbox"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
              />
              <label>Administrative Boundary</label>
            </div>
            <div className="opt-div">
              <input
                value="Malegaon_Building"
                id="mnbl"
                className="w3-check check-map"
                type="checkbox"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
              />
              <label>Buildings</label>
            </div>
            <details id="townD">
              <summary id="townS">Water and Sewerage</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Malegaon_Water_Supply"
                    id="mnwsn"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Water Supply Network</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Water_Bodies_Polygon"
                    id="mnwbp"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Water Bodies Polygon</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Storm_Water"
                    id="mnswd"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Storm Water Drainage Network</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Sewerage"
                    id="mnsn"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Sewerage Network</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Manhole"
                    id="mncm"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Chambers manhole</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary id="townS">Transportation</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Malegaon_Bus"
                    id="mnbs"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Bus Stop</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Road_Polygon"
                    id="mnrp"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.checked,
                        false,
                        false,
                        true
                      )
                    }
                  />
                  <label>Road Polygon</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Road_Line"
                    id="mnrl"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Road Line</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Bridges"
                    id="mnbr"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Bridges</label>
                </div>
              </div>
            </details>

            <details id="townD">
              <summary id="townS">Electric Powerline</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Malegaon_Power_Supply_Network_Points"
                    id="mnpsnp"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Power Supply Network Points</label>
                </div>
                <div className="opt-div">
                  <input
                    value="mnpsnl"
                    id="mnpsnl"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Power Supply Network Lines</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Street_Light"
                    id="mnsl"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Street Lights</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_High_Mast"
                    id="mnhm"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>High Mast</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_Communication"
                    id="mncd"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Communication Devices</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Malegaon_ATM"
                    id="mna"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Atm</label>
                </div>
              </div>
            </details>
          </div>
        </details>

        <details
          className="baseline"
          onToggle={() => handleOpen("Manyad_Boundary")}
        >
          <summary>Manyad</summary>
          <div className="baseline-cont">
            <div className="opt-div">
              <input
                value="Manyad_Boundary"
                id="Manyad_Boundary"
                onChange={(e) =>
                  LayerChange(e.target.value, e.target.checked, true)
                }
                className="w3-check check-map"
                type="checkbox"
              />
              <label>Boundary</label>
            </div>
            <div className="opt-div">
              <input
                value="Manyad_River_poly"
                id="mdr"
                className="w3-check check-map"
                onChange={(e) =>
                  LayerChange(
                    e.target.value,
                    e.target.checked,
                    false,
                    false,
                    true
                  )
                }
                type="checkbox"
              />
              <label>River</label>
            </div>
            <div className="opt-div">
              <input
                value="Manyad_Streams"
                id="mds"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>streams</label>
            </div>
            <div className="opt-div">
              <input
                value="Manyad_Building"
                id="mda"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>All Buildings</label>
            </div>
            <details id="townD">
              <summary id="townS">Buffer</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Manyad_River_Buff_100m"
                    id="mdb100"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>River Buffer 100m</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Manyad_River_Buff_70m"
                    id="mdb70"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>River Buffer 70m</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Manyad_River_Buff_30m"
                    id="mdb30"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>River Buffer 30m</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Manyad_River_Buff_10m"
                    id="mdb10"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>River Buffer 10m</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary id="townS">Flood Prone Buildings</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Manyad_building_100m_prone"
                    id="mdpb100"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Flood Prone 100m</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Manyad_building_70m_prone"
                    id="mdpb70"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Flood Prone 70m</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Manyad_building_30m_prone"
                    id="mdpb30"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Flood Prone 30m</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Manyad_building_10m_prone"
                    id="mdpb10"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Flood Prone 10m</label>
                </div>
              </div>
            </details>
          </div>
        </details>

        <details
          className="baseline"
          onToggle={() => handleOpen("Agrani_Boundary")}
        >
          <summary>Agrani</summary>
          <div className="baseline-cont">
            <div className="opt-div">
              <input
                value="Agrani_Boundary"
                id="Agrani_Boundary"
                onChange={(e) =>
                  LayerChange(e.target.value, e.target.checked, true)
                }
                className="w3-check check-map"
                type="checkbox"
              />
              <label>Boundary</label>
            </div>
            <div className="opt-div">
              <input
                value="Agrani_Dam"
                id="adl"
                className="w3-check check-map"
                onChange={(e) =>
                  LayerChange(e.target.value, e.target.checked, true)
                }
                type="checkbox"
              />
              <label>Dam Locations</label>
            </div>
            <div className="opt-div">
              <input
                value="Agrani_Stream"
                id="asn"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>Stream Network</label>
            </div>
            <details id="townD">
              <summary id="townS">Extracted Green Cover</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Agrani_Green_Cover_2014"
                    id="a2014"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>2014</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Agrani_Green_Cover_2023"
                    id="a2023"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>2023</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary id="townS">NDVI Images</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="2014_NDVI"
                    id="2014_NDVI"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      TileLayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>2014</label>
                </div>
                <div className="opt-div">
                  <input
                    value="2023_NDVI"
                    id="2023_NDVI"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      TileLayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>2023</label>
                </div>
              </div>
            </details>
          </div>
        </details>

        <details
          className="baseline"
          onToggle={() => handleOpen("Satara_Boundary")}
        >
          <summary>Satara</summary>
          <div className="baseline-cont">
            <div className="opt-div">
              <input
                value="Satara_Boundary"
                id="Satara_Boundary"
                onChange={(e) =>
                  LayerChange(e.target.value, e.target.checked, true)
                }
                className="w3-check check-map"
                type="checkbox"
              />
              <label>Boundary</label>
            </div>
            <div className="opt-div">
              <input
                value="Satara_Election_Ward"
                id="seb"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>Election Ward Boundary</label>
            </div>
            <div className="opt-div">
              <input
                value="Satara_Building"
                id="sbl"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>Buildings</label>
            </div>
            <div className="opt-div">
              <input
                value="Satara_Green"
                id="sgc"
                className="w3-check check-map"
                onChange={(e) =>
                  LayerChange(
                    e.target.value,
                    e.target.checked,
                    false,
                    false,
                    true
                  )
                }
                type="checkbox"
              />
              <label>Green Cover</label>
            </div>
            <div className="opt-div">
              <input
                value="Satara_Contours"
                id="sc"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>Contours</label>
            </div>
            <div className="opt-div">
              <input
                value="Satara_Roads"
                id="sr"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>Roads</label>
            </div>
            <div className="opt-div">
              <input
                value="Satara_Tree"
                id="st"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>Tree</label>
            </div>
            <details id="townD">
              <summary id="townS">Water Bodies</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Satara_Canal"
                    id="swc"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.checked,
                        false,
                        false,
                        true
                      )
                    }
                  />
                  <label>Canal</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Satara_River"
                    id="swr"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.checked,
                        false,
                        false,
                        true
                      )
                    }
                  />
                  <label>River</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Satara_Waterbodies"
                    id="sww"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.checked,
                        false,
                        false,
                        true
                      )
                    }
                  />
                  <label>Water Bodies</label>
                </div>
              </div>
            </details>
            <div className="opt-div">
              <input
                value="simage"
                id="simage"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(e.target.value, e.target.checked)
                }
                type="checkbox"
              />
              <label>Image</label>
            </div>
          </div>
        </details>

        <details
          className="baseline"
          onToggle={() => handleOpen("Pune_Demographic")}
        >
          <summary>Pune Election Ward</summary>
          <div className="baseline-cont">
            <div className="opt-div">
              <input
                value="Pune_Ground_Survey"
                id="pune_ground"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                className="w3-check check-map"
                type="checkbox"
              />
              <label>Ground Survey</label>
            </div>
            <div className="opt-div">
              <input
                value="Pune_Demographic"
                id="Pune_Demographic"
                className="w3-check check-map"
                onChange={(e) =>
                  LayerChange(e.target.value, e.target.checked, true)
                }
                type="checkbox"
              />
              <label>Demographic Boundary</label>
            </div>
            <div className="opt-div">
              <input
                value="Pune_Building"
                id="pune_building"
                className="w3-check check-map"
                onChange={(e) => LayerChange(e.target.value, e.target.checked)}
                type="checkbox"
              />
              <label>Buildings</label>
            </div>
            <details id="townD">
              <summary id="townS">Roads</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Pune_road_track"
                    id="prt"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Track</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_tertiary"
                    id="prte"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Tertiary</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_steps"
                    id="prs"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Steps</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_service"
                    id="prse"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Service</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_secondary"
                    id="prsec"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Seconday</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_residential"
                    id="prr"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Residential</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_primary"
                    id="prp"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Primary</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_path"
                    id="prpa"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Path</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_living_street"
                    id="prl"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Living Street</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_road_footway"
                    id="prf"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Footway</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary id="townS">Point</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Pune_point_toilet"
                    id="ppt"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Toilet</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_school"
                    id="ppr"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>School</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_restaurant"
                    id="ppr"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Restaurant</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_post_office"
                    id="ppp"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Post Office</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_post_box"
                    id="pppo"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Post Box</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_police"
                    id="ppl"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Police</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_hotel"
                    id="pph"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Hotel</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_hostel"
                    id="ppho"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Hostel</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_community_centres"
                    id="ppc"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Community Centre</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_comms_tower"
                    id="ppcol"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Comms Tower</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_point_college"
                    id="ppcol"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>College</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary id="townS">Landuse</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Pune_landuse_scrub"
                    id="pls"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Scrub</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_retail"
                    id="plr"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Retail</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_residential"
                    id="plrec"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Residential</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_ground"
                    id="plrec"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Recreation Ground</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_park"
                    id="plp"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Park</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_nature"
                    id="pln"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Nature Reserve</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_military"
                    id="plm"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Military</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_industrial"
                    id="pli"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Industrial</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_landuse_health"
                    id="plh"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Health</label>
                </div>
                <div className="opt-div">
                  <input
                    value="	Pune_landuse_commercial"
                    id="plc"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Commercial</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Pune_cemetery"
                    id="plce"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Cemetry</label>
                </div>
              </div>
            </details>
          </div>
        </details>
        <Nadi map={map} />
        <details
          className="baseline"
          onToggle={() => handleOpen("Shrijab_Bounds")}
        >
          <summary>Shrijab</summary>
          <div className="baseline-cont">
            <div className="opt-div">
              <input
                value="Srimage"
                id="Srimage"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(e.target.value, e.target.checked)
                }
                type="checkbox"
              />
              <label>Image</label>
            </div>
            <div style={{ display: "none" }} className="opt-div">
              <input
                value="Shrijab_Bounds"
                id="Shrijab_Bounds"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(e.target.value, e.target.checked)
                }
                type="checkbox"
              />
              <label>Image</label>
            </div>
            <details id="townD">
              <summary id="townS">Object Detection</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Shrijab_Vehicle"
                    id="srv"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Vehicle</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Shrijab_Parking"
                    id="srp"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Parking</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Shrijab_Implacement"
                    id="sre"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(e.target.value, e.target.checked)
                    }
                  />
                  <label>Emplacements</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary id="townS">Segmentation</summary>
              <div
                className="town-cont"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyItems: "right",
                }}
              >
                <div className="opt-div">
                  <input
                    value="Shrijab_Trenches"
                    id="srt"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.checked,
                        false,
                        false,
                        true
                      )
                    }
                  />
                  <label>Trenches</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Shrijab_Road"
                    id="srr"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.checked,
                        false,
                        false,
                        true
                      )
                    }
                  />
                  <label>Road</label>
                </div>
                <div className="opt-div">
                  <input
                    value="Shrijab_Bund"
                    id="srb"
                    className="w3-check check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.checked,
                        false,
                        false,
                        true
                      )
                    }
                  />
                  <label>Bund</label>
                </div>
              </div>
            </details>
          </div>
        </details>
      </div>
    </div>
  );
}

export default Main;
