import React, { useEffect, useState, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import Modal from "react-modal";
import Markdown from "react-markdown";
import files from "../static";
import { HOST, HOST_CHATBOT_APP_URL } from "../host";
import "./Chatbot.css";
import Draggable from "react-draggable";
import { Resizable } from "react-resizable";
import { GlobalContext } from "../../App";
import "react-datepicker/dist/react-datepicker.css";
import { bbox, feature } from "@turf/turf";
import L from "leaflet";
import Papa from "papaparse";
import CsvComp from "./cvsComp";
// import ReactModal from 'react-modal';
import { helpers, area, convertArea } from "@turf/turf";
import Loading from "./loading";
import { Rnd } from "react-rnd";
import { ToastContainer, toast } from "react-toastify";

export default function Chatbot({ id, setShowChatbot }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [promptMessage, setPromptMessage] = useState("");
  const [responseText, setResponseText] = useState("");
  const [geminiResponse, setgeminiResponse] = useState("");
  const [previousChatId, setPreviousChatId] = useState("");
  const {
    userInfo,
    getCsrfToken,
    lastRect,
    drawnItems,
    map,
    layerControls,
    Fstep,
    setFstep,
    CsDate,
    setCSdate,
    selTab,
    chatSmart,
    setSmart,
    Canvas,
    mapBox,
  } = useContext(GlobalContext);
  const [eDate, setEdate] = useState("2024-01-31");
  const [districts, SetDist] = useState([]);
  const [dis, SetDis] = useState(null);
  const [taluqa, setTalq] = useState([]);
  const [tal, setTal] = useState(null);
  const lastMessageRef = useRef(null);
  const [mess, setMess] = useState(null);
  const Expro = "I want to calculate forest fire area";
  const Expro1 = "I want to get the green cover change";
  const [type, setType] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvDataTable, setCsvDataTable] = useState(false);
  const [headerSize, setHeaderSize] = useState({ width: 504, height: 70 });
  const [chatSectionSize, setChatSectionSize] = useState({
    width: 504,
    height: 670,
  });
  const [footerSize, setFooterSize] = useState({ width: 504, height: 50 });
  const [maxHeaderHeight, setMaxHeaderHeight] = useState(70);
  const [maxChatHeight, setMaxChatHeight] = useState(500);
  const [maxFooterHeight, setMaxFooterHeight] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const urls = useRef(null);
  const fileInputRef = useRef(null);
  const location = useLocation();
  const [mode, setMode] = useState(2);
  const [isLoading, setIsLoading] = useState(false);

  const dataRef = useRef([]);

  function CreateNDVI(data) {
    let layer;
    layer = L.tileLayer(data.url_1[0], { maxZoom: 20, zIndex: 1005 });
    layerControls.addOverlay(
      layer,
      `Raster  ${CsDate} `,
      false,
      false,
      false,
      false,
      false,
      data.url_1[1]
    );
    layer.addTo(map);
    layer = L.tileLayer(data.url_2[0], { maxZoom: 20, zIndex: 1005 });
    layerControls.addOverlay(
      layer,
      `Raster  ${eDate} `,
      false,
      false,
      false,
      false,
      false,
      data.url_2[1]
    );
    layer.addTo(map);
    layer = L.geoJSON(data.geo_1[0], {
      style: { fill: false, color: "#000000", fillOpacity: 0.5 },
    });
    layerControls.addOverlay(
      layer,
      `Green Cover ${CsDate}`,
      false,
      false,
      false,
      false,
      false,
      data.geo_1[1]
    );
    layer = L.geoJSON(data.geo_2[0], {
      style: { fill: false, color: "#000000", fillOpacity: 0.5 },
    });
    layerControls.addOverlay(
      layer,
      `Green Cover ${eDate}`,
      false,
      false,
      false,
      false,
      false,
      data.geo_2[1]
    );
    try {
      let total_pos = area(data.change_1[0]) / 10 ** 6;
      let total_neg = area(data.change_2[0]) / 10 ** 6;

      layer = L.geoJSON(data.change_1[0], {
        style: { fill: true, color: "#00FF00" },
      });
      layerControls.addOverlay(
        layer,
        "Positive Change",
        false,
        false,
        false,
        false,
        false,
        data.change_1[1]
      );
      layer = L.geoJSON(data.change_2[0], {
        style: { fill: true, color: "#FF0000" },
      });
      layerControls.addOverlay(
        layer,
        "Negative Change",
        false,
        false,
        false,
        false,
        false,
        data.change_2[1]
      );
      sendMessage(
        `postive-${total_pos.toFixed(2)}-negative-${total_neg.toFixed(2)}`
      );
    } catch (e) { }

    setMess("The layers has been added");
    setFstep(0);
  }

  function CreateFire(data) {
    console.log(data);
    let layer;
    let total = 0;

    function calculateAndFormatArea(feature) {
      let areaValue = area(feature);
      let convertedArea = convertArea(areaValue, "meters", "kilometers");
      return convertedArea;
    }

    let layers = L.geoJSON(JSON.parse(data.geo[0]), {
      onEachFeature: (feature, layer) => {
        let areaInKm = calculateAndFormatArea(feature);
        let formattedArea = areaInKm.toFixed(2);
        layer.bindPopup(`Area: ${formattedArea} square km`);
      },
      style: function (feature) {
        return { color: "#FF0000", fill: true, fillColor: "#000000" };
      },
    });

    total = calculateAndFormatArea(JSON.parse(data.geo[0]));
    layers.addTo(map);
    let bounds = layers.getBounds();
    layerControls.addOverlay(
      layers,
      "Fire Area Vector",
      true,
      bounds,
      false,
      false,
      false,
      data.geo[1]
    );
    layers = L.tileLayer(data.norm[0], { zIndex: 1005, maxZoom: 20 });
    layers.addTo(map);
    layerControls.addOverlay(
      layers,
      "RGB",
      false,
      false,
      false,
      false,
      false,
      data.norm[1]
    );
    layers = L.tileLayer(data.fire[0], { zIndex: 1005, maxZoom: 20 });
    layers.addTo(map);
    layerControls.addOverlay(
      layers,
      "SWIR",
      false,
      false,
      false,
      false,
      false,
      data.fire[1]
    );
    setMess("The layers has been added");
    setFstep(0);
    sendMessage(`total_area-${total.toFixed(2)}`);
  }

  async function NDVI() {
    setMess("Please Wait");
    let data = {};
    data["Sdate"] = CsDate;
    data["Edate"] = eDate;
    if (Fstep === 3) {
      if (lastRect && drawnItems.hasLayer(lastRect)) {
        data["box"] = [
          JSON.stringify(
            drawnItems.getLayer(lastRect).toGeoJSON()["geometry"][
            "coordinates"
            ][0]
          ),
        ];
      } else {
        return;
      }
    }
    if (Fstep === 4) {
      data["tal"] = [dis, tal];
    }
    if (window.location.pathname.startsWith("/project/")) {
      const projectId = location.pathname.split("/")[3];
      data["project"] = projectId;
    } else {
      data["project"] = "global";
    }
    data["memb"] = userInfo.id;
    data["tab"] = selTab;
    console.log(data);
    try {
      await fetch(`${HOST}/ndvi-change`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      })
        .then((response) => response.json())
        .then((data) => CreateNDVI(data));
    } catch (error) {
      alert("Unexpected Error occured Please try again");
      setFstep(0);
    }
  }

  async function FireVis() {
    setMess("Please Wait");
    let data = {};
    data["date"] = CsDate;
    if (Fstep === 3) {
      if (lastRect && drawnItems.hasLayer(lastRect)) {
        data["box"] = [
          JSON.stringify(
            drawnItems.getLayer(lastRect).toGeoJSON()["geometry"][
            "coordinates"
            ][0]
          ),
        ];
      } else {
        return;
      }
    }
    if (Fstep === 4) {
      data["tal"] = [dis, tal];
    }
    if (window.location.pathname.startsWith("/project/")) {
      const projectId = location.pathname.split("/")[3];
      data["project"] = projectId;
    } else {
      data["project"] = "global";
    }
    data["memb"] = userInfo.id;
    data["tab"] = selTab;
    try {
      await fetch(`${HOST}/forest-fire`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      })
        .then((response) => response.json())
        .then((data) => CreateFire(data));
    } catch (error) {
      alert("Unexpected Error occured Please try again");
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const previousChatData = await fetchPreviousChatId(userInfo.id, mode);
        const chatId = previousChatData.recent_chat_id
          ? previousChatData.recent_chat_id
          : generateRandomString();
        setPreviousChatId(chatId);
        await fetchChatHistory(userInfo.id, chatId);
      } catch (error) {
        console.error("Error fetching chat data:", error);
      }
    };

    fetchData();
  }, [userInfo.id, mode]);

  const fetchPreviousChatId = async (id, mode) => {
    try {
      const response = await fetch(
        `${HOST_CHATBOT_APP_URL}/get-recent-chat-id/${id}/${mode}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch latest chat");
      }
      const data = await response.json();
      console.log("data chats", data);
      return data;
    } catch (error) {
      console.error("Error fetching latest chat:", error);
      return null;
    }
  };

  const fetchChatHistory = async (id, chatId) => {
    try {
      const response = await fetch(
        `${HOST_CHATBOT_APP_URL}/get-chat-history/${id}/${chatId}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }
      const data = await response.json();
      console.log("data history", data.his);
      setChatHistory(data.his);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      console.error("Error fetching chat history:", error);
    }
  };

  const generateRandomString = () => {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const length = 16;
    let randomString = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters[randomIndex];
    }
    return randomString;
  };

  const resetChatConversation = async () => {
    const newChatId = generateRandomString();
    setPreviousChatId(newChatId);
    console.log(newChatId);
    await fetchChatHistory(userInfo.id, newChatId, mode);
  };

  const handleTextareaChange = (event) => {
    const message = event.target.value;
    setPromptMessage(message);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // function showTable(chatHistoryId, csvFilePaths) {
  //     const myDiv = document.getElementById(`chat_history_${chatHistoryId}`);
  //     let cont = getCsvRecords(csvFilePaths)
  //     console.log(cont)
  //     myDiv.innerHTML = cont;
  //     // setCsvDataTable(!csvDataTable);
  // }

  async function sendMessage(prompt = null) {
    // let message = prompt ? prompt : promptMessage;
    let message = typeof prompt === 'string' ? prompt : promptMessage;

    if (message && message !== "") {
      setIsLoading(true);

      if (!message.includes("total_area") && !message.includes("postive-")) {
        setChatHistory((prevChatHistory) => [
          ...prevChatHistory,
          { sender: "user", text: message, time: new Date() },
        ]);
      }
      setPromptMessage("");
      if ((message === Expro || message === Expro1) && Fstep === 0) {
        setPromptMessage("");
        setFstep(1);
        if (message === Expro) {
          setType("fire");
        } else {
          setType("ndvi");
        }
      }
      let box = null;
      let extent = null;
      if (mode === 3) {
        if (lastRect && drawnItems.hasLayer(lastRect)) {
          box = bbox(drawnItems.getLayer(lastRect).toGeoJSON());
        }
        extent = map.getBounds();
      }
      await fetch(
        `${HOST_CHATBOT_APP_URL}/get-prompt-response/${userInfo.id}/${previousChatId}/${mode}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": await getCsrfToken(),
          },
          body: JSON.stringify({
            message: message,
            response: responseText,
            box: box,
            extent: extent,
          }),
        }
      )
        .then((response) => response.json())
        .then((data) => {
          console.log(data);

          setPromptMessage("");
          setPromptMessage("");
          if (data.response) {
            console.log(data.response);
            setChatHistory((prevChatHistory) => [
              ...prevChatHistory,
              {
                sender: "bot",
                text: data.response,
                mode: data.mode,
                time: new Date(),
                paths: data.paths,
              },
            ]);
          }
        })
        .catch((error) => {
          console.error("Error sending message:", error);
          setIsLoading(false);
        });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (dis) {
      setTal("");
      fetchList(dis);
    }
  }, [dis]);

  async function fetchList(name) {
    let url;
    if (name) {
      url = new URL(`${HOST}/clip-list/tal/${name}`);
    } else {
      url = new URL(`${HOST}/clip-dis-list`);
    }

    try {
      await fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if (!name) {
            SetDist(data.district);
          } else {
            setTalq(data.taluka);
          }
        });
    } catch (error) {
      console.error("Error sending POST request:", error.message);
      alert("Unexpected Error occured Please try again");
    }
  }

  function HandleNext(e, i) {
    e.preventDefault();
    e.stopPropagation();
    setFstep(i);
    if (i === 4) {
      SetDist([]);
      setTalq([]);
      SetDis(null);
      setTal(null);

      fetchList();
    }
  }

  const handleButtonClick = () => {
    // Trigger the file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log(`File selected: ${file.name}`);

      // Prepare the form data to send to the Django server
      const formData = new FormData();
      formData.append("file", file);
      setIsLoading(true);
      try {
        const response = await fetch(`${HOST}/shp-table/${userInfo.id}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": await getCsrfToken(),
          },
          body: formData,
        });

        if (response.ok) {
          alert("File uploaded successfully.");
          // You can handle the response if needed
        } else {
          alert("File not uploaded successfully");
        }
      } catch (error) {
        console.error("An error occurred while uploading the file:", error);
      }
      setIsLoading(false);
    }
  };

  function Visualize(resp) {
    console.log(typeof resp);
    if (typeof resp === "string") {
      resp = resp.replace(/'/g, '"');
      resp = JSON.parse(resp);
    }
    console.log(resp);

    resp["data"].forEach((data) => {
      console.log(data);
      // Generate a random 4-digit number
      let randomNum = Math.floor(1000 + Math.random() * 9000);
      let name = `${resp["func"]}-${data["type"]}-${randomNum}`;

      if (data["type"] === "geo") {
        Canvas.addLayerUrl(
          name,
          `https://portal.vasundharaa.in/${data["data"]}`
        );
        layerControls.addOverlay(
          L.geoJSON(),
          name,
          false,
          null,
          true,
          name,
          false
        );
      } else if (data["type"] === "url") {
        let layer = null;
        if (!Array.isArray(data["data"])) {
          // Single tile layer for Leaflet
          let layer = L.tileLayer(data["data"], { maxZoom: 20, zIndex: 1005 });
          layerControls.addOverlay(layer, data["name"] ? data["name"] : name);
          layer.addTo(map);
        } else {
          urls.current = data["data"]; // Store URLs or GeoJSON data

          if (window.location.pathname.startsWith("/MapBox") && mapBox) {
            try {
              // Add GeoJSON source and layer for Mapbox
              mapBox.addSource("watershed-source", {
                type: "geojson",
                data: data["data"][0],
              });

              mapBox.addLayer({
                id: "watershed-source-layer",
                type: "line",
                source: "watershed-source",
                paint: {
                  "line-color": "#000",
                  "line-width": 3,
                },
              });

              const layerID = `${name}-layer`;
              mapBox.on("zoomend", () => {
                updateMapboxLayer(mapBox.getZoom(), mapBox, layerID, [
                  `${name}-0`,
                  `${name}-1`,
                  `${name}-2`,
                  `${name}-3`,
                ]);
              });
            } catch (e) {
              console.error("Error handling Mapbox layers:", e);
            }
          } else {
            try {
              // Leaflet handling with dynamic tile switching
              let layer = L.tileLayer(getTileUrl(map.getZoom(), urls.current), {
                maxZoom: 20,
                zIndex: 1005,
              });

              map.on("zoomend", () => {
                const zoom = map.getZoom();
                layer.setUrl(getTileUrl(zoom, urls.current));

                if (zoom <= 5) {
                  toggleCanvasLayers(
                    "waterbody_watershed",
                    "waterbody_sub_basin",
                    "waterbody_micro_watershed"
                  );
                } else if (zoom <= 8) {
                  toggleCanvasLayers(
                    "waterbody_sub_basin",
                    "waterbody_watershed",
                    "waterbody_micro_watershed"
                  );
                } else {
                  toggleCanvasLayers(
                    "waterbody_micro_watershed",
                    "waterbody_sub_basin",
                    "waterbody_watershed"
                  );
                }
              });

              if (map.getZoom() <= 5) {
                map.flyTo([22.395, 78.768], 5);
              }

              layer.addTo(map);
              layerControls.addOverlay(
                layer,
                data["name"] ? data["name"] : name,
                false,
                false,
                false,
                false,
                false
              );
            } catch (e) {
              console.error("Error handling Leaflet layers:", e);
            }
          }
        }
      }
    });
  }

  function getTileUrl(zoom, urls) {
    if (zoom <= 5) return urls[0];
    if (zoom <= 8) return urls[1];
    if (zoom <= 10) return urls[2];
    return urls[3];
  }

  function updateMapboxLayer(zoom, mapBox, layerID, sources) {
    if (mapBox.getLayer(layerID)) {
      mapBox.removeLayer(layerID);
    }
    const sourceIndex = zoom <= 5 ? 0 : zoom <= 8 ? 1 : zoom <= 10 ? 2 : 3;
    mapBox.addLayer({
      id: layerID,
      type: "raster",
      source: sources[sourceIndex],
    });
  }

  function toggleCanvasLayers(add, ...remove) {
    Canvas.addLayer(add, "");
    remove.forEach((layer) => Canvas.removeLayer(layer, ""));
  }

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isResizing) {
      setHeaderSize((prevSize) => ({
        width: Math.max(200, prevSize.width + e.movementX),
        height: Math.max(200, prevSize.height + e.movementY),
      }));

      setChatSectionSize((prevSize) => ({
        width: Math.max(200, prevSize.width + e.movementX),
        height: Math.max(200, prevSize.height + e.movementY),
      }));

      setFooterSize((prevSize) => ({
        width: Math.max(200, prevSize.width + e.movementX),
        height: Math.max(200, prevSize.height + e.movementY),
      }));

      setMaxHeaderHeight(Math.max(200, headerSize.height + e.movementY));
      setMaxChatHeight(Math.max(200, chatSectionSize.height + e.movementY));
      setMaxFooterHeight(Math.max(200, footerSize.height + e.movementY));
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isResizing,
    headerSize.height,
    chatSectionSize.height,
    footerSize.height,
  ]);

  const clearLog = async (e) => {  
    e.preventDefault();  
    try {
      const response = await fetch(
        `${HOST_CHATBOT_APP_URL}/clear-chat-conversation-log/${userInfo.id}`,
        {
          headers: {
            "X-CSRFToken": await getCsrfToken(),
          },
        }
      );

      if (response.ok) {
        toast.success("Log Cleared successfully.");
      } else {
        toast.error("Log not cleared");
      }
    } catch (error) {
      console.error("Log not cleared", error);
    }
    setIsLoading(false);
  };

  return (
    <>
      <div
        className="chatbot-section-container"
        style={{
          cursor: "nwse-resize",
          // boxShadow: '5px 0px 10px 0px #383838'
        }}
      >
        <Rnd
          style={{
            // position: 'relative',

            // boxShadow: '5px 0px 10px 0px #383838',
            width: "100%",
            height: "100%",
          }}
          default={{
            x: 0,
            y: -250,
            width: 500,
            height: 550,
          }}
          minWidth={500}
          minHeight={550}
          maxWidth={1200}
          maxHeight={850}
          disableDragging={false}
          bounds="window"
        >
          {/* Chatbot header section */}
          <div
            className="chatbot-header-section"
            style={{ boxShadow: "1px 0px 10px 6px #383838" }}
          >
            <div>
              <label
                className="text-white"
                style={{ fontSize: "15px", marginRight: "5px" }}
              >
                Mode :{" "}
              </label>
              <select
                id="smart"
                value={mode}
                onChange={(e) => setMode(Number(e.target.value))}
              >
                <option value={1}>Perform Spatial Analysis</option> 
                <option value={2}> Help & Support</option>
                <option value={3}>Automated Actions</option>
              </select>
            </div>
            <div className="close-chatbot" style={{ width: '40px', height: '30px', textAlign: 'center' }}
              onClick={() => {
                setShowChatbot(false);
              }}>
              <i className="fa-solid fa-xmark"></i>
            </div>
          </div>

          {/* Chatbot Old header section */}
          {/* <div className="card-header d-flex justify-content-between align-items-center m-0 p-3 text-white" style={{ backgroundColor: 'black', width: '100%', zIndex: '1', position: 'sticky', top: '0', maxWidth: '100%' }}>
                    <div className="d-flex align-items-center">
                        <label htmlFor="smart" style={{ marginRight: "5px", fontSize: '16px', fontWeight: 'bold' }}>Mode</label>
                        <select
                            id="smart"
                            value={mode}
                            onChange={(e) => setMode(Number(e.target.value))}
                        >
                            <option value={1}>Perform Spatial Analysis</option>
                            <option value={2}> Help & Support</option>

                        </select>
                    </div>
                    <p className="mb-0 fw-bold flex-grow-1" style={{ marginLeft: "100px" }}>Live chat</p>
                    <i className="fas fa-times text-white" onClick={() => { setShowChatbot(false) }}></i>
                </div> */}

          {/*  Chatbot chat section */}

          <div
            className="chatbot-chat-section"
            style={{
              pointerEvents: "auto",
              boxShadow: "1px 0px 10px 6px #383838",
            }} // Disable dragging for the chat section only
            onMouseDown={(e) => e.stopPropagation()}
          >
            {Array.isArray(chatHistory) &&
              chatHistory.map((child, index) => (
                <div
                  key={index}
                  ref={index === chatHistory.length - 1 ? lastMessageRef : null}
                  style={{ position: "relative" }}
                  className={`d-flex flex-row justify-content-${child.sender === "user" ? "end" : "start"
                    } mb-4`}
                >
                  {child.sender === "user" ? (
                    <>
                      {child.text !== "" ? (
                        <>
                          <div
                            className="p-3 ms-3 position-relative"
                            style={{
                              borderRadius: "15px",
                              backgroundColor: "rgba(57, 192, 237, 0.2)",
                              minWidth: "120px",
                            }}
                          >
                            <p
                              style={{ marginBottom: "20px", fontSize: "15px" }}
                            >
                              {child.text}
                            </p>
                            <div
                              className="watermark"
                              style={{
                                position: "absolute",
                                bottom: "5px",
                                right: "5px",
                                fontSize: "10px",
                                color: "rgba(0, 0, 0, 0.5)",
                              }}
                            >
                              {new Date(child.time).toLocaleString()}
                            </div>
                          </div>
                          <img
                            src={`${process.env.PUBLIC_URL}/${files}userprofile.png`}
                            alt="avatar 1"
                            style={{
                              width: "35px",
                              height: "100%",
                              marginLeft: "2%",
                            }}
                          />
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <img
                        src={`${process.env.PUBLIC_URL}/${files}chatbot.png`}
                        alt="avatar 1"
                        style={{ width: "35px", height: "100%" }}
                      />
                      <div
                        className="p-3 border position-relative"
                        style={{
                          borderRadius: "10px",
                          backgroundColor: "#fbfbfb",
                          maxWidth: "75%",
                          overflowX: "auto",
                          overflowY: "auto",
                        }}
                      >
                        {child.mode && child.mode === 2 && (
                          <p
                            className="small mb-0"
                            style={{
                              maxWidth: "100%",
                              overflowWrap: "break-word",
                            }}
                          >
                            <Markdown>{child.text}</Markdown>
                          </p>
                        )}
                        {child.mode &&
                          child.mode === 3 &&
                          (typeof child.text === "object" &&
                            child.text !== null ? (
                            <p
                              className="small mb-0"
                              style={{
                                maxWidth: "100%",
                                overflowWrap: "break-word",
                              }}
                            >
                              {/* Visualize Layer
                              <br></br> */}
                              <button onClick={() => Visualize(child.text)}>
                                Visualize Layer
                              </button>
                            </p>
                          ) : (
                            <p
                              className="small mb-0"
                              style={{
                                maxWidth: "100%",
                                overflowWrap: "break-word",
                              }}
                            >
                              <Markdown>{child.text}</Markdown>
                            </p>
                          ))}

                        {child.mode && child.mode === 1 && (
                          <>
                            {child.mode === 1 && (
                              <>
                                <Markdown>{child.text}</Markdown>

                                {child.paths && child.paths.length ? (
                                  <CsvComp
                                    index={index}
                                    url={child.paths}
                                    setIsLoading={setIsLoading}
                                  />
                                ) : null}
                              </>
                            )}
                          </>
                        )}
                        {child.mode && (
                          <div
                            className="watermark"
                            style={{
                              position: "absolute",
                              bottom: "0px",
                              right: "5px",
                              fontSize: "10px",
                              color: "rgba(0, 0, 0, 0.5)",
                            }}
                          >
                            {child.mode === 1 && "Spatial Analysis Mode"}
                            {child.mode === 2 && "Help & Support Mode"}
                            {child.mode === 3 && "Automated Operations"}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

            {Fstep >= 1 && (
              <div className="d-flex flex-column align-items-start mb-4">
                <div
                  className="p-3 me-3 border"
                  style={{
                    borderRadius: "15px",
                    backgroundColor: "#fbfbfb",
                    maxWidth: "70%",
                  }}
                >
                  <div style={{ marginTop: "15px" }}>
                    <label
                      htmlFor="start"
                      style={{
                        marginRight: "10px",
                        color: "black",
                        fontSize: "12px",
                        display: "inline-block",
                      }}
                    >
                      Date:
                    </label>
                    <input
                      value={CsDate}
                      onChange={(e) => setCSdate(e.target.value)}
                      style={{
                        fontSize: "12px",
                        padding: "3px 10px",
                        borderRadius: "5px",
                      }}
                      type="date"
                      id="start"
                      name="start"
                    />
                  </div>
                  {type === "ndvi" ? (
                    <div style={{ marginTop: "15px" }}>
                      <label
                        htmlFor="end"
                        style={{
                          marginRight: "15px",
                          color: "black",
                          fontSize: "12px",
                          display: "inline-block",
                        }}
                      >
                        End Date:
                      </label>
                      <input
                        value={eDate}
                        onChange={(e) => setEdate(e.target.value)}
                        style={{
                          fontSize: "12px",
                          padding: "3px 10px",
                          borderRadius: "5px",
                        }}
                        type="date"
                        id="end"
                        name="end"
                      />
                    </div>
                  ) : null}
                  <button
                    onClick={(e) => HandleNext(e, 2)}
                    className="btn btn-dark mt-3"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {Fstep >= 2 && (
              <div className="d-flex flex-column align-items-start mb-4">
                <div
                  className="p-3 me-3 border"
                  style={{
                    borderRadius: "15px",
                    backgroundColor: "#fbfbfb",
                    maxWidth: "70%",
                  }}
                >
                  <div style={{ marginTop: "15px" }}>
                    <button onClick={(e) => HandleNext(e, 3)}>
                      Extent by Box
                    </button>
                  </div>
                </div>
              </div>
            )}
            {Fstep === 3 && (
              <div className="d-flex flex-column align-items-start mb-4">
                <div
                  className="p-3 me-3 border"
                  style={{
                    borderRadius: "15px",
                    backgroundColor: "#fbfbfb",
                    maxWidth: "70%",
                  }}
                >
                  <p>Please draw an Rectangle. Ignore if already drawn</p>
                  <button
                    onClick={() => (type === "fire" ? FireVis() : NDVI())}
                    className="btn btn-dark mt-3"
                  >
                    Visualize
                  </button>
                </div>
              </div>
            )}
            {Fstep === 4 && (
              <>
                <div className="d-flex flex-column align-items-start mb-4">
                  <div
                    className="p-3 me-3 border"
                    style={{
                      borderRadius: "15px",
                      backgroundColor: "#fbfbfb",
                      maxWidth: "70%",
                    }}
                  >
                    {districts && districts.length ? (
                      <>
                        <p>Please select a District</p>
                        <select
                          onChange={(e) => SetDis(e.target.value)}
                          className=" form-select custom-select"
                          style={{
                            width: "150px",
                            height: "25px",
                            padding: "0px 10px",
                            margin: "0px 0px 2px 5px",
                            fontSize: "12px",
                          }}
                        >
                          <option style={{ fontSize: "12px" }} value={""}>
                            Select District
                          </option>

                          {districts
                            .map((nme) => nme)
                            .sort()
                            .map((nme) => (
                              <option
                                style={{ textAlign: "left", fontSize: "12px" }}
                                key={nme}
                                value={nme}
                              >
                                {nme}
                              </option>
                            ))}
                        </select>
                      </>
                    ) : null}
                    {taluqa && taluqa.length ? (
                      <>
                        <p>Please select a Taluqa</p>
                        <select
                          onChange={(e) => setTal(e.target.value)}
                          className=" form-select custom-select"
                          style={{
                            width: "150px",
                            height: "25px",
                            padding: "0px 10px",
                            margin: "0px 0px 2px 5px",
                            fontSize: "12px",
                          }}
                        >
                          <option style={{ fontSize: "12px" }} value={""}>
                            Select Taluqa
                          </option>

                          {taluqa
                            .map((nme) => nme)
                            .sort()
                            .map((nme) => (
                              <option
                                style={{ textAlign: "left", fontSize: "12px" }}
                                key={nme}
                                value={nme}
                              >
                                {nme}
                              </option>
                            ))}
                        </select>
                      </>
                    ) : null}
                    {tal && tal !== "" && (
                      <button
                        onClick={() => (type === "fire" ? FireVis() : NDVI())}
                        className="btn btn-dark mt-3"
                      >
                        Visualize
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            {mess && (
              <>
                <div className="d-flex flex-column align-items-start mb-4">
                  <div
                    className="p-3 me-3 border"
                    style={{
                      borderRadius: "15px",
                      backgroundColor: "#fbfbfb",
                      maxWidth: "70%",
                    }}
                  >
                    <p>{mess}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New Textarea Section */}
          <div
            className="chatbot-footer-section"
            style={{ boxShadow: "0px 12px 15px 1px #383838" }}
          >
            <textarea
              className="chatbot-textarea"
              style={{
                minWidth: isLoading ? "250px" : "350px"
              }}
              id="textAreaExample"
              rows="4"
              placeholder="Type your message...."
              value={promptMessage}
              onChange={handleTextareaChange}
              disabled={Fstep >= 1}
              onKeyDown={handleKeyDown}
            ></textarea>
            <div className="button-group">
              <button title="send conversation" onClick={sendMessage}>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
              <button title="new conversation" onClick={resetChatConversation}>
                <i className="fa-solid fa-pen-to-square"></i>
              </button>
              {mode === 1 && (
                <button title="add file" onClick={handleButtonClick}>
                  <i className="fa-solid fa-file-arrow-up"></i>
                </button>
              )}
              {mode === 3 && (
                <button title="Clear Log" onClick={clearLog}>
                  <i className="fa-solid fa-eraser"></i>
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }} 
                accept=".zip,.kml,.kmz,.geojson,"
                onChange={handleFileChange}
              />

              {isLoading && (
                <div className="chatbot-loader">
                  <div className="lds-dual-ring">
                    <i className="fa-solid fa-globe"></i>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Rnd>
      </div>
    </>
  );
}
