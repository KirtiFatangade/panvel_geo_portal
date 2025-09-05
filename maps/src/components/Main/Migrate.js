import React, { useEffect, useState, useContext, useRef } from 'react';
import Markdown from 'react-markdown';
import files from '../static';
import { HOST } from "../host";
import { GlobalContext } from '../../App';
import { logToServer } from '../logger';

export default function Migrate({ layers, setMigrate }) {
    const { userInfo, organizationProjects, userProjects, getCsrfToken } = useContext(GlobalContext);
    const [isNew, setIsNew] = useState(false);
    const [selectedLayers, setSelectedLayers] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const exclude = ["Panvel", "panvel", "survey", "Jeevit", "Agrani", "Malegaon", "Manyad", "Pune", "Waterbody-Collection", "pune-demo", "satara", "Raigad-Landslide-Hazard-Assesment", "Kolhapur-Flood-Assesment", "Water-Impact-of-water-on-Agri-&-Livestock", "Kolhapur-Forest-Fire-Assesment", "Avalpoondurai-Crop-Classification", "Assam-Flood-2023", "Mines-in-Meghalaya", "Barpeta"];

    const handleCheckboxChange = (event, layerInfo) => {
        const isChecked = event.target.checked;
        const [layerName, layerId] = layerInfo;
        if (isChecked) {
            setSelectedLayers(prevState => [...prevState, { name: layerName, id: layerId }]);
        } else {
            setSelectedLayers(prevState => prevState.filter(layer => layer.id !== layerId));
        }
    };

    const handleSelectAll = () => {
        if (selectedLayers.length === layers.length) {

            setSelectedLayers([]);
        } else {

            const allLayers = layers.map(layer => ({ name: layer.name, id: layer.id }));
            setSelectedLayers(allLayers);
        }
    };

    const handleProjectChange = (event) => {
        setSelectedProject(event.target.value);
    };

    const allProjects = [...userProjects, ...organizationProjects];

    const handleRadioChange = () => {
        setIsNew(!isNew);
        if (isNew) {
            setSelectedProject(null);
        }
    };

    async function migrate() {
        logToServer("info", `Migration started ${selectedLayers, selectedProject}`); // Log migration start
        let projectName = selectedProject;

        if (isNew) {
            projectName = window.prompt("Please enter the new project name:");
            if (!projectName) {
                logToServer("error", "Migration failed: Project name required for new project"); // Log error

                alert("Project name is required for a new project.");
                return;
            }
        }

        if ((isNew || selectedProject) && selectedLayers.length) {
            try {
                const res = await fetch(`${HOST}/migrate-project/${isNew ? `newNAME${projectName}` : selectedProject}`, {
                    method: "POST",
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': await getCsrfToken(),
                    },
                    body: JSON.stringify({ data: { acts: selectedLayers } })
                });
                if (res.status === 400) {
                    logToServer("error", "Migration failed: Unexpected error occurred (400)"); // Log error
                    alert("Unexpected Error Occured. Please try again");
                } else if (res.status === 200) {
                    logToServer("info", "Migration successful: Project updated successfully"); // Log success
                    alert("Project updated successfully");
                    const event = new Event('added-to-pro');
                    document.dispatchEvent(event);
                } else if (res.status === 201) {
                    logToServer("error", "Migration failed: Only 10 layers allowed (201)"); // Log error
                    alert("Only 10 layers allowed")
                    return
                }
            } catch (e) {
                logToServer("error", "Migration failed: Unexpected error occurred"); // Log error
                alert("Unexpected Error Occured. Please try again");
            }
        } else {
            logToServer("error", "Migration failed: No layers or project selected"); // Log error
            alert("Please select at least one layer and a project");
        }
    }

    return (
        <>
            <div style={{ backgroundColor: '#F7F7F7', width: '500px', maxHeight: '550px', overflow:'hidden', overflowY:'scroll', display: 'flex', flexDirection: 'column' }}>
                <div className="border-0 user-modal-header">
                    <i className="fas fa-times cancel" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMigrate(false); }} style={{ marginRight: '20px' }} ></i>
                </div>
                <div style={{ padding: '40px 30px' }}>
                    <div className='d-flex' style={{ position: 'relative', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '20px', textAlign: 'center' }}>Select Layers to Migrate:</p>
                        <button onClick={handleSelectAll} className='btn-add'
                            style={{ padding: '5px 20px', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '20px' }}
                        >
                            {selectedLayers.length === layers.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    {layers ? (
                        <>
                            {layers.map((layer) => (
                                <div key={layer.id} style={{ marginBottom: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id={`layer-${layer.id}`}
                                        className="form-check-input check-map"
                                        checked={selectedLayers.some(item => item.id === layer.id)}
                                        onChange={(event) => handleCheckboxChange(event, [layer.name, layer.id])}
                                        style={{ marginRight: '10px', borderColor: "black" }}
                                    />
                                    <label htmlFor={`layer-${layer.id}`}>{layer.name}</label>
                                </div>
                            ))}
                        </>
                    ) : (null)}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select value={selectedProject} className="form-select mt-3" onChange={handleProjectChange} style={{ width: '75%', fontSize: '13px', marginBottom: '20px', border: '1px solid #ccc' }} disabled={isNew}>
                            <option value="">Select a Project</option>
                            {allProjects.map(project => (
                                !exclude.includes(project.name) && (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                )
                            ))}
                        </select>
                        <div style={{ display: 'flex', color: 'white', paddingTop: '25px' }}>
                            <input type="checkbox" id="new-project" className="check-map" disabled={userInfo.org_name === "global" && userProjects.length === 1} checked={isNew} onChange={() => setIsNew(!isNew)} style={{ marginRight: '5px' }} />
                            <label htmlFor="new-project" style={{ marginBottom: '0' }}>New Project</label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={(e) => migrate()}
                            className='btn-add'
                            style={{ width: '100%', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', margin:'0px' }}
                        >Migrate
                        </button>
                        {/* <div style={{ display: 'flex', color: 'white', justifyContent: 'center', paddingTop:'10px' }}>
                            <input type="checkbox" id="new-project" className="check-map" disabled={userInfo.org_name === "global" && userProjects.length === 1} checked={isNew} onChange={() => setIsNew(!isNew)} style={{ marginRight: '5px' }} />
                            <label htmlFor="new-project" style={{ marginBottom: '0' }}>New Project</label>
                        </div> */}
                    </div>
                </div>
            </div>
        </>
    );
}
