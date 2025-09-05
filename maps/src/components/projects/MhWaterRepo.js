import React, { useEffect, useState, useContext } from "react";
import { GlobalContext } from "../../App";
import { SideBarContext } from "../Main/sidebar";
import { useLayerFunc } from "../Main/layerFunc";
import { HOST } from "../host";
import L from "leaflet"
const district = ['Dhule', 'Gondiya', 'Nashik', 'Kolhapur', 'Jalgaon', 'Latur', 'Solapur', 'Amravati', 'Garhchiroli', 'Yavatmal', 'Pune', 'Sindhudurg', 'Wardha', 'Ratnagiri', 'Nanded', 'Osmanabad', 'Bid', 'Hingoli', 'Raigarh', 'Aurangabad', 'Satara', 'Ahmednagar', 'Parbhani', 'Greater Bombay', 'Akola', 'Nagpur', 'Chandrapur', 'Jalna', 'Nandurbar', 'Washim', 'Sangli', 'Bhandara', 'Thane', 'Buldana'];

function Repo() {
    const [dis, setDis] = useState('')
    const [tal, setTal] = useState([])
    const [selTal, setTals] = useState("")
    const {
        drawControl,
        map,
        lastRect,
        drawnItems,
        layerControls
    } = useContext(GlobalContext)
    const {
        LayerChange,
        TileLayerChange,
        handleOpen,
    } = useLayerFunc();
    const {
        setPloader
    } = useContext(SideBarContext);

    function createLayer(data) {
        let layer = L.geoJSON(JSON.parse(data))
        layer.addTo(map)
        layerControls.addOverlay(layer, `${selTal ? selTal : dis}-waterbodies`, true, layer.getBounds())
        map.flyToBounds(layer.getBounds());
    }

    useEffect(() => {
        async function getTaluka() {
            setPloader(true)
            try {
                await fetch(`${HOST}/get-taluka/${dis}`)
                    .then((response) => response.json())
                    .then((data) => {
                        setTal(data.taluka);
                        setPloader(false)
                    })

            }
            catch (error) {
                if (error.name !== 'AbortError') {
                    alert("Unexpected Error occured Please try again")
                    setPloader(false)
                }

            }
        }
        if (dis !== "") {
            getTaluka()
        }
    }, [dis])
    async function Visualize() {
        try {
            let type = selTal && selTal!=='' ? "tal" : "dis"
            let pay = selTal && selTal!=='' ? selTal : dis
            setPloader(true)
            await fetch(`${HOST}/get-water-body/${type}/${pay}`)
                .then((response) => response.json())
                .then((data) => {
                    createLayer(data.geo);
                    setPloader(false)
                })

        }
        catch (error) {
            if (error.name !== 'AbortError') {
                alert("Unexpected Error occured Please try again")
                setPloader(false)
            }

        }
    }
    return (
        <>
            <details className="baseline"   >
                <summary >Maharasthra WaterBody Collection</summary>
                <div className="baseline-cont">
                    <div className="opt-div" style={{ marginBottom: "10px" }}>
                        <input value="MH_DIS" id="MH_DIS" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked, true)} className="form-check-input check-map" type="checkbox" />
                        <label>District</label>
                    </div>
                    <div className="opt-div" style={{ marginBottom: "10px" }}>
                        <input value="MH_TQ" id="MH_TQ" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked, true)} className="form-check-input check-map" type="checkbox" />
                        <label>Taluka</label>
                    </div>

                    <div className="opt-div" style={{ display: "flex", flexDirection: "column" }}>
                        <select
                            className="form-select custom-select"
                            onChange={(e) => { setDis(e.target.value); setTals(null); }}

                        >


                            <option style={{ fontSize: "12px" }} value={''}>Select District</option>

                            {district.map((nme) => nme).sort().map((nme) => (
                                <option style={{ textAlign: "left", fontSize: "12px" }} key={nme} value={nme}>
                                    {nme}
                                </option>
                            ))}
                        </select>
                        
  
                        {tal.length && dis !== "" ? (
                            <>
                                <select
                                    className="form-select custom-select"
                                    onChange={(e) => setTals(e.target.value)}

                                >


                                    <option style={{ fontSize: "12px" }} value={''}>Select Taluka</option>

                                    {tal.map((nme) => nme).sort().map((nme) => (
                                        <option style={{ textAlign: "left", fontSize: "12px" }} key={nme} value={nme}>
                                            {nme}
                                        </option>
                                    ))}
                                </select>
                                <div>
                                    <button style={{ height: "30px", width: "60px", fontSize: "10px" }} className="visualize-button" onClick={Visualize}  >
                                        Visualize
                                    </button>
                                </div>



                            </>
                        ) : (null)}
                    </div>
                </div>
            </details>


        </>

    )


}

export default Repo