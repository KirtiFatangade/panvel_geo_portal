import React, { useState, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import Sidebar from "./sidebar";
import { HOST } from "../host";
import "leaflet-ajax";
import "leaflet-geoserver-request";
import Swipe from "../Main/swiping";
import Download from "../Main/download";
import Measure from "../Main/measure";
import Filter from "../Main/filter";
import { layers } from "../LayerContol";
import VectorCanvas from "../VectorCanvas/GeojsonLayer";
import { logToServer } from "../logger";

require("leaflet-ajax");
function AdminMap({ access, setUserInfo }) {
  const [mapData, setMapData] = useState(null);
  const [map, SetMap] = useState(null);
  const [drawnItems, setDrawnItems] = useState(null);
  const [layer_controls, setLayerControls] = useState(null);
  const [UsedLayers, SetLayers] = useState({});
  const [Boundary, setBoundary] = useState(null);
  const [Filters, setFilter] = useState(false);
  const [FilterLayers, setFLayers] = useState({});
  const [fColor, SetColor] = useState({});
  const [tools, settools] = useState(true);
  const [lastRect, setRect] = useState(null);
  const [selectedLayers, setselLayers] = useState({});
  const [draw_control, setDraw] = useState(null);
  const [Canvas, setCanvas] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${HOST}/get-map`)
      .then((response) => response.json())
      .then((data) => {
        setMapData(data);
        logToServer("info", "Map data fetched successfully.");
      })
      .catch((error) => {
        alert("Unexpected Error occured Please try again");
        logToServer("error", `Error fetching map data: ${error.message}`);
      });
  }, []);

  var customMarker = L.Icon.extend({
    options: {
      shadowUrl: null,
      iconAnchor: new L.Point(12, 12),
      iconSize: new L.Point(24, 24),
      iconUrl: "https://www.svgrepo.com/show/302636/map-marker.svg", //For Foreground
    },
  });
  useEffect(() => {
    if (!map && mapData) {
      const center = mapData.center;
      const zoom = mapData.zoom;

      const newMap = new L.map("map", { zoomControl: false }).setView(
        center,
        zoom
      );
      const osm = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      );
      const sat = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        { maxZoom: 20, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
      ).addTo(newMap);
      setselLayers({ Basemap: sat });

      var layer_control = {
        base_layers: {
          openstreetmap: osm,
          Satellite: sat,
        },
      };

      var layer_c = layers(layer_control.base_layers, layer_control.overlays, {
        autoZIndex: true,
        collapsed: true,
        position: "topright",
      }).addTo(newMap);
      setLayerControls(layer_c);

      const items = new L.FeatureGroup();
      setDrawnItems(items);
      const drawControl = new L.Control.Draw({
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
      newMap.addControl(drawControl);
      setDraw(drawControl);
      newMap.addLayer(items);
      L.control
        .zoom({
          position: "topright",
        })
        .addTo(newMap);

      L.Control.geocoder({
        collapsed: true,
        defaultMarkGeocode: false,
        position: "topright",
      })
        .on("markgeocode", function (e) {
          L.marker(e.geocode.center, { icon: new customMarker() }).addTo(
            newMap
          );
          newMap.setView(e.geocode.center, 11);
        })
        .addTo(newMap);
      // let layer1=L.geoJson.ajax("http://localhost:8080/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT_portal:pune_building&srsname=EPSG:4326&outputFormat=application/json")
      // layer1.addTo(newMap)
      // let  layer = new LeafletLayer({
      //   views: [
      //     new MapView({
      //       repeat: true
      //     })
      //   ],
      //   layers: [
      //     new GeoJsonLayer({
      //       data: "https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT:pune_building&srsname=EPSG:4326&outputFormat=application/json",
      //       getLineWidth: 0.1,
      //       getPointRadius: 1,
      //       lineWidthMinPixels: 2,
      //       pointRadiusMinPixels: 2,
      //     })
      //   ]
      // });

      // layer.addTo(newMap)

      let deck = new VectorCanvas();
      deck.addTo(newMap);
      setCanvas(deck);
      newMap.on("baselayerchange", layerchange);
      newMap.on("overlayadd", layerchange);
      newMap.on("overlayremove", layerchange);
      SetMap(newMap);
      logToServer("info", "Map initialized successfully.");
    }
  }, [map, mapData]);

  useEffect(() => {
    if (map && drawnItems) {
      map.on("draw:created", function (e) {
        var layer = e.layer;

        drawnItems.addLayer(layer);
        if (e.layerType === "rectangle") {
          if (e.layerType === "rectangle") {
            setRect(drawnItems.getLayerId(layer));
          }
        }
      });
    }
  }, [map, drawnItems]);
  function layerchange(e) {
    if (e.type === "baselayerchange") {
      setselLayers((prevLayers) => ({
        ...prevLayers,
        Basemap: e.layer,
      }));
    }
    if (e.type === "overlayadd") {
      setselLayers((prevDictionary) => ({
        ...prevDictionary,
        [e.name]: e.layer,
      }));
    }
    if (e.type === "overlayremove") {
      setselLayers((prevLayers) => {
        const { [e.name]: removedlayer, ...newLayers } = prevLayers;
        return newLayers;
      });
    }
  }
  function login() {
    navigate("/login");
    logToServer("info", "User navigated to login page.");
  }
  // function logout(){
  //   fetch(`${HOST}/logout`,{
  //     method: 'POST',
  //     credentials: 'include',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({}),
  //   })
  //   setUserInfo(null);
  //   navigate("/panvel");
  // }

  // useEffect(()=>{
  //   if(Object.keys(FilterLayers).length === 0){
  //     setFilter(false);
  // }
  // },[FilterLayers])
  return (
    <div>
      <div id="map" style={{ height: "100vh", width: "100%" }}></div>
      <Sidebar
        map={map}
        layer_controls={layer_controls}
        UsedLayers={UsedLayers}
        SetLayers={SetLayers}
        Boundary={Boundary}
        setFLayers={setFLayers}
        FilterLayers={FilterLayers}
        setFilter={setFilter}
        SetColor={SetColor}
        settools={settools}
        Canvas={Canvas}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          position: "absolute",
          left: tools ? "70px" : "21%",
          top: "10px",
          zIndex: "1000",
          columnGap: "20px",
          alignItems: "stretch",
        }}
      >
        <div style={{ flex: 1 }}>
          <Swipe map={map} selectedLayers={selectedLayers} />
        </div>
        <div style={{ flex: 1 }}>
          <Measure map={map} draw_control={draw_control} />
        </div>
        <div style={{}}>
          <Download
            map={map}
            drawnItems={drawnItems}
            selectedLayers={selectedLayers}
            lastRect={lastRect}
          />
        </div>
        <div style={{}}>
          <Filter Canvas={Canvas} />
        </div>
        <div className="login">
          <button
            style={{
              zIndex: "1000",
              fontSize: "15px",
              padding: "2px 2px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
            }}
            onClick={login}
            className="w3-button w3-white "
          >
            <i class="fa-solid fa-right-to-bracket"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminMap;
