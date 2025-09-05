import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import L from "leaflet";
import { logToServer } from "../../logger";
import { Modal } from "react-bootstrap";
function Upload() {
  const [show, setshow] = useState(false);
  const { vis } = useContext(GlobalContext);
  const [file, setFile] = useState(null);
  const [mess, setMess] = useState(null);
  const [color, setColor] = useState(null);
  const [fill, setFill] = useState(false);
  const [name, setName] = useState(null);
  const [id, setId] = useState(null);
  const [add, SetAdd] = useState(false);
  const [loader, setLoader] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [aPro, setPro] = useState(false);
  const [pro, setSelPro] = useState("");
  const [path, setPath] = useState(null);
  const [type, setType] = useState(null);
  const [column, setColumn] = useState([]);
  // const [selectedcolumn, setselectedcolumn] = useState([])
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [csv, setCsv] = useState(false);
  const [file_path, setfile_path] = useState(null);
  const [parent, setParent] = useState(null);
  const [per, setPer] = useState(null);
  const exclude = [
    "Panvel",
    "panvel",
    "survey",
    "Jeevit",
    "Agrani",
    "Malegaon",
    "Manyad",
    "Pune",
    "Waterbody-Collection",
    "pune-demo",
    "satara",
    "Raigad-Landslide-Hazard-Assesment",
    "Kolhapur-Flood-Assesment",
    "Water-Impact-of-water-on-Agri-&-Livestock",
    "Kolhapur-Forest-Fire-Assesment",
    "Avalpoondurai-Crop-Classification",
    "Assam-Flood-2023",
    "Mines-in-Meghalaya",
    "Barpeta",
  ];
  const {
    Canvas,
    layerControls,
    userInfo,
    userProjects,
    organizationProjects,
    map,
    selTab,
    getCsrfToken,
  } = useContext(GlobalContext);
  const toolvisRef = useRef(null);
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);

  const toggleModal = () => setShowModal(!showModal);

  const [eventSource, setEventSource] = useState(null);

  async function sendAct() {
    let data = {};
    if (window.location.pathname.startsWith("/project/")) {
      const projectId = window.location.pathname.split("/")[3];
      data["project"] = projectId;
    } else {
      data["project"] = "global";
    }
    data["memb"] = userInfo.id;
    data["tab"] = selTab;
    data["id"] = name;
    data["type"] = type;
    data["pro"] = pro;
    data["bounds"] = bounds;
    data["path"] = path;
    data["add"] = aPro;
    try {
      const response = await fetch(`${HOST}/upload-act`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      });
      if (!response.ok) {
        logToServer("error", "failed to send draw data");
        throw new Error("Failed to send draw data");
      }
      const responseData = await response.json();
      logToServer("info", "send Draw data");
      return responseData;
    } catch (error) {
      logToServer("error", `Error occurred while sending draw data:${error}`);
      throw error;
    }
  }

  async function AddLayertoPro() {
    if (pro && pro !== "") {
      setLoader(true);
      try {
        const res = await fetch(`${HOST}/layer-to-pro`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": await getCsrfToken(),
          },
          body: JSON.stringify({
            data: {
              name: name,
              id: id,
              bounds: bounds,
              type: type,
              project: pro,
              user: userInfo.id,
              path: path,
            },
          }),
        });
       console.log('data',res)
        if (res.status === 400) {
          alert("Layer Not added");
          setLoader(false);
          logToServer("error", "Layer Not added to project");
          return false;
        } else if (res.status === 200) {
          alert("Layer added Successfully");
          logToServer("info", "Layer added successfully to project");
          setLoader(false);
          const projectId = location.pathname.split("/")[3];
          if (projectId) {
            const event = new Event("added-to-pro");
            document.dispatchEvent(event);
          }

          return true;
        }
      } catch (e) {
        setLoader(false);
        logToServer(
          "error",
          `Unexpected error while adding layer to project: ${e}`
        );
        alert("Unexpected error occured. Please try again");
      }
    } else {
      alert("Please select a project");
      return false;
    }
  }
  async function deletePath(path) {
    await fetch(`${HOST}/delete-objects`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ data: { path: path } }),
    });
  }
  // useEffect(() => {

  //   let paths = sessionStorage.getItem('path');
  //   if (paths) {
  //     paths = JSON.parse(paths);
  //     if (Array.isArray(paths)) {
  //       sessionStorage.removeItem('path');
  //       deletePath(paths)
  //     }
  //   }
  // }, [])
  function AddLayer() {
    const savedPath = sessionStorage.getItem("path");
    if (savedPath) {
      sessionStorage.removeItem("path");
    }
    if (aPro) {
      if (!AddLayertoPro()) {
        return;
      }
    }
    SetAdd(false);
    setMess(null);
    const projectExists =
      userProjects.some(
        (project) => project.id === location.pathname.split("/")[3]
      ) ||
      organizationProjects.some(
        (project) => project.id === location.pathname.split("/")[3]
      );
    sendAct().then((result) => {
      if (projectExists && aPro) {
        setPro(false);
        setSelPro("");
        return;
      }
      setPro(false);
      setSelPro("");
      if (type === "vector") {
        let layer_col = color ? color : "#000000";
        Canvas.addLayer(name, id, layer_col, fill, true, bounds);
        layerControls.addOverlay(
          L.geoJSON(),
          id,
          true,
          bounds,
          true,
          name,
          false,
          result.parent
        );
      } else {
        const minLat = bounds[0][0];
        const minLon = bounds[0][1];
        const maxLat = bounds[1][0];
        const maxLon = bounds[1][1];

        const polygonCoordinates = [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ];
        const latLngBounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);
        const geojsonPolygon = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [polygonCoordinates],
              },
              properties: {},
            },
          ],
        };
        let layer = L.TileLayer.boundaryCanvas(
          `https://geoserver.vasundharaa.in/geoserver/useruploads/gwc/service/wmts?layer=useruploads:${name}&style=&tilematrixset=EPSG%3A900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A900913%3A{z}&TileCol={x}&TileRow={y}`,
          {
            boundary: geojsonPolygon,
            zIndex: 1000,
            bounds: latLngBounds,
            maxZoom: 20,
          }
        );

        layerControls.addOverlay(
          layer,
          id,
          false,
          false,
          false,
          false,
          false,
          result.parent
        );
        layer.addTo(map);
        map.flyToBounds(bounds);
      }

      // deletePath(path)
      logToServer("info", "Layer added successfully");
    });
  }

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  // const listenForUpdates = () => {
  //   const es = new EventSource(`${HOST}/sse/updates/${userInfo.id}`);
  //   setEventSource(es);

  //   es.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     if (
  //       data.message === "success" ||
  //       data.message === "csv" ||
  //       data.message === "sld"
  //     ) {
  //       setLoader(false);
  //       handleFinalResponse(data);
  //       es.close();
  //     }
  //   };
  //   es.onerror = (error) => {
  //     console.error("EventSource failed:", error);
  //     setMess("An error occurred while receiving updates.");
  //     es.close();
  //   };
  // };

  const listenForUpdates = () => {
    const intervalId = setInterval(() => {
      fetch(`${HOST}/sse/updates/${userInfo.id}`)
        .then((response) => response.json())
        .then((data) => {
          if (
            data.message === "success" ||
            data.message === "csv" ||
            data.message === "sld"
          ) {
            setLoader(false);
            handleFinalResponse(data);
            clearInterval(intervalId); // Stop the interval once we get the desired response
          }
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          clearInterval(intervalId); // Stop the interval if there is an error
        });
    }, 5000); // Check every 5 seconds
  };

  const handleUpload = async () => {
    setMess(null);
    setBounds(null);
    SetAdd(false);
    setLoader(true);
    const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
    console.log("CHUNK_SIZE", CHUNK_SIZE);
    if (!file) {
      alert("No file selected.");
      return;
    }
    let styleName = null;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    console.log("totalChunks", totalChunks);
    if (file.name.split(".").pop().toLowerCase() === "sld") {
      styleName = prompt("Enter Style Name:");
      if (!styleName) {
        alert("Style name is required.");
        return;
      }
    }
    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        setPer(Math.round((chunkIndex / totalChunks) * 100));
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("chunkIndex", chunkIndex);
        formData.append("totalChunks", totalChunks);
        formData.append("fileName", file.name);
        console.log('filenamegeo', file.name)
        if (file.name.split(".").pop().toLowerCase() === "sld") {
          formData.append("name", styleName);
        }

        const response = await fetch(`${HOST}/upload/${userInfo.id}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": await getCsrfToken(),
          },
          body: formData,
        });

        if (response.ok) {
          let data = await response.json();
          if (data.lastChunk) {
            listenForUpdates();
          }
        } else {
          console.log(response);
          setMess("An error occurred while uploading File.");
          setLoader(false);
          setPer(null);
          return;
        }
      }
    } catch (error) {
      logToServer("error", `Error uploading file: ${error}`);
      setMess("An error occurred while uploading the file.");
      setLoader(false);
      setPer(false);
    }
  };

  const handleFinalResponse = (data) => {
    setPer(false);
    if (data["message"] === "success") {
      setMess("Layer created successfully");
      setName(data["name"]);
      setBounds(data["bounds"]);
      setPath(data["path"]);
      setType(data["type"]);
      setParent(data["parent"]);
      SetAdd(true);
      setFill(false);
      setColor(null);
      setCsv(false);

      let existingPaths = sessionStorage.getItem("path");
      if (existingPaths) {
        existingPaths = JSON.parse(existingPaths);
        deletePath(existingPaths);
      }

      sessionStorage.setItem("path", JSON.stringify([data["path"]]));
      logToServer("info", "Layer created successfully");
    } else if (data["message"] === "csv") {
      setColumn(data.csv_content);
      setfile_path(data.file_path);
      setCsv(true);
    } else if (data["message"] === "sld") {
      if (data["status"]) {
        setMess("SLD uploaded successfully");
      } else {
        setMess("SLD was not uploaded");
      }
      SetAdd(false);
      setCsv(false);
    } else {
      setMess("Layer was not created.");
      logToServer("error", "Layer was not created.");
      SetAdd(false);
      setCsv(false);
    }
  };

  // hide content on click anyshwre on screen
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest("#upload") &&
        toolvisRef.current &&
        !toolvisRef.current.contains(event.target)
      ) {
        setshow(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);
  // edited by Amit

  const handleLongitudeChange = (e) => {
    setLongitude(e.target.value);
  };
  const handleLatitudeChange = (e) => {
    setLatitude(e.target.value);
  };

  const handleclick2 = async () => {
    if (!latitude || !longitude) {
      alert("Please select Latitude and Longitude columns.");
      return;
    }
    const latitudeIndex = column.indexOf(latitude);
    const longitudeIndex = column.indexOf(longitude);

    // console.log(file);
    // console.log(file_path);
    const formData = new FormData();
    formData.append("path", file_path);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);

    setLoader(true);
    try {
      const response = await fetch(`${HOST}/upload_csv`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data["message"] === "success") {
          setMess("Layer created successfully");
          setName(data["name"]);
          setBounds(data["bounds"]);
          setPath(data["path"]);
          setType(data["type"]);
          setParent(data["parent"]);
          SetAdd(true);
          setFill(false);
          setColor(null);
          setCsv(false);
          setLoader(false);
          logToServer("info", "Layer was created Successfully");
        } else {
          setLoader(false);
          logToServer("error", "Failed Layer was not Create");
          alert("Layer was not created.");
        }
      } else {
        setLoader(false);
        alert("Failed to upload file.");
        logToServer("error", "Failed to upload File");
      }
    } catch (error) {
      logToServer("error", `Error uploading file:${error}`);
    }
  };

  return (
    <div
      style={{ position: vis ? "absolute" : "relative" }}
      className="toolscont"
    >
      <button
        title="Upload"
        className="btn text-white"
        id="upload"
        onClick={() => setshow((prevshow) => !prevshow)}
        style={{
          zIndex: "1000",
          fontSize: "15px",
          backgroundColor: "black",
          padding: "2px 2px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
        }}
      >
        <i className="fa-solid fa-upload"></i>
      </button>
      {show ? (
        <div
          ref={toolvisRef}
          className="toolsvis"
          id="toolvis"
          style={{ width: "230px" }}
        >
          <span
            onClick={() => setshow(false)}
            className="toolclose text-danger"
          >
            &times;
          </span>

          <br />
          {/* <label className="mt-3" htmlFor="fileInput" style={{ marginLeft: '3%' }}>Upload zipped shp file/ .geojson / .tif / .tiff / .geotiff/ .kml / .kmz / .csv only  </label> */}
          <div
            style={{ display: "flex", columnGap: "1vw", alignItems: "center" }}
          >
            <input
              className="form-control custom-select mt-1"
              style={{ marginLeft: "1%" }}
              type="file"
              accept=".zip,.tif,.tiff,.geotiff,.kml,.kmz,.csv,.geojson,.sld"
              onChange={handleFileChange}
            ></input>
            <i
              style={{ fontSize: "17px" }}
              className="fa-solid fa-info"
              onClick={toggleModal}
              title="Upload zipped shp file/ .geojson / .tif / .tiff / .geotiff/ .kml / .kmz / .csv only"
            ></i>
          </div>

          {showModal && (
            <label
              className="mt-3"
              htmlFor="fileInput"
              style={{ marginLeft: "3%", color: "white" }}
            >
              Upload zipped shp file/ .geojson / .tif / .tiff / .geotiff/ .kml /
              .kmz / .csv only{" "}
            </label>
          )}
          {column && column.length && csv ? (
            <>
              <div>
                <p
                  className="mt-1"
                  style={{
                    marginBottom: "5px",
                    fontSize: "13px",
                    color: "white",
                    textAlign: "left",
                  }}
                >
                  Please Select columns for Latitude and Longitude
                </p>
              </div>
              <select
                value={longitude}
                onChange={handleLongitudeChange}
                className="form-control"
              >
                <option value="">Select Latitude </option>
                {column.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={latitude}
                onChange={handleLatitudeChange}
                className="mt-2 form-control"
              >
                <option value="">Select Longitude</option>
                {column.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <button
            className="btn btn-primary border-0 mt-3"
            style={{ width: "99%", fontSize: "13px", marginLeft: "0%" }}
            onClick={csv ? handleclick2 : handleUpload}
          >
            Upload Layer
          </button>
          <p className="m-2 text-info text-justify">{mess}</p>
          {loader && (
            <>
              <div
                className="lds-dual-ring"
                style={{ marginTop: "55px", marginLeft: "20px" }}
              >
                <i className="fa-solid fa-globe"></i>
              </div>
              {per ? <p>Progress: {per}%</p> : null}
            </>
          )}

          {add && (
            <>
              {type === "vector" ? (
                <>
                  <div style={{ margin: "5px" }}>
                    <input
                      style={{ marginRight: "2px" }}
                      type="color"
                      id="color"
                      onChange={(e) => setColor(e.target.value)}
                      name="color"
                    />
                    <label
                      htmlFor="color"
                      style={{ fontSize: "13px", color: "white" }}
                    >
                      Select Color
                    </label>
                  </div>
                  <div style={{ margin: "5px" }}>
                    <input
                      style={{ marginRight: "2px" }}
                      type="checkbox"
                      id="fill"
                      onChange={(e) => setFill(e.target.checked)}
                      name="fill"
                    />
                    <label
                      htmlFor="fill"
                      style={{ fontSize: "13px", color: "white" }}
                    >
                      Fill
                    </label>
                  </div>
                </>
              ) : null}

              <div style={{ margin: "5px" }}>
                <input
                  className="form-control"
                  style={{
                    marginRight: "2px",
                    marginLeft: "1%",
                    height: "30px",
                    fontSize: "13px",
                  }}
                  type="text"
                  id="name"
                  onChange={(e) => setId(e.target.value)}
                  name="name"
                  placeholder="Enter Layer Name"
                />
              </div>
              <div className="mt-3">
                <input
                  style={{ marginLeft: "3%" }}
                  onChange={(e) => setPro(!aPro)}
                  type="checkbox"
                  id="pro"
                  name="userType"
                  value="pro"
                />
                <label
                  style={{
                    marginLeft: "5px",
                    fontSize: "13px",
                    color: "white",
                  }}
                  htmlFor="pro"
                >
                  {" "}
                  Add to a project
                </label>
              </div>
              {aPro ? (
                <div style={{ margin: "5px" }}>
                  <select
                    className="form-select custom-select"
                    style={{ padding: "4px" }}
                    value={pro}
                    onChange={(e) => setSelPro(e.target.value)}
                  >
                    <option key={0} value="">
                      Select a Project
                    </option>
                    {userProjects &&
                      userProjects.map(
                        (pro) =>
                          !exclude.includes(pro.name) && (
                            <option key={pro.id} value={pro.id}>
                              {pro.name}
                            </option>
                          )
                      )}
                    {userInfo.is_admin &&
                      organizationProjects &&
                      organizationProjects.map(
                        (pro) =>
                          !exclude.includes(pro.name) && (
                            <option key={pro.id} value={pro.id}>
                              {pro.name}
                            </option>
                          )
                      )}
                  </select>
                </div>
              ) : null}

              <button
                className="btn btn-primary border-0 mt-3 mb-3"
                style={{
                  width: "90%",
                  height: "30px",
                  fontSize: "11px",
                  marginLeft: "3%",
                }}
                onClick={AddLayer}
              >
                Add Layer
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default Upload;
