import React, { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "../../../App";
import L from "leaflet";
import { HOST } from "../../host";
import { logToServer } from "../../logger";
import "../../Pages/ManageOrg.css";

function VectorUtils() {
  const [show, setShow] = useState(false);
  const [file, setFile] = useState(null);
  const [mess, setMess] = useState(null);
  const [showloader, setLoader] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Upload progress percentage
  const [overlay, setOverlay] = useState(null); // Track current overlay
  const path = useRef(null); // Store uploaded image path
  const toolvisRef = useRef(null);
  const fileInputRef = useRef(null);
  const {
    map,
    customMarker,
    layerControls,
    getCsrfToken,
    CreationMode,
    SetCreationMode,
    EditMode,
    SetEditMode,
    Canvas,
  } = useContext(GlobalContext);
  const height = useRef(null);
  const width = useRef(null);
  const bounds = useRef(null);
  const mapRef = useContext(GlobalContext).map; // Reference to Leaflet map
  const navigate = useNavigate();
  const [marker, setMarker] = useState(null);
  const CHUNK_SIZE = 50 * 1024 * 1024;
  const [lines, setLines] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [download, setDownload] = useState(false);
  const pixel = useRef(null);
  const latlng = useRef(null);

  function HandleCreate() {
    if (!CreationMode) {
      SetEditMode(false);
    }
    Canvas.setMode("create");
    SetCreationMode(!CreationMode);
    console.log("CreationMode", CreationMode);
  }
  function HandleEdit() {
    if (!EditMode) {
      SetCreationMode(false);
    }
    Canvas.setMode("edit");
    SetEditMode(!EditMode);
    console.log("EditMode", EditMode);
  }

  return (
    <div
      style={{ position: show ? "absolute" : "relative" }}
      className="toolscont"
    >
      <button
        title="Vector Utilities"
        className="btn text-white"
        id="roadroute"
        onClick={() => setShow((prevShow) => !prevShow)}
        style={{
          zIndex: 1000,
          fontSize: "15px",
          backgroundColor: "black",
          padding: "2px 2px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
        }}
      >
        V
      </button>

      {show && (
        <div
          ref={toolvisRef}
          className="toolsvis"
          id="toolvis"
          style={{ display: "flex", flexDirection: "column", width: "200px" }}
        >
          {/* Creation Mode
           <button
            className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
            onClick={() => {
             HandleCreate()
              
            }}
          >
            Creation Mode
          </button> */}
          <div className="d-flex" style={{gap:"20px"}}>
            <span style={{fontSize:"14px"}}>Create Vector</span>
            <label className="switch" style={{ width: '50px',height: '20px'}}>
              <input
                type="checkbox"
                checked={CreationMode}
                onChange={HandleCreate}
              />
              <span className="slider round"></span>
            </label>
          </div>
          {/* {CreationMode ? (
            <>
            <button
            className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
            onClick={() => {
            Canvas.addPoint()          
            }}
          >
            Point
          </button>
          <button
            className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
            onClick={() => {
                Canvas.addLine()
           }}
          >
            Polyline
          </button>
          <button
            className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
            onClick={() => {
                Canvas.addRectangle()           
            }}
          >
            Rectangle
          </button>
          <button
            className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
            onClick={() => {
                Canvas.addPolygon()        
            }}
          >
            Polygon
          </button>
          <button
            className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
            onClick={() => {
                if (Canvas.checkDownload()) {
                  const layerName = prompt("Enter the name for the layer:");
              
                  if (layerName) {
                    // Call your download logic with the provided layer name
                    let resp=Canvas.saveCreate(layerName);
                    let bounds=L.latLngBounds(
                      L.latLng( resp[1][1],  resp[1][0]), 
                      L.latLng(resp[1][3], resp[1][2])  
                  );
                    layerControls.addOverlay(L.geoJSON(), layerName, true, bounds, true, resp[0], false, null) //Fix bounds
                  } else {
                    alert("Layer name is required to proceed with the download.");
                  }
                } else {
                  alert("Please add Features first");
                }
              }}
          >
           Save
          </button>
            </>
          ):(null)} */}
          {/* <button
            className="mt-2 btn-add"
            style={{ width: "100%", margin: "0px" }}
            onClick={() => {
              HandleEdit();
            }}
          >
            Editing Mode
          </button> */}

          <div className="mt-2 d-flex" style={{gap:"35px"}}>
            <span style={{fontSize:"14px"}}>Edit Vector</span>
            <label className="switch" style={{ width: '50px',height: '20px'}}>
              <input
                type="checkbox"
                checked={EditMode}
                onChange={HandleEdit}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorUtils;
