import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import L from "leaflet"
import { bbox, area } from "@turf/turf";
import { logToServer } from "../../logger";
function PixelFilter() {
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
        Canvas
        ,getCsrfToken
    } = useContext(GlobalContext)
    const [show, setshow] = useState(false);
    const [FLayers, setFLayers] = useState([])
    const [selLayer, SetlLayer] = useState("")
    const [selFormat, setFormat] = useState("")
    const [showerror, seterror] = useState(false)
    const [showwait, setwait] = useState(false);
    const [bands, setBands] = useState([])
    const [selBand, setSelBand] = useState(null)
    const [value, setValue] = useState(null)
    const [Query, setQuery] = useState("");
    const [Lkey, setKey] = useState(null)
    const [Area, setArea] = useState(false)
    const [color1, setColor1] = useState("#FFFFFF")
    const [vec0, setVec0] = useState(false)
    const [vec1, setVec1] = useState(false)
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
    const location = useLocation();
    const toolvisRef = useRef(null);

    function handleClick() {
        setshow(!show);
        SetlLayer("")
        setFormat("")
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
        setSelBand(null)
        setValue(null)
        setBands(null)
        console.log(Object.keys(LayerBands).includes(key))
        if (Object.keys(LayerBands).includes(key)) {
            setBands(LayerBands[key])
            logToServer('info', `Bands for key ${key} already available locally`);

        } else {
            setwait(true)
            GetBands(key)
            logToServer('info', `Fetching bands for new key: ${key}`);

        }
        setKey(key)
    }
    function close() {
        setshow(false);
    }
    async function filter() {
        try {

            if (selLayer !== "" && selBand !== "") {

                let data = {}
                let parent = layerControls._getLayerId(selLayer)
                if (window.location.pathname.startsWith("/project/")) {
                    const projectId = window.location.pathname.split("/")[3];
                    data["project"] = projectId;

                } else {
                    data["project"] = "global";
                }
                data["memb"] = userInfo.id
                data["tab"] = selTab;
                data["bands"] = selBand
                data["key"] = Lkey
                data["query"] = Query.split(" ")
                data["color-1"] = color1
                data["parent"] = parent
                data["Area"] = false
                if (Area) {
                    data["Area"] = true
                    // if (lastRect && drawnItems.hasLayer(lastRect)) {
                    //     data["box"] = [JSON.stringify(
                    //         drawnItems.getLayer(lastRect).toGeoJSON()["geometry"]["coordinates"][0]
                    //     )]
                    // } else {
                    //     alert("Please draw a Rectangle to calculate Area")
                    //     return
                    // }
                    // if (vec0) {
                    //     data["vec0"] = true
                    // }
                    // if (vec1) {
                    //     data["vec1"] = true
                    // }
                    // if (!vec0 && !vec1) {
                    //     alert("Please select atleast one value for area calculation")
                    // }
                    if (clip) {
                        if (selDis && selDis !== "") {
                            data["clip"] = ["dis", [selDis, selState, selCont]];
                        } else if (selState && selState !== "") {
                            data["clip"] = ["state", [selState, selCont]];
                        } else if (selCont && selCont !== "") {
                            data["clip"] = ["cont", [selCont]];
                        } else {
                            alert("Please select a Region")
                            return
                        }

                    }
                    else if (clipBox) {
                        if (lastRect && drawnItems.hasLayer(lastRect)) {
                            data["box"] = [JSON.stringify(
                                drawnItems.getLayer(lastRect).toGeoJSON()["geometry"]["coordinates"][0]
                            )]
                        } else {
                            alert("Please Draw A Rectangle")
                            return;
                        }
                    }
                    else if (clipLayer) {
                        if (selCLayer && selCLayer !== "") {
                            data["layer"] = Canvas.getLayerId(selCLayer);
                            data["layer_name"] = selCLayer
                        } else {
                            alert("Please select a layer")
                            return
                        }
                    }
                    else {
                        alert("Please select A clipping option for Area Calculation");
                        return
                    }
                }
                console.log(data)
                setwait(true)
                try {
                    await fetch(`${HOST}/pixel-filter`, {
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
                            let layer_name = "Filter-Mask"
                            if (Area) {
                                layer_name += ` : Area : ${data.area} sq Km`
                            }
                            layerControls.addOverlay(layer, layer_name, false, false, false, false, false, data.ras_id)
                            layer.addTo(map)

                            setwait(false)
                            logToServer('info', 'Pixel-filter are Successfully')
                        });

                } catch (error) {
                    if (Area) {
                        logToServer('error', `Area calculation error: ${error.message}`);
                        console.log(error)
                        alert("Area too Large for calculation");
                        return
                    }
                    alert("Unexpected error occured please try again.")
                    setwait(false)

                }

            } else {
                alert("Please select a layer or a Band")
                setwait(false)
            }
        } catch (error) {
            logToServer('error', `Unexpected error in filter function: ${error.message}`);
            alert("Unexpected error occurred, please try again.");
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
        setSelBand("")
        setQuery("")
        setArea(false)
        setVec0(false)
        setVec1(false)
    }, [])

    function addQuery(key) {
        try {
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
    const handleAreaChange = () => {
        setClipBox(false);
        setClip(false);
        setClipLayer(false);
        setArea(prevArea => !prevArea);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
          if (!event.target.closest("#pixelfilter") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
            setshow(false);
          }
        };
    
        document.addEventListener("click", handleClickOutside);
    
        return () => {
          document.removeEventListener("click", handleClickOutside);
        };
      }, []);

    return (
        <div style={{ position: vis ? "absolute" : "relative", }} className="toolscont" >
            <div>
                <button title="Pixel Filter"
                    className="btn text-white"
                    onClick={handleClick}
                    id='pixelfilter'
                    style={{ zIndex: "1000", fontSize: "13px", backgroundColor:'black', padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%", border: "none",  }}
                >
                    <i className="fa-solid fa-arrow-up-short-wide" />
                </button>
            </div>

            {show && (
                <div ref={toolvisRef} className="toolsvis" id="toolsvis" style={{ marginTop: "5px" }}>
                    <span
                        onClick={close}
                        className="toolclose"
                    >
                        &times;
                    </span>
                    <div>
                        <select value={selLayer} onChange={(e) => handleChange(e.target.value)} className="form-select text-white mt-1 swipe-options" style={{ marginBottom: "5px", backgroundColor:'transparent', border:'2px solid white', fontSize: '13px' }}>
                            <option value="" disabled>Select A Layer</option>
                            {FLayers && FLayers.length && FLayers.map((layer) => (
                                <option key={layer} value={layer}> 
                                    {layer[0]}
                                </option>
                            ))}
                        </select>
                    </div>
                    {bands && bands.length ? (
                        <div style={{ backgroundColor:'transparent' }}>
                            <select value={selBand} onChange={(e) => setSelBand(e.target.value)} className="form-select text-white swipe-options" style={{backgroundColor:'black', fontSize:'13px'}}>
                                <option value="">Select A Band</option>
                                {bands.map((key) => (
                                    <option key={key} value={key}>
                                        {key}
                                    </option>
                                ))}
                            </select>

                        </div>
                    ) : (null)}
                    {selBand && selBand != "" ? (
                        <>
                            <div>
                                <input className='mt-1 form-select' style={{ fontSize:'13px', marginRight: "2px",  backgroundColor:'black' }} type="text" id="query" name="query" onChange={(e) => {
                                    setQuery(e.target.value);
                                    e.target.scrollLeft = e.target.scrollWidth;
                                }} value={Query} placeholder="Enter Query (< 1000 and > 800)" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "auto auto", gridGap: "10px", padding: "10px 0px" }}>
                                <button onClick={() => { addQuery(">") }}>{">"}</button>
                                <button onClick={() => { addQuery("<") }}>{"<"}</button>
                                <button onClick={() => { addQuery("=") }}>{"="}</button>
                                <button onClick={() => { addQuery("AND") }}>{"AND"}</button>
                                <button onClick={() => { addQuery("OR") }}>{"OR"}</button>
                            </div>
                            <div>
                                <div style={{ margin: "5px", color:'white', alignContent:'center' }}>
                                    <input style={{ marginRight: "2px" }} onChange={(e) => setColor1(e.target.value)} value={color1} type="color" id="color-1" name="color-1" />
                                    <label htmlFor="color-1" className="text-white">Select Color for 1 pixel value</label>
                                </div>
                            </div>
                            <div>
                                <div style={{ margin: "5px", display: "flex", flexDirection: "column" }}>
                                    <div>
                                        <input style={{ marginRight: "2px" }} onChange={handleAreaChange} checked={Area} type="checkbox" id="area" name="area" />
                                        <label htmlFor="color" className="text-white">Calculate Area</label>
                                    </div>
                                    {Area ? (
                                        // <div style={{ display: "flex", flexDirection: "column" }}>
                                        //     <div>
                                        //         <input style={{ marginRight: "2px" }} onChange={() => setVec0(!vec0)} checked={vec0} type="checkbox" id="0" name="0" />
                                        //         <label htmlFor="0">For 0 Pixel Values</label>
                                        //     </div>
                                        //     <div>
                                        //         <input style={{ marginRight: "2px" }} onChange={() => setVec1(!vec1)} checked={vec1} type="checkbox" id="1" name="1" />
                                        //         <label htmlFor="1">For 1 Pixel Values</label>
                                        //     </div>

                                        // </div>
                                        <div className="baseline-cont">
                                            <div className="opt-div">
                                                <input
                                                    onChange={handleClipBoxChange}
                                                    checked={clipBox}
                                                    className="form-check-input check-map"
                                                    type="checkbox"
                                                />
                                                <label>Clip by Box</label>
                                            </div>
                                            <div className="opt-div">
                                                <input
                                                    onChange={handleClipChange}
                                                    checked={clip}
                                                    className="form-check-input check-map"
                                                    type="checkbox"
                                                />
                                                <label>Clip by Region</label>
                                            </div>
                                            <div style={{ marginTop: clip ? "10px" : "0px" }}>
                                                {clip && (
                                                    <>
                                                        {country && country.length ? (
                                                            <select
                                                                className=" form-select custom-select text-white swipe-options"
                                                                onChange={(e) => HandleCont(e.target.value)}
                                                                value={selCont}
                                                                style={{ backgroundColor:'transparent', width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '13px' }}
                                                            >
                                                                <option style={{ fontSize: "13px", color:'black' }} value={""}>
                                                                    Select Country
                                                                </option>

                                                                {country
                                                                    .map((nme) => nme)
                                                                    .sort()
                                                                    .map((nme) => (
                                                                        <option
                                                                            style={{ textAlign: "left", fontSize: "13px" }}
                                                                            key={nme}
                                                                            value={nme}
                                                                        >
                                                                            {nme}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        ) : null}
                                                        {state && state.length ? (
                                                            <select
                                                                className=" form-select custom-select text-white swipe-options"
                                                                onChange={(e) => HandleState(e.target.value)}
                                                                style={{backgroundColor:'transparent', width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '13px' }}
                                                            >
                                                                <option style={{ fontSize: "13px" }} value={""}>
                                                                    Select State
                                                                </option>

                                                                {state
                                                                    .map((nme) => nme)
                                                                    .sort()
                                                                    .map((nme) => (
                                                                        <option
                                                                            style={{ textAlign: "left", fontSize: "13px" }}
                                                                            key={nme}
                                                                            value={nme}
                                                                        >
                                                                            {nme}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        ) : null}
                                                        {district && district.length ? (
                                                            <select
                                                                className=" form-select custom-select text-white swipe-options"
                                                                onChange={(e) => setDis(e.target.value)}
                                                                style={{ backgroundColor:'transparent',width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '13px' }}
                                                            >
                                                                <option style={{ fontSize: "13px" }} value={""}>
                                                                    Select District
                                                                </option>

                                                                {district
                                                                    .map((nme) => nme)
                                                                    .sort()
                                                                    .map((nme) => (
                                                                        <option
                                                                            style={{ textAlign: "left", fontSize: "13px" }}
                                                                            key={nme}
                                                                            value={nme}
                                                                        >
                                                                            {nme}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        ) : null}


                                                    </>
                                                )}
                                            </div>
                                            <div className="opt-div">
                                                <input
                                                    onChange={handleClipLayerChange}
                                                    checked={clipLayer}
                                                    className="form-check-input check-map"
                                                    type="checkbox"
                                                />
                                                <label>Clip by Layer</label>
                                            </div>
                                            <div style={{ marginTop: clipLayer ? "10px" : "0px" }}>
                                                {clipLayer && (
                                                    <>
                                                        {vectors ? (
                                                            <select
                                                                className=" form-select custom-select"
                                                                onChange={(e) => setCLayer(e.target.value)}
                                                                style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '13px' }}
                                                            >
                                                                <option style={{ fontSize: "13px" }} value={""}>
                                                                    Select Layer
                                                                </option>

                                                                {vectors.map((nme) => (
                                                                    <option
                                                                        style={{ textAlign: "left", fontSize: "13px" }}
                                                                        key={nme}
                                                                        value={nme}
                                                                    >
                                                                        {nme}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : null}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (null)}
                                </div>
                            </div>
                        </>
                    ) : (null)}
                    <div style={{ marginTop: "5px" }}>
                        <div>
                            <button onClick={filter} className='btn btn-primary border-0 mt-3 mb-3' style={{ width: '98%', height: '30px', fontSize: '13px' }} >Filter</button>
                        </div>
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
export default PixelFilter