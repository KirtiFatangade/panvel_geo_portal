import React, { useContext, useEffect,useState } from "react";
import "./panvel.css"
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function PanvelMain() {
  const {
    LayerChange,
    TileLayerChange,
    handleOpen,
  }=useLayerFunc();
  const {
    SetLogout
  }=useContext(GlobalContext)

  
  useEffect(()=>{
    SetLogout(true);
  },[])


  return (

      <>
      
       <details className="baseline" onToggle={() => handleOpen("Panvel_Boundary")}  >
       <summary>Panvel</summary>
       <div className="baseline-cont">
       <div className="opt-div">
              <input value="Panvel_Boundary" id="Panvel_Boundary" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked,true)} className="form-check-input check-map" type="checkbox" />
              <label>Boundary</label>
            </div>
       <details id="townD">
          <summary className="townS">Baseline</summary>
          <div className="town-cont">
            <div className="opt-div">
              <input value="Panvel_CIDCO" id="CIDCO" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
              <label>CIDCO</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Road" id="Road" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
              <label>Road</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Railways" id="Railway" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
              <label>Railways</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Total_Builtup" id="Total Builtup" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
              <label>Total Builtup</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Tree" id="Tree" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
              <label>Tree</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Water" id="Waterbody" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked, false, true)} />
              <label>Waterbody</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Mangrove" id="Mangrove" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked, false, true)} />
              <label>Mangrove</label>
            </div>
            <details id="townD">
              <summary className="townS">Town Planning</summary>
              <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
                <div className="opt-div">
                  <input value="Panvel_Division" id="Division" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Divisions</label>
                </div>
                <div className="opt-div">
                  <input value="Panvel_Prabhag" id="Prabhag" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Prabhag</label>
                </div>
                <div className="opt-div">
                  <input value="Panvel_Sectors" id="Sectors" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Sectors</label>
                </div>
                <div className="opt-div">
                  <input value="plot" id="plot" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Plots</label>
                </div>
                <div style={{display:"none"}} className="opt-div">
                  <input value="vill" id="vill" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                  <label>Village</label>
                </div>
               
              </div>
            </details>
          </div>
        </details>
        <details id="townD" >
          <summary className="townS">Builtup Change</summary>
          <div className="town-cont">
            <div className="opt-div">
              <input value="Panvel_Nov_2019_vector" id="Nov 2019" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked, false, true)} className="form-check-input check-map" type="checkbox" />
              <label>Nov 2019</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_May_2020_vector" id="May 2020" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox" />
              <label>May 2020</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Nov_2020_vector" id="Nov 2020" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox" />
              <label>Nov 2020</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_May_2021_vector" id="May 2021" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox" />
              <label>May 2021</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Nov_2021_vector" id="Nov 2021" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox" />
              <label>Nov 2021</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_May_2022_vector" id="May 2022" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox" />
              <label>May 2022</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Jan_2023_vector" id="Jan 2023" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox" />
              <label>Jan 2023</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_May_2025_Change" id="Mangrove" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked, false, true)} />
              <label>May 2025 </label>
            </div>
          </div>
        </details>
         <details id="townD">
            <summary className="townS"> Unauthorised Buildings </summary>
            <div className="town-cont">
              <div className="opt-div">
                <input
                  value="Unauthorized_Nov_2019"
                  id="Nov 2019"
                  className="form-check-input check-map"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                  type="checkbox"
                />
                <label>Nov 2019</label>
              </div>
              <div className="opt-div">
                <input
                  value="Unauthorized_May_2020"
                  id="Unauthorized_May_2020"
                  className="form-check-input check-map"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                  type="checkbox"
                />
                <label>May 2020</label>
              </div>
              <div className="opt-div">
                <input
                  value="Unauthorized_April_2021"
                  id="Unauthorized_April_2021"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                  className="form-check-input check-map"
                  type="checkbox"
                />
                <label>April 2021</label>
              </div>
              <div className="opt-div">
                <input
                  value="Unauthorized_Nov_2021"
                  id="Unauthorized_Nov_2021"
                  className="form-check-input check-map"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                  type="checkbox"
                />
                <label>Nov 2021</label>
              </div>
            </div>
          </details>
          
        <details id="townD">
          <summary className="townS">Images</summary>
          <div className="town-cont">
            <div className="opt-div">
              <input value="May_2019" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"May 2019",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>May 2019</label>
            </div>
            <div className="opt-div">
              <input value="Nov_2019" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Nov 2019",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>Nov 2019</label>
            </div>
            <div className="opt-div">
              <input value="May_2020" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"May 2020",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>May 2020</label>
            </div>
            <div className="opt-div">
              <input value="Nov_2020" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Nov 2020",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>Nov 2020</label>
            </div>
            <div className="opt-div">
              <input value="May_2021_Panvel_New" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"May_2021_1",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>May_2021</label>
            </div>
            <div className="opt-div">
              <input value="Nov_2021" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Nov 2021",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>Nov 2021</label>
            </div>
            <div className="opt-div">
              <input value="May_2022" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"May 2022",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>May 2022</label>
            </div>
            <div className="opt-div">
              <input value="Jan_2023" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"Jan 2023",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>Jan 2023</label>
            </div>
            <div className="opt-div">
              <input value="March_2025" id="Panvel_Boundary" onChange={(e) => TileLayerChange(e.target.value,e.target.id,"March 2025",e.target.checked)} className="form-check-input check-map" type="checkbox" />
              <label>March 2025</label>
            </div>
          </div>
        </details>
       </div>
       </details>
        
        </>
  )
}

export default PanvelMain;