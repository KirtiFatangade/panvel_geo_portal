import React, { useState, useEffect, useRef, useContext } from "react";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar";
import L, { Edit } from "leaflet";
import M from "mapbox-gl";
import Cal from "./Calender_old";
import { HOST } from "../../host";
import { bbox } from "@turf/turf";
// import datasetInfoDictionary from "./Info";
import InfoWindow from './InfoWindow';
import files from "../../static";
import ClimateChange from "./windy";
import Heatmap from "./heatmap";
import { useNavigate, useLocation } from "react-router-dom";

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
import { logToServer } from "../../logger";
function Sat({ toFetch }) {
  const [country, setCounts] = useState([]);
  const [state, setStates] = useState([]);
  const [district, setDistricts] = useState([]);
  const [selCont, setCont] = useState("");
  const [selState, setState] = useState("");
  const [selDis, setDis] = useState("");
  const [grad, setGrad] = useState("linear-gradient(to right, #5E5AF2, #EBF3E9, #00441b)");
  const [adm, setAdm] = useState("Country Boundaries");
  const [limit, setLimit] = useState(null);
  const [vectors, setVectors] = useState([]);
  const [selCLayer, setCLayer] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [weather,setWeather]=useState(false)
  const [Mum,setMum]=useState(false)
  const [Nag,setNag]=useState(false)
  const infoRef = useRef(null);
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
    setBoxLayers
    // mapBoxContainerRef,
    
  } = useContext(GlobalContext);
  const { setloader } = useContext(SideBarContext);
  const [SatData, setSat] = useState([]);
  const [SatBool, SetBool] = useState(null);
  const [SatDate, setDate] = useState(null);
  const [isSel, SetSel] = useState(true);
  const [showCal, setCal] = useState(false);
  const [visShow, setVis] = useState(false);
  const [selData, setSel] = useState(null);
  const [SDate, SetSDate] = useState(null);
  const [EDate, SetEDate] = useState(null);
  const [showerror, SetError] = useState(false);
  const [both, setBoth] = useState(false);
  const [param, SetParams] = useState(false);
  const [type, SetType] = useState(null);
  const [clip, setClip] = useState(false);
  const [AddBound, setBound] = useState(false);
  const [clipBox, setClipBox] = useState(false);
  const [clipLayer, setClipLayer] = useState(false);
  const [cloud, setCloud] = useState(false)
  const [cloudValue, setCloudValue] = useState(50)
  const urls = useRef(null);
  const location = useLocation();
  const [senBands, setSenBands] = useState({
    dropdown1: "B4",
    dropdown2: "B3",
    dropdown3: "B2",
  });
  const [landBands, setLandBands] = useState({
    dropdown1: "B4",
    dropdown2: "B3",
    dropdown3: "B2",
  });
  const handleSenBandChange = (name, value) => {
    setSenBands((prev) => ({ ...prev, [name]: value }));
  };

  const handleLandBandChange = (name, value) => {
    setLandBands((prev) => ({ ...prev, [name]: value }));
  };
  const handleClipBoxChange = (e) => {
    const isChecked = e.target.checked;
    setClipBox(isChecked);
    if (isChecked) {
      setClip(false);
      setClipLayer(false);
    }
  };

  const handleClipChange = (e) => {
    const isChecked = e.target.checked;
    setClip(isChecked);
    if (isChecked) {
      setClipBox(false);
      setClipLayer(false);
    }
  };
  const handleClipLayerChange = (e) => {
    const isChecked = e.target.checked;
    setClipLayer(isChecked);
    if (isChecked) {
      setVectors(Canvas.getLayers());
      setClipBox(false);
      setClip(false);
    }
  };
  
  const renderOptions = () => {

    
    let optionsArray =
      selData === "10m Satellite data (Sentinel 2)"
        ? senBandsList
        : landBandsListDis;
    let addArray =
      selData === "10m Satellite data (Sentinel 2)" ? sen2Add : lan2Add;
    return optionsArray.map((value, index) => (
    
      
      <option key={index} value={value}>
        {value}-{addArray[index]}
      </option>
    ));
  };
  useEffect(() => {
    
    async function SatList() {
      try {
        setloader(true);
        await fetch(`${HOST}/sat-list/${toFetch}`)
          .then((response) => response.json())
          .then((data) => {setData(data)}); 
        setloader(false);
      } catch (error) {
        console.error("Error sending POST request:", error.message);
        alert("Unexpected Error occured Please try again");
      }
    } 
    console.log(toFetch)
    SatList();
  }, []);


useEffect(()=>{
  if(Canvas){
    if(clipLayer){
      setVectors(Canvas.getLayers())
    }
  }
},[Canvas])

  
 
  useEffect(() => {
    if (clip) {
      setStates([]);
      setDistricts([]);
      setCont("");
      fetchList();
    }
  }, [clip]);

  useEffect(() => {
    if (both) {
      SetSDate(
        selData === "Landsat 1972_to_1983"
          ? "1972-07-25"
          : selData === "Water Surface Trend"
            ? "2022-02"
            : "2022-01-01"
      );
      SetEDate(
        selData === "Landsat 1972_to_1983"
          ? "1972-08-25"
          : selData === "Water Surface Trend"
            ? "2022-06"
            : "2022-01-31"
      );
    } else {
      SetSDate(null);
      SetEDate(null);
    }
  }, [both]);

  function HandleCont(name) {
    if (name !== selCont) {
      setCont(name);
      setState("");
      setDis("");
      setStates([]);
      setDistricts([]);
      if (name !== "") {
        if (adm !== "Country Boundaries")
          fetchList("state", name);
      }
    }
  }
  function HandleState(name) {
    if (name !== selState) {
      setState(name);
      setDis("");
      setDistricts([]);
      if (name !== "") {
        if (adm !== "State Boundaries") {
          fetchList("dis", name);
        }

      }
    }
  }

  async function fetchList(name, pay) {
    let url;
    if (name) {
      let payload = pay;
      url = new URL(`${HOST}/clip-list/${name}/${payload}`);
    } else {
      url = new URL(`${HOST}/clip-list`);
    }

    try {
      setloader(true);
      await fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if (name === "state") {
            setStates(data.state);
          } else if (name === "dis") {
            setDistricts(data.district);
          } else {
            setCounts(data.country);
          }
        });
      setloader(false);
    } catch (error) {
      console.error("Error sending POST request:", error.message);
      alert("Unexpected Error occured Please try again");
    }
  }

  async function fetchWaterChange() {
    if (lastRect && drawnItems.hasLayer(lastRect)) {
      setloader(true);
      let box = bbox(drawnItems.getLayer(lastRect).toGeoJSON());
      try {
        await fetch(`${HOST}/water-change`, {
          method: "POST",
          credentials:'include',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: { start: SDate, end: EDate, box: box },
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            setChart(data);
            setChartType("water");
            once.current = false;
          });
        setloader(false);
        drawnItems.removeLayer(lastRect);
        usedShapes.removeLayer(lastRect);
      } catch (error) {
        alert("Unexpected Error occured Please try again");
        setloader(false);
      }
    } else {
      SetError(true);
    }
  }

  async function fetchLayer() {
    try {
      let data = {
        dataset: selData !== "Administrative Boundaries" ? selData : adm,
        dates: [SDate, EDate],
      };
      if (type) {
        if (type === "bands") {
          data["bands"] =
            selData === "10m Satellite data (Sentinel 2)"
              ? senBands
              : {
                dropdown1: landBandsList[landBands.dropdown1],
                dropdown2: landBandsList[landBands.dropdown2],
                dropdown3: landBandsList[landBands.dropdown3],
              };
        } else if (type === "indices") {
          data["indices"] = [
            document.getElementById("ind1").value,
            document.getElementById("ind2").value,
          ];
          data["indices"] =
            selData === "10m Satellite data (Sentinel 2)"
              ? data["indices"]
              : [
                landBandsList[data["indices"][0]],
                landBandsList[data["indices"][1]],
              ];
          data["grad"] = grad;
        }
      }
      if (clip) {
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
      if (clipBox) {
        if (lastRect && drawnItems.hasLayer(lastRect)) {
          data["box"] = bbox(drawnItems.getLayer(lastRect).toGeoJSON());

          SetError(false);
        } else {
          SetError(true);
          return;
        }
      }
      if (clipLayer) {
        if (selCLayer && selCLayer !== "") {
          data["layer"] = Canvas.getLayerId(selCLayer);
          data["layer_name"] = selCLayer
        }
      }
      if (window.location.pathname.startsWith("/project/")) {
        const projectId = window.location.pathname.split("/")[3];
        data["project"] = projectId;

      } else {
        data["project"] = "global";
      }
      data["memb"] = userInfo.id
      data["tab"] = selTab;
      setloader(true);

      await fetch(`${HOST}/sat-geo/${toFetch}`, {
        method: "POST",
        credentials:'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      })
        .then((response) => response.json())
        .then((data) => CreateLayer(data)); 
      setloader(false);
    } catch (error) {
      alert("Unexpected Error occured Please try again");
      setloader(false);
    }
  }

  const Visualize = () => {
    if(selData==="Weekly Weather Animation"){
      setWeather(true)
      return
    }
    if(selData==="Mumbai Heatmap"){
      console.log(true)
      setMum(true)
      setNag(false)
      return
    }
    if(selData==="Nagpur Heatmap"){
      setNag(true)
      setMum(false)
      return
    }
    if (SDate === null) {
      if (!showCal) {
        fetchLayer();
      } else {
        SetError(true);
      }
    } else {
      if (EDate) {

        if (SDate < EDate) {
          SetError(false);
          selData === "Water Surface Trend" ? fetchWaterChange() : fetchLayer();
        } else {
          SetError(true);
        }
      } else {
        fetchLayer();
      }
    }
  };

  function CreateLayer(data) {
    console.log(data);
  
    if (data.message) {
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
      layerName += `- ${name === "10m Satellite data (Sentinel 2)"
        ? data.bands[0]
        : landBandsRev[data.bands[0]]
        }-${name === "10m Satellite data (Sentinel 2)"
          ? data.bands[1]
          : landBandsRev[data.bands[1]]
        }-${name === "10m Satellite data (Sentinel 2)"
          ? data.bands[2]
          : landBandsRev[data.bands[2]]
        }`;
    }
    
    if (data.indices) {
      layerName += `- ${name === "10m Satellite data (Sentinel 2)"
        ? data.indices[0]
        : landBandsRev[data.indices[0]]
        }-${name === "10m Satellite data (Sentinel 2)"
          ? data.indices[1]
          : landBandsRev[data.indices[1]]
        }`;
    }
    
    if (data.clip) {
      layerName += "-" + data.clip.join("-");
    }
  
    if (data.name === "Rivers of World" || data.name === "Indian Watersheds and Rivers") {
      if (data.name === "Indian Watersheds and Rivers") {
        if (window.location.pathname.startsWith("/MapBox") && mapBox) {
          urls.current = data.url; // Assuming data.url contains array of URLs
          
          // Add GeoJSON source
          mapBox.addSource("watershed-source", {
            type: 'geojson',
            data: data.url[0], // Add GeoJSON data from data.geoj
          });
  
          mapBox.addLayer({
            id: 'watershed-source-layer',
            type: 'line',
            source: 'watershed-source',
            paint: {
              'line-color': '#000',
              'line-width': 3
            }
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
          layer = L.tileLayer(data.url[urlIndex], { maxZoom: 20, zIndex: 1005 });
  
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
          layerControls.addOverlay(layer, layerName, false, false, false, false, false, data.act_id);
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
            type: 'raster',
            tiles: [data.url[0]],
            tileSize: 256
          });
          mapBox.addSource(`${layerName}-1`, {
            type: 'raster',
            tiles: [data.url[1]],
            tileSize: 256
          });
          mapBox.addSource(`${layerName}-2`, {
            type: 'raster',
            tiles: [data.url[2]],
            tileSize: 256
          });
          mapBox.addSource(`${layerName}-3`, {
            type: 'raster',
            tiles: [data.url[3]],
            tileSize: 256
          });
  
          let layerID = `${layerName}-layer`;
  
          // Add initial layer
          mapBox.addLayer({
            id: layerID,
            type: 'raster',
            source: `${layerName}-0`,
          });
  
          mapBox.on('zoomend', function () {
            const zoom = mapBox.getZoom();
  
            if (zoom <= 5) {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: 'raster',
                source: `${layerName}-0`,
              });
            } else if (zoom <= 8) {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: 'raster',
                source: `${layerName}-1`,
              });
            } else if (zoom <= 10) {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: 'raster',
                source: `${layerName}-2`,
              });
            } else {
              if (mapBox.getLayer(layerID)) {
                mapBox.removeLayer(layerID);
              }
              mapBox.addLayer({
                id: layerID,
                type: 'raster',
                source: `${layerName}-3`,
              });
            }
          });
  
          // // Add GeoJSON layer if present
          // if (data.geoj) {
          //   mapBox.addSource(`${layerName}-geojson`, {
          //     type: 'geojson',
          //     data: data.geoj, // Add GeoJSON data from data.geoj
          //   });
  
          //   mapBox.addLayer({
          //     id: `${layerName}-geojson-layer`,
          //     type: 'line',
          //     source: `${layerName}-geojson`,
          //     paint: {
          //       'line-color': '#000',
          //       'line-width': 3
          //     }
          //   });
          // }
        } catch (e) {
          console.log(e);
        }
      }
    }
  
    if (window.location.pathname.startsWith("/MapBox") && mapBox) {
      if (data.name === "Rivers of World" || data.name === "Indian Watersheds and Rivers") {
        // Already handled earlier for MapBox
          
      
      } else {
        mapBox.addSource(layerName, {
          type: 'raster',
          tiles: [data.url],
          tileSize: 256
        });
  
        mapBox.addLayer({
          type: 'raster',
          id: `${layerName}-layer`,
          source: layerName,
        });
      }
  
      setBoxLayers(prevLayers => [...prevLayers, { "name": layerName, "visible": true }]);
      return;
    }
  
    // Leaflet layer creation
    layer = L.tileLayer(data.url, { maxZoom: 20, zIndex: 1005 });
  
    if (data.name === "Germany High-Res Image (20cm)") {
      map.flyTo([52.507899, 13.386091], 18);
    }
  
    layerControls.addOverlay(layer, layerName, false, false, false, false, false, data.act_id);
  
    layer.on('tileload', function (event) {
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
  
  
  




  function setDates(e) {
    if (e.target.name === "start") {
      SetSDate(e.target.value);
    } else {
      SetEDate(e.target.value);
    }
  }

  function setData(data) {
    let List = [
      "Country Boundaries",
      "State Boundaries",
      "District Boundaries",
    ];
    let list = data.names;
    if (toFetch == "derive") {
      list = list.filter((element) => !List.includes(element));
      list.push("Administrative Boundaries");
    }
    setSat(list);
    SetBool(data.is_image);
    setDate(data.start_date);
  }

  function MDataSelect(e) {
    setClip(false);
    setBound(false);
    setAdm(null)
    setSel(e);
    console.log(e)
    if (e === "Administrative Boundaries") {
      setAdm("Country Boundaries")
    }
    
    if (
      e === "10m Satellite data (Sentinel 2)" ||
      e === "30m Satellite data (Landsat 8)"
    ) {
      SetParams(true);
      SetType(null);
    } else {
      SetParams(false);
      SetType(null);
    }

    if (SatDate[SatData.indexOf(e)] && SatDate[SatData.indexOf(e)] !== "0") {
      setLimit(SatDate[SatData.indexOf(e)]);
    } else {
      setLimit(null);
    }
    if (!SatBool[SatData.indexOf(e)]) {
      setCal(true);
      if (e === "Landsat 1972_to_1983" || e === "Water Surface Trend" || e==="Atmospheric Methane Concentration (Sentinel 5p)" || e==="Atmospheric CO Concentration ( Sentinel-5P)" ) {
        setBoth(true);
        SetSDate(e === "Landsat 1972_to_1983" ? "1972-07-25" : "2022-02");
        SetEDate(e === "Landsat 1972_to_1983" ? "1972-08-27" : "2022-06");
      } else {
        setBoth(false);
        SetSDate(null);
        SetEDate(null);
      }
    } else {
      setCal(false);
      SetSDate(null);
      SetEDate(null);
    }
    setVis(true);
    SetSel(false);
    if(e==="Weekly Weather Animation"){
      
      SetParams(false)
      SetType(false)
      setCal(false)
      
    }
    if(e==="Mumbai Heatmap"){
      
      SetParams(false)
      SetType(false)
      setCal(false)
      
    }
    if(e==="Nagpur Heatmap"){
      
      SetParams(false)
      SetType(false)
      setCal(false)
      
    }
  }

  useEffect(() => {
    let timeoutId;

    const handleMoveEnd = () => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        if (clip) {
          console.log("caleee")
          var latlng = map.getCenter();
          fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`
          )
            .then((response) => response.json())
            .then((data) => {
              console.log(data)
              setCont(data.address.country);
              if (adm !== "Country Boundaries") {
                fetchList("state", data.address.country)
              }
            })
            .catch((error) => console.error("Error:", error));
        }
      }, 200);
    };
    if (map) {
      map.on("move", handleMoveEnd);
    }

    if (clip) {
      handleMoveEnd()
    }
    return () => {
      clearTimeout(timeoutId);
      if (map) {
        map.off("move", handleMoveEnd);
      }

    };
  }, [map, clip]);


  const [selectedDataset, setSelectedDataset] = useState('');
  
  const handleDatasetSelection = (selectedValue) => {
    console.log(selectedValue)
    setSelectedDataset(selectedValue);
  };

  const dataInfo = () => {
    console.log('clicked i')
    setShowInfo(true);

  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [isOptionsVisible, setIsOptionsVisible] = useState(false);


  const toggleOptions = () => {
    setIsOptionsVisible(!isOptionsVisible);
  };

  const updateColor = (gradient) => {
    setGrad(gradient);
    toggleOptions();
  };



  return (
    <>
      <div className="select-container d-flex">
        <select
          className="form-select border-0 custom-select"
          aria-label="form-select"
          onChange={(e) => {
            MDataSelect(e.target.value);
            handleDatasetSelection(e.target.value)
          }}

        >
          {isSel && (
            <>
              <option>Select Dataset</option>
            </>
          )}

          {SatData
                   .filter(name => 
                    !(window.location.pathname.startsWith("/MapBox") && 
                      (name === "Atmospheric Methane Concentration (Sentinel 5p)" ||
                       name === "Atmospheric CO Concentration ( Sentinel-5P)"||
                      name === "Germany High-Res Image (20cm)"||
                      name === "Human Settlement Footprint"||
                      name === "Temperature above (2m)ground"||
                      name === "World Population Density"||
                      name === "Topographic diversity based on Temperature & Moisture"||
                      name === "Administrative Boundaries"||
                      name ==="Global Slope Map"
                       ) )
                    ).map((nme) => (
            <option style={{ textAlign: "left" }} key={nme} value={nme}>
              {nme}
            </option>
          ))}
          {toFetch==='weather' ? ( <option><button >Weekly Weather Animation</button></option>):(null)}
          {toFetch==='weather' ? ( <option><button >Mumbai Heatmap</button></option>):(null)}
          {toFetch==='weather' ? ( <option><button >Nagpur Heatmap</button></option>):(null)}
        </select>
        {selectedDataset !== '' && (
          <button className="info-btn" style={{ marginLeft: '10px' }} onClick={() => {
            dataInfo();
            handleDatasetSelection(selectedDataset);
          }}>
            <i className="fa-solid fa-info"></i>
          </button>
        )}

      </div>


      <div style={{ marginTop: "10px", width: "100%" }}>
        {selData !== "Administrative Boundaries" ? (
          <>
            {showCal && (
              <>
                {both ? (
                  <>
                    <div style={{ marginTop: "15px" }}>
                      <label htmlFor="start" style={{ marginRight: "10px", color: "#FAF8D4", fontSize: '12px', display: "inline-block" }}>Start Date:</label>
                      <input style={{ fontSize: '12px', padding: "3px 10px", borderRadius: "5px" }} type={selData === "Water Surface Trend" ? "month" : "date"} id="start" min={selData === "Landsat 1972_to_1983" ? "1972-07-25" :selData==="Atmospheric Methane Concentration (Sentinel 5p)" || selData==="Atmospheric CO Concentration ( Sentinel-5P)"? "2019-02-08":"2017-01"} max={selData === "Landsat 1972_to_1983" ? "1983-02-20" : null} onChange={(e) => setDates(e)} name="start" defaultValue={SDate} />
                    </div>
                    <div style={{ marginTop: "15px" }}>
                      <label htmlFor="end" style={{ marginRight: "15px", color: "#FAF8D4", fontSize: '12px', display: "inline-block" }}>End Date:</label>
                      <input style={{ fontSize: '12px', padding: "3px 10px", borderRadius: "5px" }} type={selData === "Water Surface Trend" ? "month" : "date"} id="end" name="end" min={selData === "Landsat 1972_to_1983" ? "1972-07-25" :selData==="Atmospheric Methane Concentration (Sentinel 5p)" || selData==="Atmospheric CO Concentration ( Sentinel-5P)"? "2019-02-08":"2017-01"} max={selData === "Landsat 1972_to_1983" ? "1983-02-20" : null} defaultValue={EDate} onChange={(e) => setDates(e)} />
                    </div>
                  </>
                ) : (
                  <Cal
                    map={map}
                    selData={selData}
                    SetSDate={SetSDate}
                    SDate={SDate}
                    setloader={setloader}
                    toFetch={toFetch}
                    both={both}
                    limit={limit}
                    cloud={cloud}
                    cloudValue={cloudValue}
                    mapBox={mapBox}
                  />

                )}

                <div>
                  {showerror && (
                    <>
                      <p>Please select Valid Date(s)</p>
                      {selData === "Water Surface Trend" ||
                        clipBox ||
                        (clipLayer && (
                          <>
                            <p>Or draw a rectangle or Select a valid layer</p>
                          </>
                        ))}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <select
              className=" form-select custom-select"
              onChange={(e) => setAdm(e.target.value)}
            >
              <option
                style={{ textAlign: "left" }}
                value={"Country Boundaries"}
              >
                Country
              </option>
              <option style={{ textAlign: "left" }} value={"State Boundaries"}>
                State
              </option>
              <option
                style={{ textAlign: "left" }}
                value={"District Boundaries"}
              >
                District
              </option>
            </select>
          </>
        )}
      </div>

      {selData &&
        selData !== "Germany High-Res Image (20cm)" &&
        selData !== "Water Surface Trend" &&
        selData !== "Indian Watersheds and Rivers" &&
        selData !== "Topographic diversity based on Temperature & Moisture" &&
        selData !== "Global Slope Map" &&
        selData !== "Hydroshed Drainage Direction" &&
        selData !== "World Population Density" &&
        selData !== "Global Digital Surface Model 30m" &&
        toFetch!=="weather" &&
        selData !== "Landsat 1972_to_1983" ? (
        <>
          {!exc.includes(selData) && !both && selData !== "Synthetic Aperture Radar - Sentinel 1" ? (
            <>
              <div className="opt-div">
                <input
                  onChange={(e) => setCloud(e.target.checked)}
                  checked={cloud}
                  className="form-check-input check-map"
                  type="checkbox"
                />
                <br />
                <label>Cloud Cover Filter</label>

              </div>
              {cloud && (
                <div >
                  <input
                    value={cloudValue}
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    onChange={(e) => setCloudValue(e.target.value)}
                  />
                  <label style={{ marginLeft: "5px", color: "white" }}>{cloudValue}</label>
                </div>
              )}
            </>
          ) : null}
        </>
      ) : null}


      {param && (
        <>
          <details className="baseline">
            <summary  style={{ fontSize: "12px" }}>
              Advanced Parameters :{" "}
            </summary>
            <div className="baseline-cont" style={{ margin: "2px 0px 5px 5px" }}>
              <div className="opt-div">
                <input
                  value="bands"
                  id="bands"
                  className="form-check-input check-map"
                  onChange={(e) => SetType(e.target.checked ? "bands" : null)}
                  type="checkbox"
                  checked={type === "bands"}
                />
                <label>Bands</label>
              </div>
              <div className="opt-div">
                <input
                  value="indices"
                  id="indices"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) => SetType(e.target.checked ? "indices" : null)}
                  checked={type === "indices"}
                />
                <label>Indices</label>
              </div>
            </div>
            {type === "bands" && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                >
                  <label style={{ color: "white" }}>R : </label>
                  <select className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
                    value={
                      selData === "10m Satellite data (Sentinel 2)"
                        ? senBands.dropdown1
                        : landBands.dropdown1
                    }
                    onChange={(e) =>
                      selData === "10m Satellite data (Sentinel 2)"
                        ? handleSenBandChange("dropdown1", e.target.value)
                        : handleLandBandChange("dropdown1", e.target.value)
                    }
                  >
                    {renderOptions()}
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                >
                  <label style={{ color: "white" }}>G : </label>
                  <select
                    className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
                    value={
                      selData === "10m Satellite data (Sentinel 2)"
                        ? senBands.dropdown2
                        : landBands.dropdown2
                    }
                    onChange={(e) =>
                      selData === "10m Satellite data (Sentinel 2)"
                        ? handleSenBandChange("dropdown2", e.target.value)
                        : handleLandBandChange("dropdown2", e.target.value)
                    }
                  >
                    {renderOptions()}
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                  }}
                >
                  <label style={{ color: "white" }}>B : </label>
                  <select
                    className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
                    value={
                      selData === "10m Satellite data (Sentinel 2)"
                        ? senBands.dropdown3
                        : landBands.dropdown3
                    }
                    onChange={(e) =>
                      selData === "10m Satellite data (Sentinel 2)"
                        ? handleSenBandChange("dropdown3", e.target.value)
                        : handleLandBandChange("dropdown3", e.target.value)
                    }
                  >
                    {renderOptions()}
                  </select>
                </div>
              </div>
            )}
            {type === "indices" && (
              <div style={{ display: "flex", flexDirection: "column", alignContent: "center" }}>
                <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'center', marginLeft: '10px' }}>
                  <label style={{ color: "white", marginRight: '8px' }}>A :  </label>
                  <select id="ind1" className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 5px 30px", fontSize: '12px' }}
                  >
                    {renderOptions()}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'center', marginLeft: '10px' }}>
                  <label style={{ color: "white", marginRight: '8px' }}>B :  </label>
                  <select id="ind2" className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 5px 30px", fontSize: '12px' }}

                  >
                    {renderOptions()}
                  </select>

                </div>


                <div className="custom-select" style={{ position: 'relative', width: '200px', color: 'white' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', marginLeft: '6px' }}>
                    Palette: <div className="select-styled" onClick={toggleOptions} style={{ backgroundImage: grad, width: '200px', height: '20px', marginLeft: "12px" }}></div>
                  </div>
                  <div className="select-options" style={{ display: isOptionsVisible ? 'block' : 'none', position: 'absolute', top: '100%', left: 55, width: '150px', zIndex: 1, border: 'none', boxShadow: '1px 5px 10px 8px #000000' }}>
                    {colorsList.map((gradient, index) => (
                      <div
                        key={index}
                        className="color-option"
                        style={{ background: gradient, margin: '0%', height: '20px', cursor: 'pointer', padding: '0px' }}
                        onClick={() => updateColor(gradient)}
                      ></div>
                    ))}
                  </div>
                </div>


                {/* <div style={{ height: '10px', width: '100px', marginTop: '5px', alignSelf: 'center', background: grad }}></div> */}


                <div style={{ marginTop: "5px" }}>
                  <p style={{ color: "#397aa5", margin: 0, fontSize: "12px", fontWeight: "bolder" }}>
                    Formula Applied : (A-B)/(A+B)
                  </p>
                </div>
              </div>
            )}
          </details>
        </>
      )}
      {selData && selData !== "Germany High-Res Image (20cm)" && selData !== "Water Surface Trend" && selData !== "Landsat 1972_to_1983" && selData !== "Indian Watersheds and Rivers" && selData !== "Weekly Weather Animation" && selData!=="Mumbai Heatmap" && selData!="Nagpur Heatmap"  ? (
        <details className="baseline"  >
          <summary style={{ fontSize: "12px" }}> Additional options </summary>
          <div className="baseline-cont" style={{ margin: "2px 0px 5px 5px" }}>
            <div className="opt-div">
              <input
                onChange={handleClipBoxChange}
                checked={clipBox}
                className="form-check-input check-map"
                type="checkbox"
              />
              <label>Clip by Box</label>
            </div>
            <div className="opt-div">
              <input
                onChange={handleClipChange}
                checked={clip}
                className="form-check-input check-map"
                type="checkbox"
              />
              <label>Clip by Region</label>
            </div>
            <div style={{ marginTop: clip ? "10px" : "0px" }}>
              {clip && (
                <>
                  {country && country.length ? (
                    <select
                      className=" form-select custom-select"
                      onChange={(e) => HandleCont(e.target.value)}
                      value={selCont}
                      style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
                    >
                      <option style={{ fontSize: "12px" }} value={""}>
                        Select Country
                      </option>

                      {country
                        .map((nme) => nme)
                        .sort()
                        .map((nme) => (
                          <option
                            style={{ textAlign: "left", fontSize: "12px" }}
                            key={nme}
                            value={nme}
                          >
                            {nme}
                          </option>
                        ))}
                    </select>
                  ) : null}
                  {state && state.length ? (
                    <select
                      className=" form-select custom-select"
                      onChange={(e) => HandleState(e.target.value)}
                      style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
                    >
                      <option style={{ fontSize: "12px" }} value={""}>
                        Select State
                      </option>

                      {state
                        .map((nme) => nme)
                        .sort()
                        .map((nme) => (
                          <option
                            style={{ textAlign: "left", fontSize: "12px" }}
                            key={nme}
                            value={nme}
                          >
                            {nme}
                          </option>
                        ))}
                    </select>
                  ) : null}
                  {district && district.length ? (
                    <select
                      className=" form-select custom-select"
                      onChange={(e) => setDis(e.target.value)}
                      style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
                    >
                      <option style={{ fontSize: "12px" }} value={""}>
                        Select District
                      </option>

                      {district
                        .map((nme) => nme)
                        .sort()
                        .map((nme) => (
                          <option
                            style={{ textAlign: "left", fontSize: "12px" }}
                            key={nme}
                            value={nme}
                          >
                            {nme}
                          </option>
                        ))}
                    </select>
                  ) : null}

                  <div className="opt-div">
                    <input
                      onChange={(e) => setBound(e.target.checked)}
                      checked={AddBound}
                      className="form-check-input check-map"
                      type="checkbox"
                    />
                    <label>Add Boundary</label>
                  </div>
                </>
              )}
            </div>
            <div className="opt-div">
              <input
                onChange={handleClipLayerChange}
                checked={clipLayer}
                className="form-check-input check-map"
                type="checkbox"
              />
              <label>Clip by Layer</label>
            </div>
            <div style={{ marginTop: clipLayer ? "10px" : "0px" }}>
              {clipLayer && (
                <>
                  {vectors ? (
                    <select
                      className=" form-select custom-select"
                      onChange={(e) => setCLayer(e.target.value)}
                      style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
                    >
                      <option style={{ fontSize: "12px" }} value={""}>
                        Select Layer
                      </option>

                      {vectors.map((nme) => (
                        <option
                          style={{ textAlign: "left", fontSize: "12px" }}
                          key={nme}
                          value={nme}
                        >
                          {nme}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </>
              )}
            </div>
            {!exc.includes(selData) ? (
              <div className="opt-div">
                <input
                  onChange={(e) => setBoth(e.target.checked)}
                  checked={both}
                  className="form-check-input check-map"
                  type="checkbox"
                />
                <label>Date Range</label>
              </div>
            ) : null}
          </div>
        </details>

      ) : null}

      {visShow && (
        <div>
          <button className="mt-2 btn-visualize" style={{ zIndex: '1000' }} onClick={Visualize}>
            Visualize
          </button>
        </div>
      )}
      {selectedDataset !== '' && (
        <button className="info-btn" style={{ position: "sticky", top: '0px', left: 0 }} onClick={() => {
          dataInfo();
          handleDatasetSelection(selectedDataset);
        }}>
          <i className="fa-solid fa-info"></i>
        </button>
      )}

      {showInfo && (
        <div className="info-container text-dark">
          <div className="info-div text-dark" ref={infoRef}>
            <InfoWindow selectedDataset={selectedDataset} />
          </div>
        </div>
      )}
      {weather && (
       <ClimateChange setWeather={setWeather}/>
      )}
      {(Mum  || Nag)  && (
       <Heatmap Mum={Mum} Nag={Nag} setMum={setMum} setNag={setNag}/>
      )}
    </>
  );
}

export default Sat;