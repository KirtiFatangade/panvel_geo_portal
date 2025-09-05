import React, { useEffect, useState, useContext, useRef } from "react";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar"
import L from "leaflet";
import { HOST } from "../../host";
import { logToServer } from "../../logger";
import * as turf from '@turf/turf';



function Maxar() {
  const {
    map,
    mapBox,
    layerControls,
    setBoxLayers
  } = useContext(GlobalContext)
  const {
    setloader
  } = useContext(SideBarContext)
  const [preDate, SetPre] = useState([])
  const [postDate, SetPost] = useState([])
  const [maxar, setMaxar] = useState([])
  const [SelDis, setDis] = useState(null);
  const [selPre, Setpre] = useState(null);
  const [selPost, Setpost] = useState(null);
  const [isSel, SetSel] = useState(true);
  const [highlighted, setHighlight] = useState([]);
  const abortController = useRef(null);
  const [type, setType] = useState(null);
  useEffect(() => {
    async function MaxarList() {


      try {
        setloader(true)
        await fetch(`${HOST}/maxar-list`)
          .then((response) => response.json())
          .then((data) => {
            setMaxar(data.maxar);
            logToServer('info', 'Maxar list fetched successfully');
          });
        setloader(false)

      }
      catch (error) {
        logToServer('error', 'Error fetching Maxar list');
        alert("Unexpected Error occured Please try again")
        setloader(false)
      }
    }

    MaxarList();
  }, [])

  function SetDates(data) {
    SetPre(data.pre);
    SetPost(data.post);
    logToServer('info', ` Dates set ${data.pre, data.post}`);

  }

  const MDataSelect = async (e) => {
    setloader(true)
    setDis(e);
    SetPre([]);
    SetPost([]);
    Setpre(null);
    Setpost(null);
    SetSel(false);
    try {
      if (abortController.current) {
        abortController.current.abort();
        setloader(false)
      }

      await fetch(`${HOST}/maxar-info`, {
        method: "POST",
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data: e }),
      })
        .then((response) => response.json())
        .then((data) => {
          SetDates(data);
          logToServer('info', 'Maxar info fetched successfully');
        });
      setloader(false)


    }
    catch (error) {
      alert("Unexpected Error occured Please try again")
      setloader(false)
      logToServer('error', `${error.message}`)
    }
  }

  async function getHighlight(dataset, type) {
    if (type === "pre") {
      Setpre(dataset)
    } else {
      Setpost(dataset)
    }
    dataset = dataset.split("|")[0]
    if (abortController.current) {
      abortController.current.abort();
      setloader(false);
    }
    abortController.current = new AbortController();
    setloader(true);
    const response = await fetch(`${HOST}/maxar/${type}/${dataset}`, { signal: abortController.current.signal, })
    if (response.ok) {
      const data = await response.json();
      setHighlight(data.highlight);
      setType(type);
      setloader(false)
      logToServer('info', `Response received and processed successfully`);
    } else {
      logToServer('warn', `Fetch request to ${HOST}/maxar/${type}/${dataset} failed with status: ${response.status}`);
    }

  }

  const Visualize = async (e, pre = selPre, post = selPost) => {
    if (pre && pre.split(" ").includes("Select")) {
      pre = null;
    }
    if (post && post.split(" ").includes("Select")) {
      post = null;
    }
    setloader(true)
    try {
      await fetch(`${HOST}/maxar-geo`, {
        method: "POST",
        credentials:'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { "dataset": SelDis, "collection": [pre, post] } }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (window.location.pathname.startsWith("/MapBox") && mapBox) {
            CreateMapBoxLayer(data, pre, post);
          } else {
            CreateLayer(data, pre, post);
          }
          logToServer('info', `Response received and layer created successfully`);
        })
      setloader(false)

    }
    catch (error) {
      alert("Unexpected Error occured Please try again")
      setloader(false)
      logToServer('error', `${error}`)
    }
  }





  function CreateLayer(data, pre, post) {
    var styles = {
      "fill": false,
      "color": " #000000",
      "weight": 5,
    }
    if (data.pre_file != null && data.post_file != null) {
      logToServer('info', `Both pre_file and post_file are not null`);
      let raster = L.tileLayer(data.pre_file[1], { zIndex: 1005, maxZoom: 25 });
      let gdf = L.geoJSON(data.pre_file[0]);
      layerControls.addOverlay(raster, "Pre Raster" + " - " + pre.split("|")[1], true, gdf.getBounds());
      raster.addTo(map);
      map.flyToBounds(gdf.getBounds());
      console.log("Get Bound ", gdf.getBounds());

      logToServer('info', `Pre Raster layer added to map`);

      raster = L.tileLayer(data.post_file[1], { zIndex: 1005, maxZoom: 25 });
      gdf = L.geoJSON(data.post_file[0]);
      layerControls.addOverlay(raster, "Post Raster" + " - " + post.split("|")[1], true, gdf.getBounds());
      raster.addTo(map);
      logToServer('info', `Post Raster layer added to map`);

    } else if (data.pre_file != null) {
      logToServer('info', `Only pre_file is not null`);
      let raster = L.tileLayer(data.pre_file[1], { zIndex: 1005, maxZoom: 25 });
      let gdf = L.geoJSON(data.pre_file[0]);
      layerControls.addOverlay(raster, "Pre Raster" + " - " + pre.split("|")[1], true, gdf.getBounds());
      raster.addTo(map);
      map.flyToBounds(gdf.getBounds());
      logToServer('info', `Pre Raster layer added to map`);

    } else {
      logToServer('info', `Only post_file is not null`);
      let raster = L.tileLayer(data.post_file[1], { zIndex: 1005, maxZoom: 25 });
      let gdf = L.geoJSON(data.post_file[0]);
      layerControls.addOverlay(raster, "Post Raster" + " - " + post.split("|")[1], true, gdf.getBounds());
      raster.addTo(map);
      map.flyToBounds(gdf.getBounds());
      logToServer('info', `Post Raster layer added to map`);

    }

  }

  function CreateMapBoxLayer(data, pre, post) {
    if (data.pre_file != null && data.post_file != null) {
      logToServer('info', `Both pre_file and post_file are not null`);

      // Add Pre Raster Layer
      let preLayerId = "Pre Raster - " + pre.split("|")[1];
      mapBox.addSource(preLayerId, {
        'type': 'raster',
        'tiles': [data.pre_file[1]],
        'tileSize': 256,
        'maxzoom': 25
      });

      mapBox.addLayer({
        'id': preLayerId,
        'type': 'raster',
        'source': preLayerId,
        'paint': {}
      });

      const preGeoJson = data.pre_file[0];
      mapBox.addSource('preGeoJson', {
        'type': 'geojson',
        'data': preGeoJson
      });

      mapBox.addLayer({
        'id': 'preGeoJsonLayer',
        'type': 'Polygon',
        'source': 'preGeoJson',
        'paint': {
          'line-color': '#000000',
          'line-width': 5
        }
      });

      const preBounds = turf.bbox(preGeoJson);
      mapBox.fitBounds(preBounds, { padding: 20 });
      setBoxLayers(prevLayers => [...prevLayers, { "name": preLayerId, "visible": true }]); // Update setBoxLayers

      logToServer('info', `${preLayerId} added to map`);

      // Add Post Raster Layer
      let postLayerId = "Post Raster - " + post.split("|")[1];
      mapBox.addSource(postLayerId, {
        'type': 'raster',
        'tiles': [data.post_file[1]],
        'tileSize': 256,
        'maxzoom': 25
      });

      mapBox.addLayer({
        'id': postLayerId,
        'type': 'raster',
        'source': postLayerId,
        'paint': {}
      });

      const postGeoJson = data.post_file[0];
      mapBox.addSource('postGeoJson', {
        'type': 'geojson',
        'data': postGeoJson
      });

      mapBox.addLayer({
        'id': 'postGeoJsonLayer',
        'type': 'Polygon',
        'source': 'postGeoJson',
        'paint': {
          'line-color': '#000000',
          'line-width': 5
        }
      });

      logToServer('info', `${postLayerId} added to map`);
      setBoxLayers(prevLayers => [...prevLayers, { "name": postLayerId, "visible": true }]); 


    } else if (data.pre_file != null) {
      logToServer('info', `Only pre_file is not null`);

      let preLayerId = "Pre Raster - " + pre.split("|")[1];
      mapBox.addSource(preLayerId, {
        'type': 'raster',
        'tiles': [data.pre_file[1]],
        'tileSize': 256,
        'maxzoom': 25
      });

      mapBox.addLayer({
        'id': preLayerId,
        'type': 'raster',
        'source': preLayerId,
        'paint': {}
      });

      const preGeoJson = data.pre_file[0];
      mapBox.addSource('preGeoJson', {
        'type': 'geojson',
        'data': preGeoJson
      });

      mapBox.addLayer({
        'id': 'preGeoJsonLayer',
        'type': 'Polygon',
        'source': 'preGeoJson',
        'paint': {
          'line-color': '#000000',
          'line-width': 5
        }
      });

      const preBounds = turf.bbox(preGeoJson);
      mapBox.fitBounds(preBounds, { padding: 20 });
      setBoxLayers(prevLayers => [...prevLayers, { "name": preLayerId, "visible": true }]); 

      logToServer('info', `${preLayerId} added to map`);

    } else {
      logToServer('info', `Only post_file is not null`);

      let postLayerId = "Post Raster - " + post.split("|")[1];
      mapBox.addSource(postLayerId, {
        'type': 'raster',
        'tiles': [data.post_file[1]],
        'tileSize': 256,
        'maxzoom': 25
      });

      mapBox.addLayer({
        'id': postLayerId,
        'type': 'raster',
        'source': postLayerId,
        'paint': {}
      });

      const postGeoJson = data.post_file[0];
      mapBox.addSource('postGeoJson', {
        'type': 'geojson',
        'data': postGeoJson
      });

      mapBox.addLayer({
        'id': 'postGeoJsonLayer',
        'type': 'Polygon',
        'source': 'postGeoJson',
        'paint': {
          'line-color': '#000000',
          'line-width': 5
        }
      });

      const postBounds = turf.bbox(postGeoJson);
      mapBox.fitBounds(postBounds, { padding: 20 });
      setBoxLayers(prevLayers => [...prevLayers, { "name": postLayerId, "visible": true }]);
      logToServer('info', `${postLayerId} added to map`);
    }
    return
  }



  return (
    <>


      <select
        className="form-select border-0 custom-select"
        style={{ textAlign: "center" }}
        onChange={(e) => MDataSelect(e.target.value)}
      >
        {isSel && (
          <>
            <option>Select Dataset</option>
          </>
        )}

        {maxar.slice().sort((a, b) => {
          const getLastTwoDigits = (str) => {
            const match = str.match(/(\d{2})$/);
            return match ? match[1] : '';
          };
          return getLastTwoDigits(a).localeCompare(getLastTwoDigits(b));
        }).map((nme) => (
          <option style={{ textAlign: "left" }} key={nme} value={nme}>
            {nme}
          </option>
        ))}
      </select>


      <select className="form-select border-0 custom-select" onChange={(e) => getHighlight(e.target.value, "pre")}>
        <option value={null}>Select Pre Collection Data</option>
        {preDate && preDate.slice().sort((a, b) => {
          const getDatePart = (str) => {
            const match = str.match(/\|(\d{4}-\d{2}-\d{2})$/);
            return match ? match[1] : '';
          };
          return getDatePart(a).localeCompare(getDatePart(b));
        }).map((date) => (
          <option
            style={{ textAlign: "left", backgroundColor: type === "post" && highlighted.includes(date.split("|")[0]) ? "yellow" : "inherit" }}
            key={date}
            value={date}
          >
            {date}
          </option>
        ))}
      </select>


      <select className="form-select border-0 custom-select" onChange={(e) => getHighlight(e.target.value, "post")}>
        <option value={null}>Select Post Collection Data</option>
        {postDate && postDate.slice().sort((a, b) => {
          const getDatePart = (str) => {
            const match = str.match(/\|(\d{4}-\d{2}-\d{2})$/);
            return match ? match[1] : '';
          };
          return getDatePart(a).localeCompare(getDatePart(b));
        }).map((date) => (
          <option
            style={{ textAlign: "left", backgroundColor: type === "pre" && highlighted.includes(date.split("|")[0]) ? "yellow" : "inherit" }}
            key={date}
            value={date}
          >
            {date}
          </option>
        ))}
      </select>

      <div>
        <button onClick={Visualize} className="mt-3 btn-visualize">
          Visualize
        </button>
      </div>
    </>
  );
}
export default Maxar



