import React, { useState, useContext, useEffect, useRef } from "react";
import L from "leaflet"
import { GlobalContext } from "../../../App";
import { logToServer } from "../../logger";

function useForceUpdate() {
    const [, setValue] = useState(0);

    return () => setValue(value => value + 1);
}
function Proximity() {
    const [show, setshow] = useState(false)
    const radius=useRef("100");
    const {
        map,
        drawControl,
        customMarker,
        drawnItems,
        vis
    } = useContext(GlobalContext);
    const forceUpdate = useForceUpdate();
    const toolvisRef = useRef(null);

    function addRadius() {
        let draw = new L.Draw.Marker(map, { icon: new customMarker({
            type:"proxim"
        })});
        draw.setOptions({title:"proxim"})
        draw.enable();
        
    }
    function setRadius(value){
        radius.current=value;
        forceUpdate();
    }
    function getPlaces(lat, lng) {
        fetch(`https://api.geoapify.com/v2/places?categories=commercial,catering,activity,accommodation&filter=circle:${lng},${lat},${radius.current}&apiKey=13354428756a40328f8f1512309b6f41`)
            .then(response => response.json())
            .then(result => {
                addPlaces(result);
                logToServer('info', `Places fetched for coordinates: ${lat}, ${lng} with radius ${radius.current}`);
            })
            .catch(error => {
                console.log('error', error);
                logToServer('error', `Error fetching places for coordinates: ${lat}, ${lng} with radius ${radius.current}: ${error}`);
            });
    }

    function addPlaces(data) {
        try {
            console.log(data);
            L.geoJSON(data, {
                pointToLayer: (object, latlng) => {
                    return L.marker(latlng, {
                        icon: new customMarker({
                            iconUrl: "https://cdn-icons-png.flaticon.com/512/58/58960.png",
                        }),
                        title: object.properties.name
                    });
                }
            }).addTo(map);
            logToServer('info', 'Places added to the map');
        } catch (error) {
            console.log('error', error);
            logToServer('error', `Error adding places to the map: ${error}`);
        }
    }
    // hide content on click anyshwre on screen 
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest("#proximity") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
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
                if (e.layerType === "marker" && layer.options.icon.options.type==="proxim") {
                    const latlng = layer.getLatLng();
                    L.circle([latlng.lat, latlng.lng], { radius: radius.current }).addTo(map)
                    getPlaces(latlng.lat, latlng.lng)
                }
            };
            map.on('draw:created', handleDrawCreated);

            return () => {
                map.off('draw:created', handleDrawCreated);
            };
        }
    }, [map]);

    return (
        <div style={{ position: vis?"absolute":"relative", }} className="toolscont">
            <button title="Proximity" className="btn ext-white" id='proximity' onClick={() => setshow(prevshow => !prevshow)} 
            style={{ zIndex: "1000", fontSize: "15px", padding: "2px 2px",backgroundColor:'black', width: "40px", height: "40px", borderRadius: "50%",border:"none" }}><i className="fa-solid fa-location-crosshairs"></i></button>
            {show?(
                <div ref={toolvisRef} className="toolsvis" id="toolvis" style={{display:"flex",flexDirection:"column",width:"200px"}}>

                    <div style={{margin:"6px 2px 5px 20px"}}>
                    <input className="border-0 custom-select" value={radius.current} style={{width:"85%",marginTop:'5%'}} type="number" onChange={(e)=>setRadius(e.target.value)} id="radius"/>
                <label style={{fontSize:"12px",marginTop:'5%'}} htmlFor="radius"> Enter Radius (in m)</label>
                    </div>
                   <div>
                   <button className= 'btn btn-primary mt-2' style={{width:'70%',height:'30px',fontSize:'11px', marginLeft:'10%'}} onClick={()=>addRadius()}>Find Places</button>
                   </div>
                   
                </div>
                
            ):null}
        </div>
    )
}

export default Proximity