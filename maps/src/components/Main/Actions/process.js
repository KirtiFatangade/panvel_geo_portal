import React, { useState } from "react";
import ForestFire from "./ForestFire"; 
import Change from "./Change";
import Building from "../../projects/building";
import Template from "../projectTemplate";
import NDVIChange from "./ndviChange";
import WaterChange from "./waterChange";
import LULC from "./lulc";
function Process(){
    const [selTab,setSeltab]=useState("1")

    return(
        <div className="select-container d-flex" style={{display:"flex",flexDirection:"column"}}>
            <>
            <select
          className="form-select border-0 custom-select"
          aria-label="form-select"
          onChange={(e)=>setSeltab(e.target.value)}
        >
            <option value="1">Building Footprint Extraction</option>
            <option value="2">Forest Fire Burnt Area Detection</option>
            <option value="3">Land Surface Change Detection</option>
            <option value="4">Surface Water Level Extraction</option>
            <option value="5">Green Cover Change</option>
            <option value="6">Land Use Land Cover</option>
        </select>
        </>
        <>
        <Template>
        {selTab === "1" && (
            <>
              <Building />
            </>
          )}
          {selTab === "2" && (
            <>
              <ForestFire />
            </>
          )}
          {selTab === "3" && (
            <>
              <Change />
            </>
          )}
          {selTab === "4" && (
            <>
              <WaterChange />
            </>
          )}
          {selTab === "5" && (
            <>
              <NDVIChange />
            </>
          )}
          {selTab === "6" && (
            <>
              <LULC />
            </>
          )}
        </Template>
        </>
        </div>
    )


}

export default Process