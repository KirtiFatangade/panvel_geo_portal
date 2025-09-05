import React, { useState, useContext, useEffect, useRef } from "react";
import { GlobalContext } from "../../../App";
import { HOST } from "../../host";

function SLD() {
    const [show, setShow] = useState(false);
    const [layer, setLayer] = useState("");
    const [type, setType] = useState("");
    const [projects, setProjects] = useState([]);
    const [pro, setPro] = useState("");
    const { vis, userInfo, layerControls, selectedLayers } = useContext(GlobalContext);
    const toolvisRef = useRef(null);
    const [FLayers, setFLayers] = useState([])
    const [selLayer, SetlLayer] = useState(null)
    const [selStyle, setSstyle] = useState(null)
    const [styles, setStyles] = useState([])
    
    useEffect(() => {
        if (layerControls && show) {


            let layers = []
            Object.keys(selectedLayers).forEach((ele) => {
                if (selectedLayers[ele] && selectedLayers[ele]._url && selectedLayers[ele]._url.includes("portal.vasundharaa.in")) {
                    const url = new URL(selectedLayers[ele]._url);
                    const layerParam = url.searchParams.get("layer");
                    if (layerParam) {
                        layers.push({ "name": ele.split("#")[0], "id": layerParam.split(":")[1] });
                    }
                }
            });
            setFLayers(layers)
            fetchsld()
        }
        SetlLayer(null)
    }, [show])

    const fetchsld = () => {
        fetch(`${HOST}/get-sld/${userInfo.id}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch projects");
                }
                return response.json();
            })
            .then((data) => {
                console.log(Object.keys(data.sld))
                setStyles(data.sld);
            })
            .catch((error) => {
                console.error("Error fetching projects:", error);
            });
    };
    const applySLD = () => {
        console.log(selLayer, selStyle)
        fetch(`${HOST}/apply-sld/${userInfo.id}/${selLayer}/${selStyle}`)
            .then((response) => {
                if (response.ok) {
                    alert("SLD applied to layer")
                } else {
                    alert("SLD was not applied")
                }
            })
            .catch((error) => {
                console.error("Error fetching projects:", error);
            });
    };

    function close() {
        setShow(false);
    }

  
    return (
        <div
            style={{ position: vis ? "absolute" : "relative" }}
            className="toolscont"
        >
            <button
                title="Raster Styling using SLD"
                className="btn text-white"
                id="roadroute"
                onClick={() => setShow((prevShow) => !prevShow)}
                style={{
                    zIndex: "1000",
                    fontSize: "15px",
                    backgroundColor: 'black',
                    padding: "2px 2px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "none",
                }}
            >
                <i className="fa-solid fa-paint-roller"></i>
            </button>
            {show && (
                <div
                    ref={toolvisRef}
                    className="toolsvis"
                    id="toolvis"
                    style={{ display: "flex", flexDirection: "column", width: "200px" }}
                >
                   <span
                        onClick={close}
                        className="toolclose"
                    >
                        &times;
                    </span>
                    <div>
                        <select onChange={(e) => SetlLayer(e.target.value)} value={selLayer} className="form-select text-white mt-1" style={{ marginBottom: "5px", backgroundColor: 'transparent', border: '2px solid white', fontSize: '13px' }}>
                            <option value="" >Select A Layer</option>
                            {FLayers && FLayers.length && FLayers.map((layer) => (
                                <option key={layer.id} value={layer.id}>
                                    {layer.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <select onChange={(e) => setSstyle(e.target.value)} value={selStyle} className="form-select text-white mt-2" style={{ marginBottom: "5px", backgroundColor: 'transparent', border: '2px solid white', fontSize: '13px' }}>
                            <option value="">Select A SLD</option>
                            <option value="default">None</option>
                            {styles && styles.length && styles.map((comp) => (
                                <option key={comp[Object.keys(comp)[0]]} value={comp[Object.keys(comp)[0]]}>
                                    {Object.keys(comp)[0]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button onClick={() => applySLD()} className='btn btn-primary border-0 mt-2' style={{ width: '98%', height: '30px', fontSize: '13px' }} >Apply SLD</button>
                </div>
            )}
        </div>
    );
}

export default SLD;
