
import React, { useState, useEffect, useRef, useContext } from "react";
import L, { Canvas, bounds, popup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import "leaflet-fullscreen/dist/leaflet.fullscreen.css";
import "leaflet-fullscreen";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.js";
import "../ControlCoords/Control.Coordinates";
import "../ControlCoords/Control.Coordinates.css";
import "./map.css";
import "./leaflet-routing-machine.css";
import "../geocode/leaflet.css";
import '../geocode/leafletdraw.css';
import '../Print/Leaflet.BigImage';
import '../Print/Leaflet.BigImage.css';
import { HOST } from "../host";
import baseLayers from "./BaseLayers";
import { layersControl } from "../LayerContol";
import Sidebar from "./sidebar";
import Loading from "./loading";
import { GlobalContext } from "../../App";
import MultiLineChart from "./chart";
import VectorCanvas from "../VectorCanvas/GeojsonLayer";
import Tools from "./Tools/Tools";
import geocoder from "../geocode/index.ts"
import { google } from "../geocode/google.ts"
import Chatbot from "./Chatbot.js";
import Migrate from "./Migrate.js";
import files from "../static.js";
import { landBandsRev } from "./Actions/satStatic.js"
import ".././geolet.js"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { helpers, area } from "@turf/turf";
import { logToServer } from "../logger.js";
import eventEmitter from "../eventEmitter.js";
import Modal from 'react-modal';
import CsvToHtmlTable from "./CsvTable.js";
import ResizableDiv from "./ResizableDiv.js";

let geo;
var coordinatesControl;
var drawControl, customButton;

function Map() {

  const {
    loaded,
    setLoad,
    mapData,
    setMapData,
    map,
    SetMap,
    drawnItems,
    setDrawnItems,
    setLayerControls,
    layerControls,
    setDraw,
    foreLayers,
    backLayers,
    setRect,
    lastRect,
    usedShapes,
    selectedLayers,
    setSelLayers,
    chartData,
    setChart,
    Canvas,
    setCanvas,
    customMarker,
    SetLayers,
    chartCollapse,
    setCollapse,
    showGrid,
    Grat,
    setCoder,
    chartType,
    Waterlayers,
    setWaterLayers,
    userInfo,
    setOrganizationProjects,
    setUserProjects,
    organizationProjects,
    userProjects,
    selTab,
    inspect,
    setLBands,
    LayerBands,
    SetToggled,
    getCsrfToken
  } = useContext(GlobalContext);
  const [migrate, setMigrate] = useState(false);
  const [idFetch, setId] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [OverLayers, setOverlay] = useState([])
  const [meas, setMes] = useState(null)
  const [csvTable, setTable] = useState(false)
  const [csvData, setTableData] = useState(null)
  const [csvLayer, setcsvLayer] = useState(false)
  const location = useLocation();
  const addedDraw = {}
  const navigate = useNavigate();

  eventEmitter.on("open-csv", showCsv.bind(this))

  useEffect(() => {
    if (map && userProjects && organizationProjects) {
      console.log("found")
      const path = sessionStorage.getItem('storedPath');
      console.log(window.location.pathname, path)
      if (path && path !== window.location.pathname) {

        navigate(path)
      } else {
        sessionStorage.setItem('storedPath', window.location.pathname);
      }
    }

  }, [map, organizationProjects, userProjects])

  function swapCoords(coords, type) {
    if (type === "marker") {
      return [coords[1], coords[0]]
    }
    if (type === "polyline") {
      return coords.map(coord => [coord[1], coord[0]]);
    }
    return [[coords[0].map(coord => [coord[1], coord[0]])]]
  }

  function showCsv(data) {
    if (data && data.name && Canvas) {
      setTable(true)
      setTableData(Canvas.getCsv(data.name))
      setcsvLayer(data.name)
    }
  }

  async function fetchAct(ids) {
    try {
      const response = await fetch(`${HOST}/fetch-act-view`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data: { "ids": ids } }),
      });
      const data = await response.json();
      if (Array.isArray(data.act)) {
        logToServer("info", "Fetched activities successfully");
        return data.act
      } else {
        console.error("Error: Data is not an array");
        logToServer("error", "Fetch activities failed: Data is not an array");
      }
    } catch (error) {
      logToServer('error', `Fetch activities failed ${error}`)
    }
  }

  useEffect(() => {
    if (!mapData) {
      fetch(`${HOST}/get-map`)
        .then((response) => response.json())
        .then((data) => {
          setLoad(true);
          setMapData(data);
          logToServer('info', 'Fetch get-map Successfully')
        })
        .catch((error) => {
          alert("Unexpected Error occured Please try again")
          logToServer('error', `${error}`)
        });
    } else {
      setLoad(true);
    }
    if (map) {
      SetMap(null)
      setLoad(true)
    }
    const handleMigrate = (e) => {
      setOverlay(e.detail)
      setMigrate(true)

    };
    document.addEventListener("migrate-layer", handleMigrate);

    return () => {
      document.removeEventListener("migrate-layer", handleMigrate);
    };

  }, []);



  const openChatbot = () => {
    setShowChatbot(true);
  };

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (
  //       event.target.closest(".chatbot-window") === null &&
  //       event.target.closest(".chatbot-btn") === null
  //     ) {
  //       setShowChatbot(false);
  //       setMigrate(false)
  //     }
  //   };

  //   document.addEventListener("click", handleClickOutside);

  //   return () => {
  //     document.removeEventListener("click", handleClickOutside);
  //   };
  // }, []);



  async function GetPixelValue(coords, key) {
    console.log("pixel function")
    try {

      const loadingPopup = L.popup()
        .setLatLng(coords)
        .setContent("Loading pixel value...")
        .openOn(map);

      const response = await fetch(`${HOST}/get-pixel-value`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data: { key: key, coords: coords } })
      });
      const data = await response.json();
      let content = "";
      if (Object.keys(data).length) {

        let bands = []
        Object.keys(data).forEach((ele) => {
          content += `${ele} : ${data[ele]}<br>`;
          if (!Object.keys(LayerBands).includes(key)) {
            bands.push(ele)
          }
        });
        if (!Object.keys(LayerBands).includes(key)) {
          console.log(key)
          setLBands(prevDictionary => ({
            ...prevDictionary,
            [key]: bands,
          }));
        }
      } else {
        const projectId = location.pathname.split("/")[3];
        if (projectId) {

          // eventEmitter.emit('refresh-url', { key:key });
          const event = new CustomEvent("fired", { detail: { key: key, popup: loadingPopup } });
          document.dispatchEvent(event);
        } else {
          content = "Error Fetching Pixel Value"
        }

      }

      loadingPopup.setContent(content);
      logToServer('info', `Successfully fetched pixel value for key ${key} at coordinates ${coords}`)
    } catch (error) {
      console.error("Error sending POST request:", error.message);
      alert("Unexpected Error occurred. Please try again");
      logToServer('error', `Error fetching pixel value for key ${key} at coordinates ${coords}: ${error.message}`)
    }
  }

  useEffect(() => {
    if (map) {
      const handleClick = async (event) => {
        try {
          const url = event.originalEvent.srcElement.currentSrc;
          if (url.includes("earthengine.googleapis.com") && inspect) {
            await GetPixelValue(event.latlng, url.split("/")[7]);
            logToServer('info', `Successfully handled click event for ${url} at ${event.latlng}`)
          }
        } catch (e) {
          logToServer('error', `Error handling click event: ${e.message}`)
          console.error("Error handling click event:", e);
        }
      };

      if (inspect) {
        map.addEventListener('click', handleClick);
      } else {
        map.removeEventListener('click', handleClick);
      }

      return () => {
        map.removeEventListener('click', handleClick);
      };
    }
  }, [map, inspect]);


  useEffect(() => {
    if (!map && userInfo && loaded) {
      const center = [27.891535, 78.078743]
      const zoom = 4.0
      const newMap = new L.map("map", { zoomControl: false }).setView(center, zoom);

      geo = new geocoder({
        geocoder: google(),
        collapsed: false,
        defaultMarkGeocode: false,
        position: "topright",
        queryMinLength: 1,
        suggestMinLength: 1,
        suggestTimeout: 100
      })
        .on("markgeocode", function (e) {

          let mark = L.marker(e.geocode.center, { icon: new customMarker() }).bindPopup(e.geocode.name)
          mark.addTo(newMap);
          newMap.fire("draw:created", { layer: mark });
          newMap.flyTo(e.geocode.center, 18);
        })

      geo.addTo(newMap);
      setCoder(geo)


      const hyb = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        zIndex: 1000,
        attribution: '© Vasundharaa Geo Technologies Pvt. Ltd.'
      }).addTo(newMap);
      setSelLayers({ "Basemap": hyb });

      Object.keys(baseLayers).forEach((key) => {
        if (key.includes("Hybrid")) {
          baseLayers[key] = hyb;
        }
      })


      layersControl(baseLayers, {}, { autoZIndex: false, type: "Basemap" }).addTo(newMap)
      const layer_c = layersControl({}, {}, {
        autoZIndex: false,
        collapsed: true,
        position: "topright",
        type: "Overlay",

      })
        .addTo(newMap);


      const items = new L.FeatureGroup();
      setDrawnItems(items);
      drawControl = new L.Control.Draw({
        draw: {
          marker: {
            icon: new customMarker(),
          },
          polygon: { shapeOptions: { color: "#3388ff" } },
          polyline: { shapeOptions: {} },
          rectangle: { shapeOptions: { color: "#3388ff" } },
          circle: false,
          circlemarker: false,
        },
        position: "topright",
        edit: {
          featureGroup: items,
          remove: true,
        },
      });
      setDraw(drawControl);
      newMap.addControl(drawControl);
      newMap.addLayer(items);
      L.geolet({ position: 'topright', enableHighAccuracy: true }).addTo(newMap);


      //add chatbot button
      // customButton = L.Control.extend({
      //   options: { position: 'topright' },
      //   onAdd: function () {
      //     const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control shake');
      //     container.innerHTML = `
      //       <div class="btn-light chatbot-btn" style="position: relative;">
      //         <img src="${process.env.PUBLIC_URL}/${files}chatbot.png" style="width: 40px; height: 40px; border-radius: 50%; z-index: 1000;" />
      //         <div id="chatbot-prompt" class="chatbot-prompt" style="position: absolute; left: -110px; top: -10px;">Ask me something</div>
      //       </div>`;
      //     container.onclick = openChatbot;

      //     setTimeout(() => {
      //       const prompt = document.getElementById('chatbot-prompt');
      //       if (prompt) {
      //         prompt.parentNode.removeChild(prompt);
      //       }
      //     }, 5000);


      //     return container;
      //   }
      // });

      // newMap.addControl(new customButton());

      coordinatesControl = new L.Control.Coordinates({ position: "bottomright" });
      coordinatesControl.addTo(newMap);
      newMap.on('mousemove', function (e) {
        coordinatesControl.setCoordinates(e);
      });

      // Add Scale Control with Margin
      L.control.scale({ position: "bottomright", imperial: false }).addTo(newMap);

      // Apply CSS for Margin
      const addControlMargin = () => {
        const controls = document.getElementsByClassName('leaflet-bottom leaflet-right')[0];
        if (controls) {
          controls.style.marginRight = '70px';
        }
      };

      setTimeout(addControlMargin, 500);





      let deck = new VectorCanvas();
      deck.addTo(newMap, "tile-pane")


      function deckLayerchange(e) {
        if (e.type === "decklayeradd") {
          deck.addLayer(e.name, e.id)
        }
        if (e.type === "decklayerremove") {
          deck.removeLayer(e.name, e.id);
        }
        if (e.type === "decklayercross") {
          console.log(e)
          if (e.id) {
            deck.removeLayerFromMap(e.name, e.id)
          } else {
            deck.removeLayer(e.name, e.id);
          }

        }
        if (e.type === "deckcolorchange") {
          deck.LayerColorChange(e.name, e.color, e.checked)
        }
        if (e.type === "deckopacitychange") {
          deck.LayerOpacityChange(e.name, e.opacity, e.checked)
        }
        if (e.type === "decklayerrename") {
          console.log(e)
          deck.LayerRename(e.prev, e.new)
        }
      }

      // var c = new L.Control.Coordinates({ position: "bottomright" });
      // c.addTo(newMap);
      // newMap.on('mousemove', function (e) {
      //   c.setCoordinates(e);
      // });
      // L.control.scale({ position: "bottomright", imperial: false }).addTo(newMap)

      // L.control.bigImage({position: 'topright'}).addTo(newMap);


      newMap.on("baselayerchange", layerchange)
      newMap.on("overlayadd", layerchange)
      newMap.on("overlayremove", layerchange)
      newMap.on("decklayeradd", deckLayerchange)
      newMap.on("decklayerremove", deckLayerchange)
      newMap.on("decklayercross", deckLayerchange)
      newMap.on("deckcolorchange", deckLayerchange)
      newMap.on("deckopacitychange", deckLayerchange)
      newMap.on("decklayerrename", deckLayerchange)
      newMap.on("layerrename", layerchange)


      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=').map(c => c.trim());
        acc[name] = value;
        return acc;
      }, {});
      console.log(cookies)
      const savedViewLay = JSON.parse(cookies.viewLay || "[]");
      if (savedViewLay && savedViewLay.length) {
        if (!map) {

          setTimeout(() => {
            alert("Please wait fetching Viewed Layers")
            fetchAct(savedViewLay).then(result => {
              document.cookie = 'viewLay=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
              result.forEach((act) => {
                console.log(act)
                let layer
                if (act.type === "draw") {
                  let type = act.data.name;
                  switch (type) {
                    case 'rectangle':
                      layer = L.rectangle(swapCoords(act.data.coords, type));
                      break;
                    case 'polyline':
                      layer = L.polyline(swapCoords(act.data.coords, type));
                      break;
                    case 'polygon':
                      layer = L.polygon(swapCoords(act.data.coords, type));
                      break;
                    case 'marker':
                      let custom = new customMarker();
                      layer = L.marker(swapCoords(act.data.coords, type), { icon: custom });
                      break;
                    default:
                      console.error('Invalid layer type');
                      return;
                  }
                  let bounds
                  try {
                    bounds = layer.getBounds()
                  } catch (e) {
                    var latLng = layer.getLatLng();
                    var latitude = latLng.lat;
                    var longitude = latLng.lng;
                    bounds = [[latitude, longitude], [latitude, longitude]]
                  }
                  layer.addTo(newMap)
                  layer_c.addOverlay(
                    layer,
                    `${act.data.name}-${act.id}`,
                    true,
                    bounds,
                    false,
                    false,
                    true,
                    act.id
                  );
                  items.addLayer(layer)
                  if (type === "rectangle") {
                    setRect(items.getLayerId(layer))
                    usedShapes.addLayer(layer)
                  }
                  if (type === "polygon") {
                    usedShapes.addLayer(layer)
                  }

                }
                if (act.type === "layer") {
                  layer = L.tileLayer(act.data.url, { zIndex: 1005, maxZoom: 20 })
                  let name = act.data.name;
                  let layerName = name + " - " + act.data.date;
                  if (act.data.vis.bands) {
                    layerName += `- ${name === "10m Satellite data (Sentinel 2)"
                      ? act.data.vis.bands[0]
                      : landBandsRev[act.data.vis.bands[0]]
                      }-${name === "10m Satellite data (Sentinel 2)"
                        ? act.data.vis.bands[1]
                        : landBandsRev[act.data.vis.bands[1]]
                      }-${name === "10m Satellite data (Sentinel 2)" 
                        ? act.data.vis.bands[2]
                        : landBandsRev[act.data.vis.bands[2]]
                      }`;
                  }
                  if (act.data.vis.indices) {
                    layerName += `- ${name === "10m Satellite data (Sentinel 2)"
                      ? act.data.vis.indices[0]
                      : landBandsRev[act.data.vis.indices[0]]
                      }-${name === "10m Satellite data (Sentinel 2)"
                        ? act.data.vis.indices[1]
                        : landBandsRev[act.data.vis.indices[1]]
                      }`;
                  }
                  if (act.data.vis.clip) {
                    layerName += "-" + act.data.vis.clip;
                  }
                  layer.addTo(newMap)
                  layer_c.addOverlay(layer, layerName, false, false, false, false, false, act.id);
                }
                if (act.type === "upload") {
                  if (act.data.type === "vector") {
                    deck.addLayer(act.data.id, `upload-${act.id}`, "#000000", false, true, act.data.bounds)
                    layer_c.addOverlay(L.geoJSON(), `upload-${act.id}`, true, act.data.bounds, true, act.data.id, false, act.id)
                  }
                  if (act.data.type === "raster") {
                    layer = L.tileLayer(`https://geoserver.vasundharaa.in/geoserver/useruploads/gwc/service/wmts?layer=useruploads:${act.data.id}&style=&tilematrixset=EPSG%3A900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A900913%3A{z}&TileCol={x}&TileRow={y}`, {
                      zIndex: 1000,
                      maxZoom: 20,
                      bounds: act.data.bounds
                    })
                    layer.addTo(newMap)
                    layer_c.addOverlay(layer, `upload-${act.id}`, true, act.data.bounds, false, false, false, act.id)
                  }

                }
              })
            });

          }, 500);
        }
      }
      setLayerControls(layer_c);
      setCanvas(deck);
      // let temp_layer=L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9da57b6e5104f7055f3ba9bc7b58a650`,{maxZoom: 20,
      //   zIndex: 1000})
      // temp_layer.addTo(newMap)
      SetMap(newMap);
      logToServer('info', 'Leaflet map initialized and configured successfully.')
    }

  }, [map, customMarker, userInfo]);



  function layerchange(e) {
    logToServer('info', 'Handling layer change event.',)
    if (e.type === "baselayerchange") {
      setSelLayers((prevLayers) => ({
        ...prevLayers,
        Basemap: e.layer,
      }));
    }
    if (e.type === "overlayadd") {
      setSelLayers((prevDictionary) => ({
        ...prevDictionary,
        [e.name]: e.layer,
      }));
    }
    if (e.type === "overlayremove") {
      setSelLayers((prevLayers) => {
        const { [e.name]: removedlayer, ...newLayers } = prevLayers;
        return newLayers;
      });

      if (!e.draw) {
        try {
          if (!e.layer._url.includes("portal.vasundharaa.in") && e.send) {
            sendRemove(e.id);
          }
        } catch (e) {
          console.error("Error while handling overlayremove:", e);
          logToServer('error', 'Error while handling overlay remove event.',)
        }
      }
    }
    if (e.type === "layerrename") {
      setSelLayers((prevLayers) => {
        const { [e.prev]: renamedLayer, ...rest } = prevLayers;
        return { [e.new]: renamedLayer, ...rest };
      });
    }

  }


  async function sendRemove(id) {
    let data = {};

    if (window.location.pathname.startsWith("/project/")) {
      const projectId = window.location.pathname.split("/")[3];
      data["project"] = projectId;
    } else {
      data["project"] = "global"
    }
    data["memb"] = userInfo.id;
    data["tab"] = selTab;
    if (id) {
      data["parent"] = id;
    }
    try {
      const response = await fetch(`${HOST}/remove-layer-act`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      });
      if (!response.ok) {
        throw new Error("Failed to send draw data");
      }
      logToServer('info', 'Successfully sent layer removal request.')
    } catch (error) {
      logToServer('error', `error occurred while sending draw data:${error}`)
      console.error("Error occurred while sending draw data:", error);
      throw error;
    }



  }
  async function sendDraw(type, lname, bound, parent, coords) {
    let data = {};

    if (window.location.pathname.startsWith("/project/")) {
      const projectId = window.location.pathname.split("/")[3];
      data["project"] = projectId;
    } else {
      data["project"] = "global"
    }
    data["memb"] = userInfo.id;
    data["tab"] = selTab;
    data["type"] = type;
    data["lname"] = lname;
    data["bound"] = bound;
    data["coords"] = coords
    if (parent) {
      data["parent"] = parent;
    }
    console.log(data)
    try {
      const response = await fetch(`${HOST}/draw-act`, {
        method: "POST",
        credentials: 'include',
        headers: {

          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      });
      if (!response.ok) {
        logToServer('error', 'Failed to send draw data.')
        throw new Error("Failed to send draw data");
      }
      const responseData = await response.json();
      logToServer('info', 'Successfully sent draw data.')
      return responseData;
    } catch (error) {
      logToServer('error', 'Error occurred while sending draw data.')
      console.error("Error occurred while sending draw data:", error);
      throw error;
    }

  }


  useEffect(() => {
    if (map && drawnItems) {

      map.on("draw:created", function (e) {
        L.DomEvent.stopPropagation(e);
        var layer = e.layer;
        drawnItems.addLayer(layer);
        let lname = null;
        if (e.layerType === "polyline") {
          lname = "polyline";
          var totalDistance = 0;
          var latlngs = layer.getLatLngs();
          for (var i = 1; i < latlngs.length; i++) {
            var latlng1 = latlngs[i - 1];
            var latlng2 = latlngs[i];
            var distance = latlng1.distanceTo(latlng2);
            totalDistance += distance;
          }
          if (totalDistance < 1000) {
            layer.bindPopup((totalDistance).toFixed(2) + 'm');
          } else {
            layer.bindPopup((totalDistance / 1000).toFixed(2) + 'km');
          }

          layer.on('mouseover', function (e) {
            let mes = document.getElementById('areaInfo')
            mes.style.display = "block"
            setMes((totalDistance < 1000 ? totalDistance : totalDistance / 1000).toFixed(2) + (totalDistance < 1000 ? 'm' : 'km'));
          });

          layer.on('mouseout', function (e) {
            let mes = document.getElementById('areaInfo')
            mes.style.display = "none"
            setMes(null)
          });
        }


        if (e.layerType === "rectangle") {
          lname = "rectangle";
          usedShapes.addLayer(layer);
          setRect(drawnItems.getLayerId(layer));

          var bounds = layer.getBounds();
          var width = L.CRS.Earth.distance(bounds.getSouthWest(), L.latLng(bounds.getSouthWest().lat, bounds.getNorthEast().lng));
          var height = L.CRS.Earth.distance(bounds.getSouthWest(), L.latLng(bounds.getNorthEast().lat, bounds.getSouthWest().lng));
          var area = width * height;
          var perimeter = 2 * (width + height);
          var popupContent;

          if (area < 1000000) {
            popupContent = "Area: " + area.toFixed(2) + " sq m ";
          } else {
            area = area / 1000000;
            perimeter = perimeter / 1000;
            popupContent = "Area: " + area.toFixed(2) + " sq km ";
          }

          // Bind the popup to the layer
          layer.bindPopup(popupContent);

          layer.on('mouseover', function (e) {
            let mes = document.getElementById('areaInfo');
            mes.style.display = "block";
            setMes(popupContent);
          });
          layer.on('mouseout', function (e) {
            let mes = document.getElementById('areaInfo');
            mes.style.display = "none";
            setMes(null);
          });
        }

        if (e.layerType === "polygon") {
          lname = "polygon";
          usedShapes.addLayer(layer);
          var areaInSquareMeters = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
          var popupContent;

          if (areaInSquareMeters < 1000000) {
            popupContent = "Area: " + areaInSquareMeters.toFixed(2) + " sq m ";
          } else {
            var areaInSquareKm = areaInSquareMeters / 1000000;
            popupContent = "Area: " + areaInSquareKm.toFixed(2) + " sq km ";
          }

          // Bind the popup to the layer
          layer.bindPopup(popupContent);

          layer.on('mouseover', function (e) {
            let mes = document.getElementById('areaInfo');
            mes.style.display = "block";
            setMes(popupContent);
          });
          layer.on('mouseout', function (e) {
            let mes = document.getElementById('areaInfo');
            mes.style.display = "none";
            setMes(null);
          });
        }

        if (e.layerType === "marker") {
          lname = "marker";
          var latLng = layer.getLatLng();
          var latitude = latLng.lat;
          var longitude = latLng.lng;
          var popupContent = "Latitude: " + latitude + "<br>Longitude: " + longitude;
          layer.bindPopup(popupContent);
          layer.on('mouseover', function (e) {
            this.openPopup();
          });
          layer.on('mouseout', function (e) {
            this.closePopup();
          });
        }
        if (e.layerType !== undefined) {
          if (Object.keys(addedDraw).includes(e.layerType)) {
            addedDraw[e.layerType] += 1
          } else {
            addedDraw[e.layerType] = 1
          }
          let bounds = null
          try {
            bounds = layer.getBounds()
          } catch (e) {
            var latLng = layer.getLatLng();
            var latitude = latLng.lat;
            var longitude = latLng.lng;
            bounds = [[latitude, longitude], [latitude, longitude]]
          }
          if (bounds) {
            let parent = null;
            console.log(layer.toGeoJSON().geometry.coordinates)
            sendDraw("create", lname, bounds, null, layer.toGeoJSON().geometry.coordinates)
              .then(result => {
                // Check if the result is not undefined before accessing its id property
                if (result && result.parent) {
                  parent = result.parent;
                  console.log(parent)
                  layerControls.addOverlay(
                    layer,
                    `${e.layerType}-${addedDraw[e.layerType]}`,
                    true,
                    bounds,
                    false,
                    false,
                    true,
                    parent // Pass parent to layerControls.addOverlay
                  );
                  setSelLayers(prevDictionary => ({
                    ...prevDictionary,
                    [`${e.layerType}-${addedDraw[e.layerType]}`]: layer,
                  }));
                } else {
                  console.error("Error: sendDraw did not return the expected result");
                }
              })
              .catch(error => {
                logToServer('error', 'Error occurred while sending draw data.')
                console.error("Error occurred while calling sendDraw:", error);
              });


          } else {
            layerControls.addOverlay(
              layer,
              `${e.layerType}-${addedDraw[e.layerType]}`,
              false,
              null,
              false,
              false,
              true
            );
          }

        }
      });

      map.on("draw:edited", function (e) {
        L.DomEvent.stopPropagation(e);
        e.layers.eachLayer(function (layer) {
          let lname = null;
          if (layer instanceof L.Rectangle) {
            lname = "rectangle";
            usedShapes.addLayer(layer);
            setRect(drawnItems.getLayerId(layer));
            var bounds = layer.getBounds();
            var width = L.CRS.Earth.distance(bounds.getSouthWest(), L.latLng(bounds.getSouthWest().lat, bounds.getNorthEast().lng));
            var height = L.CRS.Earth.distance(bounds.getSouthWest(), L.latLng(bounds.getNorthEast().lat, bounds.getSouthWest().lng));
            var area = width * height;
            var perimeter = 2 * (width + height);
            var popupContent;

            if (area < 1000000) {
              popupContent = "Area: " + area.toFixed(2) + " sq m ";
            } else {
              area = area / 1000000;
              perimeter = perimeter / 1000;
              popupContent = "Area: " + area.toFixed(2) + " sq km ";
            }

            // Bind the popup to the layer
            layer.bindPopup(popupContent);

            layer.on('mouseover', function (e) {
              let mes = document.getElementById('areaInfo');
              mes.style.display = "block";
              setMes(popupContent);
            });
            layer.on('mouseout', function (e) {
              let mes = document.getElementById('areaInfo');
              mes.style.display = "none";
              setMes(null);
            });
          } else if (layer instanceof L.Polygon) {
            lname = "polygon";
            usedShapes.addLayer(layer);
            var areaInSquareMeters = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            var popupContent;

            if (areaInSquareMeters < 1000000) {
              popupContent = "Area: " + areaInSquareMeters.toFixed(2) + " sq m ";
            } else {
              var areaInSquareKm = areaInSquareMeters / 1000000;
              popupContent = "Area: " + areaInSquareKm.toFixed(2) + " sq km ";
            }

            // Bind the popup to the layer
            layer.bindPopup(popupContent);

            layer.on('mouseover', function (e) {
              let mes = document.getElementById('areaInfo');
              mes.style.display = "block";
              setMes(popupContent);
            });
            layer.on('mouseout', function (e) {
              let mes = document.getElementById('areaInfo');
              mes.style.display = "none";
              setMes(null);
            });
          }

          else if (layer instanceof L.Polyline) {
            lname = "polyline";
            var totalDistance = 0;
            var latlngs = layer.getLatLngs();
            for (var i = 1; i < latlngs.length; i++) {
              var latlng1 = latlngs[i - 1];
              var latlng2 = latlngs[i];
              var distance = latlng1.distanceTo(latlng2);
              totalDistance += distance;
            }
            if (totalDistance < 1000) {
              layer.bindPopup((totalDistance).toFixed(2) + 'm');
            } else {
              layer.bindPopup((totalDistance / 1000).toFixed(2) + 'km');
            }

            layer.on('mouseover', function (e) {
              let mes = document.getElementById('areaInfo')
              mes.style.display = "block"
              setMes((totalDistance < 1000 ? totalDistance : totalDistance / 1000).toFixed(2) + (totalDistance < 1000 ? 'm' : 'km'));
            });

            layer.on('mouseout', function (e) {
              let mes = document.getElementById('areaInfo')
              mes.style.display = "none"
              setMes(null)
            });
          }
          else if (layer instanceof L.Marker) {
            lname = "marker";
            var latLng = layer.getLatLng();
            var latitude = latLng.lat;
            var longitude = latLng.lng;
            var popupContent = "Latitude: " + latitude + "<br>Longitude: " + longitude;
            layer.bindPopup(popupContent);
            layer.on('mouseover', function (e) {
              this.openPopup();
            });
            layer.on('mouseout', function (e) {
              this.closePopup();
            });
          }
          let boundss = null;
          try {
            boundss = layer.getBounds()
          } catch (e) {
            var latLng = layer.getLatLng();
            var latitude = latLng.lat;
            var longitude = latLng.lng;
            boundss = [[latitude, longitude], [latitude, longitude]]
            logToServer('error', `${e}`)
          }
          if (boundss) {
            let parent;
            parent = layerControls.__getParent(layer)
            sendDraw("edit", lname, bounds, parent, layer.toGeoJSON().geometry.coordinates)
              .then(result => {
                console.log(result)
                // Check if the result is not undefined before accessing its id property
                if (result && result.parent) {
                  parent = result.parent;
                  console.log(parent)
                  layerControls.__editDrawLayer(layer, boundss, parent)
                  drawnItems.addLayer(layer);
                } else {
                  console.error("Error: sendDraw did not return the expected result");
                }
              })
              .catch(error => {
                console.error("Error occurred while calling sendDraw:", error);
                logToServer('error', `Error occurred while calling sendDraw:${error}`)
              });


          }
        });
      });

      map.on("draw:deleted", function (e) {
        L.DomEvent.stopPropagation(e);
        var layers = e.layers;
        if (Array.isArray(layers)) {
          console.log("here")
          let layer = layers[0];
          let parent = layers[1]
          if (foreLayers.hasLayer(layer)) {
            foreLayers.removeLayer(layer);
          } else if (backLayers.hasLayer(layer)) {
            backLayers.removeLayer(layer);
          }
          if (usedShapes.hasLayer(layer)) {
            usedShapes.removeLayer(layer)
          }
          console.log(drawnItems.getLayerId(layer), lastRect)
          if (drawnItems.getLayerId(layer) === lastRect) {
            setRect(null)
          }
          try {
            console.log(parent)
            sendDraw("delete", null, null, parent, null)
              .then(result => {
                drawnItems.removeLayer(layer);
                layerControls.removeLayer(layer);
              })
              .catch(error => {
                logToServer('error', `Error occurred while calling sendDraw:${error}`)
              });

          } catch (e) {

          }

        } else {
          if (foreLayers.hasLayer(layers)) {
            foreLayers.removeLayer(layers);
          } else if (backLayers.hasLayer(layers)) {
            backLayers.removeLayer(layers);
          }
          if (usedShapes.hasLayer(layers)) {
            usedShapes.removeLayer(layers)
          }
          console.log(drawnItems.getLayerId(layers), lastRect)
          if (drawnItems.getLayerId(layers) === lastRect) {
            setRect(null)
          }
          try {
            Object.keys(layers._layers).forEach((l) => {
              let parent = layerControls.__getParent(layers._layers[l])
              sendDraw("delete", null, null, parent, null)
                .then(result => {
                  drawnItems.removeLayer(layers._layers[l])
                  layerControls.removeLayer(layers._layers[l])
                })
                .catch(error => {
                  logToServer('error', `Error occurred while calling sendDraw:${error}`)
                });


            })

          } catch (e) {

          }
        }

      });


    }

  }, [map, drawnItems, foreLayers, backLayers]);

  useEffect(() => {
    if (showGrid) {
      Grat.addTo(map)
    } else {
      Grat.remove();
    }
  }, [showGrid])

  function RemoveChart() {
    setChart(null)
    if (chartType === 'water') {
      if (Object.keys(Waterlayers).length) {
        Object.keys(Waterlayers).forEach((ele) => {
          Waterlayers[ele].remove()
        })
      }
      setWaterLayers({});
    }
  }



  return (
    <div style={{ border: 'none' }}>
      {loaded ? (
        <div style={{ position: 'relative', height: "100%", width: "100%", border: 'none',  }}>
          {csvTable && csvData && (
            // <div style={{
            //   position: 'absolute',
            //   top: '10px',
            //   left: '10px',
            //   zIndex: '1000',
            //   backgroundColor: 'white',
            //   borderRadius: '3px',
            //   padding: '1vh',
            //   boxShadow: '1px 1px 10px rgba(0, 0, 0, 0.1)',
            //   maxHeight: '90vh',
            //   overflowY: 'auto',
            //   display:"flex",
            //   flexDirection:"column"
            // }}>
            //   <>
            //   <div style={{ position: "absolute", top: chartCollapse ? "0px" : "5px", left: "5px" }}>
            //         <button title="close"
            //           className='btn' onClick={() => {setTable(false);setTableData(null)}}
            //           style={{ color: "black", backgroundColor: '#397AA5', fontSize: chartCollapse ? "10px" : "15px", padding: "2px 2px", width: chartCollapse ? "20px" : "30px", height: chartCollapse ? "20px" : "30px", borderRadius: "10%" }}
            //         >
            //           &times;
            //         </button>
            //       </div>
            //   </>
            //   <>
            //   <CsvToHtmlTable
            //     data={csvData}
            //     csvDelimiter=","
            //     tableClassName="table table-striped table-hover"
            //   />
            //   </>

            // </div>
            
            <ResizableDiv csvData={csvData} setTable={setTable} setTableData={setTableData} name={csvLayer} />
          )}
          <div id="map" style={{ height: "100vh", width: "100vw", border: 'none' }}></div>
          <div id="areaInfo" style={{ fontSize: 'bold', position: 'absolute', bottom: '1px', fontSize: '12px', right: '140px', backgroundColor: 'white', zIndex: "1000", borderRadius: '3px', paddingLeft: '1vh', paddingRight: '1vh' }}>
            {meas}
          </div>
          {chartData && (
            <div style={{ position: 'absolute', bottom: 5, left: "21%", zIndex: "1000", width: chartCollapse ? "250px" : "78%", height: chartCollapse ? "100px" : "35%", padding: chartCollapse ? "0px" : "10px", backgroundColor: "#31304D" }}>
              <div>
                <MultiLineChart />
              </div>
              <div style={{ position: "absolute", top: chartCollapse ? "0px" : "5px", left: "5px" }}>
                <button title="close"
                  className='btn' onClick={() => RemoveChart()}
                  style={{ color: "black", backgroundColor: '#397AA5', fontSize: chartCollapse ? "10px" : "15px", padding: "2px 2px", width: chartCollapse ? "20px" : "30px", height: chartCollapse ? "20px" : "30px", borderRadius: "10%" }}
                >
                  &times;
                </button>
              </div>
              <div style={{ position: "absolute", top: chartCollapse ? "0px" : "5px", right: "5px" }}>
                <button title="minimize"
                  className='btn' onClick={() => setCollapse(!chartCollapse)}
                  style={{ color: "black", backgroundColor: '#397AA5', fontSize: chartCollapse ? "10px" : "15px", padding: "2px 2px", width: chartCollapse ? "20px" : "30px", height: chartCollapse ? "20px" : "30px", borderRadius: "10%" }}
                >
                  <i className="fa-solid fa-minimize"></i>
                </button>
              </div>
            </div>
          )}
          <Sidebar />
          <Tools />
          {/* <div className="btn-light chatbot-btn" data-toggle="modal" data-target=".bd-example-modal-lg" onClick={openChatbot}><img src={`${process.env.PUBLIC_URL}/${files}chatbot.png`} style={{ width: '40px', height: '40px', borderRadius: '50%', zIndex: '1000' }} /> </div> */}
          {showChatbot && (
            <div className="chatbot-window" style={{ position: 'absolute', zIndex: '1000', top: '45%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <Chatbot id={idFetch} setShowChatbot={setShowChatbot} />
            </div>
          )}
          {migrate && (
            <div className="chatbot-window" style={{ position: 'absolute', zIndex: '1000', top: '50%', left: '50%', boxShadow: '1px 5px 10px 8px #383838', transform: 'translate(-50%, -50%)' }}>
              <Migrate layers={OverLayers} setMigrate={setMigrate} />
            </div>
          )}

        </div>
      ) : (<Loading />)}
    </div>
  );

}

export { geo, drawControl, coordinatesControl, customButton };
export default Map;
