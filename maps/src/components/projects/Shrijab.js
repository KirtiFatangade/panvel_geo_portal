import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Shrijab() {
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
   
   <details className="baseline" onToggle={() => handleOpen("Shrijab_Bounds")} >
            <summary >Shrijab</summary>
            <div className="baseline-cont">
            <div style={{display:"none"}} className="opt-div">
            <input value="Shrijab_Bounds" id="Shrijab_Bounds" className="form-check-input check-map" onChange={(e)=>TileLayerChange(e.target.value,e.target.checked)} type="checkbox"  />
            <label>Image</label>
            </div>
            <div className="opt-div">
            <input value="Srimage" id="Shrijab_Bounds" className="form-check-input check-map" onChange={(e)=>TileLayerChange(e.target.value,e.target.id,"Image",e.target.checked)} type="checkbox"  />
            <label>Image</label>
            </div>
            <details id="townD">
                <summary className="townS">Object Detection</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Shrijab_Vehicle" id="srv" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Vehicle</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Shrijab_Parking" id="srp" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Parking</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Shrijab_Implacement" id="sre" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Emplacements</label>
                    </div>
                </div>
              </details>
              <details id="townD">
                <summary className="townS">Segmentation</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Shrijab_Trenches" id="srt" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}/>
                    <label>Trenches</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Shrijab_Road" id="srr" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}/>
                    <label>Road</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Shrijab_Bund" id="srb" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}/>
                    <label>Bund</label>
                    </div>
                </div>
              </details>
            </div>
            </details>
            </>
  )
}

export default Shrijab