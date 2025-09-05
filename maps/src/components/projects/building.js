import React,{useContext,useState} from "react";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import { HOST } from "../host";
import { Polygon, bbox } from "@turf/turf";
import { GlobalContext } from "../../App";
import { SideBarContext } from "../Main/sidebar";
function Building(){
    const [vis,setVis]=useState(false)
    const [mess,setmess]=useState(null)
    const [draw,SetDraw]=useState(null)
    const {
        drawControl,
        map,
        lastRect,
        drawnItems,
        layerControls,
        selTab,
        userInfo
    }=useContext(GlobalContext)
    const {
        setPloader,
        setloader
    }=useContext(SideBarContext);
    const location=useLocation()
    
    
   async function Visualize(){
        if (lastRect && drawnItems.hasLayer(lastRect)) {
          let box = bbox(drawnItems.getLayer(lastRect).toGeoJSON())
          let data={"extent":box}
          if (window.location.pathname.startsWith("/project/")) {
            const projectId = location.pathname.split("/")[3];
            data["project"] = projectId;
    
          } else {
            data["project"] = "global";
          }
          data["memb"] = userInfo.id
          data["tab"] = selTab;
          setloader(true)
            setVis(false)
            
            try{
                await fetch(`${HOST}/building-data`, {
                 method: "POST",
                 credentials:'include',
                 headers: {
                   "Content-Type": "application/json",
                 },
                 body: JSON.stringify({ data }),
               })
                 .then((response)=>response.json())
                 .then((data)=>{
                  AddLayer(data);
                  setloader(false)
                })
                  
             }
             catch(error){
              if (error.name !== 'AbortError') {
                alert("Unexpected Error occured Please try again")
                setPloader(false)
              }
               
             }
        }else{
            alert("Please draw a Rectangle")
        }
    }

    function AddLayer(data){
        let layer = L.tileLayer(data.url, { maxZoom: 20,zIndex:1005 });
        layerControls.addOverlay(layer, "Buildings Footprint Extraction",false,false,false,false,false,data.id);
        layer.addTo(map);
        drawnItems.removeLayer(lastRect);
    }

    return(
        <div style={{display:"flex",flexDirection:"column",height:"max-content",width:"max-content",marginTop:"30px"}}>
        {(lastRect && drawnItems.hasLayer(lastRect)) ?(
            <>
            <div>
              <button style={{height:"30px",width:"60px",fontSize:"10px"}} className="visualize-button" onClick={Visualize} >
                Visualize
              </button>
            </div>
            <p style={{margin:"0px"}}>{mess}</p>
            </>
        ):(<>
        <p style={{color:"white",margin:"0px"}} >Please draw Rectangle</p>
        </>)}
        </div>
    )

}

export default Building