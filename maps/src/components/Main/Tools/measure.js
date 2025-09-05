import React, { useRef, useState, useContext, useEffect } from "react";
import { GlobalContext } from "../../../App";
import { area, length, lineString, polygon, convertArea, convertLength } from "@turf/turf"
import L from "leaflet";
import { logToServer } from "../../logger";
function Measure() {
    const {
        map,
        drawControl,
        vis
    } = useContext(GlobalContext)
    const [drawer, SetDrawer] = useState(null)
    const [measure, setMeasure] = useState(null);
    const types = useRef(null);
    const [show, setshow] = useState(false)
    const unit = useRef(0)
    const toolvisRef = useRef(null);

    function close() {
        map.off("draw:drawvertex")
        if (drawer) {
            drawer.disable()
        }
        setshow(false);
    }

    function CalcMeasure(points) {
        let pointArray = [];
        Object.keys(points).forEach((key) => {
            pointArray.push([points[key]._latlng["lng"], points[key]._latlng["lat"]])
        });
   
    try {
        if (types.current === "Distance") {
            if (pointArray.length > 1) {
                let linestring = lineString(pointArray);
                setMeasure(convertLength(length(linestring), "kilometers", unit.current).toFixed(2));
            }
        } else {
            if (pointArray.length > 2) {
                pointArray.push(pointArray[0]);
                let poly = polygon([pointArray]);
                setMeasure(convertArea(area(poly), "meters", unit.current).toFixed(2));
            }
        }
    } catch (error) {
        logToServer('error', `Error in calcMeasure function: ${error.message}`);
        console.error('Error in calcMeasure function:', error);
        setMeasure(null);
    }
}

    function HandleClick() {
        // setshow(true)
        setshow(prevshow => !prevshow);
        map.on("draw:drawvertex", function (e) {
            CalcMeasure(e.layers._layers);
        })
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest("#measure") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
                if (toolvisRef.current) {
                    toolvisRef.current.style.width = "127%";
                    toolvisRef.current.style.padding = "9px";

                    const selectTag = toolvisRef.current.querySelector("#smeasure");
                    if (selectTag) {
                        selectTag.style.width = "120px";
                        selectTag.style.fontSize = "12px";
                        selectTag.style.margin = "0px 0px 7px 2px";

                    }

                }
            }
        };


        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);


    // function handleOptionChange(e) {
    //     if (measure) {
    //         if (types.current === "Distance") {
    //             setMeasure(convertLength(measure, unit.current, e.target.value).toFixed(2))
    //         }
    //         else {
    //             setMeasure(convertArea(measure, unit.current, e.target.value).toFixed(2))
    //         }
    //     }
    //     unit.current = e.target.value;
    // }
    function handleOptionChange(e) {
        if (measure) {
            try {
                if (types.current === "Distance") {
                    setMeasure(convertLength(measure, unit.current, e.target.value).toFixed(2));
                } else {
                    setMeasure(convertArea(measure, unit.current, e.target.value).toFixed(2));
                }
            } catch (error) {
                console.error('Error in handleOptionChange function:', error);
            }
        }
        unit.current = e.target.value;
    }
    function drawOption(e) {
        setMeasure(null);
        if (drawer) {
            drawer.disable()
        }
        let draw;
        if (e.target.value === "line") {
            unit.current = "kilometers"
            types.current = "Distance";
            draw = new L.Draw.Polyline(map, drawControl.options.Polyline);


        }
        else if (e.target.value === "polygon") {
            types.current = "Area";
            unit.current = "meters"
            draw = new L.Draw.Polygon(map, drawControl.options.Polygon);
        }
        draw.enable();
        SetDrawer(draw);
    }
    return (
        <div style={{ position: vis ? "absolute" : "relative", }} className="toolscont">
            <button title="Measurement" className="btn text-white" id="measure" onClick={HandleClick} style={{ zIndex: "1000", fontSize: "15px", backgroundColor:'black', padding: "2px 2px", borderRadius: "50%", border: "none" }}><i className="fa-solid fa-ruler"></i></button>
            {show && (
                <> 
                    <div ref={toolvisRef} className='toolsvis' id="toolvis">

                        <div style={{ display: "flex", flexDirection: "row", padding: "10px" }}>
                            <div style={{ width: '60%' }}>
                                <input className="form-check-input" type="radio" name="drawOption" value="line" onChange={drawOption} />
                                <label style={{ color: 'white', marginLeft: '10%' }}> Line</label>
                            </div>
                            <div style={{ width: '60%' }}>
                                <input className="form-check-input" type="radio" name="drawOption" value="polygon" onChange={drawOption} />
                                <label style={{ color: 'white', marginLeft: '10%' }} > Polygon</label>
                            </div>
                        </div>

                        {types.current && (
                            <>
                                <div id='disance' className="display" style={{ fontSize: '12px', marginRight: '2px' }}>
                                    <p>{types.current}: {measure}</p>
                                </div>
                                {types.current === "Distance" ? (
                                    <div style={{ marginTop: '-15px' }}>
                                        <select value={unit.current} onChange={handleOptionChange} id='smeasure' className="form-select border-0 custom-select" >
                                            <option value="kilometers">Kilometers</option>
                                            <option value="meters">Meters</option>
                                            <option value="miles">Miles</option>
                                            <option value="yards">Yards</option>
                                            <option value="feet">Feet</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <select value={unit.current} onChange={handleOptionChange} id='smeasure' className="form-select border-0 custom-select" >
                                            <option value="meters">Sq Meters</option>
                                            <option value="kilometers">Sq Kilometers</option>
                                            <option value="hectares">Hectares</option>
                                            <option value="acres">Acres</option>
                                        </select>
                                    </div>
                                )}
                            </>

                        )}

                    </div>

                </>
            )}



        </div>
    )
}

export default Measure