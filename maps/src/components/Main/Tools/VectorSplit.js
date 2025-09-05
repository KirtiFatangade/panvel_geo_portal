import React, { useState, useContext, useEffect, useRef } from "react";
import { GlobalContext } from "../../../App";
import { HOST } from "../../host";
import "../../BoundaryCanvas";
import L from "leaflet";

function VectorSplit() {
  const [show, setShow] = useState(false);
  const [vectors, setVectors] = useState([]);
  const [props, setProps] = useState([]);
  const [selProp, setSelProp] = useState(null);
  const { vis, layerControls, Canvas } = useContext(GlobalContext);
  const toolvisRef = useRef(null);
  const [selLayer1, SetlLayer1] = useState(null);

  useEffect(() => {
    if (layerControls && show) {
    setVectors(Canvas.getLayers());
    }
    SetlLayer1(null);
  }, [show]);

  const close = () => setShow(false);

  function split() {
    let resp = Canvas.splitVector(selLayer1, selProp);
    Object.entries(resp).map(([key, data]) => {
      let bounds = L.latLngBounds(
        L.latLng(data[1][1], data[1][0]),
        L.latLng(data[1][3], data[1][2])
      );
      layerControls.addOverlay(
        L.geoJSON(),
        `${selLayer1}_${selProp}_${key}`,
        true,
        bounds,
        true,
        data[0],
        false,
        null
      );
    });
  }
  function splitDownload() {
    Canvas.splitVectorDownload(selLayer1, selProp);
  }
  useEffect(() => {
    if (selLayer1) {
      setProps(Canvas.getProps(selLayer1, false));
    }
  }, [selLayer1]);

  return (
    <div
      style={{ position: vis ? "absolute" : "relative" }}
      className="toolscont"
    >
      <button
        title="Vector Attribute Splitting Tool"
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
        Split
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
              className="form-select  mt-2"
              style={{
                marginBottom: "5px",
                backgroundColor: "white",
                border: "2px solid white",
                fontSize: "13px",
              }}
            >
              <option value="">Select the First vector Layer</option>
              {vectors.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>
          {selLayer1 && props ? (
            <select
              onChange={(e) => setSelProp(e.target.value)}
              value={selProp}
              className="form-select  mt-2"
              style={{
                marginBottom: "5px",
                backgroundColor: "white",
                border: "2px solid white",
                fontSize: "13px",
              }}
            >
              <option value="">Select the Propery</option>
              {props.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          ) : null}

          <div>
            <button
              className="mt-2 btn-add"
              style={{ width: "100%" }}
              onClick={split}
            >
              Split Here
            </button>
            {/* <button
              className="mt-2 btn-add"
              style={{ width: "100%" }}
              onClick={splitDownload}
            >
              Download
            </button> */}
          </div>
        </div>
      )}
    </div>
  );
}

export default VectorSplit;
