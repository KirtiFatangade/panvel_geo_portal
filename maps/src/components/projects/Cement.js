import React, { useContext, useEffect, useState } from "react";
import "./panvel.css"
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Cement() {
  const {
    LayerChange,
    TileLayerChange,
    handleOpen,
  } = useLayerFunc();
  const {
    SetLogout
  } = useContext(GlobalContext)
  // const LayerWorker = wrap(new Worker('./layerWorker.js'));

  useEffect(() => {
    SetLogout(true);
  }, [])


  return (

    <>
      <details className="baseline"   >
        <summary>Meghalaya Forest Loss Construction</summary>
        <div className="baseline-cont">
          <details id="townD" onToggle={() => handleOpen("Major_Factory_AOI")}>
            <summary className="townS">Major Construction</summary>
            <div className="opt-div" style={{ display: "none" }}>
              <input value="Major_Factory_AOI" id="Major_Factory_AOI" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>Major Construction</label>
            </div>
            <div className="town-cont">
             
              <div className="opt-div">
                <input value="megh_major_19" id="Major_Factory_AOI" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Tluh Mines 2014",e.target.checked)} />
                <label>Major Factory 2019</label>
              </div>
              <div className="opt-div">
                <input value="megh_major_22" id="Major_Factory_AOI" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Tluh Mines 2018",e.target.checked)} />
                <label>Major Factory 2022</label>
              </div>
              <div className="opt-div">
                <input value="megh_major_23" id="Major_Factory_AOI" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Tluh Mines 2019",e.target.checked)} />
                <label>Major Factory 2023</label>
              </div>
            </div>
          </details>
          <details id="townD" onToggle={() => handleOpen("Limestone_Mines_AOI")}>
            <summary className="townS">Limestone Mines</summary>
            <div className="town-cont">
              <div className="opt-div" style={{ display: "none" }}>
                <input value="Limestone_Mines_AOI" id="Limestone_Mines_AOI" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} className="form-check-input check-map" type="checkbox" />
                <label>Byndihati Mines</label>
              </div>
             
              <div className="opt-div">
                <input value="Limestone_Mines_2012" id="Limestone_Mines_AOI" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id,"Carbon Storage 2017", e.target.checked)} />
                <label>Limestone Mines 2012</label>
              </div>
              <div className="opt-div">
                <input value="Limestone_Mines_2014" id="Limestone_Mines_AOI" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Carbon Storage 2019",e.target.checked)} />
                <label>Limestone Mines 2014</label>
              </div>
              <div className="opt-div">
                <input value="Limestone_Mines_2018" id="Limestone_Mines_AOI" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Carbon Storage 2021",e.target.checked)} />
                <label>Limestone Mines 2018</label>
              </div>
            </div>
          </details>
          <details id="townD" onToggle={() => handleOpen("Cement_Factory_AOI")}>
            <summary className="townS">Cement Factory</summary>
            <div className="town-cont">
              <div className="opt-div" style={{ display: "none" }}>
                <input value="Cement_Factory_AOI" id="Cement_Factory_AOI" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} className="form-check-input check-map" type="checkbox" />
                <label>Byndihati Mines</label>
              </div>
              
              <div className="opt-div">
                <input value="Cement_Factory_2018" id="Cement_Factory_AOI" className="form-check-input check-map" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Byndihati Mines 2014",e.target.checked)} type="checkbox" />
                <label>Cement Factory 2018</label>
              </div>
              <div className="opt-div">
                <input value="Cement_Factory_2019" id="Cement_Factory_AOI" className="form-check-input check-map" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Byndihati Mines 2017",e.target.checked)} type="checkbox" />
                <label>Cement Factory 2019</label>
              </div>
              <div className="opt-div">
                <input value="Cement_Factory_2022" id="Cement_Factory_AOI" className="form-check-input check-map" onChange={(e) => TileLayerChange(e.target.value, e.target.id,"Byndihati Mines 2019", e.target.checked)} type="checkbox" />
                <label>Cement Factory 2022</label>
              </div>
            </div>
          </details>
          
        </div>
      </details>

    </>
  )
}

export default Cement;