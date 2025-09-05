import React, { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GlobalContext } from "../../../App";
import Grid from "./Grid";
import Filter from "./filter";
import Swipe from "./swiping";
import Inspect from "./inspect.js";
import PixelFilter from "./PixelFilter";
import { HOST } from "../../host";
import "./tools.css";
import L from "leaflet";
import SphericalController from "../sphericalCont.js";
import { isMobile } from "react-device-detect";
import { logToServer } from "../../logger.js";
import SLD from "./SLD.js";
import Help from "../../Authforms/HelpForm.js";
import files from "../../static.js";
import Modal from "react-modal";
// import Documentation from './Documentation.js';

function useForceUpdate() {
  const [, setValue] = useState(0);
  return () => setValue((value) => value + 1);
}

function Tools({ toggleBuildings, toggleElevationProfile }) {
  const [showModal, setShowModal] = useState(false);
  const [markedLat, setMarkedLat] = useState(null);
  const [markedLng, setMarkedLng] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const toggleModal = () => {
    setShowModal(!showModal);
    console.log("userinfo", userInfo);
  };

  const {
    userInfo,
    tools,
    Canvas,
    setUserInfo,
    SetLogout,
    UsedLayers,
    vis,
    setVis,
    setOrganizationProjects,
    setUserProjects,
    getCsrfToken,
    map,
    customMarker,
    threeD,
    set3d,
    mapBox,
    SetMap,
    setMapData,
    SetuTab,
    SetMapBox,
  } = useContext(GlobalContext);

  const navigate = useNavigate();
  const forceUpdate = useForceUpdate();

  const logout = async () => {
    const result = window.confirm("Are you sure to logout?");
    if (!result) {
      return;
    }
    await fetch(`${HOST}/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": await getCsrfToken(),
      },
      body: JSON.stringify({}),
    });
    if (!window.location.pathname.startsWith("/MapBox")) {
      Canvas.clear();
    }
    
    Object.keys(UsedLayers).forEach((id) => {
      if (typeof UsedLayers[id] === "object") {
        UsedLayers[id].remove();
      }
    });
    setUserInfo(null);
    SetLogout(false);
    setOrganizationProjects([]);
    SetMap(null);
    setMapData(null);
    setUserProjects([]);
    SetuTab("1");
    SetMapBox(null);

    console.log("user project", setUserProjects);
    console.log("org project", setOrganizationProjects);
  };

  function toggle() {
    setVis(!vis);
    forceUpdate();
  }

  useEffect(() => {
    if (Canvas) {
      if (threeD) {
        Canvas.threeD(true);
      } else {
        Canvas.threeD(false);
      }
    }
  }, [threeD]);

  const showHelpPopup = () => {
    setModalIsOpen(true);
    console.log("clicked help");
  };

  return (
    <>
      <div
        className="tool-group"
        style={{
          display: "flex",
          flexDirection: "row",
          position: "absolute",
          left: tools ? "70px" : "355px",
          top: "8px",
          zIndex: "0",
          columnGap: "7px",
          alignItems: "stretch",
        }}
      >
        <button
          title="Tools"
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
          onClick={() => toggle()}
          className={`btn ${vis ? "btn-dark" : "btn-dark"}`}
        >
          <i className="fa-solid fa-screwdriver-wrench"></i>
        </button>
        <div
          className="tools-groups"
          style={{
            display: vis ? "flex" : "none",
            alignItems: "center",
            margin: "0px",
            fontSize: "15px",
          }}
        >
          {vis ? (
            <div>
              <span>&#9664;</span>
            </div>
          ) : (
            <span>&#9654;</span>
          )}
        </div>

        {window.location.pathname.startsWith("/MapBox") ? (
          <div className={`toolCont`} style={{ width: vis ? "200px" : "0px" }}>
            <div className="tool">
              <button
                onClick={toggleBuildings}
                title="3D Building"
                style={{
                  zIndex: "1000",
                  fontSize: "15px",
                  padding: "2px 2px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "black",
                  border: "none",
                }}
                className="btn text-white"
              >
                <i className="fa-solid fa-building"></i>
              </button>
            </div>
            <div className="tool">
              <NavLink
                to="/user-console"
                title="User Console"
                style={{
                  zIndex: "1000",
                  fontSize: "15px",
                  backgroundColor: "black",
                  padding: "9px 2px",
                  borderRadius: "60%",
                  width: "40px",
                  height: "40px",
                  border: "none",
                }}
                className="btn btn-dark text-text"
              >
                <i className="fa-solid fa-user"></i>
              </NavLink>
            </div>
            <div className="tool">
              <button
                title="Logout"
                style={{
                  zIndex: "1000",
                  fontSize: "15px",
                  backgroundColor: "black",
                  padding: "2px 2px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "none",
                }}
                onClick={logout}
                className="btn-button btn-dark text-danger"
              >
                <i className="fa-solid fa-power-off"></i>
              </button>
            </div>
          </div>
        ) : (
          <div className={`toolCont`} style={{ width: vis ? "700px" : "0px" }}>
            <div className="tool">
              <Swipe />
            </div>
            <div className="tool">
              <Filter />
            </div>

            <div className="tool">
              <Grid />
            </div>
            <div className="tool">
              <Inspect />
            </div>
            <div className="tool">
              <PixelFilter />
            </div>

            {userInfo && !userInfo.is_admin && !userInfo.is_superuser && (
              <div className="tool">
                <button
                  title="Survey Form"
                  className="btn text-white survey-button"
                  onClick={() => {
                    setVis(false);
                    if (isMobile) {
                      alert("Click on the map to start survey");
                    }
                  }}
                  style={{
                    zIndex: "1000",
                    fontSize: "15px",
                    padding: "2px 2px",
                    backgroundColor: "black",
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "none",
                  }}
                >
                  <i className="fas fa-clipboard-check"></i>
                </button>
              </div>
            )}

            <div className="tool">
              <NavLink
                to="/user-console"
                title="User Console"
                style={{
                  zIndex: "1000",
                  fontSize: "15px",
                  backgroundColor: "black",
                  padding: "8px 2px",
                  borderRadius: "60%",
                  width: "40px",
                  height: "40px",
                  border: "none",
                  marginLeft: "5%",
                }}
                className="btn btn-dark text-text"
              >
                <i className="fa-solid fa-user"></i>
              </NavLink>
            </div>

            <div className="tool">
              <button
                title="Help and Support"
                style={{
                  zIndex: "1000",
                  fontSize: "14px",
                  backgroundColor: "black",
                  padding: "2px 2px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "none",
                }}
                onClick={showHelpPopup}
                className="btn-button btn-dark text-white"
              >
                <i className="fa-solid fa-question"></i>
              </button>
            </div>

            <div className="tool">
              <button
                title="Logout"
                style={{
                  zIndex: "1000",
                  fontSize: "15px",
                  backgroundColor: "black",
                  padding: "2px 2px",
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  border: "none",
                }}
                onClick={logout}
                className="btn-button btn-dark text-danger"
              >
                <i className="fa-solid fa-power-off"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {modalIsOpen && (
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={() => setModalIsOpen(false)}
          className="col-lg-12 col-sm-2 p-0 custom-modal"
          style={{ zIndex: "1", width: "600px" }}
        >
          {/* <div className="user-modal-header">
              <i className="fa-solid fa-xmark cancel" onClick={() => setModalIsOpen(false)}>
              </i>
            </div> */}
          <div
            style={{ display: "flex", flexDirection: "row", width: "700px" }}
          >
            <div
              className="p-1"
              style={{
                flex: "5",
                color: "white",
                textAlign: "left",
                backgroundColor: "#2c3e50",
                alignContent: "center",
                textAlign: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={`${process.env.PUBLIC_URL}/${files}support.png`}
                style={{
                  //  border:'2px solid red',
                  width: "200px",
                  height: "300px",
                }}
              />
            </div>
            <div style={{ flex: "5", padding: "1%" }}>
              <Help setModalIsOpen={setModalIsOpen} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default Tools;
