import React, { useEffect, useState, useContext, useRef } from "react";
import { GlobalContext } from "../../../App";
import L from "leaflet";
import { logToServer } from "../../logger";
var sideBySide = require('./leaflet-side-by-side')

//Add Not selecting same options
function Swipe() {
    const {
        map,
        selectedLayers,
        vis
    } = useContext(GlobalContext)
    const [selLayers, setSelLayers] = useState(false)
    const [lLayer, SetlLayer] = useState("")
    const [rLayer, SetrLayer] = useState("")
    const toolvisRef = useRef(null);
    const [slider, setslider] = useState(null)


    function swipeClick() {
        setSelLayers(prevSelLayers => !prevSelLayers);
        logToServer('info', 'Swipe tool toggled');

    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest("#swipping") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
                setSelLayers(false);
            }
        };

        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    function handleChange(e) {
        if (e.target.name === "Left") {
            SetlLayer(e.target.value)
            logToServer('info', `Left layer selected: ${e.target.value}`);
        }
        else {
            SetrLayer(e.target.value)
            logToServer('info', `Right layer selected: ${e.target.value}`);
        }
    }

    function close() {
        if (slider) {
            slider.remove();
            setslider(null);
            Object.keys(selectedLayers).forEach((key) => {
                selectedLayers[key].remove();
                selectedLayers[key].addTo(map);
                selectedLayers[key].setOpacity(1)
            })


        }
        setSelLayers(false)
        SetlLayer("")
        SetrLayer("")
        logToServer('info', 'Swipe tool closed and layers reset');
    }
    useEffect(() => {
        if (!(lLayer === "" || rLayer === "" || lLayer === rLayer || Object.keys(selectedLayers).length === 1)) {
            if (slider) {
                slider.remove();
            }
            logToServer('info', `Swiping layers: Left Layer - ${lLayer}, Right Layer - ${rLayer}`);

            Object.keys(selectedLayers).forEach((key) => {
                try{
                    if (key !== "Basemap" && key !== lLayer && key !== rLayer) {
                        selectedLayers[key].setOpacity(0)
                    }
                    else {
                        selectedLayers[key].setOpacity(1)
                    }
                }catch(e){
                    logToServer('error', `Error setting opacity for layer ${key}: ${e}`);


                }
                

            })
            let slide = L.control.sideBySide(selectedLayers[lLayer], selectedLayers[rLayer], selectedLayers.Basemap)
            slide.addTo(map)
            setslider(slide);
        } else {
            if (slider) {
                SetlLayer("");
                SetrLayer("");
                slider.remove()
                setslider(null);
                Object.keys(selectedLayers).forEach((key) => {
                    selectedLayers[key].setOpacity(1)
                })
                logToServer('info', 'Swipe layers reset');
            }
        }
    }, [lLayer, rLayer, selectedLayers])
    useEffect(() => { 
        if (slider) {
            slider.setBaseLayer(selectedLayers.Basemap);
        }
    }, [selectedLayers.Basemap]);

    return (
        <div style={{ position: vis ? "absolute" : "relative", }} className="toolscont" >
            <button title="Swiping Tool"
                className="btn text-white"
                onClick={swipeClick}
                id="swipping"
                style={{ zIndex: "1000", backgroundColor:'black',fontSize: "15px", padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%",   }}
            >
                <i className="fa-solid fa-left-right"></i>
            </button>

            {selLayers ? (
                <>
                    <div ref={toolvisRef} className="toolsvis" id="toolvis">
                        <span
                            onClick={close}
                            className="toolclose"
                        >
                            &times;
                        </span>
                        <select value={lLayer} className="form-select custom-select text-white mt-1 swipe-options" onChange={handleChange} name="Left" style={{ marginBottom: "5px", backgroundColor:'transparent', border:'2px solid white', fontSize: '12px' }}>
                            <option value="" style={{backgroundColor:'black', color:'white'}} disabled>Select Left Layer</option>
                            {Object.keys(selectedLayers).map((key) => (
                                <option key={key} value={key}>
                                    {key.split("#")[0]}
                                </option>
                            ))}
                         </select>
                        <select value={rLayer} className="form-select custom-select text-white mt-2 swipe-options" onChange={handleChange} name="Right" style={{ marginBottom: "5px", backgroundColor:'transparent', border:'2px solid white',fontSize: '12px' }}>
                            <option value="" disabled style={{backgroundColor:'black', color:'white'}}>Select Right Layer</option>
                            {Object.keys(selectedLayers).map((key) => (
                                <option key={key} value={key}>
                                    {key.split("#")[0]}
                                </option>
                            ))}
                        </select>

                    </div>

                </>
            ) : (null)}


        </div>

    )
}

export default Swipe