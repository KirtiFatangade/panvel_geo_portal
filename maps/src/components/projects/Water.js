import React, { useContext, useEffect, useState } from "react";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


function Water() {
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

            <details className="baseline"  >
                <summary>WaterBodies</summary>
                <div className="baseline-cont">
                    {/* <div className="opt-div" style={{ display: "none" }}>
                        <input value="clipping_extent" id="clipping_extent" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked, true)} className="form-check-input check-map" type="checkbox" />
                        <label>Boundary</label>
                    </div> */}
                    <div className="opt-div">
                        <input value="waterbody_watershed" id="clipping_extent" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
                        <label>Watershed</label>
                    </div>
                    <div className="opt-div">
                        <input value="waterbody_sub_basin" id="clipping_extent" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
                        <label>Watershed Sub-basin</label>
                    </div>
                    <div className="opt-div">
                        <input value="waterbody_micro_watershed" id="clipping_extent" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
                        <label>Watershed Micro-Watershed</label>
                    </div>
                   
                </div>
            </details>
        </>
    )
}

export default Water