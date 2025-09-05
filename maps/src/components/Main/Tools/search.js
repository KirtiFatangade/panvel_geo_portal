import React, { useState, useContext, useRef, useEffect } from "react";
import { GlobalContext } from "../../../App";
import L from "leaflet"
import { logToServer } from "../../logger";


function useForceUpdate() {
    const [, setValue] = useState(0);

    return () => setValue(value => value + 1);
}

function Search({ type }) {
    const [sugg, setSug] = useState([]);
    const forceUpdate = useForceUpdate();
    const { geocoding, vis } = useContext(GlobalContext);
    let autocomplete = geocoding.getAutocompleteService();
    let search = geocoding.getPlacesService();
    const { map, customMarker } = useContext(GlobalContext)

    async function suggest(query) {
        let results = [];
        try {
            const predictions = await new Promise((resolve, reject) => {
                autocomplete.getPlacePredictions({ input: query }, (predictions, status) => {
                    if (status === "OK") {
                        resolve(predictions);
                    } else if (status === "ZERO_RESULTS") {
                        resolve([]);
                    } else {
                        reject(status);
                    }
                });
            });

            results = predictions.map((prediction) => ({
                name: prediction.description,
                id: prediction.reference,
            }));

            setSug(results.length ? results : []);

            logToServer('info', `Suggestions fetched for query: ${query}`);
        } catch (error) {
            logToServer('error', `Error fetching suggestions for query ${query}: ${error}`);
        }
    }
    async function addMarker(query) {
        setSug([]);
        try {
            search.getDetails({ "placeId": query, fields: ["geometry"] }, (place, status) => {
                if (status !== "OK") {
                    logToServer('error', `Error fetching place details for query ${query}: ${status}`);
                    return;
                }

                const keys = Object.keys(place.geometry.viewport);
                const x = (place.geometry.viewport[keys[1]].hi + place.geometry.viewport[keys[1]].lo) / 2;
                const y = (place.geometry.viewport[keys[0]].hi + place.geometry.viewport[keys[0]].lo) / 2;
                let mark;

                if (type === "start") {
                    mark = L.marker([y, x], {
                        icon: new customMarker({
                            type: "start"
                        })
                    }).bindPopup("Start");
                } else if (type === "end") {
                    mark = L.marker([y, x], {
                        icon: new customMarker({
                            iconUrl: "https://cdn-icons-png.flaticon.com/512/8866/8866624.png",
                            type: "end"
                        })
                    }).bindPopup("End");
                } else {
                    mark = L.marker([y, x], {
                        icon: new customMarker({
                            iconUrl: "https://cdn-icons-png.flaticon.com/512/58/58960.png",
                            type: "waypoint"
                        })
                    }).bindPopup("End");
                }

                mark.addTo(map);
                map.fire("draw:created", { layer: mark, layerType: "marker" });
                map.flyTo([y, x], 18);

                logToServer('info', `Marker added at coordinates: [${y}, ${x}] for type: ${type}`);
            });
        } catch (error) {
            logToServer('error', `Error adding marker for query ${query}: ${error}`);
        }
    }

    function cross() {
        setSug([]);
        document.getElementById("search").value = "";
        logToServer('info', 'Search input cleared');
    }
    return (
        <>
            <div style={{ display: 'flex', flexDirection: "row" }}>
                <input onChange={(e) => suggest(e.target.value)} style={{ width: "120px", fontSize: "12px" }} placeholder="Search" id="search"></input>
                <span onClick={() => cross()} style={{ cursor: "pointer" }}>&times;</span>
            </div>
            <div>
                <ul style={{ listStyle: "none", padding: "0px" }}>
                    {sugg.map((ele) => (
                        <li key={ele.reference} style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                            <button className='btn btn-secondary text-white' onClick={(e) => addMarker(e.target.value)} value={ele.id} style={{ width: "120px", height: '30px', overflow: "hidden", textOverflow: "ellipsis", fontSize: '12px' }}>
                                {ele.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

        </>
    )


}

export default Search

