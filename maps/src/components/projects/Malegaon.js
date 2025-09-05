import React, { useContext, useEffect,useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Malegaon() {
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
   
            <details className="baseline" onToggle={() => handleOpen("Malegaon_Boundary")} >
            <summary>Malegaon</summary>
            <div className="baseline-cont">
                    <div className="opt-div">
                    <input value="Malegaon_Boundary" id="Malegaon_Boundary" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,true)}/>
                    <label>Boundary</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Adm_Boundary" id="Administrative Boundary" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Administrative Boundary</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Building" id="mnbl" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Buildings</label>
                    </div>
            <details id="townD">
                <summary className="townS">Water and Sewerage</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Malegaon_Water_Supply" id="mnwsn" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Wells</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Water_Bodies_Polygon" id="mnwbp" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Water Bodies Polygon</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Storm_Water" id="mnswd" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Storm Water Drainage Network</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Sewerage" id="mnsn" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Sewerage Network</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Manhole" id="mncm" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Chambers manhole</label>
                    </div> 
                </div>
            </details>
            <details id="townD">
                <summary className="townS">Transportation</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Malegaon_Bus" id="mnbs" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Bus Stop</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Road_Polygon" id="mnrp" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked,false,true)}/>
                    <label>Road Polygon</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Road_Line" id="mnrl" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Road Line</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Bridges" id="mnbr" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Bridges</label>
                    </div> 
                </div>
            </details>
            
            <details id="townD">
                <summary className="townS">Electric Powerline</summary>
                <div className="town-cont" style={{display:"flex",flexDirection:"column",justifyItems:"right"}}>
                    <div className="opt-div">
                    <input value="Malegaon_Power_Supply_Network_Points" id="mnpsnp" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Power Supply Network Points</label>
                    </div> 
                    <div className="opt-div">
                    <input value="mnpsnl" id="mnpsnl" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Power Supply Network Lines</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Street_Light" id="mnsl" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Street Lights</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_High_Mast" id="mnhm" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>High Mast</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_Communication" id="mncd" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Communication Devices</label>
                    </div> 
                    <div className="opt-div">
                    <input value="Malegaon_ATM" id="mna" className="form-check-input check-map"  type="checkbox" onChange={(e)=>LayerChange(e.target.value,e.target.id,e.target.checked)}/>
                    <label>Atm</label>
                    </div> 
                </div>
            </details>
            </div>
            </details>
            </>
  )
}

export default Malegaon