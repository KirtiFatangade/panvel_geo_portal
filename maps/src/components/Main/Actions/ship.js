import React,{useContext, useEffect, useState} from "react";
import Cal from "./Cal2";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar";
import { Polygon, bbox } from "@turf/turf";
import { HOST } from "../../host";
import L from "leaflet"
import { logToServer } from "../../logger";
function Ship(){
    const {
        map,
        layerControls,
        lastRect,
        drawnItems,
      } = useContext(GlobalContext)
    const {setloader}=useContext(SideBarContext)
    const [mess,setMess]=useState(null)  
    const [sDate,SetSDate]=useState(null)

    async function getDetections(){
      logToServer("info", "getDetections function called", { sDate });

        if(sDate && lastRect && drawnItems.hasLayer(lastRect)){
          setMess(null)
          setloader(true)
          logToServer("info", "Fetching ship detections", { sDate });

          try{
            await fetch(`${HOST}/ship-od`, {
                method: "POST",
                credentials:'include',
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ data:{"date":sDate,"box":bbox(drawnItems.getLayer(lastRect).toGeoJSON())} }),
              })
                .then((response) => response.json())
                .then((data) => createLayer(data.geo,data.url,data.date))
                logToServer("success", "Ship detections fetched successfully", { sDate });

              setloader(false)
        }
        catch (error) {
          logToServer("error", "Failed to fetch ship detections", { error: error.message });
          alert("Unexpected error occured please try again later")
          setloader(false)
        }
        }else{
          setMess("Please select valid Dates or draw a rectangle")
          logToServer("warn", "Invalid date or rectangle selection", { sDate });

        }
        
    }
    function createLayer(data,url,date){
      logToServer("info", "Creating layer with fetched data", { date });

      let layer=L.tileLayer(url,{maxZoom:20,zIndex:1005})
        layer.addTo(map)
        layerControls.addOverlay(layer,`SAR-${date}`)
      if(data.features.length){   
        layer=L.geoJSON(data,{style:{fill:false,color:"yellow"}})
     layer.addTo(map)
        layerControls.addOverlay(layer, `ship-${date}`, true, layer.getBounds())
        map.flyToBounds(layer.getBounds());
      }
     
    }
    return(
        <>
            <>
            <Cal  SetSDate={SetSDate}></Cal><div>
          <button className="visualize-button" onClick={getDetections}>
            Visualize
          </button>
        </div>
        {mess && (
          mess
        )}
            </>
        </>
    )



}

export default Ship