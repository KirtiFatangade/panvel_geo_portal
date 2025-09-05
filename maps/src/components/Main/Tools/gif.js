import React, { useContext, useState, useEffect, useRef } from "react";
import { GlobalContext } from "../../../App";
import L from "leaflet";
import { HOST } from "../../host";
import { logToServer } from "../../logger";

function GIF() {
    const [selectedLayer, setSelectedLayer] = useState("sen");
    const [fps, setFps] = useState(5);
    const [zoom, setZoom] = useState(false);
    const [SDate, SetSDate] = useState("2019-03-22");
    const [EDate, SetEDate] = useState("2019-03-30");
    const [overlayBounds, setOverlayBounds] = useState(null);
    const [show, setShow] = useState(false);
    const [height, setHeight] = useState(null);
    const [width, setWidth] = useState(null);
    const [mess, setMess] = useState(null);
    const [loader, setLoader] = useState(false);
    const { vis, map, gif, setGif,getCsrfToken } = useContext(GlobalContext);
    const toolvisRef = useRef(null);
    async function Visualize() {
        try {
            setLoader(true);
            const response = await fetch(`${HOST}/gif`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': await getCsrfToken(),
                  },
                body: JSON.stringify({
                    data: {
                        dataset: selectedLayer,
                        aoi: overlayBounds,
                        start_date: SDate,
                        end_date: EDate,
                        fps: fps,
                        height: height,
                        width: width,
                    },
                }),
            });
            if (response.ok) {
                setMess(null);
                let data = await response.json();
                let image = new Image();
                image.src = `data:image/gif;base64,${data.gif}`;
                let layer = L.imageOverlay(image.src, overlayBounds, {
                    opacity: 1,
                    zIndex: 2000,
                    interactive: true,
                }).bindPopup(
                    `<button onclick="Remove()" class="btn" style="width: 100px; background:#397aa5;height: 20px; font-size: 10px; padding: 0px; margin-top: 5px;">Remove Gif</button>`,
                    { closeButton: false }
                );
                layer.on("load", () => {
                    setLoader(false);
                });
                setGif(layer);
                layer.addTo(map);
                logToServer('info','Gif could be created Successfully')
            } else {
                if (response.status === 403) {
                    logToServer('error','Gif could not be created.')
                    setMess("Gif could not be created.");
                    setLoader(false);
                }
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            logToServer('error',`Error upload file:${error}`)
            setLoader(false);
        }
    }
    function handleClick() {
        setShow((prevShow) => !prevShow);
    }
    function close() {
        setShow(false);
    }
    function Download() {
        const gifUrl = gif._url;
        fetch(gifUrl)
            .then((response) => response.blob())
            .then((blob) => {
                const url = window.URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.href = url;
                downloadLink.download = "downloaded_gif.gif";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                window.URL.revokeObjectURL(url);
                gif.remove();
                setGif(null);
                logToServer('info','Downloaded gif are successfully')
            })
            .catch((error) => {
                console.error("Error downloading the GIF:", error);
                logToServer('error',`Error downloading the GIF:${error}`)
            });
    }
    window.Remove = function () {
        if (gif) {
            gif.remove();
            setGif(null);
        }
    };
    useEffect(() => {
        if (map && show && !gif) {
            const overlay = L.DomUtil.create("div", "overlay");
            map.getPanes().overlayPane.appendChild(overlay);
            setHeight(overlay.clientHeight);
            setWidth(overlay.clientWidth);
            if (map.getZoom() >= 14) {
                overlay.style.display = "block";
                updateOverlay();
                setZoom(true);
            } else {
                overlay.style.display = "none";
                setZoom(false);
            }
            function updateOverlay() {
                const bounds = map.getBounds();
                const mapTopLeft = map.latLngToLayerPoint(bounds.getNorthWest());
                const mapBottomRight = map.latLngToLayerPoint(bounds.getSouthEast());
                const overlayMarginLeft = 0.1;
                const adjustedTopLeft = L.point(
                    mapTopLeft.x + overlayMarginLeft * map.getSize().x,
                    mapTopLeft.y
                );
                const adjustedBottomRight = L.point(
                    mapBottomRight.x - overlayMarginLeft * map.getSize().x,
                    mapBottomRight.y
                );
                L.DomUtil.setPosition(overlay, adjustedTopLeft);
                const overlayBounds = L.latLngBounds(
                    map.layerPointToLatLng(adjustedTopLeft),
                    map.layerPointToLatLng(adjustedBottomRight)
                );
                setOverlayBounds(overlayBounds);
            }
            updateOverlay();
            map.on("moveend", updateOverlay);
            map.on("zoom", function () {
                const zoomThreshold = 14;
                if (map.getZoom() >= zoomThreshold) {
                    overlay.style.display = "block";
                    updateOverlay();
                    setZoom(true);
                } else {
                    overlay.style.display = "none";
                    setZoom(false);
                }
            });
            return () => {
                map.getPanes().overlayPane.removeChild(overlay);
            };
        }
    }, [map, show, gif]);
    // hide content on click anywhere on screen
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest("#gifbtn") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
                setShow(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);
    return (
        <div style={{ position: vis ? "absolute" : "relative", width: "fit-content" }} className="toolscont">
            <div>
                <button
                    title="GIF"
                    className="btn btn-dark text-white"
                    id="gifbtn"
                    onClick={handleClick}
                    style={{ zIndex: "1000", fontSize: "15px", padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%", border: "none" }}
                >
                    GIF
                </button>
            </div>
            {show && (
    <div ref={toolvisRef} className="toolsvis" id="toolvis" style={{ marginTop: "5px", padding: '14px', width: "max-content", position: 'relative' }}>
        <style>
            {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    border-left-color: #2596BE;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    animation: spin 1s linear infinite;
                    position: absolute;
                    right: 10px; /* Move the spinner to the top-right corner */
                    top: 10px;
                }
                .toolclose {
                    position: absolute;
                    right: 10px;
                    top: 10px; /* Move the close button to the top-right corner */
                    cursor: pointer;
                }
            `}
        </style>
        {loader ? (
            <div className="spinner"></div>
        ) : (
            <span
                onClick={close}
                className="toolclose"
            >
                &times;
            </span>
        )}
        {zoom ? (
            <>
                {gif ? (
                    <div style={{ display: 'flex', flexDirection: "column" }}>
                        <button onClick={Download} className="btn btn-dark mx-auto mt-3" style={{ width: "max-content", height: "20px", fontSize: "13px", padding: "0px", color: '#2596BE' }}>Download Gif</button>
                    </div>
                ) : (
                    <div>
                        <div style={{ flex: "1 0 auto" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ marginBottom: "10px" }}>
                                    <p style={{ margin: "0px", fontSize: '15px' }}>Select Layer :</p>
                                    <input
                                        id="sen"
                                        type="radio"
                                        checked={selectedLayer === 'sen'}
                                        onChange={() => setSelectedLayer("sen")}
                                    />
                                    <label htmlFor="sen" style={{ marginRight: "5px" }}> Sentinel 2</label>
                                    <input
                                        id="land"
                                        type="radio"
                                        checked={selectedLayer === 'land'}
                                        onChange={() => setSelectedLayer("land")}
                                    />
                                    <label htmlFor="land"> Landsat 8</label>
                                </div>
                                <div style={{ display: "flex", flexDirection: "row" }}>
                                    <div>
                                        <label htmlFor="fps">Speed : </label>
                                        <input id="fps" type="range" value={fps} min={1} max={10} style={{ width: "100px" }} onChange={(e) => setFps(e.target.value)}></input>
                                    </div>
                                    <p style={{ margin: "0px", marginLeft: "2px" }}>{fps}</p>
                                </div>
                                <div>
                                    <div style={{ marginTop: "15px" }}>
                                        <label htmlFor="start" style={{ marginRight: "5px", fontSize: '11px' }}>Start Date:</label>
                                        <input type="date" id="start" min={selectedLayer === "sen" ? "2017-03-28" : "2013-03-18"} onChange={(e) => SetSDate(e.target.value)} name="start" defaultValue={SDate} />
                                    </div>
                                    <div style={{ marginTop: "15px" }}>
                                        <label htmlFor="end" style={{ marginRight: "5px", fontSize: '11px' }}>End Date:</label>
                                        <input type="date" id="end" name="end" min={selectedLayer === "sen" ? "2017-03-28" : "2013-03-18"} onChange={(e) => SetEDate(e.target.value)} defaultValue={EDate} />
                                    </div>
                                </div>
                                <button onClick={Visualize} className="btn btn-dark mx-auto mt-3" style={{ width: "max-content", height: "20px", fontSize: "13px", padding: "0px", color: '#2596BE' }}>Visualize Gif</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        ) : (<p style={{paddingRight:'10px'}}>Please Zoom</p>)}
        <p style={{ wordWrap: "break-word" }}>{mess}</p>
    </div>
)}
        </div>
    );
}
export default GIF;
