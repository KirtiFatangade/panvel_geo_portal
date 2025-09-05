import React, { useState, createContext, useContext, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Actions from "./Actions/Actions_new";
import SidebarTabs from "./sidebarTabs";
import Free from "../projects/Free";
import CProject from "../Authforms/createProject";
import Survey from "../projects/Survey";
import { GlobalContext } from "../../App";
import files from "../static";
import "./map.css";
import { useNavigate } from "react-router-dom";
import Navigate from "../navigate";
import { logToServer } from "../logger";
import PanvelProject from "./PanvelProject";

export const SideBarContext = createContext();

function Sidebar() {
  const {
    tools,
    setTools,
    userInfo,
    scrollDivRef,
    sidebarRef,
    isSidebarTabs,
    setSidebarTabs,
  } = useContext(GlobalContext);
  const [showloader, setloader] = useState(false);
  const [showPloader, setPloader] = useState(false);
  const navigate = useNavigate();
  const contextValue = {
    setloader,
    setPloader,
  };
  const [sidePanelWidth, setSidePanelWidth] = useState("0");

  useEffect(() => {
    console.log(window.location.pathname);
    if (!tools) {
      openNav();
      logToServer("info", "Sidebar component mounted");
    }
  }, [userInfo, tools]);

  useEffect(() => {
    if (window.location.pathname.includes("/project")) {
      setSidebarTabs(true);
    } else {
      setSidebarTabs(false);
    }
  }, [window.location.pathname]);

  const openNav = () => {
    setTools(false);
    document.getElementById("openbtn").style.display = "none";
    setSidePanelWidth("350px");
  };

  const closeNav = () => {
    setTools(true);
    document.getElementById("openbtn").style.display = "flex";
    setSidePanelWidth("0");
  };

  return (
    <>
      <div
        ref={sidebarRef}
        id="mySidepanel"
        className="sidepanel"
        style={{ width: sidePanelWidth }}
      >
        <div
          className="arrow-logo-container"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "95%",
          }}
        >
          <div
            className="mt-1 closebtn"
            onClick={closeNav}
            style={{ flex: 1, textAlign: "left" }}
          >
            <i className="fa-solid fa-angle-left"></i>
          </div>
         
            <img
              style={{
                flex: 4,
                maxWidth: "65%",
                marginLeft: "15%",
                textAlign: "center",
              }}
              src={`${process.env.PUBLIC_URL}/${files}panvel_municipal_corporation.png`}
              className="sidepanel-top-logo"
            />

          {showloader && (
            <div
              className="loading-globe"
              style={{ flex: 1, display: "flex", justifyContent: "center" }}
            >
              <div className="lds-dual-ring" style={{ top: "15px" }}>
                <i className="fa-solid fa-globe"></i>
              </div>
            </div>
           )} 
        </div>
        <PanvelProject/>

{/*            
        <div ref={scrollDivRef} className="scroll-sidebar-div">
          <SideBarContext.Provider value={contextValue}>
            <Routes>
              <Route
                path="/project/*"
                element={userInfo ? <SidebarTabs /> : <Navigate to="/" />}
              />
            </Routes>
          </SideBarContext.Provider>
        </div> */}
      </div>
      <button className="openbtn" id="openbtn" onClick={openNav}>
        <i className="fa-solid fa-bars"></i>
      </button>

      
    </>
  );
}

export default Sidebar;
