import L from "leaflet"
import '../../Print/Leaflet.BigImage';
import React, { useState, useContext } from "react";
import domtoimage from "dom-to-image-more";
import jsPDF from "jspdf";
import { GlobalContext } from "../../../App";
import { logToServer } from "../../logger";

function Downloads() {
    const { vis, map, drawControl } = useContext(GlobalContext);
    const [show, setShow] = useState(false);
    const [mode, setMode] = useState("");
    const [format, setFormat] = useState("");
    const [showError, setShowError] = useState(false);
    const [showWait, setShowWait] = useState(false);

    function HandleModeChange(value) {
        setMode(value);
        if (value === "custom") {
            new L.Draw.Rectangle(map, drawControl.options.Rectangle).enable();
        }
    }

    function handleClick() {
        setShow(true);
        setMode("");
    }

    function close() {
        setShow(false);
    }

    async function download() {
        const toolvisElement = document.getElementById("toolvis");
        if (!toolvisElement) {
            console.error("Element not found");
            setShowError(true);
            logToServer('error','Element not found during download')
            return;
        }
        
        setShowWait(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for the element to fully render

            const options = {
                quality: 1,
                bgcolor: 'none',
                style: {
                    width: toolvisElement.offsetWidth + "px",
                    height: toolvisElement.offsetHeight + "px",
                },
            };

            const dataUrl = await domtoimage.toPng(toolvisElement, options);

            if (format === "pdf") {
                const pdf = new jsPDF({
                    orientation: mode === "port" ? "portrait" : "landscape",
                });
                pdf.addImage(dataUrl, "PNG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
                pdf.save("map_image.pdf");
                logToServer("info","PDF downloaded" );
            } else if (format === "png") {
                const downloadLink = document.createElement("a");
                downloadLink.href = dataUrl;
                downloadLink.download = "map_image.png";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                logToServer('info','png downloaded')
            } else if (format === "jpg") {
                const dataUrlJpg = await domtoimage.toJpeg(toolvisElement, options);
                const downloadLink = document.createElement("a");
                downloadLink.href = dataUrlJpg;
                downloadLink.download = "map_image.jpg";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                logToServer('info','jpg downloaded')
            }

        } catch (error) {
            logToServer('error',`Failed to capture the image:${error}`)
            setShowError(true);
        } finally {
            setShowWait(false);
        }
    }

   

    return (
        <div style={{ position: vis ? "absolute" : "relative", width: "fit-content" }} className="toolscont">
            <div>
                <button
                    title="Download Image"
                    className="btn text-white"
                    onClick={handleClick}
                    style={{ fontSize: "15px", padding: "2px 2px", backgroundColor:'black', width: "40px", height: "40px", borderRadius: "50%" }}
                >
                    <i className="fa-regular fa-file-pdf"></i>
                </button>
            </div>

            {show && (
                <div className="toolsvis" style={{ marginTop: "5px" }}>
                    <span
                        onClick={close}
                        style={{
                            position: "relative",
                            color: "white",
                            fontSize: "20px",
                            cursor: "pointer",
                        }}
                    >
                        &times;
                    </span>
                    <div>
                        <select value={mode} name="layer" onChange={(e) => HandleModeChange(e.target.value)} className="w3-select">
                            <option value="" disabled>Select Mode</option>
                            <option value="port">Portrait</option>
                            <option value="land">Landscape</option>
                            {/* <option value="custom">Custom</option> */}
                        </select>
                    </div>
                    <div style={{ marginTop: "5px" }}>
                        <select className="w3-select" name="format" onChange={(e) => setFormat(e.target.value)} value={format}>
                            <option value="" disabled>Select Format</option>
                            <option value="pdf">PDF</option>
                            <option value="png">PNG</option>
                            <option value="jpg">JPEG</option>
                        </select>
                        <div>
                            <button
                                onClick={download}
                                className="btn btn-dark text-white"
                                style={{ width: "60px", fontSize: "10px", padding: "2px 2px" }}
                            >
                                Download
                            </button>
                        </div>
                    </div>
                    <div>
                        {showError && <p style={{ fontSize: "10px" }}>Select proper options or draw AOI</p>}
                        {showWait && <p style={{ fontSize: "15px" }}><b>Please wait</b></p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Downloads;


