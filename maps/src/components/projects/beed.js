import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Beed() {
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
   
   <details className="baseline" onToggle={() => handleOpen("beed_adm_vil_out")} > 
            <summary>Impact of water on Agri & Livestock</summary>
            <div className="baseline-cont">
                
                <details id="townD">
              <summary className="townS">Admin Boundaries</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div  className="opt-div">
                  <input value="beed_adm_vil_out" id="beed_adm_vil_out" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked,false,true)} />
                  <label>Area of Interest</label>
                </div>
              <div className="opt-div">   
                <input  value="beed_adm_bound" id="District" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  className="form-check-input check-map" type="checkbox"/>
            <label>District</label>
                </div>
                <div className="opt-div">
                  <input value="beed_adm_jam" id="Jamkhed" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Jamkhed</label>
                </div>
                <div className="opt-div">
                  <input value="beed_adm_vil" id="Villages" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Villages</label>
                </div>
                
              </div>
            </details>
            <details id="townD">
              <summary className="townS">Vegetation Area</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                  <input value="beed_veg_23" id="2023" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>2023</label>
                </div>
                <div  className="opt-div">
                  <input value="beed_veg_24" id="2024" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}  />
                  <label>2024</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary className="townS">Water Area</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                  <input value="beed_water_23" id="2023" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>2023</label>
                </div>
                <div  className="opt-div">
                  <input value="beed_water_24" id="2024" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}  />
                  <label>2024</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary className="townS">NDVI</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                  <input value="beed_NDVI_2023NDVI" id="beed_adm_vil_out" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2023",e.target.checked,false,false)} />
                  <label>2023</label>
                </div>
                <div  className="opt-div">
                  <input value="2024_NDVI" id="beed_adm_vil_out" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2024",e.target.checked,false,false)}  />
                  <label>2024</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary className="townS">NDWI</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                  <input value="2023_NDWI" id="beed_adm_vil_out" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2023",e.target.checked,false,false)} />
                  <label>2023</label>
                </div>
                <div  className="opt-div">
                  <input value="2024_NDWI" id="beed_adm_vil_out" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2024",e.target.checked,false,false)}  />
                  <label>2024</label>
                </div>
              </div>
            </details>
            <details id="townD">
              <summary className="townS">RGB</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                  <input value="2023_04_02" id="beed_adm_vil_out" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2023",e.target.checked,false,false)} />
                  <label>2023</label>
                </div>
                <div  className="opt-div">
                  <input value="2024_04_12" id="beed_adm_vil_out" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"2024",e.target.checked,false,false)}  />
                  <label>2024</label>
                </div>
              </div>
            </details>
            </div>
            </details>
            </>
  )
}

export default Beed