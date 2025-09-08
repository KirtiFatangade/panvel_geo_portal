import React, {
  useState,
  useContext,
  useEffect,
  lazy,
  Suspense,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import Template from "../projectTemplate";
import { GlobalContext } from "../../../App";
import FModal from "./fModal";
import Modal from "react-modal";
import { HOST } from "../../host";
import DynFeat from "./DynFeature";
import datasetInfoDictionary from "./Info";

const loadComponent = (comp) => {
  return lazy(() => import(`../../static/${comp}`));
};

const buttonContainerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "15px",
  marginBottom: "1px",
  fontSize: "15px",
  // border: '2px solid gray'
};

const buttonStyle = {
  background: "none",
  color: "white",
  border: "none",
  borderRadius: "50%",
  display: "flex",
  alignItems: "right",
  justifyContent: "right",
  cursor: "pointer",
  fontSize: "13px",
};
function Actions({ selectedDataset }) {
  const { userInfo, setPrevMeta } = useContext(GlobalContext);
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [features, setFeatures] = useState([]);
  const [selFeature, setSelFeature] = useState(null);
  const [subFeatures, setSubFeatures] = useState([]);
  const [featureIdForModal, setFeatureIdForModal] = useState(null);
  const [selSubFeature, setSelSubFeature] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [FDropdown, setFdropdown] = useState(false);
  const [SubDropdown, SetDropdown] = useState(false);
  const [infoId, setId] = useState(null); // State to toggle info div
  const location = useLocation();
  const infoRef = useRef(null);

  const featuresCache = useRef(null); // Cache for features

  useEffect(() => {
    const handleAddedToPro = () => setPrevMeta({});
    document.addEventListener("added-to-pro", handleAddedToPro);
    return () => document.removeEventListener("added-to-pro", handleAddedToPro);
  }, []);

  const fetchFeatures = async (cache) => {
    if (featuresCache.current && cache) {
      // Use cached features if available
      setFeatures(featuresCache.current);
      if (featuresCache.current.length > 0) {
        const firstFeature = featuresCache.current[0];
        setSelFeature(firstFeature);
        if (firstFeature.sub) {
          await fetchSubFeatures(firstFeature.id);
        }
      }
    } else {
      try {
        const response = await fetch(`${HOST}/get-feature/0`);
        if (response.ok) {
          const data = await response.json();
          setFeatures(data.features);
          featuresCache.current = data.features; 
          if (data.features.length > 0) {
            const firstFeature = data.features[0];
            setSelFeature(firstFeature);
            if (firstFeature.sub) {
              await fetchSubFeatures(firstFeature.id);
            }
          }
        } else {
          console.error("Failed to fetch features");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const fetchSubFeatures = async (featureId) => {
    setSubFeatures([]);
    setSelSubFeature(null);
    try {
      const response = await fetch(`${HOST}/get-feature/${featureId}`);
      if (response.ok) {
        const subData = await response.json();
        setSubFeatures(subData.features);
        if (subData.features.length > 0) {
          setSelSubFeature(subData.features[0]);
        }
      } else {
        console.error("Failed to fetch sub-features");
      }
    } catch (error) {
      console.error("Error fetching sub-features:", error);
    }
  };

  useEffect(() => {
    fetchFeatures(true); // Initial fetch, only runs once on component mount
  }, []);

  const handleFeatureSelect = async (id) => {
    setShowInfo(false);
    setFdropdown(false);
    const selectedId = id;
    const feature = features.find((f) => f.id === parseInt(selectedId));
    if (!userInfo.is_superuser) {
      if (!(feature.plan <= userInfo.plan)) {
        alert("This feature is not available for your Plan");
        return;
      }
    }

    setSelFeature(feature);

    if (feature.sub) {
      await fetchSubFeatures(feature.id);
    } else {
      setSubFeatures([]);
      setSelSubFeature(null);
    }
  };

  const handleSubFeatureSelect = (id) => {
    setShowInfo(false);
    SetDropdown(false);
    const selectedId = id;
    const subFeature = subFeatures.find((f) => f.id === parseInt(selectedId));
    if (!userInfo.is_superuser) {
      if (!(subFeature.plan <= userInfo.plan)) {
        alert("This feature is not available for your Plan");
        return;
      }
    }
    setSelSubFeature(subFeature);
  };

  const handleInfoToggle = () => {
    setShowInfo(!showInfo);
    setId(selFeature?.id || selSubFeature?.id);
    console.log("Info button clicked. Show Info:", !showInfo);
    console.log("Selected Feature:", selSubFeature);
    setSelSubFeature(selSubFeature);
  };

  const handleDelete = async (id, isSubFeature) => {
    // Prompt the user for a password
    const password = window.prompt("Enter Password");

    // Check if the entered password matches the required one
    if (password !== "notallowed") {
      alert("Incorrect password. You are not allowed to delete this feature.");
      return; // Stop execution if the password is incorrect
    }

    try {
      const response = await fetch(`${HOST}/delete-feature/${id}`);
      if (response.ok) {
        if (isSubFeature) {
          setSubFeatures(subFeatures.filter((f) => f.id !== id));
          setSelSubFeature(subFeatures.filter((f) => f.id !== id)[0]);
        } else {
          setFeatures(features.filter((f) => f.id !== id));
          setSelFeature(features.filter((f) => f.id !== id)[0]);
          if (features.filter((f) => f.id !== id)[0].sub) {
            await fetchSubFeatures(features.filter((f) => f.id !== id)[0].id);
          }
          setSelSubFeature(null);
          featuresCache.current = features.filter((f) => f.id !== id);
        }
      } else {
        console.error("Failed to delete feature");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const openModalForFeature = (featureId) => {
    setEditMode(false);
    setFeatureIdForModal(featureId);
    setModal(true);
  };
  const openEditModal = (featureId) => {
    setFeatureIdForModal(featureId);
    setEditMode(true); // Enable edit mode
    setModal(true);
  };

  return (
    <>
      <div className="hide-show-container" style={{ width: "94%" }}>
        {" "}
        {/* Ensure full width of container */}
        <div className="sidepanel-container" style={{ width: "100%" }}>
          {" "}
          {/* Full width for panel */}
          <div className="sidenav" style={{ width: "100%" }}>
            {" "}
            {/* Ensure sidenav takes full width */}
            <div className="sidepanel-container" style={{ gap: "30%" }}>
              <div style={{ fontSize: "13px" }}>Select An Action </div>
              {userInfo.is_superuser && (
                <span style={buttonContainerStyle}>
                  {/* Add Button */}
                  <span
                    onClick={() => {
                      setFeatureIdForModal(null);
                      setModal(true);
                      setEditMode(false);
                    }}
                    style={buttonStyle}
                  >
                    <i className="fa-solid fa-plus"></i>
                  </span>
                  <span
                    style={buttonStyle}
                    onClick={() => openEditModal(selFeature.id)}
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </span>
                 
                  <span
                    style={buttonStyle}
                    onClick={() => handleDelete(selFeature.id, false)}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </span>
                </span>
              )}
            </div>
            <button
              onClick={() => setFdropdown(!FDropdown)}
              className="dropdown-btn"
              style={{
                backgroundColor: "gray",
                color: "white",
                border: "none",
                borderRadius: "4px",
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "13px" }}>
                {selFeature && selFeature.name}
              </div>
              <div>
                <i
                  className={`fa ${
                    FDropdown ? "fa-caret-up" : "fa-caret-down"
                  }`}
                  style={{ marginLeft: "5px" }}
                ></i>
              </div>
            </button>
            {FDropdown && (
              <div className="hidden-container">
                {features.map((feature) => (
                  <div
                    style={{ fontSize: "13px" }}
                    className="dropdown-div"
                    key={feature.id}
                    onClick={() => handleFeatureSelect(feature.id)}
                    value={feature.id}
                  >
                    {feature.name}
                    <hr style={{ margin: "5px 0" }} /> 
                  </div>
                ))}
              </div>
            )}
            
            {selFeature && selFeature.sub && !FDropdown && (
              <>
                {subFeatures && (
                  <>
                    <div
                      className="sidepanel-container"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: userInfo.is_superuser ? "10%" : "25%",
                        padding: "1px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          justifyContent: "center",
                          alignContent: "center",
                          padding: "5px",
                        }}
                      >
                        Select a Sub-Action
                      </div>

                      <div
                        className="sidepanel-container"
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "1%",
                          padding: "3%",
                        }}
                      >
                        {userInfo.is_superuser && (
                          <div style={buttonContainerStyle}>
                           
                            <span
                              onClick={() => openModalForFeature(selFeature.id)}
                              style={buttonStyle}
                            >
                              <i className="fa-solid fa-plus"></i>
                            </span>

                            
                            {selSubFeature && (
                              <>
                                <span
                                  style={buttonStyle}
                                  onClick={() =>
                                    openEditModal(selSubFeature.id)
                                  }
                                >
                                  <i className="fa-solid fa-pen-to-square"></i>
                                </span>
                                <span
                                  style={buttonStyle}
                                  onClick={() =>
                                    handleDelete(selSubFeature.id, true)
                                  }
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {selFeature && (
                          <span
                            onClick={handleInfoToggle}
                            style={{
                              backgroundColor: "transparent",
                              color: "white",
                              padding: "0px 5px",
                              marginTop: "-3px",
                            }}
                          >
                            <i className="fa-solid fa-info"> </i>
                          </span>
                        )}
                      </div>
                    </div>

                    {subFeatures.length ? (
                      <button
                        onClick={() => SetDropdown(!SubDropdown)}
                        className="dropdown-btn"
                        style={{
                          backgroundColor: "gray",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: "13px" }}>
                          {selSubFeature && selSubFeature.name}
                        </div>
                        <div>
                          <i
                            className={`fa ${
                              SubDropdown ? "fa-caret-up" : "fa-caret-down"
                            }`}
                            style={{ marginLeft: "5px" }}
                          ></i>
                        </div>
                      </button>
                    ) : null}

                    {SubDropdown && (
                      <div className="hidden-container">
                        {subFeatures.length &&
                          subFeatures.map((feature) => (
                            <div
                              style={{ fontSize: "13px" }}
                              className="dropdown-div"
                              onClick={() => handleSubFeatureSelect(feature.id)}
                              key={feature.id}
                              value={feature.id}
                            >
                              {feature.name}
                              <hr style={{ margin: "5px 0" }} />
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {selFeature && selFeature.comp_type && !FDropdown ? (
        <Suspense fallback={<div>Loading...</div>}>
          {React.createElement(loadComponent(selFeature.comp), {
            feat_id: selFeature.id,
            credit: selFeature.credit,
          })}
        </Suspense>
      ) : null}

      {selFeature && !selFeature.comp_type && !selFeature.sub && !FDropdown && (
        <DynFeat
          id={selFeature.id}
          name={selFeature.name}
          comp_type={selFeature.comp_type}
          comp={selFeature.comp}
          type={selFeature.type}
          url={selFeature.url}
          url_params={selFeature.url_params}
          visuals={selFeature.visuals}
          add={selFeature.add}
          credit={selFeature.credit}
        />
      )}

      {selSubFeature &&
        !selSubFeature.comp_type &&
        !SubDropdown &&
        !FDropdown && (
          <DynFeat
            id={selSubFeature.id}
            name={selSubFeature.name}
            comp_type={selSubFeature.comp_type}
            comp={selSubFeature.comp}
            type={selSubFeature.type}
            url={selSubFeature.url}
            url_params={selSubFeature.url_params}
            visuals={selSubFeature.visuals}
            add={selSubFeature.add}
            credit={selSubFeature.credit}
          />
        )}

      {selSubFeature &&
      selSubFeature.comp_type &&
      !SubDropdown &&
      !FDropdown ? (
        <Suspense fallback={<div>Loading...</div>}>
          {React.createElement(loadComponent(selSubFeature.comp), {
            feat_id: selSubFeature.id,
            credit: selSubFeature.credit,
          })}
        </Suspense>
      ) : null}

      {showInfo && selSubFeature && (
        <>
          <div className="info-div">
            <div className="user-modal-header">
              <i
                className="m-0 fa-solid fa-xmark cancel"
                onClick={() => setShowInfo(false)}
              ></i>
            </div>
            {datasetInfoDictionary[selSubFeature.name] ? (
              <>
                <h3>{selSubFeature.name}</h3>
                <p>{datasetInfoDictionary[selSubFeature.name]}</p>
              </>
            ) : (
              <p className="m-0 text-center">No Information Available</p>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modal}
        onRequestClose={() => setModal(false)}
        className="col-lg-3 col-sm-2 custom-modal"
        contentLabel="Feature Modal"
      >
        <div className="user-modal-header">
          <i
            className="fa-solid fa-xmark cancel"
            onClick={() => setModal(false)}
          ></i>
        </div>

        <FModal
          feature_id={featureIdForModal}
          fetchFeatures={fetchFeatures}
          fetchSubFeatures={fetchSubFeatures}
          editMode={editMode}
          selFeature={
            editMode &&
            featureIdForModal &&
            selFeature &&
            featureIdForModal === selFeature.id
              ? selFeature
              : null
          }
          selSubFeature={
            editMode &&
            featureIdForModal &&
            selSubFeature &&
            featureIdForModal === selSubFeature.id
              ? selSubFeature
              : null
          }
        />
      </Modal>
    </>
  );
}

export default Actions;
