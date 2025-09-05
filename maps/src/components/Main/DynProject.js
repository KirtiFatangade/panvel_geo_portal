import React, { useEffect, useState, useContext, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GlobalContext } from "../../App";
import { useNavigate, useLocation } from "react-router-dom";
import { useLayerFunc } from "../Main/layerFunc";
import L from "leaflet"
import { HOST } from "../host";
import { logToServer } from "../logger";
import eventEmitter from '../eventEmitter';
import './Project.css'
import Modal from 'react-modal';

function useForceUpdate() {
    const [, setValue] = useState(0);
    return () => setValue(value => value + 1);
}

function Project() {
    const {
        map,
        userInfo,
        userProjects,
        organizationProjects,
        UsedLayers,
        prevMeta,
        setPrevMeta,
        toggled,
        SetToggled,
        layerControls,
        getCsrfToken
    } = useContext(GlobalContext);

    const forceUpdate = useForceUpdate();
    const {
        LayerChange,
        TileLayerChange,
        handleOpen,
        DrawLayerChange,
        SatLayerChange,
        GeoLayerChange,
        GetSat
    } = useLayerFunc();
    const dragged = useRef(null)
    const draggedTo = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [meta, setMeta] = useState(null)
    const [clone, setClone] = useState(null)
    const [edit, setEdit] = useState(false)
    const [once, setOnce] = useState(false)
    const [vectors, setVectors] = useState([])
    const [modalContent, setModalContent] = useState({})
    const [clipVector, setClipVector] = useState(null)
    const owner = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    function openRasterModal(name, id, clipper, index) {
        setModalContent({ name, id, clipper, index });
        setIsModalOpen(true);
    }

    const closeModal = () => {
        setModalContent({});
        setIsModalOpen(false);
    };
    const originalNames = useRef([]);
    eventEmitter.on('refresh-url', RefeshUrl.bind(this));
    useEffect(() => {
        logToServer("info", "SidebarTabs component mounted");
        let id = Number(location.pathname.split("/")[3])
        checkProjectExists(id)
    }, [])

    const checkProjectExists = async (id) => {
        try {
            const response = await fetch(`${HOST}/check-pro/${userInfo.id}/${id}`);
            console.log(response.status)
            if (response.status === 200) {
                // Project exists, no action needed
            } else if (response.status === 404) {
                logToServer("error", `Project not found: ${id}`);
                navigate("/user-console");
            } else {
                logToServer("error", `Unexpected error checking project: ${response.status}`);
                navigate("/user-console");
            }
        } catch (error) {
            logToServer("error", `Error checking project: ${error}`);
            navigate("/user-console");
        }
    };
    
    function RefeshUrl(data) {
        if (data && data.key) {
            if (clone) {
                console.log("pixel refresh")
                findSatComp(clone["children"], data.key, "0")
            }
        }
    }

    function findSatComp(comp, key, popup, indices = "") {
        comp.forEach((item, index) => {
            if (item.type === "parent") {
                findSatComp(item.children, key, `${indices}.${index}`);
            } else if (item.type === "sat") {
                if (key === item.url.split("/")[7]) {
                    if (["Change Detection", "Change Detection-1", "Change Detection-2"].includes(item.add)) {
                        popup.setContent("Pixel Value not available for this layer");
                        return
                    }
                    console.log(item, `${indices}.${index}`);
                    popup.setContent("Fetching Pixel Value. Wait for 30 seconds. If not displayed, Try again")
                    let element = document.getElementById(`${indices}.${index}`);
                    if (element && element.checked) {
                        element.checked = false;
                    }
                    GetSat(item, `${indices}.${index}`)
                }
            }
        });
    }

    useEffect(() => {
        const firedUrl = (e) => {
            findSatComp(clone["children"], e.detail.key, e.detail.popup, "0")
        };
        if (clone) {
            document.addEventListener("fired", firedUrl);
        }
        return () => {
            document.removeEventListener("fired", firedUrl);

        };
    }, [clone]);

    function filterVectors(meta) {
        let layers = []
        meta.forEach((item) => {
            if (item.type === "parent") {
                layers.push.apply(layers, filterVectors(item["children"]))
            } else if (item.type === "vector") {
                layers.push([item.name, item.id])
            }
        })
        console.log(layers)
        return layers
    }

    async function fetchMetaUpdate() {
        const projectId = location.pathname.split("/")[3];

        if (projectId) {

            try {
                const res = await fetch(`${HOST}/fetch-meta/${projectId}`);
                const data = await res.json();
                if (res.status === 400) {
                    alert("Unexpected Error Occured. Please try again")
                    logToServer('error', 'Failed to fetching data')
                    navigate("/user-console")
                } else if (res.status === 200) {
                    setMeta(data.metadata)
                    setClone(data.metadata)

                    logToServer('info', 'Successfully fetch metadata')
                    setPrevMeta({ [`${projectId}`]: data.metadata });
                }
            }
            catch (e) {
                logToServer('error', `Unexpected Error Occured:${e}`)
                alert("Unexpected Error Occured. Please try again")
                navigate("/user-console")
            }


        } else {
            alert("Unexpected Error Occured. Please try again")
            logToServer('error', 'failed to fetch metadata')
            navigate("/user-console")
        }

    }

    useEffect(() => {
        const handleAddedToPro = () => {
            fetchMetaUpdate();
        };
        document.addEventListener("added-to-pro", handleAddedToPro);


        return () => {
            document.removeEventListener("added-to-pro", handleAddedToPro);

        };
    }, []);

    useEffect(() => {

        const handleChangeUrl = (e) => {
            setTimeout(() => {
                ChangeUrl(e.detail.comp, e.detail.url);
            }, 100);
        };

        document.addEventListener("url-change-pro", handleChangeUrl);
        return () => {
            document.removeEventListener("url-change-pro", handleChangeUrl);
        };
    }, [clone]);


    const findComponent = (comp, indices) => {
        let currentComp = comp;
        for (const index of indices.slice(1)) {
            currentComp = currentComp.children[index];
        }

        return currentComp;
    };


    function cancel() {
        const prevMetaCopy = JSON.parse(JSON.stringify(prevMeta[location.pathname.split("/")[3]]));
        setClone(prevMetaCopy);
        setEdit(false);
        forceUpdate();
        console.log(originalNames.current)
        originalNames.current.forEach(([prev, news, type]) => {
            console.log(type);
            const eventType = type === "vector" ? "decklayerrename" : "layerrename";
            map.fire(eventType, { prev: news, new: prev });
        });


    }

    function dragS(e, comp) {
        console.log("s", comp)
        e.stopPropagation();

        // e.preventDefault();

        dragged.current = comp

    }
    function dragE(e, comp) {
        try {
            e.stopPropagation();
            if (dragged.current === comp) {
                return; // If dragged and dropped on the same component, return early
            }
            draggedTo.current = comp
            const previouslyHighlighted = document.querySelector('.highlighted-drag');
            if (previouslyHighlighted) {
                previouslyHighlighted.classList.remove('highlighted-drag');
            }

            // Highlight the current element being dragged over
            const currentElement = document.getElementById(comp);
            if (currentElement) {
                currentElement.classList.add('highlighted-drag');
            }

        }
        catch (e) {

        }


    }
    function dragEnd(e, comp) {
        try {
            e.stopPropagation();
            // e.preventDefault();
            const draggedIndices = dragged.current.split(".").map(index => parseInt(index));
            const draggedToIndices = draggedTo.current.split(".").map(index => parseInt(index));

            console.log(draggedIndices, draggedToIndices)

            const updatedMeta = JSON.parse(JSON.stringify(clone));





            let draggedComponent = findComponent(updatedMeta, draggedIndices);

            const draggedParent = findComponent(updatedMeta, draggedIndices.slice(0, -1));
            // let droppedComponent = draggedToIndices.length > 2 ? findComponent(updatedMeta, draggedToIndices) : updatedMeta;
            console.log(draggedComponent)
            // Ensure that the dragged and dropped components are valid
            if (draggedComponent) {
                // Remove the dragged component from its parent's children

                draggedParent.children.splice(draggedIndices[draggedIndices.length - 1], 1);
                let to_mod = null;
                if (draggedIndices.length === draggedToIndices.length) {
                    to_mod = draggedToIndices.length - 1
                } else {
                    to_mod = draggedToIndices.length - 2


                }
                if (draggedIndices[draggedIndices.length - 1] < draggedToIndices[to_mod] && draggedIndices.length <= draggedToIndices.length) {
                    draggedToIndices[to_mod]--;
                }
                let droppedComponent = findComponent(updatedMeta, draggedToIndices);
                console.log(droppedComponent)
                // Insert the dragged component into the dropped component's children
                if (droppedComponent.type === "parent") {
                    if (droppedComponent.children.length) {
                        droppedComponent = findComponent(updatedMeta, draggedToIndices.slice(0, -1));
                        droppedComponent.children.splice(draggedToIndices[draggedToIndices.length - 1], 0, draggedComponent);
                    } else {
                        droppedComponent.children.push(draggedComponent);
                    }

                } else {
                    droppedComponent = findComponent(updatedMeta, draggedToIndices.slice(0, -1));
                    console.log(droppedComponent)
                    droppedComponent.children.splice(draggedToIndices[draggedToIndices.length - 1], 0, draggedComponent);
                }

                // Update the state with the modified meta object
                setClone(updatedMeta)
                const previouslyHighlighted = document.querySelector('.highlighted-drag');
                if (previouslyHighlighted) {
                    previouslyHighlighted.classList.remove('highlighted-drag');
                }
                forceUpdate();
            }
        }
        catch (e) {

        }
    }
    function DeleteLayer(component) {

        if (component.type === "vector") {
            LayerChange(component.id, component.name, false, false, false, true, component.bounds, component.color)

        } else if (component.type === "raster") {
            TileLayerChange(component.id, component.name, component.name, false, true, component.bounds)
        }
        else if (component.type === "draw") {
            DrawLayerChange(component.id, false, component["draw-type"], component.bounds, component.coords)
        } else if (component.type === "sat") {
            SatLayerChange(component.name, false, component, null)
        }
        else if (component.type === "geo") {
            GeoLayerChange(component.id, false, component.geo, component.color)
        } else if (component.type === "parent") {
            component["children"].forEach((comp) => {
                DeleteLayer(comp)
            })
        }
    }
    function deleteComp(comp) {
        const updatedMeta = JSON.parse(JSON.stringify(clone));
        const deletedInd = comp.split(".").map(index => parseInt(index));
        const deleteParent = findComponent(updatedMeta, deletedInd.slice(0, -1));
        const deleteComp = findComponent(updatedMeta, deletedInd);
        if (deleteComp.type === "parent") {
            deleteComp["children"].forEach((component) => {
                DeleteLayer(component)
            })
        } else {
            DeleteLayer(deleteComp)
        }


        deleteParent.children.splice(deletedInd[deletedInd.length - 1], 1);
        setClone(updatedMeta)

    }

    function addGroupComp() {
        // Ask the user for a name using prompt
        const name = window.prompt("Enter a name for the group:");

        // Ensure a name is provided
        if (!name) {
            // If no name provided, return early
            return;
        }

        // Create a new group object with the provided name
        const newGroup = {
            "type": "parent",
            "name": name,
            "children": []
        };

        // Create a deep copy of the clone
        const updatedMeta = JSON.parse(JSON.stringify(clone));

        // Push the new group object into the children array
        updatedMeta.children.push(newGroup);

        // Update the clone state with the updated meta
        setClone(updatedMeta);
    }

    function ChangeUrl(comp, url) {
        const updatedMeta = JSON.parse(JSON.stringify(clone));
        const Ind = comp.split(".").map(index => parseInt(index));
        const Comp = findComponent(updatedMeta, Ind)
        console.log(Comp, url)
        Comp.url = url
        setClone(updatedMeta);
        UpdateProject(updatedMeta);

    }

    function Rename(comp, type) {
        const name = window.prompt("Enter the new Name:");
        if (!name) {
            return;
        }
        const updatedMeta = JSON.parse(JSON.stringify(clone));
        const RenameInd = comp.split(".").map(index => parseInt(index));
        const renameComp = findComponent(updatedMeta, RenameInd);
        const prevNAME = renameComp.name;
        let news = null
        let prev = null;

        if (renameComp.type === "vector") {
            renameComp.name = name;
            prev = `${prevNAME}#${renameComp.id}`;
            news = `${name}#${renameComp.id}`
            map.fire("decklayerrename", { prev: prev, new: news });
        } else {
            renameComp.name = name;
            prev = prevNAME
            news = name
            map.fire("layerrename", { prev: prev, new: news });
        }
        originalNames.current.push([prev, news, renameComp.type]);
        console.log("prev", prevNAME);

        // Update the clone state
        setClone(updatedMeta);
    }

    function ColorSet(comp, color) {
        const updatedMeta = JSON.parse(JSON.stringify(clone));
        const Ind = comp.split(".").map(index => parseInt(index));
        const Comp = findComponent(updatedMeta, Ind)
        Comp.color = color
        setClone(updatedMeta);
    }

    function checkBoxes() {
        if (toggled && !once) {
            setOnce(true)
            const els = document.getElementsByClassName("check-map");
            for (let i of els) {
                if (toggled.includes(i.value)) {
                    SetToggled(prevToggle => prevToggle.filter(item => item !== i.value));
                    i.click()

                    const parentDetails = i.closest('details');
                    if (parentDetails) {
                        if (!parentDetails.open) {

                            parentDetails.open = true;
                        }
                    }

                }
            }

        }
    };
    useEffect(() => {
        if (clone && !once) {
            console.log("check")
            setTimeout(() => {
                checkBoxes();

            }, 100)
        }
        if (clone && !vectors.length) {
            setVectors(filterVectors(clone["children"]))
        }
    }, [clone, once])

    function SendToControl(id, name, bounds) {
        
        layerControls.addOverlay(L.geoJSON(), id, true, bounds, true, name, false, null)
    }

    function generateListItems(data, comp) {
        return data.map((item, index) => (
            <>
                {item.type === "parent" ? (
                    <>
                       <div>
                        <details id="townD" className="sidenav" style={{ marginBottom: '0px !important' }}>
                            <summary id={comp + `.${index}`} draggable={edit} onDragStart={(e) => edit ? dragS(e, comp + `.${index}`) : null} onDragOver={(e) => edit ? dragE(e, comp + `.${index}`) : null} onDragEnd={(e) => edit ? dragEnd(e, comp + `.${index}`) : null} className="townS">
                                {edit && (
                                    <>
                                        <div className="opts-container">
                                            <button
                                            className="btn-delete"
                                            style={{
                                                fontSize: "12px",
                                                padding: "3px 6px",
                                                backgroundColor: 'transparent',
                                                color: 'red'
                                            }}
                                                onClick={(e) => deleteComp(comp + `.${index}`)}
                                            >
                                                <i className="fa fa-trash"></i>
                                            </button>
                                            <button
                                                className="btn-update"
                                                style={{
                                                    marginLeft: "5px",
                                                    fontSize: "12px",
                                                    padding: "3px 6px",
                                                    backgroundColor: 'transparent',
                                                    color: 'green'
                                                }}
                                                onClick={(e) => Rename(comp + `.${index}`)}
                                            >
                                                <i className="fa fa-pencil"></i>
                                            </button>
                                        </div>
                                    </>
                                )}
                                <p style={{ fontSize: '15px', whiteSpace: 'wrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '5px', display: 'inline-block', marginBottom: "5px", color: 'white' }}>{item.name}</p>

                            </summary>
                            <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right"}}>
                                {generateListItems(item.children, comp + `.${index}`)}
                            </div>
                        </details>
                        </div>
                    </>
                ) : (
                    <div draggable={edit} onDragStart={(e) => edit ? dragS(e, comp + `.${index}`) : null} onDragOver={(e) => edit ? dragE(e, comp + `.${index}`) : null} onDragEnd={(e) => edit ? dragEnd(e, comp + `.${index}`) : null} className="opt-div" style={{ display: "flex", flexDirection: "column", margin: "5px", width: '100%' }} key={item.id}>
                        <div id={comp + `.${index}`} className="sidenav">
                            <div className="opts-container">
                                {item.type === "vector" ? (
                                    <input
                                        value={item.id}
                                        id={item.id}
                                        onChange={(e) => LayerChange(e.target.value, item.name, e.target.checked, false, false, true, item.bounds, item.color)}
                                        type="checkbox"
                                    />
                                ) : item.type === "raster" ? (
                                    <input
                                        value={item.id}
                                        id={item.id}
                                        onChange={(e) => TileLayerChange(e.target.value, item.name, item.name, e.target.checked, true, item.bounds, item.clipper)}
                                        type="checkbox"
                                    />
                                ) : item.type === "draw" ? (
                                    <input
                                        value={item.id}
                                        id={item.id}
                                        onChange={(e) => DrawLayerChange(e.target.value, e.target.checked, item["draw-type"], item.bounds, item.coords)}
                                        type="checkbox"
                                    />
                                ) : item.type === "sat" ? (
                                    <input
                                        value={item.name}
                                        id={item.name}
                                        onChange={(e) => SatLayerChange(e.target.value, e.target.checked, item, comp + `.${index}`)}
                                        type="checkbox"
                                    />
                                ) : item.type === "geo" ? (
                                    <input
                                        value={item.id}
                                        id={item.id}
                                        onChange={(e) => GeoLayerChange(e.target.value, e.target.checked, item.geo, item.color)}
                                        type="checkbox"
                                    />
                                ) : (null)}
                                <label htmlFor={item.id} style={{ whiteSpace: 'wrap', color:'white', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{item.name} {(item.type === "vector") && toggled.includes(item.id) ? (
                                    <button title="Send to Overlay" style={{ marginLeft: "5px", fontSize: "8px" }} onClick={(e) => SendToControl(item.name, item.id, item.bounds)}>
                                        <i className="fa fa-arrow-right"></i>
                                    </button>
                                ) : (null)}</label>
                            </div>
                            <div>
                                {edit && (
                                    <div className="mt-2 opts-container">
                                        <button
                                            className="btn-delete"
                                            style={{
                                                fontSize: "12px",
                                                padding: "3px 6px",
                                                backgroundColor: 'transparent',
                                                color:'red'
                                            }}
                                            onClick={(e) => deleteComp(comp + `.${index}`)}
                                        >
                                            <i className="fa fa-trash"></i>
                                        </button>
                                        <button
                                            className="btn-update"
                                            style={{
                                                marginLeft: "5px",
                                                fontSize: "12px",
                                                padding: "3px 6px",
                                                backgroundColor: 'transparent',
                                                color: 'green'
                                            }}
                                            onClick={(e) => Rename(comp + `.${index}`, item.type)}
                                        >
                                            <i className="fa fa-pencil"></i>
                                        </button>
                                        {(item.type === "vector" || item.type === "geo") && createColor(item.id, comp + `.${index}`, item.type)}
                                        {item.type === "raster" && createRasterButton(item.name, item.id, item.clipper, comp + `.${index}`)}
                                    </div>
                                )}




                            </div>
                        </div>


                    </div>
                )}

            </>
        ));
    }



    function ChangeGeoColor(id, color) {
        if (id in UsedLayers) {
            UsedLayers[id].setStyle({ color: color })
        }
    }
    function createColor(name, comp, type) {
        return (
            <input
                type="color"
                style={{
                    width: "30px",
                    height: "20px",
                    marginBottom: "5px",
                    alignSelf: "center",
                    marginLeft: "5px",
                }}
                onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newColor = e.target.value;
                    console.log(type);
                    ColorSet(comp, newColor);
                    type === "vector"
                        ? map.fire("deckcolorchange", {
                            name: name,
                            color: newColor,
                            checked: toggled.includes(name),
                        })
                        : ChangeGeoColor(name, e.target.value);
                }}
            />
        );
    }
    function createRasterButton(name, id, clipper, index) {
        return (
            <button
                className="btn-raster"
                style={{
                    marginLeft: "5px",
                    fontSize: "6px",
                    padding: "2px 4px",
                    backgroundColor: 'orange',
                    color: 'white'
                }}
                onClick={() => openRasterModal(name, id, clipper, index)}
            >
                <i className="fa fa-scissors"></i>
            </button>
        );
    }

    function ClipSave() {
        const updatedMeta = JSON.parse(JSON.stringify(clone));
        const Ind = modalContent.index.split(".").map(index => parseInt(index));
        const Comp = findComponent(updatedMeta, Ind)
        Comp.clipper = clipVector.split(",")
        setClone(updatedMeta);
        alert("Changes has been Saved. Please refresh to see the changes")
    }



    async function fetchMetaData() {
        const projectId = location.pathname.split("/")[3];

        if (projectId) {
            if (Object.keys(prevMeta).includes(String(projectId))) {
                setMeta(prevMeta[projectId])
                setClone(prevMeta[projectId])
            } else {
                try {
                    const res = await fetch(`${HOST}/fetch-meta/${projectId}`);
                    const data = await res.json();
                    if (res.status === 400) {
                        alert("Unexpected Error Occured. Please try again")
                        navigate("/user-console")
                    } else if (res.status === 200) {
                        setMeta(data.metadata)
                        setClone(data.metadata)
                        setPrevMeta({ [`${projectId}`]: data.metadata });
                    }
                }
                catch (e) {
                    alert("Unexpected Error Occured. Please try again")
                    navigate("/user-console")
                }
            }

        } else {
            alert("Unexpected Error Occured. Please try again")
            navigate("/user-console")
        }

    }


    async function UpdateProject(meta = null) {
        const projectId = location.pathname.split("/")[3];
        const isMeta = meta !== null; // Check if meta is provided

        const data = {
            update: isMeta ? meta : clone,

        };
        if (projectId) {
            try {
                const res = await fetch(`${HOST}/update-project/${projectId}`, {
                    method: "POST",
                    credentials:'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': await getCsrfToken(),
                      },
                    body: JSON.stringify(data)
                });
                if (res.status === 400) {
                    alert("Unexpected Error Occured. Please try again")
                } else if (res.status === 200) {
                    if (!isMeta) {
                        alert("Project updated successfully")
                    }
                    setMeta(clone)
                    setEdit(false)
                    setPrevMeta({ [`${projectId}`]: clone });
                }
            }
            catch (e) {
                alert("Unexpected Error Occured. Please try again")

            }
        } else {
            alert("Unexpected Error Occured. Please try again")

        }

    }



    useEffect(() => {
        const projectId = location.pathname.split("/")[3];
        if (userProjects.some(project => project.id === Number(projectId))) {
            owner.current = "user"
        } else if (organizationProjects.some(project => project.id === Number(projectId))) {
            owner.current = "org"
        }
        fetchMetaData()
    }, [])



    return (
        <>

            {clone && (
                <>
                    <div className="sidepanel-container" style={{gap:'10px'}}>
                        {((owner.current === "user" && userInfo.user_permissions.includes("change_project")) || (owner.current === "org" && userInfo.user_permissions.includes("change_org_project") || userInfo.is_admin || userInfo.is_superuser)) ? (
                            <>
                                <button onClick={(e) => setEdit(!edit)} type='button' className='cancel' title="edit" style={{ color: edit ? "green" : null }} disabled={edit} >
                                    <i className="fa-regular fa-pen-to-square"></i></button>
                            </>
                        ) : (null)}

                        {edit ? (
                            <>
                                <button className='cancel' onClick={(e) => cancel()} title="close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                                <button className='btn-add' onClick={(e) => UpdateProject()} title="save" style={{color:'white'}}><i class="fa-regular fa-square-check"></i></button>
                            </>
                        ) : (null)}
                   

                    {edit ? (
                        <>
                            <button type='button' className="btn-add" title="add group" style={{color:'white'}} onClick={(e) => addGroupComp()} >
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                            </button>
                        </>
                    ) : (null)}

</div>
                    <div className="sidenav">
                        <details className="sidenav" style={{ marginBottom: "30px", width: '-webkit-fill-available' }}>
                            <summary id={"0"} style={{ fontSize: '15px',marginTop:'0px'}}>{clone.name}</summary>
                            <div onDragOver={(e) => edit ? dragE(e, "0") : null} className="text-white">
                                {generateListItems(clone.children, "0")}
                            </div>
                        </details>
                    </div>

                </>

            )}

            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel=""
                style={{
                    content: {
                        width: 'fit-content',
                        height: 'fit-content',
                        margin: 'auto',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0px 0px 15px rgba(0, 0, 0, 0.2)',
                        textAlign: 'center',
                        position: 'relative'  // Ensure relative positioning for the close button
                    }
                }}
            >
                <button
                    onClick={closeModal}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '5px',
                        fontSize: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#FF4C4C',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.2)'
                    }}
                >
                    &times;
                </button>

                <div style={{ marginTop: '40px' }}>
                    <h4 style={{ marginBottom: '15px', fontWeight: 'bold' }}>Layer Name: {modalContent.name}</h4>
                    <h5 style={{ marginBottom: '20px', color: '#555' }}>
                        Current Clipping Layer: {modalContent.clipper ? modalContent.clipper[0] : "None"}
                    </h5>

                    <select onChange={(e) => setClipVector(e.target.value)} style={{ marginBottom: '20px', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}>
                        <option value="">Select a Layer</option>
                        <option value={null}>None</option>
                        {vectors.map((vector, index) => (
                            <option key={index} value={vector}>
                                {vector[0]}
                            </option>
                        ))}
                    </select>
                    {clipVector && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <button
                                onClick={() => ClipSave()}
                                style={{
                                    padding: '8px 15px',
                                    fontSize: '14px',
                                    borderRadius: '5px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.2)'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    )}

                </div>
            </Modal>




        </>
    )

}

export default Project;


