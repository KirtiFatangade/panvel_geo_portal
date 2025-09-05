import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Kol() {
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
   
   <details className="baseline" onToggle={() => handleOpen("kolhapur_bound_new")} > 
            <summary>Kolhapur Flood Assesment</summary>
            <div className="baseline-cont">
                <div  style={{display:"none"}} className="opt-div">   
                <input  value="kolhapur_bound_new" id="kolhapur_bound_new" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  className="form-check-input check-map" type="checkbox"/>
            <label>Boundary</label>
                </div>
                <div className="opt-div">   
                <input  value="kolhapur_build" id="Buildings" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  className="form-check-input check-map" type="checkbox"/>
            <label>Buildings</label>
                </div>
                <details id="townD">
              <summary className="townS">2021</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
                <div className="opt-div">
                  <input value="kolhapur_2021_build" id="Affected Buildings" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Affected Buildings</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_2021_farm" id="Affected Farms" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Affected Farms</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_2021_flood" id="	Flood" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked,false,true)} />
                  <label>Flood</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_2021_image_flood_pre" id="kolhapur_bound_new" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Pre-Flood",e.target.checked,false,false)} />
                  <label>Pre-Flood</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_2021_image_flood_post" id="kolhapur_bound_new" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Post-Flood",e.target.checked,false,false)} />
                  <label>Post-Flood</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_2021_image_flood_21" id="kolhapur_bound_new" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Flood - 28/07/21",e.target.checked,false,false)} />
                  <label>Flood - 28/07/21</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary className="townS">2023</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                  <input value="kolhapur_2023_build" id="Affected Buildings" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Affected Buildings</label>
                </div>
                <div  className="opt-div">
                  <input value="kolhapur_2023_flood" id="Flood" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}  />
                  <label>Flood</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_2023_image_flood_pre" id="kolhapur_bound_new" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Pre-Flood",e.target.checked,false,false)} />
                  <label>Pre-Flood</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_2023_image_flood_post" id="kolhapur_bound_new" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Post-Flood",e.target.checked,false,false)} />
                  <label>Post-Flood</label>
                </div>
              </div>
            </details>
            </div>
            </details>
            </>
  )
}

export default Kol