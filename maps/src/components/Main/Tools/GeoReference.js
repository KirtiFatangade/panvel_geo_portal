import React, { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "../../../App";
import L from "leaflet";
import { HOST, HOST_MEDIA_URL } from "../../host";
import { logToServer } from "../../logger";
import Modal from "react-modal";

function GeoReference() {
  const [show, setShow] = useState(false);
  const [file, setFile] = useState(null);
  const [mess, setMess] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [overlay, setOverlay] = useState(null);
  const path = useRef(null); // Store uploaded image path
  const toolvisRef = useRef(null);
  const fileInputRef = useRef(null);
  const { map, customMarker, layerControls, getCsrfToken } =
    useContext(GlobalContext);
  const height = useRef(null);
  const width = useRef(null);
  const bounds = useRef(null);
  const mapRef = useContext(GlobalContext).map; // Reference to Leaflet map
  const CHUNK_SIZE = 50 * 1024 * 1024; //52 MB
  const [lines, setLines] = useState([]);
  const polylines = useRef({});
  const [markers, setMarkers] = useState([]);
  const [download, setDownload] = useState(false);
  const [modify, setModify] = useState(false);
  const pixel = useRef(null);
  const latlng = useRef(null);
  const [lineCount, setLineCount] = useState(0); // Tracks number of lines drawn
  const [markerCount, setMarkerCount] = useState(0); // Tracks number of markers drawn
  const [GeoRefByLine, setGeoRefByLine] = useState(false);
  const [GeoRefByMarker, setGeoRefByMarker] = useState(false);
  const [inputLatLngModal, setInputLatLngModal] = useState(false);
  const [inputLat, setInputLat] = useState(null);
  const [inputLng, setInputLng] = useState(null);
  const [initialMarkerLatLng, setInitialMarkerLatLng] = useState(null);

  const handleFileChange = (event) => {
    try {
      setFile(event.target.files);
    } catch (e) {
      alert("Please select File(s)");
    }
  };

  const handleUpload = async () => {
    setMess(null);
    setUploadProgress(0);

    if (file) {
      try {
        let files = Array.from(file);
        for (const f of files) {
          const totalChunks = Math.ceil(f.size / CHUNK_SIZE);
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(f.size, start + CHUNK_SIZE);
            const chunk = f.slice(start, end);
            const formData = new FormData();
            formData.append("chunk", chunk);
            formData.append("chunkIndex", chunkIndex);
            formData.append("totalChunks", totalChunks);
            formData.append("fileName", f.name);

            const response = await fetch(`${HOST}/uploads/georef`, {
              method: "POST",
              credentials: "include",
              headers: {
                "X-CSRFToken": await getCsrfToken(),
              },
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              console.log(data);

              // Update progress percentage
              const progress = Math.round(
                ((chunkIndex + 1) / totalChunks) * 100
              );
              setUploadProgress(progress);

              if (chunkIndex === totalChunks - 1 && data.path) {
                path.current = data.path;
                // Save the image path
                width.current = data.width;
                height.current = data.height;
                addImageOverlay(data.path, data.height, data.width, false);
                removeAllLines();
                setUploadProgress(0);
              }
            } else {
              setMess("An error occurred while uploading chunks.");
              return;
            }
          }
        }
      } catch (error) {
        logToServer("error", `Error uploading files: ${error}`);
        setMess("An error occurred while uploading the files.");
        return;
      }

      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      alert("Please select File(s)");
    }
  };

  const addImageOverlay = (imagePath, height, width, bound = false) => {
    setDownload(false);
    imagePath = `${HOST_MEDIA_URL}/${imagePath}`;

    if (!mapRef) return;
    const map = mapRef;

    if (overlay) overlay.remove();

    const imageWidth = 50; // Set image dimensions
    const imageHeight = 50;
    let boundsss;
    if (!bound) {
      boundsss = L.latLngBounds(
        map.containerPointToLatLng([
          (map.getSize().x - imageWidth) / 2,
          (map.getSize().y - imageHeight) / 2,
        ]),
        map.containerPointToLatLng([
          (map.getSize().x + imageWidth) / 2,
          (map.getSize().y + imageHeight) / 2,
        ])
      );
      bounds.current = boundsss;
    } else {
      boundsss = bounds.current;
    }

    const newOverlay = L.imageOverlay(imagePath, boundsss).addTo(map);
    layerControls.addOverlay(
      newOverlay,
      "Geo-Image",
      false,
      false,
      false,
      false,
      false,
      null
    );
    setOverlay(newOverlay);
  };

  // Creates a new Leaflet Draw Marker (L.Draw.Marker) with a custom icon (geo_start), Enables the drawing mode with .enable(),
  //  If GeoRefByMarker is true, it opens the latitude/longitude input modal (setInputLatLngModal(true);).
  function HandleDrawClick(e) {
    let draw = new L.Draw.Marker(map, {
      icon: new customMarker({
        type: "geo_start",
      }),
      draggable: false,
    });
    draw.enable();

    const onDrawCreated = (e) => {
      if (GeoRefByMarker) {
        const { layer } = e;
        const markerLatLng = layer.getLatLng();

        console.log("Marker added at:", markerLatLng);

        // Store marker LatLng in state
        setInitialMarkerLatLng(markerLatLng);
        map.addLayer(layer);

        // Open input modal and pre-fill values
        setInputLat(markerLatLng.lat);
        setInputLng(markerLatLng.lng);
        setInputLatLngModal(true);

        // Disable drawing mode completely
        draw.disable();
        map.off("draw:created", onDrawCreated);

        // Forcefully remove any active drawing tools
        if (map.editTools) {
          map.editTools.stopDrawing();
        }
        console.log("Drawing mode disabled, no further markers can be placed.");
      } else {
        console.log("GeoRefByMarker is false, keeping default functionality.");
      }
    };

    // Clear any existing event listeners before adding a new one
    map.off("draw:created", onDrawCreated);
    map.once("draw:created", onDrawCreated);

    console.log("Draw mode enabled");
  }

  // Adds a listener for draw:created on the map.
  // When a user adds a marker:
  // If it's a geo_start marker:
  // Converts the position to image pixel coordinates.
  // If inside image bounds and GeoRefByLine is true, it enables drawing of geo_end.
  // If it's a geo_end marker:
  // Replaces lat/lng with user input if GeoRefByMarker is true.
  // Draws a line between geo_start and geo_end.
  // Makes it draggable, updating the line and state on drag.
  // Cleans up the listener on component unmount

  useEffect(() => {
    if (map) {
      const handleDrawCreated = function (e) {
        console.log("handleDrawCreated called");
        const layer = e.layer;
        console.log(layer);

        if (e.layerType === "marker") {
          if (layer.options.icon.options.type === "geo_start") {
            const markerLatLng = layer.getLatLng();

            if (bounds.current.contains(markerLatLng)) {
              const pixelCoords = latLngToImagePixel(markerLatLng);
              console.log(
                "Pixel coordinates within image:",
                pixelCoords,
                "markerLatLng",
                markerLatLng
              );

              const randomId = Math.random().toString(36).substring(2, 15);

              // **CHECK if a line is already created, prevent extra geo_end**
              if (GeoRefByMarker && lineCount > 0) {
                console.log(
                  "Line already created, preventing new geo_end marker."
                );
                return;
              }

              // **Only allow a new geo_end if GeoRefByLine is true**
              if (GeoRefByLine) {
                let draw = new L.Draw.Marker(map, {
                  icon: new customMarker({
                    type: "geo_end",
                    coords: markerLatLng,
                    pixel: pixelCoords,
                    id: randomId,
                  }),
                  draggable: true,
                });

                draw.enable();
                setMarkers((prevMarkers) => [...prevMarkers, layer]);
                setMarkerCount((prevCount) => prevCount + 1);
                console.log("Marker count in handledraw:", markerCount);
              } else {
                console.warn(
                  "GeoRefByLine is false. Not adding a geo_end marker."
                );
              }
            } else {
              alert("The starting point must be inside the image");
              layer.remove();
            }
          } else if (layer.options.icon.options.type === "geo_end") {
            console.log(layer);

            const markerLatLng = layer.getLatLng();

            // **Use user-entered latlng as geo_end**
            if (GeoRefByMarker) {
              markerLatLng.lat = inputLat;
              markerLatLng.lng = inputLng;
            }

            // Update the existing geo_end marker location
            layer.setLatLng(markerLatLng);

            drawLine(
              layer.options.icon.options.coords,
              markerLatLng,
              layer.options.icon.options.pixel,
              layer.options.icon.options.id
            );

            setLineCount((prevCount) => {
              const newCount = prevCount + 1;
              console.log("Updated Line count:", newCount);
              return newCount;
            });
            console.log("Line count in handledraw:", lineCount);
            setMarkers((prevMarkers) => [...prevMarkers, layer]);

            // Make geo_end marker draggable and update line on move
            layer.on("dragend", (event) => {
              const newLatLng = event.target.getLatLng();

              updateLine(
                layer.options.icon.options.coords,
                newLatLng,
                layer.options.icon.options.id
              );

              setLines((prevLines) => {
                return prevLines.map((line) =>
                  line.pixelCoords === layer.options.icon.options.pixel
                    ? { ...line, latLngs: newLatLng }
                    : line
                );
              });

              pixel.current = layer.options.icon.options.pixel;
              latlng.current = newLatLng;
            });
          }
        }

        logToServer("info", "Draw created event handled", {
          layerType: e.layerType,
        });
      };

      map.on("draw:created", handleDrawCreated);

      return () => {
        map.off("draw:created", handleDrawCreated);
      };
    }
  }, [map, customMarker, lineCount, inputLat, inputLng, GeoRefByLine]);

  const drawLine = (
    latlng1,
    latLng2,
    pixelCoords,
    id,
    GeoRefByMarker = false
  ) => {
    console.log("id", id);
    if (!mapRef) return;
    const map = mapRef;

    const lineCoordinates = [latlng1, latLng2];
    console.log("lineCoordinates", lineCoordinates);

    // Ensure that lineCoordinates is a valid array with objects containing lat/lng
    if (!Array.isArray(lineCoordinates) || lineCoordinates.length !== 2) {
      console.error("Invalid lineCoordinates:", lineCoordinates);
      return;
    }
    // Ensure both points have lat/lng format
    if (
      (!lineCoordinates[0].lat && !lineCoordinates[0].x) ||
      (!lineCoordinates[1].lat && !lineCoordinates[1].x)
    ) {
      console.error("Invalid coordinates structure:", lineCoordinates);
      return;
    }
    const polyline = L.polyline(lineCoordinates, {
      color: GeoRefByMarker ? "transparent" : "red",
    }).addTo(map);

    // Save the polyline object for later removal
    polylines.current = {
      ...polylines.current,
      [id]: polyline, // Use id (or pixel) as the key
    };

    // Save pixel and latLng only for Georef by Marker
    setLines((prevLines) => [
      ...prevLines,
      { pixelCoords: pixelCoords, latLngs: latLng2 },
    ]);

    pixel.current = pixelCoords;
    latlng.current = latLng2;
    console.log("Line drawn:", lines);
  };

  const removeAllLines = () => {
    Object.values(polylines.current).forEach((polyline) => polyline.remove());
    markers.forEach((marker) => marker.remove());
    setMarkers([]);
    polylines.current = {};
    setLines([]);
  };

  // Uses bounds.current to get the top-left and bottom-right corners of the image.
  // Calculates ratios of latitude and longitude based on these bounds.
  // Multiplies these ratios by the image width and height (width.current and height.current) to get pixel coordinates (x, y).
  const latLngToImagePixel = (latlng) => {
    console.log("latlongtoimagepixel called");
    console.log(height.current, width.current);
    const topLeft = bounds.current.getNorthWest(); // Top-left of the image
    const bottomRight = bounds.current.getSouthEast(); // Bottom-right of the image

    const latRatio =
      (topLeft.lat - latlng.lat) / (topLeft.lat - bottomRight.lat);
    const lngRatio =
      (latlng.lng - topLeft.lng) / (bottomRight.lng - topLeft.lng);

    // Ensure width and height are valid numbers before calculation
    const imageWidth = width.current || 1; // Default to 1 to avoid division by zero
    const imageHeight = height.current || 1; // Default to 1 to avoid division by zero

    const x = Math.round(lngRatio * imageWidth); // Image-local X coordinate
    const y = Math.round(latRatio * imageHeight); // Image-local Y coordinate

    return { x, y };
  };

  function HandleModify() {
    if (!modify) {
      markers.forEach((marker) => {
        if (marker.options.icon.options.type === "geo_end") {
          marker.dragging.enable();
        }
      });
      setModify(true);
    } else {
      markers.forEach((marker) => {
        if (marker.options.icon.options.type === "geo_end") {
          marker.dragging.disable();
        }
      });
      setModify(false);
    }
  }

  const updateLine = (latlng1, newLatLng, id) => {
    const map = mapRef;
    if (!map) return;

    // Check if the polyline exists for the given pixel
    const polylineToUpdate = polylines.current[id]; // Access polyline using the pixel key

    if (polylineToUpdate) {
      // Remove the existing polyline from the map
      polylineToUpdate.remove();

      // Remove it from the state
      const { [id]: _, ...rest } = polylines.current; // Destructure to exclude the polyline with the given pixel
      polylines.current = rest;
    }

    // Add new polyline with updated coordinates
    const updatedPolyline = L.polyline([latlng1, newLatLng], {
      color: "red",
    }).addTo(map);

    // Save the updated polyline in the state
    polylines.current = {
      ...polylines.current,
      [id]: updatedPolyline, // Use id as the key
    };
  };

  const saveLatLng = () => {
    if (inputLat && inputLng) {
      const newLatLng = new L.LatLng(
        parseFloat(inputLat),
        parseFloat(inputLng)
      );

      // Convert new lat/lng to pixel coordinates
      const pixelCoords = latLngToImagePixel(initialMarkerLatLng);

      if (!pixelCoords) {
        console.warn("Entered location is out of bounds!");
        return;
      }

      // Generate a unique ID for the line
      const lineId = Math.random().toString(36).substring(2, 15);

      if (!initialMarkerLatLng) {
        console.warn("Initial marker LatLng not set, skipping drawLine");
        return;
      }

      // Draw the line from the initial marker to the user-entered `geo_end` (if applicable)
      if (GeoRefByMarker) {
        drawLine(initialMarkerLatLng, newLatLng, pixelCoords, lineId, true);
        setLineCount((prevCount) => prevCount + 1);
        console.log("Line count after saveLatLng:", lineCount + 1);
      }

      // Clear input fields and close modal
      setInputLat("");
      setInputLng("");
      setInputLatLngModal(false);
    } else {
      console.warn("Latitude and Longitude fields cannot be empty.");
    }
  };

  async function GeoRef() {
    if (lineCount < 2 && markerCount < 4) {
      alert("Please draw at least two markers on image before proceeding.");
      return;
    }

    const response = await fetch(`${HOST}/georef-image`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lines: lines,
        path: path.current,
      }),
    });
    if (response.ok) {
      const result = await response.json();
      console.log("result", result);
      bounds.current = L.latLngBounds(
        L.latLng(result.new_bounds[1], result.new_bounds[0]),
        L.latLng(result.new_bounds[3], result.new_bounds[2])
      );
      addImageOverlay(path.current, false, false, true);
      setDownload(true);
      removeAllLines();
    } else {
    }
  }

  async function DownloadGeoRef() {
    try {
      const response = await fetch(`${HOST}/download-georef-image`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
        body: JSON.stringify({
          path: path.current, // Assuming `path` is a reference to the input path
        }),
      });

      if (response.ok) {
        const blob = await response.blob(); // Get the response as a Blob
        const url = window.URL.createObjectURL(blob); // Create a URL for the Blob
        const filename = path.current
          .split("/")
          .pop()
          .replace(/\.[^.]+$/, ".tif"); // Extract and modify filename

        // Create a download link and trigger the download
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log("TIFF downloaded successfully:", filename);
      } else {
        console.error("Failed to download GeoTIFF:", response.statusText);
      }
    } catch (error) {
      console.error("Error downloading TIFF:", error);
    }
  }

  return (
    <div
      style={{ position: show ? "absolute" : "relative" }}
      className="toolscont"
    >
      <button
        title="Geo Tool"
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
        <i className="fa-solid fa-book-atlas"></i>
      </button>

      {show && (
        <div
          ref={toolvisRef}
          className="toolsvis"
          id="toolvis"
          style={{ display: "flex", flexDirection: "column", width: "200px" }}
        >
          <input
            className="form-control"
            style={{ width: "100%", fontSize: "11px", color: "black" }}
            type="file"
            accept=".jpg,.png,.jpeg,"
            onChange={handleFileChange}
            multiple
            ref={fileInputRef}
          />
          <button
            className="mt-2 btn-add"
            style={{ width: "100%" }}
            onClick={handleUpload}
          >
            Upload Image
          </button>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label className="text-white">
              <input
                type="checkbox"
                onClick={() => {
                  setGeoRefByLine(!GeoRefByLine);
                  console.log("georefbyline", GeoRefByLine);
                }}
              />
              Georeference by Marker
            </label>

            <label className="text-white">
              <input
                type="checkbox"
                onClick={() => {
                  setGeoRefByMarker(!GeoRefByMarker);
                  console.log("georefbyline", GeoRefByMarker);
                }}
              />
              Georeference by Location
            </label>
          </div>
          {GeoRefByLine ? (
            <button
              className="mt-2 mb-1 btn-add"
              style={{ width: "100%" }}
              onClick={() => {
                HandleDrawClick();
                console.log("Line drawing mode enabled.");
              }}
            >
              Draw Line
            </button>
          ) : null}

          {GeoRefByMarker ? (
            <button
              className="mt-2 mb-1 btn-add"
              style={{ width: "100%" }}
              onClick={() => {
                HandleDrawClick();
                console.log("Line drawing mode enabled.");
              }}
            >
              Draw points
            </button>
          ) : null}

          {GeoRefByLine && lines.length ? (
            <button
              className="mt-2 mb-0 btn-add"
              style={{ width: "100%", backgroundColor: modify ? "gray" : "" }}
              onClick={() => {
                HandleModify();
              }}
            >
              Modify Line
            </button>
          ) : null}
          <button
            className="mt-2 mb-0 btn-add"
            style={{ width: "100%" }}
            onClick={() => {
              GeoRef();
            }}
          >
            Geo
          </button>
          {download ? (
            <button
              className="mt-2 btn-add"
              style={{ width: "100%" }}
              onClick={() => {
                DownloadGeoRef();
              }}
            >
              Download
            </button>
          ) : null}

          {/* {uploadProgress > 0 && (
            <div style={{ marginTop: "10px", fontWeight: "bold" }}>
              Upload Progress: {uploadProgress}%
            </div>
          )} */}
        </div>
      )}

      {inputLatLngModal && (
        <Modal
          isOpen={inputLatLngModal}
          onRequestClose={() => setInputLatLngModal(false)}
          className="col-lg-2 col-sm-2 custom-modal"
        >
          <div className="user-modal-header">
            <i
              className="fa-solid fa-xmark cancel"
              onClick={() => setInputLatLngModal(false)}
            ></i>
          </div>

          <form className="col-lg-12 col-md-6 col-sm-10">
            Lattitude :
            <input
              type="text"
              className="form-control"
              style={{ width: "100%", fontSize: "11px", color: "black" }}
              value={inputLat}
              onChange={(e) => {
                setInputLat(e.target.value);
                console.log("inputLat", inputLat);
              }}
            />
            Longitude :
            <input
              type="text"
              className="form-control"
              style={{ width: "100%", fontSize: "11px", color: "black" }}
              value={inputLng}
              onChange={(e) => {
                setInputLng(e.target.value);
                console.log("inputLng", inputLng);
              }}
            />
          </form>
          <div className="modal-footer">
            <button type="submit" onClick={saveLatLng} className="mt-3 btn-add">
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default GeoReference;
