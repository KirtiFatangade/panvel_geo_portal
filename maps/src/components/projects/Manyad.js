import React, { useContext, useEffect, useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Manyad() {
  const {
    LayerChange,
    TileLayerChange,
    handleOpen,
  } = useLayerFunc();
  const {
    SetLogout
  } = useContext(GlobalContext)

  useEffect(() => {
    SetLogout(true);
  }, [])


  return (
    <>
      {/* Manyad_Village Manyad_Watershed */}
      <details className="baseline" onToggle={() => handleOpen("Manyad_Boundary")} >
        <summary>Manyad</summary>
        <div className="baseline-cont">
          <div className="opt-div">
            <input value="Manyad_Boundary" id="Manyad_Boundary" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked, true)} className="form-check-input check-map" type="checkbox" />
            <label>Boundary</label>
          </div>
          <div className="opt-div">
            <input value="Manyad_River_poly" id="mdr" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked, false, true)} type="checkbox" />
            <label>River</label>
          </div>
          <div className="opt-div">
            <input value="Manyad_Streams" id="mds" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
            <label>Streams</label>
          </div>
          <div className="opt-div">
            <input value="manyadMicroWatershed" id="mds" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
            <label>Micro Watershed</label>
          </div>
          <div className="opt-div">
            <input value="Manyad_Village" id="mds" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
            <label>Nearby Villages</label>
          </div>
          <div className="opt-div">
            <input value="Manyad_Building" id="mda" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
            <label>All Buildings</label>
          </div>
          <div className="opt-div">
            <input value="Manyad_DEM" id="Manyad_Boundary" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Manyad DEM", e.target.checked)} />
            <label>Manyad Dem</label>
          </div>
          <details id="townD">
            <summary className="townS">Buffer</summary>
            <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                <input value="Manyad_River_Buff_100m" id="mdb100" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>River Buffer 100m</label>
              </div>
              <div className="opt-div">
                <input value="Manyad_River_Buff_70m" id="mdb70" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>River Buffer 70m</label>
              </div>
              <div className="opt-div">
                <input value="Manyad_River_Buff_30m" id="mdb30" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>River Buffer 30m</label>
              </div>
              <div className="opt-div">
                <input value="Manyad_River_Buff_10m" id="mdb10" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>River Buffer 10m</label>
              </div>
            </div>
          </details>
          <details id="townD">
            <summary className="townS">Flood Prone Buildings</summary>
            <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
              <div className="opt-div">
                <input value="Manyad_building_100m_prone" id="mdpb100" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>Flood Prone 100m</label>
              </div>
              <div className="opt-div">
                <input value="Manyad_building_70m_prone" id="mdpb70" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>Flood Prone 70m</label>
              </div>
              <div className="opt-div">
                <input value="Manyad_building_30m_prone" id="mdpb30" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>Flood Prone 30m</label>
              </div>
              <div className="opt-div">
                <input value="Manyad_building_10m_prone" id="mdpb10" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                <label>Flood Prone 10m</label>
              </div>
            </div>
          </details>
        </div>
      </details>
    </>
  )
}

export default Manyad