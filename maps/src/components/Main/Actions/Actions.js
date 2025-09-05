import React, { useState, useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Segment from "./segment";
import Sat from "./satellite";
import Maxar from "./maxar";
import OD from "./od";
import NDVI from "./ndvi";
import Ship from "./ship";
import Template from "../projectTemplate";
import Process from "./process";
import UP42 from "../../static/up42";
import { GlobalContext } from "../../../App";

function Actions({ selectedDataset }) {
  const { userInfo, setPrevMeta } = useContext(GlobalContext);
  const { selTab, setTab,forceUpdate } = useContext(GlobalContext);
  const location = useLocation();

  const paymentPrompt = () => {
    alert("This feature is locked. Please contact support.dharaatech@gmail.com for more information");
  };

  useEffect(() => {
    const handleAddedToPro = () => setPrevMeta({});
    document.addEventListener("added-to-pro", handleAddedToPro);
    return () => document.removeEventListener("added-to-pro", handleAddedToPro);
  }, []);

  // Map tab options to components
 

  return (
    <div
      className="actions"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        marginTop: '-10px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', padding: '5px 0px' }}>
        <h4 style={{ flex: '10', color: "#FAF8D4", fontSize: '14px' }}>Select An Action</h4>
      </div>
      <div className="select" tabIndex="1">
        {/* Map over radio options */}
        {[
          { id: "opt1", label: "Open Source Satellite Datasets" },
          { id: "opt2", label: "Derived Open Source Satellite Datasets" },
          { id: "opt3", label: "High Resolution Disaster Satellite Datasets" },
          { id: "opt4", label: "Perform Map Segmentation", icon: true },
          { id: "opt5", label: "Perform Object Detection", icon: true },
          { id: "opt6", label: "Farm Health Graph Generation" },
          { id: "opt8", label: "Automated Actions" },
          { id: "opt9", label: "Climate and Weather Dataset" },
          { id: "opt10", label: "Ship Detection using SAR", icon: true },
          { id: "opt11", label: "UP42", icon: true }
        ].map(({ id, label, icon }) => (
          <>
            <input
              className="selectopt"
              name="test"
              type="radio"
              id={id}
              checked={selTab === id}
              onChange={() => {setTab(id);forceUpdate();}}
            />
            <label htmlFor={id} className="option" style={{ color: "#FAF8D4", fontSize: '12px', marginTop: "0px", display: 'flex', flexDirection: 'row' }}>
              <span style={{ marginRight: '5px' }}>{label}</span>
              {icon && <i className="fa-solid fa-crown" style={{ color: 'white', textShadow: '0 0 3px white', fontSize: '15px' }}></i>}
            </label>
          </>
        ))}
      </div>

      {/* Dynamically render selected component */}
      <Template>
          {selTab === "opt1" && (
            <>
              <Sat toFetch="open" />
            </>
          )}
          {selTab === "opt2" && (
            <>
              <Sat toFetch="derive" />
            </>
          )}
          {selTab === "opt3" && (
            <>
              <Maxar />
            </>
          )}
          {selTab === "opt4" && (
            <>
              <Segment />
            </>
          )}
          {selTab === "opt5" && (
            <>
              <OD />
            </>
          )}
          {selTab === "opt6" && (
            <>
              <NDVI />
            </>
          )}
          {/* {selTab === "opt7" && (
                  <>
                     <Ship />
                  </>
                )} */}
         
           {selTab === "opt8" && (
            <>
              <Process />
            </>
            
          )}
          {selTab === "opt9" && (
            <>
              <Sat  toFetch="weather"/>
            </>
            
          )}
           {selTab === "opt10" && (
            <>
              <Ship/>
            </>
            
          )}
          {selTab === "opt11" && (
            <>
              <UP42/>
            </>
            
          )}

        </Template>
      
    </div>
  );
}

export default Actions;
