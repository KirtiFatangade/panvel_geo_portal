import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Satara() {
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
   
   <details className="baseline" onToggle={() => handleOpen("Satara_Boundary")} >
            <summary>Satara</summary>
            <div className="baseline-cont">
                <div className="opt-div">
                <input  value="Satara_Boundary" id="Satara_Boundary" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  className="form-check-input check-map" type="checkbox"/>
            <label>Boundary</label>
                </div>
            <div className="opt-div">
            <input value="Satara_Election_Ward" id="seb" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}  type="checkbox" />
            <label>Election Ward Boundary</label>
            </div>
            <div className="opt-div">
            <input value="Satara_Building" id="sbl" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox"  />
            <label>Buildings</label>
            </div>
            <div className="opt-div">
            <input value="Satara_Green" id="sgc" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)} type="checkbox"   />
            <label>Green Cover</label>
            </div>
            <div className="opt-div">
            <input value="Satara_Contours" id="sc" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox"   />
            <label>Contours</label>
            </div>
            <div className="opt-div">
            <input value="Satara_Roads" id="sr" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox"   />
            <label>Roads</label>
            </div>
            <div className="opt-div">
            <input value="Satara_Tree" id="st" className="form-check-input check-map" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)} type="checkbox"   />
            <label>Tree</label>
            </div>
            <details id="townD" className="mt-3">
                <summary className="townS">Water Bodies</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Satara_Canal" id="swc" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}/>
                    <label>Canal</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Satara_River" id="swr" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}/>
                    <label>River</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Satara_Waterbodies" id="sww" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}/>
                    <label>Water Bodies</label>
                    </div>
                </div>
            </details>
            <div className="opt-div mb-3">
            <input value="simage" id="Satara_Boundary" className="form-check-input check-map" onChange={(e)=>TileLayerChange(e.target.value,e.target.id,"Image",e.target.checked)} type="checkbox"   />
            <label>Image</label>
            </div>
            </div>
            </details>
            </>
  )
}

export default Satara