
import Map from "./components/Main/Map";
import Ucon from "./components/UCon";
// import Login from './components/login';
// import Signup from "./components/signup";
import User from "./components/user";
import { HOST } from "./components/host";
import "../src/components/leaflet.latlng-graticule";
import Login from "./components/Authforms/Login";

import OrganizationForm from "./components/Authforms/OrgForm";
import NVerified from "./components/Pages/nverified";
import Verified from "./components/Pages/verified";
import SignUp from "./components/Authforms/SignUp";

import AdminPage from "./components/Pages/UserConsole";
import RefundAndCancellationPolicy from "./components/Pages/refund";
import TermsConditions from "./components/Pages/terms";
import PrivacyPolicy from "./components/Pages/policy";
import PricingTable from "./components/Pages/pricing";
import Forget from "./components/Authforms/forget";
import CreateUser from "./components/Authforms/AddUser";
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import Navigate from "./components/navigate";
import L from "leaflet";
import "./App.css";
import { createContext } from "react";
import { logToServer } from "./components/logger";
import MapBox from "./components/Pages/3dMapPages/MapBox";

export const GlobalContext = createContext();

function useForceUpdate() {
  const [, setValue] = useState(0);

  return () => setValue((value) => value + 1);
}

function App() {
  const [loaded, setLoad] = useState(false);
  const [mapData, setMapData] = useState({
    center: [27.891535, 78.078743],
    zoom: 4.0,
  });
  const [map, SetMap] = useState(null);
  const [drawnItems, setDrawnItems] = useState(null);
  const [layerControls, setLayerControls] = useState(null);
  const [drawControl, setDraw] = useState(null);
  const [foreLayers] = useState(new L.FeatureGroup());
  const [backLayers] = useState(new L.FeatureGroup());
  const [lastRect, setRect] = useState(null);
  const [usedShapes] = useState(new L.FeatureGroup());
  const [UsedLayers, SetLayers] = useState({});
  const [selectedLayers, setSelLayers] = useState({});
  const [chartData, setChart] = useState(null);
  const [tools, setTools] = useState(true);
  const [Canvas, setCanvas] = useState(null);
  const DrawHandler = useRef(null);
  const [userInfo, setUserInfo] = useState(null);
  const [Logout, SetLogout] = useState(false);
  const [filLayer, setFilLayer] = useState("");
  const routerPath = useRef(null);
  const waypoints = useRef([]);
  const [CountReq, setReq] = useState(0);
  const [chartCollapse, setCollapse] = useState(false);
  const [showGrid, setGrid] = useState(false);
  const [geocoding, setCoder] = useState(null);
  const [uploaded, setUploaded] = useState([]);
  const [gif, setGif] = useState(null);
  const [email, setEmail] = useState();
  const [chartType, setChartType] = useState(null);
  const [Waterlayers, setWaterLayers] = useState({});
  const once = useRef(false);
  const session_fetch = useRef(false);
  const [organizationProjects, setOrganizationProjects] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [selTab, setTab] = useState("opt1");
  const [prevMeta, setPrevMeta] = useState({});
  const [toggled, SetToggled] = useState([]);
  const [UTab, SetuTab] = useState("1");
  const [chatSmart, setSmart] = useState(false);
  const [CreationMode, SetCreationMode] = useState(false);
  const [EditMode, SetEditMode] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [Grat] = useState(
    L.latlngGraticule({
      showLabel: true,
      width: 5,
      fontColor: "yellow",
      font: "15px bold",
      color: "black",
      zoomInterval: [
        { start: 1, end: 3, interval: 30 },
        { start: 4, end: 4, interval: 10 },
        { start: 5, end: 7, interval: 5 },
        { start: 8, end: 10, interval: 1 },
        { start: 11, end: 14, interval: 0.1 },
        { start: 15, end: 17, interval: 0.01 },
        { start: 18, end: 20, interval: 0.003 },
      ],
    })
  );
  var customMarker = L.Icon.extend({
    options: {
      shadowUrl: null,
      iconAnchor: new L.Point(12, 12),
      iconSize: new L.Point(24, 24),
      iconUrl:
        "https://cdn4.iconfinder.com/data/icons/small-n-flat/24/map-marker-1024.png",
    },
  });
  const [vis, setVis] = useState(false);
  const [hisDate, setHisDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [Fstep, setFstep] = useState(0);
  const [CsDate, setCSdate] = useState("2024-01-01");
  const [inspect, SetInspect] = useState(false);
  const [LayerBands, setLBands] = useState({});
  const [threeD, set3d] = useState(false);
  const mapBoxContainerRef = useRef(null);
  const [mapBox, SetMapBox] = useState(null);
  const [boxLayers, setBoxLayers] = useState([]);
  const scrollDivRef = useRef(null);
  const sidebarRef = useRef(null);
  const [isSidebarTabs,setSidebarTabs]=useState(false);
  const forceUpdate = useForceUpdate();



  const contextValue = {
    loaded,
    setLoad,
    mapData,
    setMapData,
    map,
    SetMap,
    drawnItems,
    setDrawnItems,
    layerControls,
    setLayerControls,
    drawControl,
    setDraw,
    foreLayers,
    backLayers,
    lastRect,
    setRect,
    usedShapes,
    selectedLayers,
    setSelLayers,
    chartData,
    setChart,
    tools,
    setTools,
    Canvas,
    setCanvas,
    DrawHandler,
    userInfo,
    setUserInfo,
    UsedLayers,
    SetLayers,
    Logout,
    SetLogout,
    filLayer,
    setFilLayer,
    routerPath,
    customMarker,
    waypoints,
    CountReq,
    setReq,
    chartCollapse,
    setCollapse,
    showGrid,
    setGrid,
    Grat,
    geocoding,
    setCoder,
    vis,
    setVis,
    uploaded,
    setUploaded,
    gif,
    setGif,
    chartType,
    setChartType,
    Waterlayers,
    setWaterLayers,
    once,
    setOrganizationProjects,
    setUserProjects,
    userProjects,
    organizationProjects,
    email,
    setEmail,
    selTab,
    setTab,
    prevMeta,
    setPrevMeta,
    toggled,
    SetToggled,
    hisDate,
    setHisDate,
    getCsrfToken,
    UTab,
    SetuTab,
    Fstep,
    setFstep,
    CsDate,
    setCSdate,
    inspect,
    SetInspect,
    LayerBands,
    setLBands,
    chatSmart,
    setSmart,
    threeD,
    set3d,
    mapBox,
    SetMapBox,
    mapBoxContainerRef,
    boxLayers,
    setBoxLayers,
    forceUpdate,
    scrollDivRef,
    sidebarRef,
    CreationMode,
    SetCreationMode,
    EditMode,
    SetEditMode,
    transactions, 
    setTransactions,
    isSidebarTabs,
    setSidebarTabs
  };

  useEffect(() => {
    const fetchProjects = (email) => {
      if (
        organizationProjects &&
        userProjects &&
        !userProjects.length &&
        !organizationProjects.length
      ) {
        fetch(`${HOST}/fetch_projects/${email}`)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to fetch projects");
            }
            return response.json();
          })
          .then((data) => {
            console.log(data);
            setOrganizationProjects(data.organization_projects);
            setUserProjects(data.member_projects);
          })
          .catch((error) => {
            logToServer("error", `${error}`);
          });
      }
    };
    const fetchSession = async () => {
      try {
        const response = await fetch(`${HOST}/is-session`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const sessionData = await response.json();
          setEmail(sessionData.user.email_address);
          setUserInfo(sessionData.user);
          fetchProjects(sessionData.user.id);
        } else {
          // Check if the current path is not '/login' before redirecting
          // if (window.location.pathname !== "/login") {
          //   window.location.replace("/login");
          // }

           if (
            window.location.pathname !== "/login" &&
            window.location.pathname !== "/kmc-login"
          ) {
            if (window.location.pathname.includes("kmc")) {
              window.location.replace("/kmc-login");
            } else {
              window.location.replace("/login");
            }
          }
        }
      } catch (error) {
        // Log the error and redirect if not on the login page
        logToServer("error", `${error}`);
        // if (window.location.pathname !== "/login") {
        //   window.location.replace("/login");
        // }
         // for khopoli

        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/kmc-login"
        ) {
          if (window.location.pathname.includes("kmc")) {
            window.location.replace("/kmc-login");
          } else {
            window.location.replace("/login");
          }
        }
      }
    };

    if (!userInfo) {
      fetchSession();
    }
  }, [userInfo]);

  let _csrfToken = null;
  async function getCsrfToken() {
    if (_csrfToken === null) {
      const response = await fetch(`${HOST}/csrf/`, {
        credentials: "include",
      });
      const data = await response.json();
      _csrfToken = data.csrfToken;
    }
    return _csrfToken;
  }

  return (
    <GlobalContext.Provider value={contextValue}>
      <BrowserRouter>
        <Routes>
          <Route path="forget-password" element={<Forget />} />

          <Route path="verified" element={<Verified />} />
          <Route path="not-verified" element={<NVerified />} />
          <Route
            path=""
            element={
              userInfo ? (
                <Navigate url={"/panvel"} />
              ) : (
                <Navigate url={"/login"} />
              )
            }
          />

          <Route path="/*" element={<Map />} />

          <Route
            path="login"
            element={userInfo ? <Navigate url={"/panvel"} /> : <Login />}
          />
          <Route
            path="signup"
            element={userInfo ? <Navigate url={"/panvel"} /> : <SignUp />}
          />
          <Route
            path="createmember"
            element={userInfo ? <CreateUser /> : <Navigate url={"/login"} />}
          />
          <Route
            path="user-console"
            element={userInfo ? <AdminPage /> : <Navigate url={"/login"} />}
          />

          <Route
            path="/MapBox"
            element={userInfo ? <MapBox /> : <Navigate to="/login" />}
          />

          <Route path="terms-and-conditions" element={<TermsConditions />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route
            path="refund-policy"
            element={<RefundAndCancellationPolicy />}
          />
          <Route path="pricing" element={<PricingTable />} />

        </Routes>
       
      </BrowserRouter>
      <ToastContainer
        position="bottom-right"
        theme="colored"
        draggable={false}
      />
    </GlobalContext.Provider>
  );
}

export default App;
