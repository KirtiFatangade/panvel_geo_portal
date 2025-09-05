import React, { useContext } from "react";
import { GlobalContext } from "../../../App";

function Inspect() {
    const {
        inspect,
        SetInspect,
        vis
    } = useContext(GlobalContext);

    // Function to toggle pointer events
    const togglePointerEvents = () => {
        const container = document.getElementById("deckgl-custom");
        const mapContainer = document.querySelector(".leaflet-container");
        const canvas = document.getElementById("deckgl-overlay");
        // console.log(container);
        // console.log(mapContainer);
        // console.log(canvas);

        if (container) {
            // Toggle pointer events based on the current state
            container.style.pointerEvents = !inspect ? "none" : "auto";
            container.style.setProperty("cursor", "crosshair", "important");
            console.log(container.style.cursor);

        }

        if (mapContainer) {
            mapContainer.style.cursor = !inspect ? "crosshair" : "grab";
            console.log(mapContainer.style.cursor);
        }

        // if (canvas) {
        //     canvas.style.cursor = inspect ? "grab" : "crosshair"; 
        //     console.log(canvas.style.cursor);
        // }


        SetInspect(!inspect);
    };

    return (
        <div style={{ position: vis ? "absolute" : "relative" }} className="toolscont">
            <button
                className="btn text-white"
                title="Inspector"
                onClick={togglePointerEvents}
                style={{
                    zIndex: "1000",
                    fontSize: "15px",
                    padding: "2px 2px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: inspect ? 'white' : 'black'
                }}
            >
                <i style={{ color: inspect ? "#212529" : "white" }} className="fa-solid fa-binoculars"></i>
            </button>
        </div>
    );
}

export default Inspect;
