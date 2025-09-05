import React, { useContext, useEffect, useState } from "react";
import "./panvel.css"
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Meghalaya() {
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
        <summary>Mining in  Meghalaya</summary>
        <div className="baseline-cont">
          <details id="townD" onToggle={() => handleOpen("meghalaya rat hole Tluh Mines extent")}>
            <summary className="townS">Tluh Mines</summary>
            <div className="opt-div" style={{ display: "none" }}>
              <input value="meghalaya rat hole Tluh Mines extent" id="meghalaya rat hole Tluh Mines extent" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>Byndihati Mines</label>
            </div>
            <div className="town-cont">
             
              <div className="opt-div">
                <input value="meghalaya rat hole Tluh Mines 2014" id="meghalaya rat hole Tluh Mines extent" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Tluh Mines 2014",e.target.checked)} />
                <label>Tluh Mines 2014</label>
              </div>
              <div className="opt-div">
                <input value="meghalaya rat hole Tluh Mines 2018" id="meghalaya rat hole Tluh Mines extent" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Tluh Mines 2018",e.target.checked)} />
                <label>Tluh Mines 2018</label>
              </div>
              <div className="opt-div">
                <input value="meghalaya rat hole Tluh Mines 2019" id="meghalaya rat hole Tluh Mines extent" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Tluh Mines 2019",e.target.checked)} />
                <label>Tluh Mines 2019</label>
              </div>
            </div>
          </details>
          <details id="townD" onToggle={() => handleOpen("meghalaya rat hole carbon extent")}>
            <summary className="townS">Carbon Storage</summary>
            <div className="town-cont">
              <div className="opt-div" style={{ display: "none" }}>
                <input value="meghalaya rat hole carbon extent" id="meghalaya rat hole carbon extent" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} className="form-check-input check-map" type="checkbox" />
                <label>Byndihati Mines</label>
              </div>
             
              <div className="opt-div">
                <input value="Mine Carbon Storage 2017" id="meghalaya rat hole carbon extent" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id,"Carbon Storage 2017", e.target.checked)} />
                <label>Carbon Storage 2017</label>
              </div>
              <div className="opt-div">
                <input value="Mine Carbon Storage 2019" id="meghalaya rat hole carbon extent" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Carbon Storage 2019",e.target.checked)} />
                <label>Carbon Storage 2019</label>
              </div>
              <div className="opt-div">
                <input value="Mine Carbon Storage 2021" id="meghalaya rat hole carbon extent" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Carbon Storage 2021",e.target.checked)} />
                <label>Carbon Storage 2021</label>
              </div>
              <div className="opt-div">
                <input value="Mine Carbon Storage 2022" id="meghalaya rat hole carbon extent" className="form-check-input check-map" type="checkbox" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Carbon Storage 2022",e.target.checked)} />
                <label>Carbon Storage 2022</label>
              </div>
            </div>
          </details>
          <details id="townD" onToggle={() => handleOpen("meghalaya rat hole byndihati extent")}>
            <summary className="townS">Byndihati Mines</summary>
            <div className="town-cont">
              <div className="opt-div" style={{ display: "none" }}>
                <input value="meghalaya rat hole byndihati extent" id="meghalaya rat hole byndihati extent" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} className="form-check-input check-map" type="checkbox" />
                <label>Byndihati Mines</label>
              </div>
              
              <div className="opt-div">
                <input value="Byndihati Mines 2014" id="meghalaya rat hole byndihati extent" className="form-check-input check-map" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Byndihati Mines 2014",e.target.checked)} type="checkbox" />
                <label>Byndihati Mines 2014</label>
              </div>
              <div className="opt-div">
                <input value="Byndihati Mines 2017" id="meghalaya rat hole byndihati extent" className="form-check-input check-map" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Byndihati Mines 2017",e.target.checked)} type="checkbox" />
                <label>Byndihati Mines 2017</label>
              </div>
              <div className="opt-div">
                <input value="Byndihati Mines 2019" id="meghalaya rat hole byndihati extent" className="form-check-input check-map" onChange={(e) => TileLayerChange(e.target.value, e.target.id,"Byndihati Mines 2019", e.target.checked)} type="checkbox" />
                <label>Byndihati Mines 2019</label>
              </div>
              <div className="opt-div">
                <input value="Byndihati Mines 2021" id="meghalaya rat hole byndihati extent" className="form-check-input check-map" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Byndihati Mines 2022",e.target.checked)} type="checkbox" />
                <label>Byndihati Mines 2022</label>
              </div>
            </div>
          </details>
          <details id="townD" onToggle={() => handleOpen("meghalaya rat hole myndihati extent")}>
            <summary className="townS">Myndihati Mines</summary>
            <div className="opt-div" style={{ display: "none" }}>
              <input value="meghalaya rat hole myndihati extent" id="meghalaya rat hole myndihati extent" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>Byndihati Mines</label>
            </div>
            <div className="town-cont">
             
              <div className="opt-div">
                <input value="Myndihati Mines 2014" id="meghalaya rat hole myndihati extent" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Myndihati Mines 2014",e.target.checked)} className="form-check-input check-map" type="checkbox" />
                <label>Myndihati Mines 2014</label>
              </div>
              <div className="opt-div">
                <input value="Myndihati Mines 2019" id="meghalaya rat hole myndihati extent" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Myndihati Mines 2019",e.target.checked)} className="form-check-input check-map" type="checkbox" />
                <label>Myndihati Mines 2019</label>
              </div>
              <div className="opt-div">
                <input value="Myndihati Mines 2022" id="meghalaya rat hole myndihati extent" onChange={(e) => TileLayerChange(e.target.value, e.target.id, "Myndihati Mines 2022",e.target.checked)} className="form-check-input check-map" type="checkbox" />
                <label>Myndihati Mines 2022</label>
              </div>
            </div>
          </details>
        </div>
      </details>

    </>
  )
}

export default Meghalaya;