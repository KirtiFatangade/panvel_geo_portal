import React, { useState, useContext, useEffect, useRef } from "react";
import { GlobalContext } from "../../../App";
import { HOST } from "../../host";
import "../../BoundaryCanvas";
import L from "leaflet";

function VectorA() {
  const [show, setShow] = useState(false);
  const [vectors, setVectors] = useState([]);
  const { vis, layerControls, Canvas, drawnItems } = useContext(GlobalContext);
  const toolvisRef = useRef(null);
  const [selLayer1, SetlLayer1] = useState(null);
  const [selLayer2, SetlLayer2] = useState(null);

  useEffect(() => {
      if (layerControls && show) {
          setVectors(Canvas.getLayers());
      }
      SetlLayer1(null);
      SetlLayer2(null);
  }, [show]);

  // useEffect(() => {
  //   if (layerControls && show) {
  //     let createdLayers = Canvas.getLayers();
  //     let drawnLayers = drawnItems ? drawnItems.getLayers() : [];

  //     console.log("Drawn Layers in Vector_A:", drawnLayers);

  //     let drawnLayerNames = drawnLayers
  //       .map((layer) =>
  //         layer.options && layer.options.name
  //           ? layer.options.name
  //           : `Unknown_${layer._leaflet_id}`
  //       )
  //       .filter(Boolean);

  //     console.log("Available Layers for Selection:", [
  //       ...createdLayers,
  //       ...drawnLayerNames,
  //     ]);

  //     setVectors([...createdLayers, ...drawnLayerNames]);
  //   }
  //   SetlLayer1(null);
  //   SetlLayer2(null);
  // }, [show, drawnItems]);

//   useEffect(() => {
//     const updateLayers = () => {
//         if (layerControls && show) {
//             let layers = [
//                 ...(Canvas?.getLayers() || []),
//                 ...(drawnItems?.getLayers().map(l => l.options?.name || `Unknown_${l._leaflet_id}`) || [])
//             ];
//             setVectors(layers);
//         } else {
//             setVectors([]);
//         }
//         SetlLayer1(null);
//         SetlLayer2(null);
//     };

//     updateLayers();

//     const clearLayersHandler = () => {
//         console.log("Layers cleared! Updating VectorA dropdown...");
//         setVectors([]); 
//         SetlLayer1(null);
//         SetlLayer2(null);
//     };

//     window.addEventListener("layersCleared", clearLayersHandler);
//     return () => window.removeEventListener("layersCleared", clearLayersHandler);
// }, [show, drawnItems]);

  const close = () => setShow(false);

  const validateLayers = (action) => {
    if (!selLayer1 || !selLayer2) {
      alert("Please select both layers.");
      return false;
    }
    if (selLayer1 === selLayer2) {
      alert("The selected layers must be different.");
      return false;
    }

    const layerName = prompt(`Enter a name for the new layer after ${action}:`);
    if (layerName) {
      return layerName;
    }

    return false;
  };

  const handleUnion = () => {
    const valid = validateLayers("Union");
    if (valid) {
      // Perform the union operation here

      let resp = Canvas.VectorUnion(selLayer1, selLayer2, valid);
      console.log(resp);
      let bounds = L.latLngBounds(
        L.latLng(resp[1][1], resp[1][0]),
        L.latLng(resp[1][3], resp[1][2])
      );
      layerControls.addOverlay(
        L.geoJSON(),
        valid,
        true,
        bounds,
        true,
        resp[0],
        false,
        null
      );
    }
  };

  // const handleIntersection = () => {
  //     const valid = validateLayers("Intersection");
  //     if (valid) {

  //         let resp = Canvas.VectorIntersect(selLayer1,selLayer2,valid);
  //         let bounds=L.latLngBounds(
  //             L.latLng( resp[1][1],  resp[1][0]),
  //             L.latLng(resp[1][3], resp[1][2])
  //         );
  //           layerControls.addOverlay(L.geoJSON(), valid, true, bounds, true, resp[0], false, null)
  //     }
  // };

  const handleIntersection = () => {
    const valid = validateLayers("Intersection");
    if (!valid) return;

    console.log(" Selected Layers for Intersection:", selLayer1, selLayer2);

    let [layer1, layer2] = [
      Canvas.getLayerData(selLayer1),
      Canvas.getLayerData(selLayer2),
    ];
    if (!layer1 || !layer2)
      return alert("One or both layers do not contain valid data.");

    let resp = Canvas.VectorIntersect(selLayer1, selLayer2, valid);
    if (!resp || !resp[0]) return alert("Intersection operation failed.");

    layerControls.addOverlay(
      L.geoJSON(),
      valid,
      true,
      L.latLngBounds(
        L.latLng(resp[1][1], resp[1][0]),
        L.latLng(resp[1][3], resp[1][2])
      ),
      true,
      resp[0],
      false,
      null
    );
  };

  const handleSymmetricDifference = () => {
    const valid = validateLayers("Symmetric Difference");
    if (valid) {
      let resp = Canvas.VectorSD(selLayer1, selLayer2, valid);
      let bounds = L.latLngBounds(
        L.latLng(resp[1][1], resp[1][0]),
        L.latLng(resp[1][3], resp[1][2])
      );
      layerControls.addOverlay(
        L.geoJSON(),
        valid,
        true,
        bounds,
        true,
        resp[0],
        false,
        null
      );
    }
  };

  const handleClip = () => {
      const valid = validateLayers("Clip");
      if (valid) {

          let resp=Canvas.VectorClip(selLayer1,selLayer2,valid);
          let bounds=L.latLngBounds(
              L.latLng( resp[1][1],  resp[1][0]),
              L.latLng(resp[1][3], resp[1][2])
          );
            layerControls.addOverlay(L.geoJSON(), valid, true, bounds, true, resp[0], false, null)
      }
  };


  const handleMerge = () => {
    const valid = validateLayers("Merge");
    console.log(valid);
    if (valid) {
      let resp = Canvas.VectorMerge(selLayer1, selLayer2, valid);
      let bounds = L.latLngBounds(
        L.latLng(resp[1][1], resp[1][0]),
        L.latLng(resp[1][3], resp[1][2])
      );
      layerControls.addOverlay(
        L.geoJSON(),
        valid,
        true,
        bounds,
        true,
        resp[0],
        false,
        null
      );
    }
  };
  const handleSplit = (intersect = false) => {   
    const actionName = intersect ? "Split" : "Split by Intersection"; 
    const valid = validateLayers(actionName);
    if (valid) {
    let resp = Canvas.splitVectorLayer(selLayer1, selLayer2, valid, intersect);
    Object.entries(resp).map(([key, data]) => {
      let bounds = L.latLngBounds(
        L.latLng(data[1][1], data[1][0]),
        L.latLng(data[1][3], data[1][2])
      );
      layerControls.addOverlay(
        L.geoJSON(),
        valid,
        true,
        bounds,
        true,
        data[0],
        false,
        null
      );
    });
  };
  }

  // const handleBuffer = () => {
  //   const buffer = prompt(`Enter the buffer (in m)`);

  //   if (!buffer) {
  //     alert("Please give Buffer");
  //     return;
  //   }
  //   const layerName = prompt(`Enter a name for the new layer`);
  //   if (!layerName) {
  //     alert("Please give the Layer Name");
  //     return;
  //   }
  //   if (buffer && layerName) {
  //     let resp = Canvas.VectorBuffer(selLayer1, buffer, layerName);
  //     let bounds = L.latLngBounds(
  //       L.latLng(resp[1][1], resp[1][0]),
  //       L.latLng(resp[1][3], resp[1][2])
  //     );
  //     layerControls.addOverlay(
  //       L.geoJSON(),
  //       layerName,
  //       true,
  //       bounds,
  //       true,
  //       resp[0],
  //       false,
  //       null
  //     );
  //   }
  // };

  const handleBuffer = () => {
    const buffer = prompt("Enter the buffer (in meters)");
    if (!buffer) {
      alert("Please provide a buffer distance.");
      return;
    }

    const layerName = prompt("Enter a name for the new layer");
    if (!layerName) {
      alert("Please provide a layer name.");
      return;
    }

    if (buffer && layerName) {
      let resp = Canvas.VectorBuffer(selLayer1, buffer, layerName);

      console.log("Buffer Response:", resp);

      if (!resp || !Array.isArray(resp) || resp.length < 2) {
        console.error("Invalid response from VectorBuffer:", resp);
        alert("Buffer creation failed due to invalid response.");
        return;
      }

      const [layerId, bbox] = resp; // Destructure response
      if (!Array.isArray(bbox) || bbox.length !== 4) {
        console.error("Invalid bounding box format:", bbox);
        alert("Invalid bounding box data.");
        return;
      }

      // Construct a valid GeoJSON polygon
      const geoJsonBuffer = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: layerId },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [bbox[0], bbox[1]],
                  [bbox[2], bbox[1]],
                  [bbox[2], bbox[3]],
                  [bbox[0], bbox[3]],
                  [bbox[0], bbox[1]],
                ],
              ],
            },
          },
        ],
      };

      console.log("Generated GeoJSON:", geoJsonBuffer);

      let bounds = L.latLngBounds(
        L.latLng(bbox[1], bbox[0]),
        L.latLng(bbox[3], bbox[2])
      );

      let geoJsonLayer = L.geoJSON(); 

      layerControls.addOverlay(
        geoJsonLayer,
        layerName,
        true,
        bounds,
        true,
        layerId,
        false,
        null
      );
      geoJsonLayer.addData(geoJsonBuffer);
    }
  };

  return (
    <div
      style={{ position: vis ? "absolute" : "relative" }}
      className="toolscont"
    >
      <button
        title="Vector Tools"
        className="btn text-white"
        id="roadroute"
        onClick={() => setShow((prevShow) => !prevShow)}
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
        A
      </button>
      {show && (
        <div
          ref={toolvisRef}
          className="toolsvis"
          id="toolvis"
          style={{ display: "flex", flexDirection: "column", width: "200px" }}
        >
          <span onClick={close} className="toolclose">
            &times;
          </span>
          <div>
            <select
              onChange={(e) => SetlLayer1(e.target.value)}
              value={selLayer1}
              className="form-select text-white mt-2"
              style={{
                marginBottom: "5px",
                backgroundColor: "transparent",
                border: "2px solid white",
                fontSize: "13px",
              }}
            >
              <option value="" className="bg-dark">
                Select First vector Layer
              </option>
              {vectors.map((comp) => (
                <option key={comp} value={comp} className="bg-dark">
                  {comp}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              onChange={(e) => SetlLayer2(e.target.value)}
              value={selLayer2}
              className="form-select text-white mt-2"
              style={{
                marginBottom: "5px",
                backgroundColor: "transparent",
                border: "2px solid white",
                fontSize: "13px",
              }}
            >
              <option value="" className="bg-dark">
                Select Second vector Layer
              </option>
              {vectors.map((comp) => (
                <option key={comp} value={comp} className="bg-dark">
                  {comp}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
              onClick={handleUnion}
            >
              Union
            </button>
            <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
              onClick={handleIntersection}
            >
              Intersection
            </button>
            <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px", padding: "10px 15px" }}
              onClick={handleSymmetricDifference}
            >
              Symmetric Difference
            </button>
            <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
              onClick={handleMerge}
            >
              Merge
            </button>
            {/* <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
              onClick={handleClip}
            >
              Clip
            </button>
            <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
              onClick={() => handleSplit(true)}
            >
              Split
            </button> */}
           {/* <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
              onClick={() => handleSplit(false)}
            >
              Split by Intersection
            </button>*/}
            <button
              className="mt-2 btn-add"
              style={{ width: "100%", margin: "0px" }}
              onClick={handleBuffer}
            >
              Buffer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorA;
