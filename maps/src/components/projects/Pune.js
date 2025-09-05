import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Pune() {
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
            <details id="townD">
                <summary className="townS">Roads</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Pune_road_track" id="prt" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Track</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Pune_road_tertiary" id="prte" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Tertiary</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Pune_road_steps" id="prs" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Steps</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_road_service" id="prse" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Service</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_road_secondary" id="prsec" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Seconday</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_road_residential" id="prr" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Residential</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_road_primary" id="prp" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Primary</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_road_path" id="prpa" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Path</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_road_living_street" id="prl" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Living Street</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_road_footway" id="prf" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Footway</label>
                    </div>
                </div>
            </details>
            <details id="townD">
                <summary className="townS">Point</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Pune_point_toilet" id="ppt" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Toilet</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Pune_point_school" id="ppr" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>School</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Pune_point_restaurant" id="ppr" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Restaurant</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_post_office" id="ppp" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Post Office</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_post_box" id="pppo" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Post Box</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_police" id="ppl" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Police</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_hotel" id="pph" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Hotel</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_hostel" id="ppho" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Hostel</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_community_centres" id="ppc" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Community Centre</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_comms_tower" id="ppcol" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Comms Tower</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_point_college" id="ppcol" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>College</label>
                    </div>
                </div>
            </details>
            <details id="townD">
                <summary className="townS">Landuse</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Pune_landuse_scrub" id="pls" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Scrub</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Pune_landuse_retail" id="plr" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Retail</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Pune_landuse_residential" id="plrec" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Residential</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_landuse_ground" id="plrec" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Recreation Ground</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_landuse_park" id="plp" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Park</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_landuse_nature" id="pln" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Nature Reserve</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_landuse_military" id="plm" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Military</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_landuse_industrial" id="pli" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Industrial</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_landuse_health" id="plh" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Health</label>
                    </div>
                    <div className="opt-div">
                    <input value="	Pune_landuse_commercial" id="plc" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Commercial</label>
                    </div>
                    <div className="opt-div">
                    <input value="Pune_cemetery" id="plce" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Cemetry</label>
                    </div>
                </div>
            </details>
            </div>
            </details>
            </>
  )
}

export default Pune