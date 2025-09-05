import React, { useState, useContext, useRef, useEffect } from "react";
import L from "leaflet"
import { GlobalContext } from "../../../App";
import Search from "./search"
import { logToServer } from "../../logger";
require("leaflet-routing-machine")

function useForceUpdate() {
    const [, setValue] = useState(0);

    return () => setValue(value => value + 1);
}
function FindRoute() {
    const {
        routerPath,
        map,
        drawControl,
        customMarker,
        drawnItems,
        waypoints,
        vis
    } = useContext(GlobalContext);
    const start = useRef(null)
    const end = useRef(null)
    const [show, setshow] = useState(false);
    const [loader, setLoader] = useState(false)
    const toolvisRef = useRef(null);

    const types = ["start", "end", "waypoint"]
    const forceUpdate = useForceUpdate();


    function drawWaypoint(id) {
        let draw;
        if (id === "start") {
            draw = new L.Draw.Marker(map, {
                icon: new customMarker({
                    type: "start"
                }),
                edit:false 
            });
        } else if (id === "end") {
            draw = new L.Draw.Marker(map, {
                icon: new customMarker({
                    iconUrl: "https://cdn-icons-png.flaticon.com/512/8866/8866624.png",
                    type: "end"
                })
            })
        } else {
            draw = new L.Draw.Marker(map, {
                icon: new customMarker({
                    iconUrl: "https://cdn-icons-png.flaticon.com/512/58/58960.png",
                    type: "waypoint"
                }),
                
            })
        }

        draw.enable();

    }

    // hide content on click anyshwre on screen 
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest("#roadroute") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
                setshow(false);
            }
        };

        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (map) {
            const handleDrawCreated = function (e) {
                const layer = e.layer;
                if (e.layerType === "marker" && types.includes(layer.options.icon.options.type)) {

                    const latlng = layer.getLatLng();
                    let prevLayers = waypoints.current;
                    waypoints.current = [...prevLayers, drawnItems.getLayerId(layer)]
                    if (layer.options.icon.options.type === "start") {
                        start.current = latlng;
                        drawRoute();

                    } else if (layer.options.icon.options.type === "end") {
                        end.current = latlng;
                        drawRoute();

                    }
                    else {
                        addWaypoint(latlng.lat, latlng.lng)
                    }

                }
            };

            map.on('draw:created', handleDrawCreated);

            return () => {
                map.off('draw:created', handleDrawCreated);
            };
        }


    }, [map]);

    function drawRoute() {
        if (start.current && end.current) {
            setLoader(true)
            let router = L.Routing.control({
                waypoints: [
                    L.latLng(start.current.lat, start.current.lng),
                    L.latLng(end.current.lat, end.current.lng)
                ],
                routeWhileDragging: false,
                collapsible: true,
                show: true,
                createMarker: () => { new L.Draw.Marker(map, { icon: new customMarker() }); }
            })
            router.addTo(map)
            router.on("routesfound", (e) => {
                setLoader(false)
            })
            routerPath.current = router
            forceUpdate();
        }
    }
    function addWaypoint(lat, lng) {
        if (routerPath.current) {
            const waypoints = routerPath.current.getWaypoints();
            waypoints.splice(waypoints.length - 1, 0, L.latLng(lat, lng));
            routerPath.current.setWaypoints(waypoints);
        }
    }
    function RemoveRoute() {
        if (routerPath.current) {
            routerPath.current.remove();
            waypoints.current.forEach((ele) => {
                drawnItems.removeLayer(ele)
            })
            routerPath.current = null;
            start.current = null;
            end.current = null;
            forceUpdate();
        }
    }

    return (
        <div style={{ position: vis ? "absolute" : "relative", }} className="toolscont">
            <button title="Road Route" className="btn text-white" id='roadroute' onClick={() => setshow(prevShow => !prevShow)} style={{ zIndex: "1000", fontSize: "15px", backgroundColor:'black', padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%", border: "none" }}><i className="fa-solid fa-route"></i></button>

            {show ? (
                <div ref={toolvisRef} className="toolsvis" id="toolvis" style={{ fontSize: "15px", width: '120%' }}>
                    {!routerPath.current ? (
                        <div style={{ display: "flex", flexDirection: "row", height: "fit-content", marginTop: "5px" }}>
                            <div style={{ margin: "5px", display: "flex", flexDirection: "column", flex: '1', width: '130px' }} className="start">
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button class="btn btn-primary" style={{ width: "30px", padding: "0px", marginBottom: '5%',marginRight:"10px" }} onClick={() => drawWaypoint("start")}><i className="fa-solid fa-location-dot"></i></button>
                                    <p style={{ margin: "0px", color: 'white',fontSize:"12px" }}>Add Start Point</p>
                                </div>
                                <Search type={"start"} />
                            </div>

                            <div style={{ width: "1px", height: "100%", background: "black", margin: "0px" }} />

                            <div style={{ margin: "5px", display: "flex", flexDirection: "column", flex: 1, width: '140px' }} className="end">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button class="btn btn-primary" style={{ width: "30px", padding: "0px", marginBottom: '5%',marginRight:"10px" }} onClick={() => drawWaypoint("end")}><i className="fa-solid fa-location-dot"></i></button>
                                <p style={{ margin: "0px", color: 'white',fontSize:"12px" }}>Add End Point</p>
                            </div>
                                <Search type={"end"} />
                            </div>

                        </div>
                    )
                        : (
                            <div style={{ display: "flex", flexDirection: "row", width: '100%' }}>
                                <div style={{ margin: "5px", display: "flex", flexDirection: "column", flex: 1 }} className="waypoint">
                                    <p style={{ margin: "0px", color: 'white', fontSize:'12px' }}>Add Waypoint</p>
                                    <button className="mt-2 mb-2 btn btn-primary" style={{ width: "120px", height:'30px', marginBottom: '3%', fontSize:'12px'}} onClick={() => drawWaypoint("waypoint")}>By Click</button>
                                    <Search type={"waypoint"} />
                                </div>
                                {loader ? (
                                    <div className="lds-dual-ring-white" style={{ zIndex: "1000" }}></div>

                                ) : (

                                    <>
                                        <i className="fa-solid fa-trash-can text-danger mt-2" onClick={() => RemoveRoute()}></i>
                                    </>
                                )}

                            </div>
                        )}
                </div>
            ) : null}
        </div>

    )

}

export default FindRoute