import React, { useState, useContext, useRef, useEffect } from "react";
import L from "leaflet";
import { HOST } from "../host";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GlobalContext } from "../../App";
require("leaflet-routing-machine");

function useForceUpdate() {
    const [, setValue] = useState(0);
    return () => setValue(value => value + 1);
  }
function Modal({ closeModal, currentDateTime, loc }) {
    // const groups = ["Group One", "Group Two", "Group Three", "Group Four", "Group Five", "Group Six", "Group Seven", "Group Eight", "Group Nine", "Group Ten", "Group Eleven", "Group Twelve"]
    const nos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const build = ["Residential", "Commercial", "Industrial", "Health", "Education", "Emergency Services"]
    const [theme, setTheme] = useState("");
    const [name, setName] = useState("");
    const [no, setNo] = useState("")
    const [imageData, setImageData] = useState(null);
    const [data, setData] = useState(["", "", ""]);

    const CameraComponent = ({ closeModal }) => {
        const [stream, setStream] = useState(null);
        const [error, setError] = useState(null);
        const [selectedFile, setSelectedFile] = useState(null);
        const [isFrontCamera, setIsFrontCamera] = useState(false);


        const startCamera = async (event) => {
            event.preventDefault();
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: isFrontCamera ? 'user' : 'environment' }});
                setStream(mediaStream);
            } catch (err) {
                setError(err.message || "Failed to access camera.");
            }
        };

        const stopCamera = (event) => {
            event.preventDefault();
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                setStream(null);
            }
        };

        const captureImage = () => {
            const video = document.querySelector('video');
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setImageData(dataUrl);
            setStream(null);
        };

        //   const handleImageChange = (event) => {
        //     const file = event.target.files[0];
        //     const reader = new FileReader();
        //     reader.readAsDataURL(file);
        //     reader.onloadend = () => {
        //       setImageData(reader.result);
        //     };
        //   };

        const cancelUpload = () => {
            setImageData(null);
        }


        const toggleCamera = (event) => {
            event.preventDefault();
            setIsFrontCamera((prevIsFrontCamera) => !prevIsFrontCamera); 
            if (stream) {
                // Stop the current stream before starting the camera again with the new facing mode
                stopCamera(new Event('click'));
                startCamera(new Event('click'));
            }
        };
        // const toggleCamera = () => {
        //     setIsFrontCamera(!isFrontCamera);
        //     if (stream) {
        //         startCamera(new Event('click'));
        //     }
        // };

        return (
            <div>
                {stream ? (
                    <div style={{position:'relative'}}  >
                        <video style={{ maxHeight: '200px', margin: '1% 5%' }} autoPlay ref={(videoElement) => {
                            if (videoElement) videoElement.srcObject = stream;
                        }}/>
                         <span style={{ position: 'absolute', bottom: '50px', right: '20px', cursor: 'pointer', zIndex: 1 }} onClick={toggleCamera}>
                            {isFrontCamera ? <i className="fa-solid fa-camera-rotate" style={{ color: 'white', fontSize: '20px' }}></i> : <i className="fa-solid fa-camera-rotate" style={{ color: 'white', fontSize: '20px' }}></i>}
                        </span>

                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1% 5%' }}>
                            <button type="button" className="btn btn-danger" style={{ flex: 1, padding: '2%', fontSize: '14px' }} onClick={stopCamera}>Stop Camera</button>
                            <button type="button" className="btn btn-primary" style={{ flex: 1, padding: '2%', fontSize: '14px' }} onClick={captureImage}>Capture Image</button>
                        </div>
                    </div>
                ) : imageData ? (
                    <div>
                        <img src={imageData} alt="Captured" style={{ maxHeight: '200px', margin: '1% 5%' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1% 3%' }}>
                            <button type="button" className="btn btn-danger" style={{ flex: 1, padding: '2%', fontSize: '14px' }} onClick={cancelUpload}>Cancel</button>
                            <button type="button" className="btn btn-primary" style={{ flex: 1, padding: '2%', fontSize: '14px' }} onClick={(event) => startCamera(event)}>Restart Camera</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1% 3%' }}>
                    <button type="button" className="btn btn-primary" style={{ flex: 1, padding: '1%', fontSize: '14px'}} onClick={(event) => startCamera(event)}>Start Camera</button>
                   
                </div>
                )}
                {error && <p>{error}</p>}
            </div>
        );
    };

    // ) : (
    //     <button type="button" className="btn btn-primary" style={{ width: '90%',margin:'1% 5%', padding:'2%', fontSize:'14px' }} onClick={(event) => startCamera(event)}>Start Camera</button>
    // )}
    // {error && <p>{error}</p>}
    // {imageData && (
    //     <div>
    //         <img src={imageData} alt="Captured" style={{ maxHeight: '200px', maxWidth:'90%',margin:'1% 5%' }} />
    //         <button type="button" className="mt-3 btn btn-danger" style={{ width: '90%',margin:'1% 5%' }} onClick={cancelUpload}>Cancel</button>

    //     </div>
    // )}

    //         );
    // };

    async function uploadSurvey() {

        const emptyFields = {
            // name: !name,
            no: !no,
            theme: !theme,
            data0: !data[0],
            data1: !data[1],
            data2: !data[2],
            imageData: !imageData
        };

        setEmptyFields(emptyFields);

        if (Object.values(emptyFields).some(field => field)) {
            alert("Please enter all fields");
            return;
        }

        // if (!name || !no || !theme || !data[0] || !data[1] || !data[2] || !imageData) {
        //     toast.warn("Please enter all fields");
        //     return;
        // }

        if (no !== "" && theme !== "" && data[0] !== "" && data[1] !== "" && data[2] != "" && imageData) {
            try {
                const latlng = loc.getLatLng()
                // Create an object with the data
                const requestData = {
                    // name: name,
                    number: no,
                    theme: theme,
                    data: data,
                    imageData: imageData,
                    loc: latlng
                };

                const response = await fetch(`${HOST}/upload-survey`, {
                    method: 'POST',
                    credentials:'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data: requestData })
                });

                if (response.ok) {
                    alert('Survey data uploaded successfully.');
                    setName(!name);
                    setNo(!no);
                    setTheme(!theme);
                    setImageData(!imageData);
                    closeModal();
                } else {
                    console.error('Failed to upload survey data.');
                }
            } catch (error) {
                console.error('Error uploading survey data:', error);
            }
        } else {
            alert("Please fill all the fields")
        }

    }

    function handleChange(value, index) {
        let dat = data;
        dat[index] = value
        setData(data);
    }
    useEffect(() => {
        setData(["", "", ""]);
    }, [theme]);

    const [emptyFields, setEmptyFields] = useState({
        name: false,
        no: false,
        theme: false,
        data0: false,
        data1: false,
        data2: false,
        imageData: false
    });

    return (

        <div id="modal" className="col-xl-12 modal survey-form" style={{ width: '100%', margin: 'auto', marginTop: '70px', padding: '20px 5px', maxWidth: '300px', maxHeight: '80vh', overflowY: 'auto', zIndex: '1000000' }}>
            <div className="modal-content">
                <div className="container bg-dark text-white">
                    <span onClick={closeModal} className="btn fs-6 text-white position-absolute top-0 end-0">&times;</span>
                    <form style={{ width: "100%", color: 'white', textAlign: "left", margin: '1% auto', padding: '20px 10px', backgroundColor: 'transparent' }}>
                        <h4 style={{ textAlign: 'center' }}> Survey Form</h4>
                        <p style={{ fontSize: '12px' }}>Current Date and Time:{currentDateTime}</p>
                        {/* <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                        {emptyFields.name && <span style={{ color: 'red',margin:'3% 5% 0% -5%'}}>*</span>}
                            <select
                                id="selectOption"
                                className="form-select mt-2 custom-select"
                                style={{ width: '90%',flex:'1' }}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            >
                                <option value="">Select Group Name</option>
                                {groups.map((i) => (
                                    <option value={i}>{i}</option>
                                ))}
                            </select>
                            
                        </div> */}
                        <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                        {emptyFields.no && <span style={{ color: 'red',margin:'3% 5% 0% -5%' }}>*</span>}
                            <select
                                id="selectOption"
                                className="form-select mt-2 custom-select"
                                style={{ width: '90%', flex:'1' }}
                                value={no}
                                onChange={(e) => setNo(e.target.value)}
                                required
                            >
                                <option value="">Select Group No</option>
                                {nos.map((i) => (
                                    <option value={i}>{i}</option>
                                ))}
                            </select>
                            
                        </div>
                        <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                        {emptyFields.theme && <span style={{ color: 'red',margin:'3% 5% 0% -5%'}}>*</span>}
                            <select
                                id="selectOption"
                                className="form-select mt-2 custom-select"
                                style={{ width: '90%',flex:'1'}}
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                required
                            >
                                <option value="">Select Survey Theme</option>
                                <option value="Buildings">Buildings</option>
                                <option value="Trees">Trees</option>
                            </select>
                           
                        </div>

                        <div className="mt-2 form-group">
                        {emptyFields.imageData && <span style={{ color: 'red', flex:'1'}}>*</span>}
                            <CameraComponent closeModal={closeModal} style={{flex:'1'}}/>
                            
                        </div>

                        {theme === "Buildings" ? (
                            <div>
                                <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                                {emptyFields.data0 && <span style={{ color: 'red',margin:'3% 5% 0% -5%' }}>*</span>}
                                    <input
                                        type="text"
                                        id="remarkInput"
                                        // value={}
                                        onChange={(e) => handleChange(e.target.value, 0)}
                                        className="mt-2 form-control"
                                        style={{ width: '90%', flex:'1'}}
                                        placeholder="Name of Building"
                                        required
                                    />
                                    
                                </div>
                                <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                                {emptyFields.data1 && <span style={{ color: 'red',margin:'3% 5% 0% -5%' }}>*</span>}
                                    <select
                                        id="selectOption"
                                        className="form-select mt-2 custom-select"
                                        style={{ width: '90%', flex:'1'}}
                                        onChange={(e) => handleChange(e.target.value, 1)}
                                        required
                                    >
                                        <option value="">Select Building Type</option>
                                        {build.map((i) => (
                                            <option value={i}>{i}</option>
                                        ))}
                                    </select>
                                   
                                </div>
                                <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                                {emptyFields.data2 && <span style={{ color: 'red',margin:'3% 5% 0% -5%' }}>*</span>}
                                    <input
                                        type='number'
                                        id="remarkInput"
                                        // value={}
                                        onChange={(e) => handleChange(e.target.value, 2)}
                                        className="mt-2 form-control"
                                        style={{ width: '90%', flex:'1'}}
                                        placeholder="No of Floors"
                                        required
                                    />
                                    
                                </div>
                            </div>
                        ) : (null)}
                        {theme === "Trees" ? (
                            <div>
                                <div className="form-group" style={{display:'flex', flexDirection:'row', margin: '1% 5%'  }}>
                                {emptyFields.data0 && <span style={{ color: 'red',margin:'3% 5% 0% -5%' }}>*</span>}
                                    <input
                                        type="text"
                                        id="remarkInput"
                                        // value={}
                                        onChange={(e) => handleChange(e.target.value, 0)}
                                        className="mt-2 form-control"
                                        style={{ flex:'1', width: '90%'}}
                                        placeholder="Name of Tree"
                                        required
                                    />
                                   
                                </div>
                                <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                                {emptyFields.data1 && <span style={{ color: 'red',margin:'3% 5% 0% -5%' }}>*</span>}
                                    <input
                                        type="number"
                                        id="remarkInput"
                                        // value={}
                                        onChange={(e) => handleChange(e.target.value, 1)}
                                        className="mt-2 form-control"
                                        style={{ flex:'1', width: '90%' }}
                                        placeholder="Height of Tree"
                                        required
                                    />
                                    
                                </div>
                                <div className="form-group" style={{display:'flex', flexDirection:'row' , margin: '1% 5%' }}>
                                {emptyFields.data2 && <span style={{ color: 'red',margin:'3% 5% 0% -5%' }}>*</span>}
                                    <input
                                        type="number"
                                        id="remarkInput"
                                        // value={}
                                        onChange={(e) => handleChange(e.target.value, 2)}
                                        className="mt-2 form-control"
                                        style={{flex:'1', width: '90%'}}
                                        placeholder="Girth of Tree"
                                        required
                                    />
                                    
                                </div>
                            </div>
                        ) : (null)}
                        {/* <div className="form-group">
                                <input
                                    type="text"
                                    id="remarkInput"
                                    // value={}
                                    // onChange={(e) => setaddress(e.target.value)}
                                    className="mt-2 form-control"
                                    placeholder="Remark"
                                />
                            </div> */}
                        <button type="button" className="mt-1 btn btn-warning" style={{ width: '90%', margin: '3% 5%', padding: '2%', fontSize: '14px' }} onClick={() => uploadSurvey()}>Upload Survey</button>
                    </form>

                </div>
            </div>
        </div>
    );
}

export default function Survey() {
    const {
        map,
        customMarker,
        layerControls,
        vis,
    setVis,
    } = useContext(GlobalContext);
    const [currentDateTime, setCurrentDateTime] = useState("");
    const [selectedMarkerId, setSelectedMarkerId] = useState(null);
    const [curr, setCurr] = useState(null)
    function drawWaypoint(id) {
        let draw;
        draw = new L.Draw.Marker(map, {
            icon: new customMarker({
                type: "survey"
            }),
            edit: false
        });

        draw.enable();
    }

    function showSurveyModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'block';
            setCurrentDateTime(getCurrentDateTime());
        }
    }

    function getCurrentDateTime() {
        const now = new Date();
        return now.toLocaleString();
    }


    useEffect(() => {
        if (map) {
            const handleDrawCreated = function (e) {
                const layer = e.layer;
                if (e.layerType === "marker") {

                    if (layer.options.icon.options.type === "survey") {
                        showSurveyModal();
                        setCurr(layer)
                    }


                }
            };
            map.on('draw:created', handleDrawCreated);

            return () => {
                map.off('draw:created', handleDrawCreated);
            };
        }
    }, [map]);

    useEffect(() => {
        const handle = function (e) {
            closeModal()
        };
        if (curr) {
            curr.on("remove", handle)
            return () => {
                curr.off('remove', handle);
            };
        }
    }, [curr])

    const closeModal = () => {
        document.getElementById('modal').style.display = 'none';
        setSelectedMarkerId(null);
        if (curr) {
            layerControls.removeLayer(curr, false, false)
            setCurr(null);


        }
    };
    const forceUpdate = useForceUpdate();
    return (
        <>
            <div>
                <button className="btn btn-primary tool" style={{ width: "100%", marginBottom: '3%', borderRadius: '50%' }} onClick={() => { setVis(false);forceUpdate(); drawWaypoint("waypoint");  }}><i className="fa-solid fa-location-dot"></i></button>
            </div>
            <Modal id={selectedMarkerId} loc={curr} closeModal={closeModal} currentDateTime={currentDateTime} />
            <ToastContainer position="bottom-center" theme="colored" draggable={true} />
        </>
    )
}
// useEffect(() => {
    //     if (stream) {
    //         startCamera();
    //     }
    //     return () => {
    //         stopCamera();
    //     };
    // }, [isFrontCamera, stream]);