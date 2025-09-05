import React, { useState, useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import L from "leaflet"
import { bbox, area } from "@turf/turf";
import { logToServer } from "../../logger";
function PixelCalc() {
    const {
        drawnItems,
        lastRect,
        selectedLayers,
        vis,
        setLBands,
        LayerBands,
        layerControls,
        map,
        userInfo,
        selTab,
        Canvas,
        getCsrfToken
    } = useContext(GlobalContext)
    const [show, setshow] = useState(false);
    const [FLayers, setFLayers] = useState([])
    const [selLayer, SetlLayer] = useState("")
    const [showerror, seterror] = useState(false)
    const [showwait, setwait] = useState(false);
    const [bands, setBands] = useState([])
    const [Query, setQuery] = useState("");
    const [country, setCounts] = useState([]);
    const [state, setStates] = useState([]);
    const [district, setDistricts] = useState([]);
    const [selCont, setCont] = useState("");
    const [selState, setState] = useState("");
    const [selDis, setDis] = useState("");
    const [vectors, setVectors] = useState([]);
    const [clip, setClip] = useState(false);
    const [clipBox, setClipBox] = useState(false);
    const [clipLayer, setClipLayer] = useState(false);
    const [adm] = useState("")
    const [selCLayer, setCLayer] = useState("");
    const [keyDict,setDict]=useState({})
    const location = useLocation();
    function handleClick() {
        setshow(!show);
        SetlLayer("")
        
    }
    async function GetBands(key) {
        try {
            logToServer('info', `Fetching bands for key: ${key}`);
            await fetch(`${HOST}/get-bands/${key}`)
                .then((response) => response.json())
                .then((data) => {
                    setLBands(prevDictionary => ({
                        ...prevDictionary,
                        [key]: data.bands,
                    }));
                    setBands(data.bands)
                    setwait(false)
                    logToServer('info', `Fetched and set bands for key: ${key}`);

                });

        } catch (error) {
            logToServer('error', `Error fetching bands for key: ${key} - ${error.message}`);
            alert("Unexpected Error occured Please try again");

        }
    }

    function handleChange(layer) {
        logToServer('info', `Layer changed: ${layer}`);
        const [name, key] = layer.split(",");
        console.log(name, key)
        SetlLayer(name)
        
        setBands(null)
        if (!Object.keys(keyDict).includes(name)){
            setDict(prevDictionary => ({
                ...prevDictionary,
                [name]: key,
            }));
        }
        console.log(Object.keys(LayerBands).includes(key))
        if (Object.keys(LayerBands).includes(key)) {
            setBands(LayerBands[key])
            logToServer('info', `Bands for key ${key} already available locally`);

        } else {
            setwait(true)
            GetBands(key)
            logToServer('info', `Fetching bands for new key: ${key}`);

        }
        
    }
    function close() {
        setshow(false);
    }
    function parseQuery(query) {
        const stack = [];
        let currentSubarray = [];
        let currentToken = '';
        let isInsideCurlyBraces = false;
    
        for (let i = 0; i < query.length; i++) {
            const char = query[i];
    
            if (char === '{') {
                isInsideCurlyBraces = true;
                currentToken += char;
            } else if (char === '}') {
                isInsideCurlyBraces = false;
                currentToken += char;
                currentSubarray.push(currentToken.trim());
                currentToken = '';
            } else if (isInsideCurlyBraces) {
                currentToken += char;
            } else if (char === '(') {
                if (currentToken.trim()) {
                    currentSubarray.push(currentToken.trim());
                    currentToken = '';
                }
                stack.push(currentSubarray);
                currentSubarray = [];
            } else if (char === ')') {
                if (currentToken.trim()) {
                    currentSubarray.push(currentToken.trim());
                    currentToken = '';
                }
                const previousSubarray = stack.pop();
                previousSubarray.push(currentSubarray);
                currentSubarray = previousSubarray;
            } else if (char.trim() === '') {
                if (currentToken.trim()) {
                    currentSubarray.push(currentToken.trim());
                    currentToken = '';
                }
            } else {
                currentToken += char;
            }
        }
    
        // Add any remaining token
        if (currentToken.trim()) {
            currentSubarray.push(currentToken.trim());
        }
        
        return currentSubarray;
    }
    function processQuery(data) {
        return data.map((ele) => {
            if (ele instanceof Array) {
                // Recursively process nested arrays
                return processQuery(ele);
            } else if (typeof ele === 'string') {
                if (ele.includes("{") && ele.includes("}")) {
                    // Extract key, find in keyDict, and replace the string
                    const key = ele.substring(1, ele.length - 1);
                    return `{${keyDict[key]}}`;
                }
                return ele; // Return the string as-is if no replacement is needed
            } else {
                return ele; // Return other types as-is
            }
        });
    }
    
    
    async function filter() {
        try {

            if (Query && Query!="") {

                let data = {}

                
                if (window.location.pathname.startsWith("/project/")) {
                    const projectId = window.location.pathname.split("/")[3];
                    data["project"] = projectId;

                } else {
                    data["project"] = "global";
                }
                data["memb"] = userInfo.id
                data["tab"] = selTab;
                data["query"] = parseQuery(Query)
                data["key-dict"]=keyDict
                console.log(data["query"])
               
                setwait(true)
                try {
                    await fetch(`${HOST}/calc-pixel`, {
                        method: "POST",
                        credentials:'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': await getCsrfToken(),
                          },
                        body: JSON.stringify({ data }),
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            console.log(data)
                            let layer = L.tileLayer(data.url, { maxZoom: 20, zIndex: 1005 })
                            let layer_name = "Raster"
                            
                            layerControls.addOverlay(layer, layer_name, false, false, false, false, false, data.ras_id)
                            layer.addTo(map)

                            setwait(false)
                            logToServer('info', 'Pixel-Calc are Successfully')
                        });

                } catch (error) {
                    
                    alert("Unexpected error occured please try again.")
                    setwait(false)

                }

            } else {
                alert("Please select a layer or a Band")
                setwait(false)
            }
        } catch (error) {
            logToServer('error', `Unexpected error in filter function: ${error.message}`);
            alert("Unexpected error occurred, please try again.", error);
            setwait(false);
        }
    }

    useEffect(() => {
        if (layerControls && show) {


            let layers = []
            Object.keys(selectedLayers).forEach((ele) => {
                if (selectedLayers[ele] && selectedLayers[ele]._url && selectedLayers[ele]._url.includes("earthengine.googleapis.com")) {
                    layers.push([ele.split("#")[0], selectedLayers[ele]._url.split("/")[7]])
                }
            })
            setFLayers(layers)
        }
        SetlLayer(null)
        setBands(null)
    }, [show])
    useEffect(() => {
        setQuery("")
    }, [])

    function addQuery(key,band=false) {
        try {
            if(band){
                key=`{${selLayer}}.${key}`
            }
            setQuery((prevQuery) => prevQuery + (prevQuery ? ' ' : '') + key);
            const inputElement = document.getElementById('query');
            if (inputElement) {
                inputElement.focus();
                requestAnimationFrame(() => {
                    inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
                    inputElement.scrollLeft = inputElement.scrollWidth;
                });
            }
            logToServer('info', `Added query key: ${key}`);
        } catch (error) {
            logToServer('error', `Error adding query key: ${key} - ${error.message}`);
        }
    }


    const handleClipBoxChange = (e) => {
        try {
            const isChecked = e.target.checked;
            setClipBox(isChecked);
            if (isChecked) {
                setClip(false);
                setClipLayer(false);
            }
            logToServer('info', `Clip Box changed: ${isChecked}`);
        } catch (error) {
            logToServer('error', `Error handling Clip Box change: ${error.message}`);
            console.error('Error handling Clip Box change:', error);
        }
    };

    const handleClipChange = (e) => {
        try {
            const isChecked = e.target.checked;
            setClip(isChecked);
            if (isChecked) {
                setClipBox(false);
                setClipLayer(false);
            }
            logToServer('info', `Clip changed: ${isChecked}`);
        } catch (error) {
            logToServer('error', `Error handling Clip change: ${error.message}`);
            console.error('Error handling Clip change:', error);
        }
    };

    const handleClipLayerChange = (e) => {
        try {
            const isChecked = e.target.checked;
            setClipLayer(isChecked);
            if (isChecked) {
                setVectors(Canvas.getLayers());
                setClipBox(false);
                setClip(false);
            }
            logToServer('info', `Clip Layer changed: ${isChecked}`);
        } catch (error) {
            logToServer('error', `Error handling Clip Layer change: ${error.message}`);
            console.error('Error handling Clip Layer change:', error);
        }
    };
    useEffect(() => {
        if (clip) {
            setStates([]);
            setDistricts([]);
            setCont("");
            fetchList();
        }
    }, [clip]);
    useEffect(() => {
        let timeoutId;

        const handleMoveEnd = () => {
            clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                if (clip) {
                    console.log("caleee")
                    var latlng = map.getCenter();
                    fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`
                    )
                        .then((response) => response.json())
                        .then((data) => {
                            console.log(data)
                            setCont(data.address.country);
                            if (adm !== "Country Boundaries") {
                                fetchList("state", data.address.country)
                                logToServer('info', `Fetched states for country: ${data.address.country}`);
                            }
                        })
                        .catch((error) => {
                            logToServer('error', `Error calling Nominatim API: ${error.message}`);

                        });
                }
            }, 200);
        };
        if (map) {
            map.on("move", handleMoveEnd);
        }

        if (clip) {
            handleMoveEnd()
        }
        return () => {
            clearTimeout(timeoutId);
            if (map) {
                map.off("move", handleMoveEnd);
            }

        };
    }, [map, clip]);
    function HandleCont(name) {
        if (name !== selCont) {
            setCont(name);
            setState("");
            setDis("");
            setStates([]);
            setDistricts([]);
            if (name !== "") {
                if (adm !== "Country Boundaries") {
                    fetchList("state", name);
                    logToServer('info', `Fetching states for country: ${name}`);
                }

            }
        }
    }
    function HandleState(name) {
        if (name !== selState) {
            setState(name);
            setDis("");
            setDistricts([]);
            if (name !== "") {
                if (adm !== "State Boundaries") {
                    fetchList("dis", name);
                    logToServer('info', `Fetching districts for state: ${name}`);

                }

            }
        }
    }

    async function fetchList(name, pay) {
        let url;
        if (name) {
            let payload = pay;
            url = new URL(`${HOST}/clip-list/${name}/${payload}`);
            logToServer('info', `Fetching list for name: ${name} with payload: ${payload}`);

        } else {
            url = new URL(`${HOST}/clip-list`);
            logToServer('info', 'Fetching list without name and payload');

        }

        try {
            await fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    if (name === "state") {
                        setStates(data.state);
                        logToServer('info', 'Fetched and set states');

                    } else if (name === "dis") {
                        setDistricts(data.district);
                        logToServer('info', 'Fetched and set districts');

                    } else {
                        setCounts(data.country);
                        logToServer('info', 'Fetched and set countries');
                    }
                });
        } catch (error) {
            logToServer('error', `Error fetching list for name: ${name} with payload: ${pay} - ${error.message}`);
            alert("Unexpected Error occured Please try again");
        }
    }
    return (
        <div style={{ position: vis ? "absolute" : "relative", }} className="toolscont" >
            <div>
                <button title="Raster Calculator"
                    className="btn text-white"
                    onClick={handleClick}
                    style={{ zIndex: "1000", fontSize: "13px", backgroundColor:'black', padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%", border: "none" , }}
                >
                    <i className="fa-solid fa-calculator"></i>
                </button>
            </div>

            {show && (
                <div className="toolsvis" id="toolsvis" style={{ marginTop: "5px" }}>
                    <span
                        onClick={close}
                        className="toolclose"
                    >
                        &times;
                    </span>
                    <div>
                        <select value={selLayer} onChange={(e) => handleChange(e.target.value)} className="form-select text-white mt-3" style={{ marginBottom: "5px",backgroundColor:'black', border:'2px solid white',fontSize: '13px' }}>
                            <option value="" disabled>Select A Layer</option>
                            {FLayers && FLayers.length && FLayers.map((layer) => (
                                <option key={layer} value={layer}>
                                    {layer[0]}
                                </option>
                            ))}
                        </select>
                    </div>

                    
                        <>
                            {bands && bands.length ? (
                                <div style={{ margin: "5px" }}>
                                    <select onChange={(e) => addQuery(e.target.value,true)}>
                                        <option value="" >Select A Band</option>
                                        {bands.map((key) => (
                                            <option key={key} value={key}>
                                                {key}
                                            </option>
                                        ))}
                                    </select>

                                </div>
                            ) : (null)}
                            <div style={{ margin: "5px" }}>
                                <textarea spellcheck="false" style={{ marginRight: "2px",fontSize:'13px',backgroundColor:'transparent', height:"100px",width:"100%"}} type="text" id="query" name="query" onChange={(e) => {
                                    setQuery(e.target.value);
                                    e.target.scrollLeft = e.target.scrollWidth;
                                }} value={Query} placeholder="Enter Query (< 1000 and > 800)" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "auto auto", gridGap: "10px", padding: "10px" }}>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery("+") }}>{"+"}</button>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery("-") }}>{"-"}</button>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery("*") }}>{"*"}</button>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery("/") }}>{"/"}</button>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery("log10") }}>{"log10"}</button>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery("logn") }}>{"logn"}</button>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery("(") }}>{"("}</button>
                                <button style={{backgroundColor:'#3c3b3b'}} onClick={() => { addQuery(")") }}>{")"}</button>
                            </div>
                            
                            
                        </>
                    
                  
                        <div>
                            <button onClick={filter} className='btn btn-primary border-0 mt-1' style={{ width: '93%', height: '30px', fontSize: '13px', marginLeft: '3%' }} >Filter</button>
                        </div>
                   
                    <div>
                        {showwait && (
                            <><p style={{ fontSize: "13px" }}><b>Please wait</b></p></>
                        )}


                    </div>
                </div>

            )}

        </div>


    )

}
export default PixelCalc