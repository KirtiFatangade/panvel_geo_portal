import React, { useState } from "react";
import files from "../static";

import Main from "./Main";
import Overlay from "./overlay";
import { logToServer } from "../logger";


function Sidebar({ map, layer_controls, UsedLayers, SetLayers, Boundary, setFLayers, FilterLayers, setFilter, fcolor, SetColor, settools, Canvas }) {
  const [selTab, setTab] = useState("Main");
  const [showPloader, setPloader] = useState(false)
  const [showloader, setloader] = useState(false)

  function sidebarOpen() {
    document.getElementById("mySidebar").style.display = "flex";
    document.getElementById("openNav").style.display = "none";
    settools(false)
    logToServer("info", "Sidebar opened");
  }

  function sidebarClose() {
    document.getElementById("mySidebar").style.display = "none";
    document.getElementById("openNav").style.display = "block";
    settools(true)
    logToServer("info", "Sidebar closed");

  }
  function tabChange(e) {
    if (e === "Main") {
      setTab("Main");
      logToServer("info", "Switched to Main tab in Sidebar");

    }
    if (e === "Overlay") {
      setTab("Overlay");
      logToServer("info", "Switched to Overlay tab in Sidebar");

    }
  }
  return (
    <div>
      <div
        className="w3-sidebar w3-bar-block"
        style={{
          display: "none",
          height: "99%",
          width: "20%",
          zIndex: "1000",
          position: "absolute",
          top: "0px",
          left: "0px",
          flexDirection: "column",
          borderRadius: "1%",
          overflow: "hidden",
          margin: "5px",
          backgroundColor: "#161A30",
          opacity: "0.9",
        }}
        id="mySidebar"
      >
        <div style={{ position: "relative" }}>
          <button
            className="w3-button w3-xlarge"
            onClick={sidebarClose}
            style={{
              position: "absolute",
              top: "5px",
              left: "5px",
              height: "30px",
              width: "30px",
              borderRadius: "50%",
              color: "white",
              border: "none",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            &times;
          </button>

        </div>

        <div
          className="sidebar-content"
          style={{
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            height: "93%",
            width: "100%",


          }}
        >
          <div className="vgtLogo" style={{ marginBottom: "10px" }}>
            <img
              className="logo"
              src={`${files}vgtlogo.png`}
              style={{ width: "100%", height: "100%", margin: "-20px 0px 10px 5px", flex: '9' }}
            />
          </div>
          {showloader && (
            <>
              <div className="lds-dual-ring" style={{ zIndex: "1000", position: "absolute", top: "25%", }}></div>
            </>
          )}
          <div>
            {selTab === "Main" && (
              <>
                {showPloader && (

                  <div className="lds-dual-ring" style={{ zIndex: "1000", position: "absolute", top: "15%", right: "1%" }}></div>

                )}

                <Main map={map} UsedLayers={UsedLayers} SetLayers={SetLayers} Boundary={Boundary} setFLayers={setFLayers} FilterLayers={FilterLayers} setFilter={setFilter} SetColor={SetColor} setPloader={setPloader} Canvas={Canvas} />
              </>
            )}
            {selTab === "Overlay" && (
              <>
                <Overlay map={map} layer_controls={layer_controls} setloader={setloader} />
              </>
            )}
          </div>
          <div className="tabs-button" style={{ position: "absolute", display: "flex", flexDirection: "row", width: "100%", bottom: "0", left: "0" }}>
            <input type="radio" id="tab-action" name="tab" className="tab-input" value="Main" style={{ display: "none" }} onChange={(e) => tabChange(e.target.value)} checked={selTab === "Main"} />
            <label htmlFor="tab-action" className="w3-button tab-buttons" style={{ flex: "1", margin: "1px", marginBottom: "0", color: "#FAF8D4" }}>Main</label>

            <input type="radio" id="tab-overlay" name="tab" className="tab-input" value="Overlay" style={{ display: "none" }} onChange={(e) => tabChange(e.target.value)} checked={selTab === "Overlay"} />
            <label htmlFor="tab-overlay" className="w3-button tab-buttons" style={{ flex: "1", margin: "1px", marginBottom: "0", color: "#FAF8D4" }}>Overlay</label>
          </div>

        </div>

      </div>
      <button
        id="openNav"
        className="w3-teal w3-large"
        style={{
          height: "40px",
          width: "40px",
          zIndex: "1000",
          position: "absolute",
          top: "10px",
          left: "10px",
          borderRadius: "100%",
          border: "none",
          backgroundColor: "#008080",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onClick={sidebarOpen}
      >
        &#9776;
      </button>


    </div>

  );
}

export default Sidebar