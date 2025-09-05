import React, { useState, useContext } from "react";
import Cal from "./Calender_old";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar";
import { bbox } from "@turf/turf";
import { useLocation } from "react-router-dom";
import { HOST } from "../../host";
import L from "leaflet";
import Options from "./clipComp";
import { logToServer } from "../../logger";

function LULC() {
    const {
        map,
        layerControls,
        lastRect,
        drawnItems,
        userInfo,
        selTab,
        Canvas
    } = useContext(GlobalContext);

    const [clip, setClip] = useState(false);
    const [AddBound, setBound] = useState(false);
    const [clipBox, setClipBox] = useState(false);
    const [clipLayer, setClipLayer] = useState(false);
    const [selCLayer, setCLayer] = useState("");
    const [selCont, setCont] = useState("");
    const [selState, setState] = useState("");
    const [selDis, setDis] = useState("");
    const [adm, setAdm] = useState("");

    const { setloader } = useContext(SideBarContext);
    const [SDate, SetSDate] = useState(null);
    const location = useLocation();

    function create(data) {
        logToServer("info", "Creating change detection layers on the map", { data });
        console.log(data.area)
        let layer = L.tileLayer(data.lulc[0], { maxZoom: 20, zIndex: 1005 });
        layerControls.addOverlay(layer, "LULC", false, false, false, false, false, data.lulc[1]);
        layer.addTo(map);

        layer = L.tileLayer(data.sat_1[0], { maxZoom: 20, zIndex: 1005 });
        layerControls.addOverlay(layer, `Image - TCC `, false, false, false, false, false, data.sat_1[1]);
        layer = L.tileLayer(data.sat_2[0], { maxZoom: 20, zIndex: 1005 });
        layerControls.addOverlay(layer, `Image - FCC `, false, false, false, false, false, data.sat_2[1]);
        var legend = L.control({ position: 'bottomright' });



        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend');

            div.style.backgroundColor = 'white';
            div.style.padding = '10px';
            div.style.borderRadius = '5px';
            div.style.position = 'relative'; // Ensure positioning context for the close button


            // Create the legend content
            var labels = ['Water', 'Trees', 'Grass', 'Flooded Vegetation', 'Crops', 'Shrub and Scrub', 'Built', 'Bare'];
            var colors = ['#419bdf', '#397d49', '#88b053', '#7a87c6', '#e49635', '#dfc35a', '#c4281b', '#a59b8f'];
            div.innerHTML += '<p style="font-weight: bold; font-size: 16px; margin: 0; padding-bottom: 10px;">LEGEND</p>';
            for (var i = 0; i < labels.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + colors[i] + '"></i> ' +
                    labels[i] + ' - ' + data.area[i] + ' sq km<br>';
            }

            // Attach an event listener to the close button
            L.DomEvent.on(div, 'dblclick', function (e) {

                map.removeControl(legend);
            });
            var tooltip = L.DomUtil.create('div', 'legend-tooltip', div);
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = 'black';
            tooltip.style.color = 'white';
            tooltip.style.padding = '5px';
            tooltip.style.borderRadius = '3px';
            tooltip.style.display = 'none'; // Hidden by default
            tooltip.innerHTML = 'Double Click to remove Legend'; // Set your tooltip text here

            // Event listener to show the tooltip on hover
            L.DomEvent.on(div, 'mouseover', function (e) {
                tooltip.style.display = 'block';
                tooltip.style.left = e.offsetX + 10 + 'px';
                tooltip.style.top = e.offsetY + 10 + 'px';
            });

            // Event listener to hide the tooltip when not hovering
            L.DomEvent.on(div, 'mouseout', function (e) {
                tooltip.style.display = 'none';
            });

            // Optionally, update the tooltip position as the mouse moves
            L.DomEvent.on(div, 'mousemove', function (e) {
                tooltip.style.left = e.offsetX + 10 + 'px';
                tooltip.style.top = e.offsetY + 10 + 'px';
            });

            return div;
        };

        legend.addTo(map);

        logToServer("success", "LULC success");
    }

    async function fetchLayer() {
        logToServer("info", "fetchLayer function called", { SDate, lastRect });

        if (!SDate) {
            alert("Please select a date");
            return;
        }
        if (!clip && !clipBox && !clipLayer) {
            alert("Please select a clipping option")
            return
        }
        try {
            let data = {
                dates: SDate,
            };

            if (clip) {
                if (selDis && selDis !== "") {
                    data["clip"] = ["dis", [selDis, selState, selCont]];
                } else if (selState && selState !== "") {
                    data["clip"] = ["state", [selState, selCont]];
                } else if (selCont && selCont !== "") {
                    data["clip"] = ["cont", [selCont]];
                } else {
                    alert("Please select Region")
                    return
                }
                if (AddBound) {
                    data["bound"] = true;
                }
            }
            if (clipBox) {
                if (lastRect && drawnItems.hasLayer(lastRect)) {
                    data["box"] = bbox(drawnItems.getLayer(lastRect).toGeoJSON());
                } else {
                    alert("Please draw a rectangle or polygon")
                    return;
                }
            }
            if (clipLayer) {
                if (selCLayer && selCLayer !== "") {
                    data["layer"] = Canvas.getLayerId(selCLayer);
                    data["layer_name"] = selCLayer
                } else {
                    alert("Please select a Layer")
                    return
                }
            }

            if (window.location.pathname.startsWith("/project/")) {
                const projectId = window.location.pathname.split("/")[3];
                data["project"] = projectId;
            } else {
                data["project"] = "global";
            }

            data["memb"] = userInfo.id;
            data["tab"] = selTab;
            setloader(true);

            await fetch(`${HOST}/get-lulc`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': await getCsrfToken(),
                  },
                body: JSON.stringify({ data }),
            })
                .then((response) => response.json())
                .then((data) => create(data));

            logToServer("success", "fetchLayer request successful", { data });
            setloader(false);
        } catch (error) {
            alert("Unexpected Error occurred. Please try again");
            logToServer("error", "Error sending POST request for fetchLayer", { error: error.message });
            setloader(false);
        }
    }

    return (
        <>
            <div style={{ display: "flex", flexDirection: "column" }} className="select-container d-flex">
                <div style={{ display: "flex", flexDirection: "column" }}>

                    <div>
                    <Cal
                            map={map}
                            selData={"10m Satellite data (Sentinel 2)"}
                            SetSDate={SetSDate}
                            SDate={SDate}
                            setloader={setloader}
                            toFetch={"open"}
                            both={false}
                            limit={"2017-03-28"}
                            cloud={true}
                            cloudValue={100}
                        />
                    </div>
                </div>
                <>
                <Options clip={clip} AddBound={AddBound} clipBox={clipBox} clipLayer={clipLayer} selCont={selCont} selState={selState} setClip={setClip} setBound={setBound} setClipBox={setClipBox} setClipLayer={setClipLayer} setCLayer={setCLayer} setCont={setCont} setState={setState} setDis={setDis} adv_options={true} req_box={false} req_layer={false} req_region={false} />
                </>
                <div>
                    <button className="mt-2 btn-visualize" style={{ zIndex: '1000' }} onClick={fetchLayer}>
                        Extract
                    </button>
                </div>
            </div>
        </>
    );
}

export default LULC;
