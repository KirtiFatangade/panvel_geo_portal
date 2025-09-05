import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import L from "leaflet"
import { logToServer } from "../../logger";
import { Modal } from "react-bootstrap";
function Conversion() {
  const [show, setshow] = useState(false);
  const { vis } = useContext(GlobalContext)
  const [file, setFile] = useState(null);
  const [mess, setMess] = useState(null)
  const [color, setColor] = useState(null)
  const [fill, setFill] = useState(false)
  const [name, setName] = useState(null)
  const [id, setId] = useState(null)
  const [add, SetAdd] = useState(false)
  const [loader, setLoader] = useState(false)
  const [bounds, setBounds] = useState(null)
  const [aPro, setPro] = useState(false)
  const [pro, setSelPro] = useState("")
  const [path, setPath] = useState(null)
  const [type, setType] = useState(null)
  const [column, setColumn] = useState([])
  // const [selectedcolumn, setselectedcolumn] = useState([])
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [csv, setCsv] = useState(false)
  const [file_path, setfile_path] = useState(null)
  const [parent, setParent] = useState(null)
  const [per, setPer] = useState(null)
  const exclude = ["Panvel", "panvel", "survey", "Jeevit", "Agrani", "Malegaon", "Manyad", "Pune", "Waterbody-Collection", "pune-demo", "satara", "Raigad-Landslide-Hazard-Assesment", "Kolhapur-Flood-Assesment", "Water-Impact-of-water-on-Agri-&-Livestock", "Kolhapur-Forest-Fire-Assesment", "Avalpoondurai-Crop-Classification", "Assam-Flood-2023", "Mines-in-Meghalaya", "Barpeta"]
  const { Canvas,
    layerControls,
    userInfo,
    userProjects,
    organizationProjects,
    map,
    selTab,
    getCsrfToken
  } = useContext(GlobalContext)
  const toolvisRef = useRef(null);
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);

  const toggleModal = () => setShowModal(!showModal);

  const [eventSource, setEventSource] = useState(null);



 

  

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };



  const handleUpload = async () => {
    setMess(null);
    setBounds(null);
    SetAdd(false)
    setLoader(true);
    const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
    if (!file) {
      alert("No file selected.");
      return;
    }
    let styleName = null
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);


    
    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        setPer(Math.round((chunkIndex / totalChunks) * 100))
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);
        formData.append('fileName', file.name);
        if (file.name.split('.').pop().toLowerCase() === "sld") {
          formData.append("name", styleName);
        }

        const response = await fetch(`${HOST}/convert`, {
          method: 'POST',
          credentials:'include',
          headers: {
            'X-CSRFToken': await getCsrfToken(),
          },
          body: formData,
        });

        if (response.ok) {
          let data = await response.json();

          if (data.lastChunk) {
            handleFinalResponse(data)
            setLoader(false);
          }
        } else {
          // Handle non-OK response
          setMess("An error occurred while uploading File.");
          setLoader(false);
          setPer(null)
          return;
        }
      }
    } catch (error) {
      logToServer('error', `Error uploading file: ${error}`);
      setMess("An error occurred while uploading the file.");
      setLoader(false);
      setPer(false)
    }

  };

  const handleFinalResponse = (data) => {
    if (data.zip_file) {
      // Create a link element
      const link = document.createElement('a');
      link.href = `http://localhost:8000/${data.zip_file}`; // Assuming the server provides the zip file path
      link.setAttribute('download', data.zip_file.split('/').pop()); // Set the filename for download
  
      // Append to the body
      document.body.appendChild(link);
      link.click(); // Programmatically click the link to trigger the download
      link.remove(); // Clean up and remove the link
    } else {
      setMess("No zip file was returned.");
    }
  };




  

  return (
    <div style={{ position: vis ? "absolute" : "relative", }} className="toolscont">
      <button title="KML/GPX to SHP" className="btn text-white" id='upload' onClick={() => setshow(prevshow => !prevshow)} style={{ zIndex: "1000", fontSize: "15px", backgroundColor: 'black', padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%", border: "none", }}>C</button>
      {show ? (
        <div ref={toolvisRef} className="toolsvis" id="toolvis" style={{ width: '230px' }}>
          <span
            onClick={() => setshow(false)}
            className="toolclose text-danger"
          >
            &times;
          </span>

          <br />
          {/* <label className="mt-3" htmlFor="fileInput" style={{ marginLeft: '3%' }}>Upload zipped shp file/ .geojson / .tif / .tiff / .geotiff/ .kml / .kmz / .csv only  </label> */}
          <div style={{ display: 'flex', columnGap: '1vw', alignItems: 'center' }}>
            <input className="form-control custom-select mt-1" style={{ marginLeft: '1%', }} type="file" accept=".kml,.gpx" onChange={handleFileChange} ></input>
            <i style={{ fontSize: '20px' }} className="fa fa-info-circle" onClick={toggleModal}

              title="Upload zipped shp file/ .kml / .gpx only"></i>
          </div>

          {showModal && (
            <label className="mt-3" htmlFor="fileInput" style={{ marginLeft: '3%' }}>Upload zipped shp file/ .geojson / .tif / .tiff / .geotiff/ .kml / .kmz / .csv only  </label>

          )}
          
          <button className='btn btn-primary border-0 mt-3' style={{ width: '99%', fontSize: '13px', marginLeft: '0%' }} onClick={handleUpload}>Upload Layer</button>
          <p className="text-info" style={{ marginLeft: '3%' }}>{mess}</p>
          {loader && (
            <>

              <div className="lds-dual-ring" style={{ marginTop: '55px', marginLeft: '-40px' }}>
                <i className="fa-solid fa-globe"></i>
              </div>
              {per ? (<p>Progress: {per}</p>) : (null)}
            </>
          )}


          
        </div>
      ) : null}
    </div>
  )
}

export default Conversion