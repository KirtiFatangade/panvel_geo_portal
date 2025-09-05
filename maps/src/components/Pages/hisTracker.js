import React, { useEffect, useContext, useState } from "react";
import { GlobalContext } from "../../App";
import { HOST } from "../host";
import log, { logToServer } from '../logger.js';


import { ArcherContainer, ArcherElement } from 'react-archer';

function Tracker({ id }) {
    const { hisDate, setHisDate, userProjects, organizationProjects } = useContext(GlobalContext);
    const [history, setHistory] = useState([]);
    const [Arrows, SetArrows] = useState(null);
    const [showDetails, setShowDetails] = useState({});
    const [view, setView] = useState(false)
    const [viewLay, setLayer] = useState([])
    const tabNames = {
        opt1: "Open Source Satellite Datasets",
        opt2: "Derived Open Source Satellite Datasets",
        opt3: "High Resolution Disaster Satellite Datasets",
        opt4: "Perform Map Segmentation",
        opt5: "Perform Object Detection",
        opt6: "Farm Health Graph Generation",
        opt8: "Building Footprint Extraction",
        opt9: "Change Detection"
    };

    useEffect(() => {
        if (hisDate && id) {
            fetchHistory();
        }
    }, [id, hisDate]);

    useEffect(() => {
        if (history) {
            setTimeout(() => {
                let arrow = GenerateArrows();
                SetArrows(arrow);
            }, 200)
        }
    }, [history])

    function generateRandomCode() {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }
    function openLayerinTab() {
        if (viewLay && viewLay.length) {
            sessionStorage.setItem('storedPath', "/panvel");
            const randomCode = generateRandomCode();
            viewLay.push(Number(randomCode));
            document.cookie = `viewLay=${JSON.stringify(viewLay)};`;
            window.open('/portal');

        } else {
            alert("Please select Layers")
            return
        }
    }

    function getProName(id) {
        for (const project of userProjects) {
            if (project.id === id) {
                return project.name;
            }
        }

        for (const project of organizationProjects) {
            if (project.id === id) {
                return project.name;
            }
        }

        return null;
    }

    function AddHoverClass(event, id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add("hovered");
            try {
                let parent = history.filter((ele) => ele.id == id)
                if (parent) {
                    AddHoverClass(false, parent[0].data.parent)
                }
            } catch (e) {

            }
        } else {
            console.error(`Element with id ${id} not found.`);
        }
    }

    function RemoveHoverClass(event) {
        const elements = document.querySelectorAll('.hovered');
        elements.forEach(element => {
            element.classList.remove('hovered');
        });
    }


    function GenerateArrows() {
        const arrows = [];
        history.forEach(act => {
            // Check if current action is a draw or layer
            if (act.type === "draw" || act.type === "layer") {
                // Get source and destination elements
                const sourceElement = document.getElementById(act.data.parent);
                const destinationElement = document.getElementById(act.id);
                console.log(sourceElement, destinationElement)
                // Check if source and destination elements exist
                if (sourceElement && destinationElement) {
                    arrows.push(
                        <ArcherElement
                            key={`${act.data.parent}-${act.id}`}
                            id={`arrow-${act.data.parent}-${act.id}`}
                            relations={[{ targetId: act.data.parent, targetAnchor: "bottom", sourceAnchor: "top" }]}
                        >
                            <div style={{ width: "5", height: "5" }} />
                        </ArcherElement>
                    );
                }
            }
        });
        console.log(arrows)
        return arrows;
    }
    const handleShowClick = (id) => {
        setShowDetails(prevState => ({
            ...prevState,
            [id]: !prevState[id]
        }));
    };
    const handleViewClick = (id) => {
        setLayer(prevState => {
            const idExists = prevState.includes(id);
            const newLayer = idExists ? prevState.filter(item => item !== id) : [...prevState, id];
            return newLayer;
        });
    };
    useEffect(() => {
        if (!view) {
            setLayer([])
        }
    }, [view])
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString();
    };
    function GeneateHistoryElements(his) {

        return his.map((act, index) => (

            <div className="timeline">
                <div className="container track-dots right" >
                    <React.Fragment key={act.id}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div>
                                {index === 0 && (
                                    <>
                                        <div className="project-changed">Navigated to  {act.project ? `Project ${getProName(act.project)}` : "Portal"}</div>
                                        <div className="tab-changed">Switched to {tabNames[act.tab]}</div>

                                    </>
                                )}
                                {index > 0 && his[index - 1].project !== his[index].project && (
                                    <>
                                        <div className="project-changed">Navigated to {act.project ? `Project ${getProName(act.project)}` : "Portal"}</div>

                                    </>
                                )}
                                {index > 0 && his[index - 1].tab !== his[index].tab && (
                                    <>
                                        <div className="tab-changed">Switched to {tabNames[act.tab]}</div>

                                    </>
                                )}
                            </div>
                            <div>
                                <div style={{ display: 'flex', flexDirection: "row" }}>
                                    <div style={{ flex: 1 }}>
                                        {(act.type === "draw" || act.type === "layer") && (
                                            <div onClick={() => (act.data.type === "create" || act.data.type === "edit" || act.data.type === "filter" || act.data.type === "calc") ? handleShowClick(act.id) : null} className={`activity ${act.type}`} onMouseOver={(e) => act.data.type !== "create" && AddHoverClass(e, act.data.parent)} onMouseOut={(e) => act.data.type !== "create" && RemoveHoverClass(e)} id={act.id} style={{
                                                color: act.data.type === "create" ? "rgb(80, 161, 80)" : ((act.data.type === "edit" || act.data.type === "filter" || act.data.type === "calc") ? "black" : "rgb(196, 70, 70)")
                                            }}>
                                                <div>
                                                    <p>{act.data.type === "create" ? "Created" : (act.data.type === "edit" ? "Edited" : (act.data.type === "filter" ? "Filtered" : act.data.type !== "calc" ? "Removed" : ""))} {act.data.type === "calc" ? "Calculated Raster" : act.data.name}</p>
                                                </div>
                                                {showDetails[act.id] && (
                                                    <div className="additional-content">
                                                        {act.type === "draw" ? (
                                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                                {act.data.type !== "delete" ? (
                                                                    <p>Bounds: {act.data.name !== "marker" ? JSON.stringify(act.data.bound) : JSON.stringify(act.data.bound[0])}</p>
                                                                ) : null}
                                                            </div>
                                                        ) : act.type === "layer" ? (
                                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                                {act.data.type !== "filter" && act.data.type !== "calc" ? (
                                                                    <>
                                                                        {Array.isArray(act.data.date) && (
                                                                            <>
                                                                                <p>{act.data.date[1] ? "Start Date" : "Date"}: {formatDate(act.data.date[0])}</p>
                                                                                {act.data.date[1] && <p>End Date: {formatDate(act.data.date[1])}</p>}
                                                                            </>
                                                                        )}
                                                                        {act.data.vis.bands && (<p>Bands selected : {JSON.stringify(act.data.vis.bands[0])}, {JSON.stringify(act.data.vis.bands[1])}, {JSON.stringify(act.data.vis.bands[2])}</p>)}
                                                                        {act.data.vis.indices && (<p>Indices calculated using : {JSON.stringify(act.data.vis.indices[0])}, {JSON.stringify(act.data.vis.indices[1])}</p>)}
                                                                        {act.data.vis.clip && (
                                                                            <p>
                                                                                Clipped using {act.data.vis.clip[0] === "cont" ? "Country" : act.data.vis.clip[0] === "state" ? "State" : "District"} Boundary: {act.data.vis.clip[1].join(', ')}
                                                                            </p>
                                                                        )}
                                                                        {act.data.vis.layer && (<p>Clipped using {act.data.vis.layer_name} Vector Layer</p>)}
                                                                        {act.data.vis.box && (
                                                                            <p>
                                                                                Clipped using Box with Bounds:
                                                                                <br />
                                                                                minX: {act.data.vis.box[0]},
                                                                                minY: {act.data.vis.box[1]},
                                                                                maxX: {act.data.vis.box[2]},
                                                                                maxY: {act.data.vis.box[3]}
                                                                            </p>
                                                                        )}
                                                                    </>
                                                                ) : (<>
                                                                    {act.data.type === "filter" ? (
                                                                        <p>Filtered Using Band : {JSON.stringify(act.data.vis.filter_band)}</p>
                                                                    ) : null}
                                                                    <br></br>
                                                                    <p>
                                                                        Query: {
                                                                            act.data.vis.query
                                                                                .map(item => Array.isArray(item) ? item.join(" ") : item)
                                                                                .join(" ")
                                                                        }
                                                                    </p>
                                                                </>)}


                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {(act.type === "upload") && (
                                            <div id={act.id} className={`activity ${act.type}`} style={{ color: 'rgb(80, 161, 80)', backgroundColor: 'white' }} >
                                                <div>
                                                    <p>Uploaded a {act.data.type} Layer</p>
                                                    {act.data.added != "" && (<p>Layer was added to Project {getProName(Number(act.data.added))}</p>)}
                                                </div>
                                            </div>
                                        )}
                                        {(act.type === "view") && (
                                            <div id={act.id} onMouseOver={(e) => AddHoverClass(e, act.parent)} onMouseOut={(e) => RemoveHoverClass(e)} className={`activity ${act.type}`} style={{ color: 'rgb(80, 161, 80)', backgroundColor: 'white' }} >
                                                <div>
                                                    <p>Viewed a Layer in Portal</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ marginLeft: "10px" }}>
                                        {act.data.type && (act.data.type === "create" || act.data.type === "edit" || act.data.type === "filter" || act.data.type==="calc") && view && (
                                            <input type="checkbox" onClick={() => handleViewClick(act.id)} />
                                        )}
                                        {act.type === "upload" && view &&
                                            (() => {
                                                const hisDateObj = new Date(hisDate);
                                                const currentDateObj = new Date();
                                                const timeDifference = currentDateObj - hisDateObj;
                                                const dayDifference = timeDifference / (1000 * 3600 * 24);
                                                return dayDifference <= 2;
                                            })() && (
                                                <input type="checkbox" onClick={() => handleViewClick(act.id)} />
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                </div>
            </div>

        ));
    }

    async function fetchHistory() {
        try {
            const response = await fetch(`${HOST}/fetch-act/${id}/${hisDate}`);
            const data = await response.json();

            if (Array.isArray(data.act)) {
                setHistory(data.act);
                logToServer('info', "Data is  an array")
            } else {
                logToServer('error', 'Data is not an array')
            }
        } catch (error) {
            logToServer('error', `Error Fetching History: ${error}`)
            alert("Error Fetching History");
        }
    }

    return (
        <div style={{ backgroundColor: '#2c3e50', fontSize:'15px', fontFamily: 'Lato', display: "flex", flexDirection: "column", maxWidth: 'calc(100vw - 200px)', height: '600px', maxHeight: 'calc(100vh - 200px)', overflow: 'hidden', overflowY: 'scroll', boxShadow: '1px 5px 10px 8px #bbbbbb', padding: '3%' }}>
            <div style={{ marginLeft: '65px', marginBottom: '10px' }}>
                <input
                    type="date"
                    value={hisDate}
                    style={{ padding: '5px 10px', border: 'none' }}
                    onChange={(e) => setHisDate(e.target.value)}

                />
                <div style={{ display: "flex", flexDirection: "row" }}>
                    <button className='mt-3 btn-light' onClick={() => setView(!view)} style={{ alignSelf: 'flex-end', padding: '5px 20px' }}>View Layers</button>
                    {viewLay.length ? (
                        <button className='mt-3 btn-light' style={{ alignSelf: 'flex-end', padding: '5px 20px' }} onClick={() => openLayerinTab()} >View Selected Layers</button>
                    ) : (null)}
                </div>
            </div>
            <div>
                {history && history.length ? (
                    <>
                        <ArcherContainer>
                            {GeneateHistoryElements(history)}
                            {Arrows}
                        </ArcherContainer>
                    </>
                ) : (
                    <p className="text-white" style={{ marginLeft: '70px' }}>No Data Available for this Date</p>
                )}
            </div>
        </div>
    );
};


export default Tracker;
