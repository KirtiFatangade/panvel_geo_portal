    import React, { useEffect, useState,useContext } from "react";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Actions from "./Actions/Actions_new.js";
import PanvelMain from "../projects/Main"
import Nadi from "../projects/nadi";
import Satara from "../projects/Satara";
import Agrani from "../projects/Agrani";
import Malegaon from "../projects/Malegaon";
import Manyad from "../projects/Manyad";
import Pune from "../projects/Pune";
import Shrijab from "../projects/Shrijab";
import Repo from "../projects/MhWaterRepo";
import Project from "./DynProject";
import All from "../projects/ProjectsAll";
import { LayerFunctions } from "./layerFunc";
import Template from "./projectTemplate";
import PuneMini from "../projects/PuneMini";
import Survey from "../projects/Survey";
import Hazard from "../projects/hazard";
import Kol from "../projects/kol";
import Beed from "../projects/beed";
import KolFire from "../projects/kol_fire.js";
import Bird from "../projects/birdscale";
import Barpeta from "../projects/Barpeta.js";
import Water from "../projects/Water.js";
import Meghalaya from "../projects/Meghalaya.js";
import Cement from "../projects/Cement.js";
import { useNavigate, useLocation } from "react-router-dom";
import { GlobalContext } from "../../App";
import S3tiff from "../projects/S3tiff";
import { logToServer } from "../logger.js";
import PanvelNew from "../projects/PanvelNew";
import HDImage from "../projects/HDImage.js";

function SidebarTabs() {
    const [selTab, setTab] = useState("Main");
    const location = useLocation();
    const {
        userInfo,
        userProjects,
        organizationProjects
      } = useContext(GlobalContext)
    const navigate = useNavigate();
    function tabChange(e) {
        if (e === "Main") {
            setTab("Main");
            logToServer("info", "Tab changed to Main");

        }
        if (e === "Overlay") {
            setTab("Overlay");
            logToServer("info", "Tab changed to Overlay");

        }
    }


    
    return (
        <>


            {selTab === "Main" && (
                <>
                    <LayerFunctions>
                        <Template>
                            <Routes>
                                <Route
                                    path="/Panvel/*"
                                    element={
                                        <PanvelMain />
                                    }
                                />
                                <Route
                                    path="/Panvel-2025/*"
                                    element={
                                        <PanvelNew />
                                    }
                                />
                                <Route
                                    path="/15-cm-hd-image/*"
                                    element={
                                        <HDImage />
                                    }
                                />
                                <Route
                                    path="/Jeevit/*"
                                    element={
                                        <Nadi />
                                    }
                                />
                                <Route
                                    path="/Agrani/*"
                                    element={
                                        <Agrani />
                                    }
                                />
                                <Route
                                    path="/Malegaon/*"
                                    element={
                                        <Malegaon />
                                    }
                                />
                                <Route
                                    path="/Manyad/*"
                                    element={
                                        <Manyad />
                                    }
                                />
                                <Route
                                    path="/Pune/*"
                                    element={
                                        <Pune />
                                    }
                                />
                                <Route
                                    path="/Shrijab/*"
                                    element={
                                        <Shrijab />
                                    }
                                />
                                <Route
                                    path="/Waterbody-Collection/*"
                                    element={
                                        <Repo />
                                    }
                                />
                                {/* <Route
                                path="/projects"
                                element={<All/>}
                                /> */}
                                <Route
                                    path="/pune-demo/*"
                                    element={<PuneMini />}
                                />
                                <Route
                                    path="/satara/*"
                                    element={<Satara />}
                                />
                                <Route
                                path="/*"
                                element={<Project/>}
                                />
                                {/* <Route
                                    path="/survey"
                                    element={
                                        <Survey />
                                    }
                                /> */}
                                <Route
                                    path="/Raigad-Landslide-Hazard-Assesment/*"
                                    element={
                                        <Hazard />
                                    }
                                />
                                <Route
                                    path="/Kolhapur-Flood-Assesment/*"
                                    element={
                                        <Kol />
                                    }
                                />
                                <Route
                                    path="/Water-Impact-of-water-on-Agri-&-Livestock/*"
                                    element={
                                        <Beed />
                                    }
                                />
                                <Route
                                    path="/Kolhapur-Forest-Fire-Assesment/*"
                                    element={
                                        <KolFire />
                                    }
                                />
                                 <Route
                                    path="/Barpeta/*"
                                    element={
                                        <Barpeta/>
                                    }
                                />
                                <Route
                                    path="/Avalpoondurai-Crop-Classification/*"
                                    element={<Bird />}
                                />
                                <Route
                                    path="/Assam-Flood-2023/*" 
                                    element={<Barpeta />}
                                />
                                 <Route
                                    path="/Mines-in-Meghalaya/*"
                                    element={<Meghalaya />}
                                />
                                  <Route
                                    path="/Meghalaya-Forest-Loss-Construction/*"
                                    element={<Cement />}
                                />
                                 
                            </Routes>
                        </Template>
                    </LayerFunctions>
                </>
            )}
            {selTab === "Overlay" && (
                <>
                    <Actions />
                </>
            )}
            <div className="tabs-button" style={{ position: "absolute", display: "flex", flexDirection: "row", width: "100%", bottom: "0", left:'0',  backgroundColor:"rgb(37, 37, 37)"}}>
                <input type="radio" id="tab-action" name="tab" className="tab-input" value="Main" style={{ display: "none" }} onChange={(e) => tabChange(e.target.value)} checked={selTab === "Main"} />
                <label htmlFor="tab-action" className="btn tab-buttons" style={{ flex: "1", margin: "0px", marginBottom: "0", color: "#FAF8D4", fontSize: "15px" }}>Main</label>

                <input type="radio" id="tab-overlay" name="tab" className="tab-input" value="Overlay" style={{ display: "none" }} onChange={(e) => tabChange(e.target.value)} checked={selTab === "Overlay"} />
                <label htmlFor="tab-overlay" className="btn tab-buttons" style={{ flex: "1", margin: "0px", marginBottom: "0",color: "#FAF8D4", fontSize: "15px" }}>Overlay</label>
            </div>
        </>
    )
}

export default SidebarTabs;