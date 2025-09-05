import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function PuneMini() {
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
   
   <details className="baseline" onToggle={() => handleOpen("Pune_Demographic")} >
            <summary >Pune Election Ward</summary>
            <div className="baseline-cont">
                <div className="opt-div">
                <input  value="Pune_Ground_Survey" id="pune_ground" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}  className="form-check-input check-map" type="checkbox"/>
            <label>Ground Survey</label>
                </div>
            <div className="opt-div">
            <input value="Pune_Demographic" id="Pune_Demographic" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  type="checkbox" />
            <label>Demographic Boundary</label>
            </div>
            <div className="opt-div">
            <input value="Pune_Building" id="pune_building" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox"  />
            <label>Buildings</label>
            </div>
            </div>
            </details>
            </>
  )
}

export default PuneMini