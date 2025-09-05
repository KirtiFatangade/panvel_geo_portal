import React, { useContext } from "react";
import { HOST } from "../../host";
import L from "leaflet"
import { GlobalContext } from "../../../App";
function Buffer({ val, type }) {
    const { vis, Canvas, layerControls,getCsrfToken } = useContext(GlobalContext);
    async function AddBuffer() {
        const buffer = window.prompt("Enter buffer (in meters):");
        if (buffer) {
            let data = {}
            if (val) {
                data = { table: val[0], column: val[1], unique: val[2], geom: type }
            }
            data.buffer = parseInt(buffer)
            try {
                const response = await fetch(`${HOST}/build-buffer`, {
                    method: 'POST',
                    credentials:'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': await getCsrfToken(),
                      },
                    body: JSON.stringify({ data }),
                });

                if (response.ok) {
                    const result = await response.json();
                    AddLayers(result.buffer, result.build)
                } else {
                    console.error('Error:', response.statusText);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        } else {
            console.error('Buffer value is required');
        }
    }
    function AddLayers(buffer, build) {

        Canvas.addLayerGeo(`Buffer-${val[0]}-${val[1]}-${val[2]}`, buffer)
        layerControls.addOverlay(L.geoJSON(), `Buffer-${val[0]}-${val[1]}-${val[2]}`, false, null, true, `Buffer-${val[0]}-${val[1]}-${val[2]}`, false)
        Canvas.addLayerGeo(`Buildings-${val[0]}-${val[1]}-${val[2]}`, build)
        layerControls.addOverlay(L.geoJSON(), `Buildings-${val[0]}-${val[1]}-${val[2]}`, false, null, true, `Buildings-${val[0]}-${val[1]}-${val[2]}`, false)
    }
    return (
        <>
            <div>
                <button onClick={AddBuffer} className='btn btn-primary border-0 mt-3 mb-3' style={{ width: '90%', height: '30px', fontSize: '11px', marginLeft: '3%' }} >Extract Buildings</button>
            </div>
        </>
    );
}

export default Buffer;
