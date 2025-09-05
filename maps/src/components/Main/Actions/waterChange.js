import React from "react";
import Cal from "./Calender";
import { useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import { SideBarContext } from "../sidebar";
import { GlobalContext } from "../../../App";
import { helpers, area, convertArea } from "@turf/turf";
import { HOST } from "../../host";
import L from "leaflet"
import { logToServer } from "../../logger";

function WaterChange() {
    const [SDate, setSdate] = useState(null)
    const [Edate, setEdate] = useState(null)
    const { setloader } = useContext(SideBarContext)
    const { map, lastRect, drawnItems, layerControls, userInfo, selTab } = useContext(GlobalContext)
    const location = useLocation();
    function CreateNDVI(data) {
        let layer;


        layer = L.tileLayer(data.url_1[0], { maxZoom: 20, zIndex: 1005 });
        layerControls.addOverlay(layer, `Raster ${SDate}`, false, false, false, false, false, data.url_1[1]);
        layer.addTo(map);


        layer = L.tileLayer(data.url_2[0], { maxZoom: 20, zIndex: 1005 });
        layerControls.addOverlay(layer, `Raster ${Edate}`, false, false, false, false, false, data.url_2[1]);
        layer.addTo(map);


        let ar = (area(data.geo_1[0]) / 10 ** 6).toFixed(4);
        layer = L.geoJSON(data.geo_1[0], { style: { fill: true, fillColor: "#000000", color: "#000000", fillOpacity: 0.5 } });
        layer.bindPopup(`Area : ${ar} sq km`);
        layerControls.addOverlay(layer, `Water Cover ${SDate}`, false, false, false, false, false, data.geo_1[1]);


        ar = (area(data.geo_2[0]) / 10 ** 6).toFixed(4);
        layer = L.geoJSON(data.geo_2[0], { style: { fill: true, fillColor: "#0000FF", color: "#0000FF", fillOpacity: 0.5 } });
        layer.bindPopup(`Area : ${ar} sq km`);
        layerControls.addOverlay(layer, `Water Cover ${Edate}`, false, false, false, false, false, data.geo_2[1]);

        try {

            let total_pos = (area(data.change_1[0]) / 10 ** 6).toFixed(4);
            layer = L.geoJSON(data.change_1[0], { style: { fill: true, color: "#00FF00" } });
            layer.bindPopup(`Area :  ${total_pos} sq km`);
            layerControls.addOverlay(layer, "Positive Change", false, false, false, false, false, data.change_1[1]);


            let total_neg = (area(data.change_2[0]) / 10 ** 6).toFixed(4);
            layer = L.geoJSON(data.change_2[0], { style: { fill: true, color: "#FF0000" } });
            layer.bindPopup(`Area :  ${total_neg} sq km`);
            layerControls.addOverlay(layer, "Negative Change", false, false, false, false, false, data.change_2[1]);
        } catch (e) {
            logToServer("error", "Error processing change layers");

        }
    }
    async function NDVI() {
        logToServer("info", "NDVI function called");

        let data = {}
        if ((!SDate || !Edate) || SDate > Edate) {
            alert("Please select Proper dates")
            logToServer("warn", `Invalid date selection ${SDate, Edate}`);

            return
        }
        data["Sdate"] = SDate
        data["Edate"] = Edate
        if (lastRect && drawnItems.hasLayer(lastRect)) {
            data["box"] = [JSON.stringify(
                drawnItems.getLayer(lastRect).toGeoJSON()["geometry"]["coordinates"][0]
            )]

        } else {
            logToServer("warn", "No rectangle drawn on the map");
            return
        }
        setloader(true)
        if (window.location.pathname.startsWith("/project/")) {
            const projectId = window.location.pathname.split("/")[3];
            data["project"] = projectId;

        } else {
            data["project"] = "global";
        }
        data["memb"] = userInfo.id
        data["tab"] = selTab;
        try {
            await fetch(`${HOST}/water-change-diff`, {
                method: "POST",
                credentials:'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ data }),
            })
                .then((response) => response.json())
                .then((data) => CreateNDVI(data));
            logToServer("success", `${data}`);

        } catch (error) {
            alert("The area you're trying to work with is too large. Please try with a smaller area.");
            logToServer("error", `${error.message}`);

        }
        setloader(false)
    }
    return (
        <div style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}>
            <>
                <>
                    <div>
                        <label htmlFor="start" style={{ marginRight: "10px", color: "white", fontSize: '12px', display: "inline-block" }}>Start Date:</label>
                        <input style={{ fontSize: '12px', padding: "3px 10px", borderRadius: "5px" }} type={"date"} id="start" min={"2017-01"} max={new Date().toISOString().split('T')[0]} onChange={(e) => setSdate(e.target.value)} name="start" defaultValue={SDate} />
                    </div>
                    <div >
                        <label htmlFor="end" style={{ marginRight: "15px", color: "white", fontSize: '12px', display: "inline-block" }}>End Date:</label>
                        <input style={{ fontSize: '12px', padding: "3px 10px", borderRadius: "5px" }} type={"date"} id="end" name="end" min={"2017-01"} max={new Date().toISOString().split('T')[0]} defaultValue={Edate} onChange={(e) => setEdate(e.target.value)} />
                    </div>
                </>
            </>
            <>
                <div>
                    <button className="mt-2 btn-visualize" style={{ zIndex: '1000' }} onClick={(e) => NDVI()}>
                        Get Change
                    </button>
                </div>
            </>
        </div>
    )

}

export default WaterChange