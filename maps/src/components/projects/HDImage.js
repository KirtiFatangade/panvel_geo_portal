import React, { useContext, useEffect, useState } from "react";
import "./panvel.css";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";


export default function HDImage() {
  const { TileLayerChange } = useLayerFunc();
  return (
     <>
      <details
        className="baseline"
      >
        <summary>15 cm HD Image</summary>
        <div className="baseline-cont">

          <details id="townD">
            <summary className="townS">Images</summary>
            <div className="town-cont">

              {/* 
              When dynamic was true, your code used the provided static bounds to zoom and tried loading the tile from useruploads, but the layer wasn't there. When dynamic was false, it searched in VGT, but didn't zoom because zooming (map.flyToBounds(bounds)) only happens in the if (dynamic) block. So, zooming didn’t trigger for static layers */}

              {/* for panvel layers : Its layer was present in VGT, so with dynamic: false, tiles loaded from the correct WMTS URL.
                Even though bounds was null, UsedLayers[id].getBounds() was used in the static (dynamic: false) branch to define the tile bounds and clipping geometry.
                So the map could visualize it using the boundary stored in UsedLayers, not the bounds param. */}
                
              <div className="opt-div mb-2">
                <input
                  value="Argentina"
                  id="Argentina"
                  onChange={(e) =>
                    TileLayerChange(
                      e.target.value, // name
                      e.target.id,    // id (can be dummy if not using a boundary)
                      "Argentina",    // display name
                      e.target.checked,
                      true,           // dynamic = true
                      [
                        [-34.81048370287112, -56.35907840061084], // [minLat, minLon]
                        [-34.773730404781205, -56.32568062331092] // [maxLat, maxLon]
                      ],
                      null            // no clipper
                    )
                  }
                  className="form-check-input check-map"
                  type="checkbox"
                />
                <label>Argentina 15cm HD</label>
              </div>
             
            </div>
          </details>

        </div>
      </details>
    </>
  )
}
