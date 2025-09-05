import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function KolFire() {
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
   
   <details className="baseline" onToggle={() => handleOpen("kol_fire_bound")} > 
            <summary>Kolhapur Forest Fire Assesment</summary>
            <div className="baseline-cont">
                <div   className="opt-div">   
                <input  value="kol_fire_bound" id="kol_fire_bound" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  className="form-check-input check-map" type="checkbox"/>
            <label>AOI</label>
                </div>
                <details id="townD">
              <summary className="townS">Burn Areas</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
                <div className="opt-div">
                  <input value="kol_2018_02_13" id="2018-02-13" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>2018-02-13</label>
                </div>
                <div className="opt-div">
                  <input value="kol_2018_02_28" id="2018-02-28" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>2018-02-28</label>
                </div>
                <div className="opt-div">
                  <input value="kol_2018_03_05" id="2018-03-05" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>2018-03-05</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary className="townS">Images</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                  <input value="kolhapur_fire_2018-02-13" id="kol_fire_bound" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2018-02-13",e.target.checked,false,false)} />
                  <label>2018-02-13</label>
                </div>
                <div  className="opt-div">
                  <input value="kolhapur_fire_2018-02-28" id="kol_fire_bound" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2018-02-28",e.target.checked,false,false)}  />
                  <label>2018-02-28</label>
                </div>
                <div className="opt-div">
                  <input value="kolhapur_fire_2018-03-05" id="kol_fire_bound" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2018-03-05",e.target.checked,false,false)} />
                  <label>2018-03-05</label>
                </div>
              </div>
            </details>
            </div>
            </details>
            </>
  )
}

export default KolFire