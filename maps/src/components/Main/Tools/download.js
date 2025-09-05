import React, { useState, useContext } from "react";
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import { logToServer } from "../../logger";

function Download() {
  const {
    drawnItems,
    lastRect,
    selectedLayers,
    vis,
    getCsrfToken
  } = useContext(GlobalContext)
  const [show, setshow] = useState(false);
  const [selLayer, SetlLayer] = useState("")
  const [selFormat, setFormat] = useState("")
  const [showerror, seterror] = useState(false)
  const [showwait, setwait] = useState(false);
  function handleClick() {
    setshow(true);
    SetlLayer("")
    setFormat("")
  }
  function handleChange(e) {
    if (e.target.name === "layer") {
      SetlLayer(e.target.value)
    }
    else {
      setFormat(e.target.value)
    }
  }
  function close() {
    setshow(false);
  }
  async function download() {

    if (selLayer !== "" && selFormat !== "") {
      if (lastRect === undefined || lastRect===null) {
        seterror(true)
      }
      else {
        seterror(false)
        setwait(true)
        var geometry = [];
        geometry.push(
          JSON.stringify(
            drawnItems.getLayer(lastRect).toGeoJSON()["geometry"]["coordinates"][0]
          )
        );
        try {
          const response = await fetch(`${HOST}/download`, {
            method: "POST",
            credentials:'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': await getCsrfToken(),
            },
            body: JSON.stringify({ data: { "aoi": geometry, "url": selectedLayers[selLayer]._url, "format": selFormat } }),
          })
          if (response.ok) {
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition ? contentDisposition.split('filename=')[1] : 'downloaded_file';

            const blob = await response.blob();

            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            setwait(false)
            link.click();
            drawnItems.removeLayer(lastRect)
            logToServer('info','Downloaded Successfully')

          } else {
            logToServer('error',`Error: ${response.status} - ${response.statusText}`)
          }
        } catch (error) {
          logToServer('error',`${error}`)
          alert("Unexpected Error occured Please try again")
          setwait(false)
        }
      }

    } else {
      seterror(true)
    }
  }
  return (
    <div style={{ position: vis?"absolute":"relative", }} className="toolscont" >
      <div>
        <button title="Download Image"
          className="btn text-white"
          onClick={handleClick}
          style={{ zIndex: "1000", fontSize: "15px", backgroundColor:'black', padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%",border:"none" }}
        >
          <i className="fa fa-download" />
        </button>
      </div>

      {show && (
        <div className="toolsvis"  style={{marginTop:"5px"}}>
            <span
            onClick={close}
            style={{
              position: "relative",
              color: "black",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            &times;
          </span>
          <div>
            <select value={selLayer} name="layer" onChange={handleChange} className="form-select">
              <option value="" disabled>Select A Layer</option>
              {Object.keys(selectedLayers).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: "5px" }}>
            <select className="form-select" name="format" onChange={handleChange} value={selFormat}>
              <option value="" disabled>Select Format</option>
              <option value="png">PNG</option>
              <option value="tif">TIFF</option>
            </select>
            <div>
              <button onClick={download} className="btn" style={{ width: "60px", backgroundColor:'#397aa5', fontSize: '10px', padding: "2px 2px" }} >Download</button>
            </div>
          </div>
          <div>
            {showerror && (
              <><p style={{ fontSize: "10px" }}>Select proper options or draw AOI</p></>
            )}
            {showwait && (
              <><p style={{ fontSize: "15px" }}><b>Please wait</b></p></>
            )}


          </div>
        </div>

      )}

    </div>


  )

}
export default Download