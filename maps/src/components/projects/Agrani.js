import React, { useContext, useEffect, useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Agrani() {
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

      <details className="baseline" onToggle={() => handleOpen("Agrani_Boundary")} >
        <summary className="m-3 mb-1"><h6>Agrani</h6></summary>
        <div className="baseline-cont">
          <div className="opt-div">
            <input value="Agrani_Boundary" id="Agrani_Boundary" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked, true)} className="form-check-input check-map" type="checkbox" />
            <label>Boundary</label>
          </div>
          <div className="opt-div">
            <input value="Agrani_Dam" id="Dam Locations" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
            <label>Check Dam Locations</label>
          </div>
          <div className="opt-div">
            <input value="Agrani_Stream" id="Stream Network" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
            <label>Stream Network</label>
          </div>
          <details id="townD">
            <summary className="townS">Extracted Green Cover</summary>
            <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                <input value="Agrani_Green_Cover_2014" id="Agrani_Boundary" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>2014</label>
              </div>
              <div className="opt-div">
                <input value="Agrani_Green_Cover_2023" id="Agrani_Boundary" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>2023</label>
              </div>
            </div>
          </details>
          <details id="townD">
            <summary className="townS">NDVI Images</summary>
            <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                <input value="2014_NDVI" id="Agrani_Boundary" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "2014", e.target.checked)} />
                <label>2014</label>
              </div>
              <div className="opt-div">
                <input value="2023_NDVI" id="Agrani_Boundary" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "2023", e.target.checked)} />
                <label>2023</label>
              </div>
            </div>
          </details>
        </div>
      </details>
    </>
  )
}

export default Agrani