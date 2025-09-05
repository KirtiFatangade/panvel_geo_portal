import React, { useContext, useEffect, useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Barpeta() {
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

            <details className="baseline" onToggle={() => handleOpen("AssamFlood_Assam_Region")} >
                <summary>Assam Flood 2023</summary>
                <div className="baseline-cont">
                    <div className="opt-div">
                        <input value="AssamFlood_Assam_Region" id="AssamFlood_Assam_Region" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked,true)} type="checkbox" />
                        <label>Assam Flood Regions 2023</label>
                    </div>
                    <div className="opt-div">
                        <input value="AssamFlood_Barpeta_ALL_Buildings" id="All Buildings" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
                        <label>All Buildings</label>
                    </div>
                    <div className="opt-div">
                        <input value="AssamFlood_Flooded_Buildings" id="Flood Affected Buildings" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
                        <label>Flood Affected Buildings</label>
                    </div>
                   
                   
                <div className="opt-div">
                  <input value="Flood_Assam_vector" id="Flood" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id,e.target.checked,false,true)} />
                  <label>Barpeta Flood Layer</label>
                </div>
                   
                </div>
            </details>
        </>
    )
}

export default Barpeta;