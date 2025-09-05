import React, { useContext, useEffect, useRef, useState } from "react";
import { HOST } from "../host";
import { Dropdown, Button, Form } from 'react-bootstrap';
import { colorsList } from "../Main/Actions/satStatic";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFile } from '@fortawesome/free-solid-svg-icons';
import log, { logToServer } from "../logger";
import { GlobalContext } from "../../App";


export default function ManageCloudFile({ path, setPath, id }) {
    const [cloudData, setCloudData] = useState(null);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderHistory, setFolderHistory] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [isRoot, setIsRoot] = useState(true);
    const [file, setFile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [uploadPath, setUploadPath] = useState("");
    const {getCsrfToken}=useContext(GlobalContext)
    useEffect(() => {
        fetchProjectFiles(path);
    }, [path]);

    const fetchProjectFiles = async (path) => {
        try {
            const response = await fetch(`${HOST}/cloud/${id}`, {
            });
            if (!response.ok) {
                throw new Error('Failed to fetch project files');
            }
            const data = await response.json();
            setCloudData(data);
            setSelectedElement(data.objects[Object.keys(data.objects)[0]]);
            setCurrentFolder(null);
            setIsRoot(true);
            logToServer('info', 'Fetching cloud File successfully')
        } catch (error) {
            logToServer('error', `Error fetching project files:${error}`)
        }
    };

    const fetchCurrentFolderFiles = async () => {
        await fetchProjectFiles(folderHistory.join('/'));
    };

    const handleFolderClick = (folderName, folderData) => {
        console.log("Folder clicked:", folderName);
        setCurrentFolder(folderName);
        setFolderHistory([...folderHistory, folderName]);
        setSelectedElement(folderData);
        setIsRoot(false);
    };

    const handleBackButtonClick = () => {
        if (folderHistory.length > 1) {
            let ele = null;
            let cData = cloudData.objects[Object.keys(cloudData.objects)[0]];
            folderHistory.slice(0, -1).forEach((key) => {
                ele = cData[key];
                cData = ele;
            });
            setFolderHistory(folderHistory.slice(0, -1));
            setSelectedElement(ele);
            setIsRoot(false);
        } else {
            setFolderHistory([]);
            setSelectedElement(cloudData.objects[Object.keys(cloudData.objects)[0]]);
            setIsRoot(true);
        }
    };

    const handleDelete = async (itemName) => {
        // Show confirmation prompt
        const confirmed = window.confirm(`Are you sure you want to delete ${itemName}?`);

        // If the user cancels, exit the function
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${HOST}/deleteCloud/${id}`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': await getCsrfToken(),
                  },
                body: JSON.stringify({
                    bucket_name: cloudData.bucket_name,
                    object_path: `${cloudData.prefix}/${folderHistory.join('/')}/${itemName}`,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete object');
            }

            // Fetch the updated list of files
            await fetchCurrentFolderFiles();
            logToServer('info', 'File deleted successfully');
        } catch (error) {
            logToServer('error', `Error deleting object: ${error}`);
        }
    };


    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        try {
            if (!file) {
                throw new Error('No file selected');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket_name', cloudData.bucket_name);
            const objectPath = `${cloudData.prefix}/${uploadPath}/${file.name}`.replace(/\/{2,}/g, '/');
            formData.append('object_path', objectPath);
            formData.append('content_type', file.type);

            const response = await fetch(`${HOST}/Upload_object`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'X-CSRFToken': await getCsrfToken(),
                  },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload file');
            }

            logToServer('info', 'File uploaded successfully')

            await fetchCurrentFolderFiles();
        } catch (error) {
            logToServer('error', `Error uploading file:${error}`)
        } finally {
            setShowModal(false);
        }
    };

    const handleCreateFolder = async () => {
        try {
            const formData = new FormData();
            formData.append('bucket_name', cloudData.bucket_name);
            const objectPath = `${cloudData.prefix}/${folderHistory.join('/')}/${newFolderName}/text.txt`.replace(/\/{2,}/g, '/');
            formData.append('object_path', objectPath);

            const response = await fetch(`${HOST}/createfolder`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'X-CSRFToken': await getCsrfToken(),
                  },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to create folder');
            }

            await fetchCurrentFolderFiles();
            logToServer('info', 'Folder created successfully')
        } catch (error) {
            logToServer('error', `Error creating folder:${error}`)
        } finally {
            setShowFolderModal(false);
        }
    };

    const handleDownload = async (itemName) => {
        try {
            const objectPath = `${cloudData.prefix}/${folderHistory.join('/')}/${itemName}`.replace(/\/{2,}/g, '/');
            const response = await fetch(`${HOST}/Download_object?bucket_name=${cloudData.bucket_name}&object_path=${objectPath}`, {
                method: "GET",
                credentials:'include',
            });
            if (!response.ok) {
                throw new Error('Failed to download object');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = itemName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            logToServer('info', 'downloading object successfully')
        } catch (error) {
            logToServer('error', `Error downloading object:${error}`)
        }
    };


    const RenderDropdownMenu = (ele, index) => {
        const isFile = ele.includes('.'); 
        return (
            <Dropdown key={index}>
                <Dropdown.Toggle
                    variant="secondary"
                    id={`dropdownMenuButton_${index}`}
                    className="ellipsis-toggle"
                    style={{ border: "none", outlinr: 'none', backgroundColor: "transparent", padding: 0 }}
                >
                    <i className="fas fa-ellipsis-v" style={{ color: "black", cursor: "pointer" }}></i>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    {isFile ? (
                        <>
                            <Dropdown.Item onClick={() => handleDelete(ele)}>Delete</Dropdown.Item>
                            <Dropdown.Item onClick={() => handleDownload(ele)}>Download</Dropdown.Item>
                        </>
                    ) : (
                        <Dropdown.Item onClick={() => { setUploadPath(`${folderHistory.join('/')}/${ele}`); setShowModal(true); }}>Upload File</Dropdown.Item>
                    )}
                </Dropdown.Menu>
            </Dropdown>
        );
    };

    const GenerateElements = (data) => {
        if (!data || typeof data !== 'object') return null;
        return Object.keys(data)
            .filter((key) => key !== 'text.txt') 
            .map((ele, index) => {
                const isFile = ele.includes('.');
                return (
                    <div style={styles.elementContainer} key={index}>
                        <div style={styles.element}>
                            <FontAwesomeIcon icon={isFile ? faFile : faFolder} style={{ color: '#2c3e50' }} />
                            <span onClick={() => isFile ? handleDownload(ele) : handleFolderClick(ele, data[ele])} style={styles.elementName}>
                                {ele}
                            </span>
                            <div className="dropdown">
                                {RenderDropdownMenu(ele, index)}
                            </div>
                        </div>
                    </div>
                );
            });
    };


    const getCurrentPath = () => {
        return folderHistory.join('/');
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.header}>
                {!isRoot && folderHistory.length > 0 && (
                    <Button className='btn-danger text-white border-0' onClick={handleBackButtonClick} variant="outline-secondary">Back</Button>
                )}
                <h5 style={{ color: 'black' }}>{cloudData ? `${cloudData.prefix}/${getCurrentPath()}` : 'Loading...'}</h5>
                <Button className='add-btn' style={{ padding: '10px 15px' }} onClick={() => setShowFolderModal(true)}>Create Folder</Button>
            </div>
            <div style={styles.tableContainer}>
                <div style={styles.table}>
                    {cloudData && GenerateElements(selectedElement)}
                </div>
            </div>

            {showModal && (
                <div style={styles.customModal}>
                    
                    <div className="user-modal-header">
                        <i className="fa-solid fa-xmark cancel" onClick={() => setShowModal(false)}>
                        </i>
                    </div>
                        <input type="file" className="mt-2 form-control" onChange={handleFileChange} style={styles.fileInput} />
                        <div className="modal-footer w-100">
                            {/* <Button className="btn btn-danger text-white border-0" onClick={() => setShowModal(false)}>Close</Button> */}
                            <Button variant="primary" className="mt-2 btn-add " onClick={handleUpload}>Upload</Button>
                        </div>
                    
                </div>
            )}

            {showFolderModal && (
                <div style={styles.customModal}>
                    
                    <div className="user-modal-header">
                        <i className="fa-solid fa-xmark cancel" onClick={() => setShowFolderModal(false)}>
                        </i>
                    </div>
                        <Form.Group controlId="formFolderName" className="mt-2">
                            <Form.Control
                                type="text"
                                placeholder="Enter folder name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                style={styles.folderNameInput}
                            />
                        </Form.Group>
                       
                            {/* <Button
                                style={{ width: "80px", padding: "4px 8px", fontSize: "12px" }} // Adjusted width and padding
                                variant="secondary"
                                onClick={() => setShowFolderModal(false)}
                            >
                                Close
                            </Button> */}
                            <div className="modal-footer w-100">
                            <button
                                className="btn-add "
                                variant="primary"
                                onClick={handleCreateFolder}
                            >
                                Create
                            </button>
                            </div>
                        
                    
                </div>
            )}
        </div>
    );
}

const styles = {
    wrapper: {
        padding: '20px',
        backgroundColor: 'transparent',
        borderRadius: '8px',
        maxWidth: '80vw',
        height: 'calc(90vh - 80px)',
        overflow: 'hidden',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1vh',
    },
    tableContainer: {
        height: 'calc(80vh - 80px)', // Subtract header and padding height
        overflow: 'hidden',
        overflowY: 'scroll',
        border: 'none',
        borderRadius: '8px'
    },
    table: {
        width: '100%',
        paddingTop: '10px',
    },
    elementContainer: {
        marginBottom: '10px',
    },
    element: {
        display: 'flex',
        flexDirection: 'row',
        padding: '10px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        alignItems: 'center'
    },
    elementName: {
        flex: '1',
        marginLeft: '15px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '400',
        color: 'black',
    },
    ellipsisToggle: {
        border: 'none',
        borderColor: 'transparent',
        outline: 'none',
        backgroundColor: '#fff',
        boxShadow: 'none',
        '&:focus': {
            outline: 'none',
            boxShadow: 'none',
        }
    },
    customModal: {
        position: 'fixed',
        top: '20%',
        left: '40%',
        // transform: 'translate(-50%, -50%)',
        // width: '200px',
        // height: 'auto',
        // backgroundColor: 'rgba(0, 0, 0, 0)',
        // display: 'flex',
        // justifyContent: 'center',
        // alignItems: 'center',
        // zIndex: 1000,
        // padding: '10px',
        // borderRadius: "8px"

        margin: '8% auto',
        padding: ' 0% 2% 1% 2%',
        backgroundColor: '#ffffff',
        transition: 'opacity 0.3s ease',
        boxShadow: '1px 5px 10px 8px #bbbbbb',
        animation: 'popup 0.3s ease-in-out',
        width: 'fit-content',
        maxHeight: 'calc(100vh-400px)',
        overflow: 'hidden',
        overflowY: 'scroll',
        borderRadius: '5px',

    },
    customModalContent: {
        backgroundColor: 'white',
        padding: '15px',
        width: '100%',
        maxWidth: '100%',
        textAlign: 'center',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '15px',
    },
    folderNameInput: {
        width: '100%',
        marginBottom: '15px',
    },
};
