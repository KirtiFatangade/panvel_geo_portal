import React, { useState, useContext, useEffect,useRef } from "react";
import { Polygon, bbox } from "@turf/turf";
import { GlobalContext } from "../../../App";
import { logToServer } from "../../logger";
function useForceUpdate() {
    const [, setValue] = useState(0);

    return () => setValue(value => value + 1);
}

function Filter() {
    const [loader,setLoader]=useState(false)
    const {
        Canvas,
        drawnItems,
        lastRect,
        filLayer,
        setFilLayer,
        vis
    } = useContext(GlobalContext)
    const [show, setShow] = useState(null);
    const [Query, setQuery] = useState("");
    const [color, setColor] = useState(null)
    const [mess, SetMess] = useState("")
    const [FilLayer, setFilter] = useState(null) 
    const [layers, setLayers] = useState([])
    const forceUpdate = useForceUpdate();
    const toolvisRef = useRef(null);
    const [error, setError] = useState(null); // State to manage errors


    function open() {
        setShow(prevShow => !prevShow); 
        if (Canvas) {
            let list = Canvas.getLayers()
            setLayers(list);
            Canvas.on("layerchange", () => {
                let list = Canvas.getLayers()
                if (list.includes(filLayer)) {

                    setLayers(list);
                } else {
                    if (list) {
                        setLayers(list);
                    } else {
                        setFilLayer("")
                        setLayers([])
                    }
                }
            })
            Canvas.on("loading",()=>{
                setLoader(true)
            })
            
        }
        logToServer('info','Filter panel opened')
    }

    // hide content on click anyshwre on screen 
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest("#filter") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
                setShow(false);
            }
        };
    
        document.addEventListener("click", handleClickOutside);
    
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    function close() {
        setShow(false)
        Canvas.off("layerchange");
        logToServer('info','Filter panel closed')
    }
    const handleChange = (event) => {
        setFilLayer(event.target.value);
        setQuery("");
        SetMess("");
        setFilter(Canvas.getFilterList(event.target.value))
        logToServer('info',`Layer changed to ${event.target.value}` )
    };

    function addQuery(key) {
        setQuery((prevQuery) => prevQuery + (prevQuery ? ' ' : '') + key);
        const inputElement = document.getElementById('query');
        if (inputElement) {
            inputElement.focus();
            requestAnimationFrame(() => {
                inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
                inputElement.scrollLeft = inputElement.scrollWidth;
            });
        }
        
    }
    function removeLayer(id) {
        Canvas.removeFilterLayer(id, filLayer);
        let list = Canvas.getFilterList(filLayer)
        setFilter(list);
        forceUpdate();
        logToServer('info',`Layer removed: ${id}`)

    }
    async function applyFilter() {
        try{
        let res;
        if (document.getElementById("bbox").checked) {
            if (lastRect && drawnItems.hasLayer(lastRect)) {
                let box = bbox(drawnItems.getLayer(lastRect).toGeoJSON())
                res = await Canvas.ValidateQuery(filLayer, Query, color, box)
            } else {
                SetMess("Please draw a rectangle")
            }

        } else {
            res = await Canvas.ValidateQuery(filLayer, Query, color)
        }
        if (res !== undefined) {
            if (res[0]) {
                SetMess(`Features Matched : ${res[1]}`)
                if (document.getElementById("bbox").checked) {
                    drawnItems.removeLayer(lastRect);
                }
            } else {
                SetMess("Invalid Query")
            }
            setLoader(false)
            setFilter(Canvas.getFilterList(filLayer))
            forceUpdate();
            logToServer('info','Filter applied successfully')
        }
    }catch(error){
        setError(error.message);
        logToServer('error',`Error applying filter: ${error.message}` )
    }

    }
    
    return (
        <div style={{ position: vis?"absolute":"relative", }} className="toolscont">
            <button className="btn text-white" title="Filter Vector Layers" id='filter' onClick={open} style={{ zIndex: "1000", fontSize: "15px", backgroundColor:'black',padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%",border:"none" , }}><i className="fa-solid fa-filter"></i></button>
            {show ? (
                <div ref={toolvisRef} className="toolsvis" id="toolvis">
                     <span
                        onClick={close}
                       className="toolclose"
                    >
                        &times;
                    </span>
                    {Canvas && (
                        <select id="layerselect" className="form-select custom-select text-white mt-1 mb-3 swipe-options" style={{ backgroundColor:'transparent', border:'2px solid white', fontSize: '12px' }} value={filLayer} onChange={handleChange}>
                            <option key="" value={""}>
                                Select Layer
                            </option>
                            {layers.map((key) => (
                                <option key={key} value={key}>
                                    {key}
                                </option>
                            ))}
                        </select>
                    )}

                    {filLayer !== "" && (
                        <div style={{ display: "flex", flexDirection: "row" }}>
                            <div style={{ margin: "10px" }}>
                                <div>
                                    <p style={{ textAlign: "center" }}>Layer Attributes</p>
                                    <select style={{ marginLeft: "5px" }} onChange={(e) => { addQuery(e.target.value) }}>
                                        <option key="" value={""}>
                                            Select Attribute
                                        </option>
                                        {Canvas.getProps(filLayer).map((key) => (
                                            <option key={key} value={key}>
                                                {key}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>


                                    <ol style={{ listStyleType: "none" }}>
                                        {FilLayer.map(([id, color]) => (
                                            <li style={{ margin: "5px" }} key={id}>
                                                <div style={{ display: "flex", flexDirection: "row" }}>
                                                    <div style={{ height: "25px", width: "25px", backgroundColor: color, marginRight: "5px" }}></div>
                                                    <span onClick={() => removeLayer(id)} style={{ cursor: "pointer", fontSize: "10px", color: "red", alignSelf: "center" }}>X</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                            <div style={{ margin: "10px", display: "flex", flexDirection: "column" }}>
                                <div><input id="bbox" type="checkbox"></input>   Box Filter</div>
                                <div>
                                    <input
                                        placeholder="Query"
                                        value={Query}
                                        id="query"
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            e.target.scrollLeft = e.target.scrollWidth;
                                        }}
                                        style={{ overflowX: "scroll" }}
                                    ></input>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "auto auto", gridGap: "10px", padding: "10px" }}>
                                    <button onClick={() => { addQuery(">") }}>{">"}</button>
                                    <button onClick={() => { addQuery("<") }}>{"<"}</button>
                                    <button onClick={() => { addQuery("=") }}>{"="}</button>
                                    <button onClick={() => { addQuery("!=") }}>{"!="}</button>
                                    <button onClick={() => { addQuery("AND") }}>{"AND"}</button>
                                    <button onClick={() => { addQuery("OR") }}>{"OR"}</button>
                                </div>
                                <div style={{ alignSelf: "center" }}>
                                    <div style={{ margin: "5px" }}>
                                        <input style={{ marginRight: "2px" }} type="color" id="color" onChange={(e) => setColor(e.target.value)} name="color" />
                                        <label htmlFor="color">Select Color</label>
                                    </div>
                                    <button onClick={applyFilter}>Apply Filter</button>
                                    <div>
                                    <p style={{ margin: "0px", marginTop: "2px" }}>{mess}</p>
                                    {loader?(
                                        <div className="lds-dual-ring" style={{ zIndex: "1000",height:"8px",width:"8px",borderColor:"black transparent black transparent"}}></div>
                                    ):(null)}
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    )}
                   
                </div>
            ) : null}
        </div>
    );
}

export default Filter;
