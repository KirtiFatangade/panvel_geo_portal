import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Hazard() {
  const {
    LayerChange,
    TileLayerChange,
    handleOpen,
  }=useLayerFunc();
  const {
    SetLogout
  }=useContext(GlobalContext)
  // const LayerWorker = wrap(new Worker('./layerWorker.js'));
  
  useEffect(()=>{
    SetLogout(true);
  },[])


  return (
        <>
   
   <details className="baseline" onToggle={() => handleOpen("hazard_raigad_district")} > 
            <summary>Raigad Landslide hazard Assesment</summary>
            <div className="baseline-cont">
                <div className="opt-div">   
                <input  value="hazard_raigad_district" id="hazard_raigad_district" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  className="form-check-input check-map" type="checkbox"/>
            <label>Boundary</label>
                </div>
            <div className="opt-div">
            <input value="raigaid_taluka" id="raigaid_taluka" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  type="checkbox" />
            <label>Taluqa</label>
            </div>
            <div className="opt-div">
            <input value="hazard_raigad_buildings" id="Building Footprint" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}  type="checkbox" />
            <label>Building Footprint</label>
            </div>
            <div className="opt-div">
            <input value="hazard_raigad_buildings_100" id="Prone Buildings within 100m" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}  type="checkbox" />
            <label>Prone Buildings within 100m </label>
            </div>
            <div className="opt-div">
            <input value="hazard_raigad_buildings_50" id="Prone Buildings within 50m" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}  type="checkbox" />
            <label>Prone Buildings within 50m</label>
            </div>
            </div>
            </details>
            </>
  )
}

export default Hazard