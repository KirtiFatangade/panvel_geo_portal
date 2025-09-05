import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Bird() {
  const {
    LayerChange,
    TileLayerChange,
    handleOpen,
  }=useLayerFunc();
  const {
    SetLogout
  }=useContext(GlobalContext)
const [op,setOp]=useState(1);
  // const LayerWorker = wrap(new Worker('./layerWorker.js'));
  
  useEffect(()=>{
    SetLogout(true);
  },[])


  return (
        <>
   
   <details className="baseline" onToggle={() => handleOpen("bird_bound")} > 
            <summary>Avalpoondurai Crop Classification</summary>
            <div className="baseline-cont">
                <div  style={{display:"none"}} className="opt-div">
                <input  value="bird_bound" id="bird_bound" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}  className="form-check-input check-map" type="checkbox"/>
            <label>Area Boundary</label>
                </div>
                <details id="townD">
                <summary className="townS">Crop Classification</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="bird_crop_class_banana" id="Banana" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Banana</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_cane" id="Sugarcane" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Sugarcane</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_cocount" id="Coconut" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Coconut</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_corn" id="Corn" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Corn</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_nut" id="Ground" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Ground Nut</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_paddy" id="Paddy" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Paddy</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_fallow" id="Fallow" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Fallow</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_barren" id="Barren" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Barren</label>
                    </div> 
                    <div className="opt-div">
                    <input value="bird_crop_class_other" id="Other" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Other</label>
                    </div> 

                </div>
            </details>
            <div className="opt-div">
            <input value="bird_drone_2" id="bird_bound" className="form-check-input check-map" onChange={(e)=>TileLayerChange(e.target.value,e.target.id,"Avalpoondurai Image",e.target.checked,false,false)}  type="checkbox" />
            <label>Avalpoondurai Image</label>
            </div>

		   
            </div>
            </details>
            </>
  )
}

export default Bird