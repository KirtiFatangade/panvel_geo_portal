
import { createContext, useContext, useEffect, useState } from "react";

import L from "leaflet"
import { SideBarContext } from "./sidebar";
import { GlobalContext } from "../../App";
import { HOST } from "../host";
import "../BoundaryCanvas"
import "leaflet-ajax"
import { bbox } from "@turf/turf";
import { logToServer } from "../logger";
const context = createContext();

export const LayerFunctions = ({ children }) => {
    const {
        map,
        Canvas,
        UsedLayers,
        SetLayers,
        CountReq,
        setReq,
        toggled,
        SetToggled,
        customMarker,
        getCsrfToken
    } = useContext(GlobalContext);
    const {
        setloader
    } = useContext(SideBarContext);


    useEffect(() => {
        if (Canvas) {
            Canvas.on("fetching", () => {
                setReq(CountReq + 1)
            })
            Canvas.on("fetched", () => {
                setReq(CountReq - 1)
            })
        }
        if (CountReq) {
            setloader(true);
        } else {
            setloader(false);
        }
    }, [Canvas, CountReq])

    useEffect(() => {
        if (toggled) {
            if (toggled.length) {
                sessionStorage.setItem('prevToggled', JSON.stringify(toggled));
            } else {
                sessionStorage.removeItem('prevToggled');
            }

        }
    }, [toggled])

    // useEffect(() => {
    //     if (toggled && toggled.length) {
    //         const els = document.getElementsByClassName("check-map");
    //         for (let i of els) {
    //             if (toggled.includes(i.value)) {
    //                 console.log(i)
    //                 i.checked = true;
    //                 let index = toggled.indexOf(i.value)
    //                 console.log(index)
    //                 const parentDetails = i.closest('details');
    //                 if (parentDetails) {
    //                     if (!parentDetails.open) {
    //                         // The details element is open, so close it
    //                         parentDetails.open = true;
    //                     }
    //                 }

    //             }
    //         }

    //     }
    // }, [])
    async function GetLayer(name, id, bound, fill) {
        try {
            setloader(true)
            await fetch(`${HOST}/project-get-layer`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': await getCsrfToken(),
                  },
                body: JSON.stringify({ data: name }),
                
            })
                .then((response) => response.json())
                .then((data) => {
                    logToServer('info', 'Fetch Successfully Project Layer')
                    console.log('data',data)
                    CreateLayer(data, name, id, bound, fill)
                })
            if (bound) {
                setloader(false)
            }

        }
        catch (error) {
            logToServer('error', `Unexpected Error occured Please try again ${error}`)
            alert("Unexpected Error occured Please try again")
            setloader(false)
        }
    }
    function LayerChange(name, id, ischeck, bound = false, fill = false, dynamic = false, bounds = null, color = null) {
        try {
            logToServer('info', `LayerChange called with params: name=${name}, id=${id}, ischeck=${ischeck}, bound=${bound}, fill=${fill}, dynamic=${dynamic}, bounds=${JSON.stringify(bounds)}, color=${color}`);

            if (ischeck) {
                if (name in UsedLayers) {
                    if (bound) {
                        if (name !== "kolhapur_bound_new") {
                            UsedLayers[name].addTo(map);
                            logToServer('info', `Layer ${name} added to map with bound`);
                        }
                    } else {
                        Canvas.addLayer(name, id);
                        logToServer('info', `Layer ${name} added to Canvas`);
                        if (dynamic) {
                            map.flyToBounds(bounds);
                            logToServer('info', `Map flew to bounds: ${JSON.stringify(bounds)}`);
                        }
                    }
                } else {
                    if (dynamic) {
                        CreateLayer({ "color": color ? color : "#000000" }, name, id, bound, fill, dynamic, bounds);
                        logToServer('info', `Dynamic layer ${name} created with color ${color}`);
                    } else {
                        GetLayer(name, id, bound, fill);
                        logToServer('info', `Layer ${name} fetched with GetLayer`);
                    }
                }
                SetToggled(prevToggle => ([...prevToggle, name]));
                logToServer('info', `Layer ${name} toggled on`);
            } else {
                if (name in UsedLayers) {
                    if (bound) {
                        UsedLayers[name].remove();
                        logToServer('info', `Layer ${name} removed from map with bound`);
                    } else {
                        Canvas.removeLayer(name, id);
                        logToServer('info', `Layer ${name} removed from Canvas`);
                    }
                }
                try {
                    console.log(toggled);
                    SetToggled(prevToggle => prevToggle.filter(item => item !== name));
                    logToServer('info', `Layer ${name} toggled off`);
                } catch (e) {
                    logToServer('error', `Error in toggling layer ${name} off: ${e.message}`);
                    console.log(e);
                }
            }
        } catch (error) {
            logToServer('error', `Error in LayerChange function: ${error.message}`);
        }
    }


    function swapCoords(coords, type) {
        try {
            logToServer('info', `swapCoords called with params: coords=${JSON.stringify(coords)}, type=${type}`);

            if (type === "marker") {
                logToServer('info', '`Marker coords swapped');

                return [coords[1], coords[0]]
            }
            if (type === "polyline") {
                logToServer('info', 'Polyline coords swapped');

                return coords.map(coord => [coord[1], coord[0]]);
            }

            return [[coords[0].map(coord => [coord[1], coord[0]])]]
        } catch (error) {
            logToServer('error', `Error in swapCoords function: ${error.message}`);
            throw error;
        }
    }

    
    const DrawLayerChange = (id, ischeck, type, bounds, coords) => {
        logToServer('info', `DrawLayerChange called with params: id=${id}, ischeck=${ischeck}, type=${type}, bounds=${JSON.stringify(bounds)}, coords=${JSON.stringify(coords)}`);

        try {
            if (ischeck) {
                if (id in UsedLayers) {
                    UsedLayers[id].addTo(map);
                    logToServer('info', `Layer ${id} added to map.`);
                    map.fire('overlayadd', { layer: UsedLayers[id], name: id, overlay: true });
                    if (bounds) {
                        let latLngBounds;
                        try {
                            const { _northEast, _southWest } = bounds;
                            latLngBounds = L.latLngBounds(
                                L.latLng(_southWest.lat, _southWest.lng),
                                L.latLng(_northEast.lat, _northEast.lng)
                            );
                        } catch (e) {
                            latLngBounds = bounds;
                        }
                        map.flyToBounds(latLngBounds);
                    }
                } else {
                    let layer;
                    switch (type) {
                        case 'rectangle':
                            layer = L.rectangle(swapCoords(coords, type));
                            break;
                        case 'polyline':
                            layer = L.polyline(swapCoords(coords, type));
                            break;
                        case 'polygon':
                            layer = L.polygon(swapCoords(coords, type));
                            break;
                        case 'circle':
                            layer = L.circle(swapCoords(coords, type));
                            break;
                        case 'circlemarker':
                            layer = L.circleMarker(swapCoords(coords, type));
                            break;
                        case 'marker':
                            const custom = new customMarker();
                            layer = L.marker(swapCoords(coords, type), { icon: custom });
                            break;
                        default:
                            logToServer('error', `Invalid layer type: ${type}`);
                            return;
                    }
                    layer.addTo(map);
                    map.fire('overlayadd', { layer, name: id, overlay: true });
                    let latLngBounds;
                    try {
                        const { _northEast, _southWest } = bounds;
                        latLngBounds = L.latLngBounds(
                            L.latLng(_southWest.lat, _southWest.lng),
                            L.latLng(_northEast.lat, _northEast.lng)
                        );
                    } catch (e) {
                        latLngBounds = bounds;
                    }
                    map.flyToBounds(latLngBounds);
                    SetLayers(prevDictionary => ({ ...prevDictionary, [id]: layer }));
                }
                SetToggled(prevToggle => [...prevToggle, id]);
            } else {
                if (id in UsedLayers) {
                    UsedLayers[id].remove();
                    map.fire('overlayremove', { layer: UsedLayers[id], name: id, overlay: true });
                }
                SetToggled(prevToggle => prevToggle.filter(item => item !== id));
            }
        } catch (error) {
            logToServer('error', `Error in DrawLayerChange function: ${error.message}`);
            throw error;
        }
    };


    async function GetSat(item, comp) {
        logToServer('info', `GetSat called with params: item=${JSON.stringify(item)}, comp=${comp}`);

        try {
            const response = await fetch(`${HOST}/get-sat-layer`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': await getCsrfToken(),
                  },
                body: JSON.stringify({
                    data: {
                        name: item.add,
                        vis: item.vis,
                        date: item.date,
                        feat_id:item.feat_id
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            logToServer('info', `GetSat fetch success: ${JSON.stringify(data)}`);
            console.log(data)
            const updatedItem = { ...item, url: data.url };
            SatLayerChange(item.id, true, updatedItem);
            const event = new CustomEvent("url-change-pro", {
                detail: {
                    comp: comp,
                    url: data.url
                }
            });
            document.dispatchEvent(event);
        } catch (error) {
            logToServer('error', `GetSat fetch error: ${error.message}`);
            console.error('GetSat fetch error:', error);
        }
    }

    const isValidUrl = async (url, timeout = 2000) => {
        logToServer('info', `isValidUrl called with params: url=${url}, timeout=${timeout}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url.replace("{z}", 1).replace("{x}", 1).replace("{y}", 1), { signal: controller.signal });
            clearTimeout(timeoutId);
            logToServer('info', `URL validation success: ${url}`);
            return response.ok;
        } catch (error) {
            if (error.name === 'AbortError') {
                logToServer('info', `URL validation aborted: ${url}`);
                return true;
            } else {
                logToServer('error', `URL validation failed: ${error.message}`);
                console.error("URL validation failed:", error);
            }
            return false;
        }
    };



    async function SatLayerChange(id, ischeck, data, comp) {
        setloader(true);
        console.log(id,ischeck)
        try {
            logToServer('info', `SatLayerChange called with params: id=${id}, ischeck=${ischeck}, data.url=${data.url}, comp=${comp}`);
            let layerKey=null
            try{
                layerKey = `${id}#${data.url.split("/")[7]}`;
            }catch{

            }
            
            if (ischeck) {
                if (layerKey in UsedLayers) {
                    
                    UsedLayers[layerKey].addTo(map);
                    map.fire('overlayadd', { "layer": UsedLayers[layerKey], "name": layerKey, "overlay": true });
                    logToServer('info', `Layer ${layerKey} added to map`);
                } else {
                    console.log(data)
                    if (!data.url) {
                        GetSat(data, comp);
                        return;
                    }
                    const valid = await isValidUrl(data.url);
                    logToServer('info', `URL validation for ${data.url} returned ${valid}`);

                    if (!valid) {
                        GetSat(data, comp);
                        logToServer('info', `Invalid URL. Called GetSat for ${data.url}`);
                        return;
                    }

                    let layer = L.tileLayer(data.url, { zIndex: 1005, maxZoom: 20 });
                    layer.addTo(map);

                    SetLayers(prevDictionary => ({
                        ...prevDictionary,
                        [layerKey]: layer,
                    }));
                    map.fire('overlayadd', { "layer": layer, "name": layerKey, "overlay": true });
                    logToServer('info', `New layer ${layerKey} created and added to map`);
                }

                SetToggled(prevToggle => ([...prevToggle, id]));
                setloader(false)
                logToServer('info', `Layer ${id} toggled on`);
            } else {
                if (layerKey in UsedLayers) {
                    UsedLayers[layerKey].remove();
                    map.fire('overlayremove', { "layer": UsedLayers[layerKey], "name": layerKey, "overlay": true, "send": false });
                    logToServer('info', `Layer ${layerKey} removed from map`);
                }

                SetToggled(prevToggle => prevToggle.filter(item => item !== id));
                setloader(false)
                logToServer('info', `Layer ${id} toggled off`);
            }
        } catch (error) {
            console.log(error)
            logToServer('error', `Error in SatLayerChange function: ${error.message}`);
        }
    }



    async function GeoLayerChange(id, ischeck, data, color) {
        setloader(true);

        try {
            logToServer('info', `GeoLayerChange called with params: id=${id}, ischeck=${ischeck}, data=${data.length} characters, color=${color}`);

            if (ischeck) {
                if (id in UsedLayers) {
                    UsedLayers[id].addTo(map);
                    map.flyToBounds(UsedLayers[id].getBounds());
                    logToServer('info', `Layer ${id} added to map and map flew to bounds`);
                    setloader(false);
                } else {
                    let layer;
                    try {
                        layer = L.geoJSON(JSON.parse(data), {
                            style: function (feature) {
                                return { color: color ? color : "#000000", fill: false };
                            }
                        });
                    } catch (e) {
                        layer = L.geoJSON(data, {
                            style: function (feature) {
                                return { color: color ? color : "#000000", fill: false };
                            }
                        });
                    }

                    layer.addTo(map);
                    map.flyToBounds(layer.getBounds());
                    logToServer('info', `New layer ${id} created and added to map with color`);

                    SetLayers(prevDictionary => ({
                        ...prevDictionary,
                        [id]: layer,
                    }));
                }

                SetToggled(prevToggle => ([...prevToggle, id]));
                logToServer('info', `Layer ${id} toggled on`);
            } else {
                if (id in UsedLayers) {
                    UsedLayers[id].remove();
                    logToServer('info', `Layer ${id} removed from map`);
                    setloader(false)

                }

                SetToggled(prevToggle => prevToggle.filter(item => item !== id));
                logToServer('info', `Layer ${id} toggled off`);
            }
        } catch (error) {
            logToServer('error', `Error in GeoLayerChange function: ${error.message}`);
        }
    }



    async function CreateLayer(data, name, id, bound, fill, dynamic = false, bounds = null) {
        let layer;
        try {
            logToServer('info', 'Successfully CreateLayer ')

            if (!data.color) {
            data.color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
       console.log('data color in createlayer',data)
        }

            if (bound) {
                if (name === "raigaid_taluka") {
                    let geo = JSON.parse(data.color[0])
                    layer = L.geoJSON(geo, {
                        style: {
                            color: data.color[1],
                            fillOpacity: 0.0
                        },
                        onEachFeature: function (feature, layer) {
                            let content = ``
                            for (const key in feature.properties) {
                                content = content + `<b>${key} : ${feature.properties[key]}</b><br>`

                            }
                            layer.bindPopup(content);
                        }
                    })
                } else {
                    layer = L.geoJson.ajax(`https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT:${name}&srsname=EPSG:4326&outputFormat=application/json`, {
                        style: {
                            color: data.color,
                            fillOpacity: 0.0
                        },
                        onEachFeature: function (feature, layer) {
                            if (name === "AssamFlood_Assam_Region") {
                                let content = ``
                                for (const key in feature.properties) {
                                    content = content + `<b>${key} : ${feature.properties[key]}</b><br>`

                                }
                                layer.bindPopup(content);
                            }
                            if (name === "MH_TQ") {
                                layer.bindPopup(`<b>District : ${feature.properties.NAME_2}</b><br><b>Taluka : ${feature.properties.NAME_3}</b>`);
                            }
                            if (name === "MH_DIS") {
                                layer.bindPopup(`<b>District : ${feature.properties.d_name}</b>`);
                            }
                        }
                    })
                }

            } else {
                if (dynamic) {
                    Canvas.addLayer(name, id, data.color, fill, true, bounds)
                } else {

                    Canvas.addLayer(name, id, data.color, fill)
                }
                SetLayers(prevDictionary => ({
                    ...prevDictionary,
                    [name]: name,
                }));
            }

            if (bound) {
                if (name !== "kolhapur_bound_new") {
                    layer.addTo(map);
                }

                layer.on("data:loaded", (() => {
                    map.flyToBounds(layer.getBounds());
                }))
                layer.bringToFront();
                SetLayers(prevDictionary => ({
                    ...prevDictionary,
                    [name]: layer,
                }));
            }
            // if(dynamic){
            //     map.flyToBounds(bounds)
            // }

        } catch (error) {
            logToServer('error', `Error in CreateLayer function: ${error.message}`)
        }
    }


   async function CreateTileLayer(name, id, layer_name, dynamic, bounds,clipper) {
        let layer = null;
        console.log(clipper)
        try {
            logToServer('info', `CreateTileLayer called with params: name=${name}, id=${id}, layer_name=${layer_name}, dynamic=${dynamic}, bounds=${JSON.stringify(bounds)}`);
            let latLngBounds = null
            let geojsonPolygon=null;
            if (dynamic) {
                if(!clipper || (clipper[0]=="None")){
                    const minLat = bounds[0][0];
                    const minLon = bounds[0][1];
                    const maxLat = bounds[1][0];
                    const maxLon = bounds[1][1];
    
                    const polygonCoordinates = [
                        [minLon, minLat],
                        [maxLon, minLat],
                        [maxLon, maxLat],
                        [minLon, maxLat],
                        [minLon, minLat]
                    ];
                    latLngBounds=L.latLngBounds(
                        [minLat, minLon],
                        [maxLat, maxLon]
                    );
                    geojsonPolygon = {
                        "type": "FeatureCollection",
                        "features": [
                            {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Polygon",
                                    "coordinates": [
                                        polygonCoordinates
                                    ]
                                },
                                "properties": {}
                            }
                        ]
                    };
                }else{
                    if(Canvas.getLayers().includes(clipper[0])){
                        let geo=Canvas.getLayerGeo(clipper[1])
                        
                        latLngBounds=L.latLngBounds(
                            [geo[1][0], geo[1][1]],
                            [geo[1][2], geo[1][3]]
                        );
                        geojsonPolygon=geo[0];
                    }else{
                        const wfsUrl = `https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=useruploads:${clipper[1]}&srsname=EPSG:4326&outputFormat=application/json`;

                        try {
                            const response =  await fetch(wfsUrl);
                            
                            const data = await response.json();
                    
                            let box = bbox(data);
                            box = [box[1], box[0], box[3], box[2]];
                            latLngBounds = L.latLngBounds(
                                [box[0], box[1]],
                                [box[2], box[3]]
                            );
                            geojsonPolygon = data;
                            
                        } catch (error) {
                            console.error("Failed to fetch GeoJSON data:", error);
                        }
                    }
                }
                
                
               console.log(geojsonPolygon,latLngBounds)
                layer = L.TileLayer.boundaryCanvas(`https://geoserver.vasundharaa.in/geoserver/useruploads/gwc/service/wmts?layer=useruploads:${name}&style=&tilematrixset=EPSG%3A900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&&TileMatrix=EPSG%3A900913%3A{z}&TileCol={x}&TileRow={y}`, {
                    boundary: geojsonPolygon,
                    zIndex: 1000,
                    bounds: latLngBounds,
                    maxZoom: 20,
                });
                logToServer('info', `Dynamic tile layer created with bounds: ${JSON.stringify(bounds)}`);
            } else {
                let Boundary = UsedLayers[id].toGeoJSON();
                let Bounds = UsedLayers[id].getBounds();
                layer = L.TileLayer.boundaryCanvas(`https://geoserver.vasundharaa.in/geoserver/VGT/gwc/service/wmts?layer=VGT:${name}&style=&tilematrixset=EPSG%3A900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A900913%3A{z}&TileCol={x}&TileRow={y}`, {
                    boundary: Boundary,
                    zIndex: 1000,
                    bounds: Bounds,
                    maxZoom: 20,
                });
                logToServer('info', `Static tile layer created with layer ID: ${id}`);
            }

            layer.addTo(map);
            layer.bringToFront();
            SetLayers(prevDictionary => ({
                ...prevDictionary,
                [`${layer_name}#${name}`]: layer,
            }));
            logToServer('info', `Layer ${layer_name}#${name} added to map and brought to front`);

            map.fire('overlayadd', { "layer": layer, "name": `${layer_name}#${name}`, "overlay": true });

            if (dynamic) {
                map.flyToBounds(bounds);
                logToServer('info', `Map flew to bounds: ${JSON.stringify(bounds)}`);
            }
        } catch (error) {
            logToServer('error', `Error in CreateTileLayer function: ${error.message}`);
        }
    }


    function TileLayerChange(name, id, layer_name, ischeck, dynamic = false, bounds = null,clipper=null) {
        try {
            logToServer('info', `TileLayerChange called with params: name=${name}, id=${id}, layer_name=${layer_name}, ischeck=${ischeck}, dynamic=${dynamic}, bounds=${bounds}`);
            
            if (ischeck) {
                if (`${layer_name}#${name}` in UsedLayers) {
                    UsedLayers[`${layer_name}#${name}`].addTo(map);
                    logToServer('info', `Layer ${layer_name}#${name} added to map`);
                    map.fire('overlayadd', { "layer": UsedLayers[`${layer_name}#${name}`], "name": `${layer_name}#${name}`, "overlay": true });
                    if (dynamic) {
                        map.flyToBounds(bounds);
                        logToServer('info', `Map flew to bounds: ${bounds}`);
                    }
                } else {
                    CreateTileLayer(name, id, layer_name, dynamic, bounds,clipper);
                    logToServer('info', `TileLayer ${layer_name}#${name} created`);
                }
                SetToggled(prevToggle => ([...prevToggle, name]));
                logToServer('info', `Toggled layers updated: ${name} added`);
            } else {
                if (`${layer_name}#${name}` in UsedLayers) {
                    UsedLayers[`${layer_name}#${name}`].remove();
                    logToServer('info', `Layer ${layer_name}#${name} removed from map`);
                    map.fire('overlayremove', { "layer": UsedLayers[`${layer_name}#${name}`], "name": `${layer_name}#${name}`, "overlay": true });
                }
                SetToggled(prevToggle => prevToggle.filter(item => item !== name));
                logToServer('info', `Toggled layers updated: ${name} removed`);
            }
        } catch (error) {
            logToServer('error', `Error in TileLayerChange function: ${error.message}`);
        }
    }
 
    function handleOpen(id) {
        try {
            logToServer('info', `handleOpen called with id=${id}`);

            document.getElementById(id).checked = true;
            logToServer('info', `Checkbox ${id} set to true`);

            LayerChange(id, id, true, true);
            logToServer('info', `LayerChange called with params: id=${id}, ischeck=true, dynamic=true`);

            if (Object.keys(UsedLayers).includes(id)) {
                map.flyToBounds(UsedLayers[id].getBounds());
                logToServer('info', `Map flew to bounds of layer: ${id}`);
            }
        } catch (error) {
            logToServer('error', `Error in handleOpen function: ${error.message}`);
        }
    }

    const contextValue = {
        GetLayer,
        LayerChange,
        TileLayerChange,
        CreateLayer,
        CreateTileLayer,
        handleOpen,
        DrawLayerChange,
        SatLayerChange,
        GeoLayerChange,
        GetSat,
    }
    return <context.Provider value={contextValue}>{children}</context.Provider>
}

export const useLayerFunc = () => {
    return useContext(context)
}
