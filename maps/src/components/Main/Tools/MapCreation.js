import React, { useState, useContext, useRef, useEffect } from "react";
import { GlobalContext } from "../../../App";
import L from "leaflet";
import '../../Print/Leaflet.BigImage';
import '../../Print/Leaflet.BigImage.css';
// import Modal from 'react-modal';
import files from "../../static";
import html2canvas from "html2canvas";
import './tools.css';
import 'leaflet/dist/leaflet.css';
import { layersControl } from "../../LayerContol";
import baseLayers from "../BaseLayers";
import { geo, layer_c, customButton, coordinatesControl, drawControl } from "../Map";
import domtoimage from "dom-to-image-more";
import { logToServer } from "../../logger";

export default function MapCreation() {
    const { map, tools, vis, setCoder, layerControls, selectedLayers, Canvas,setTools } = useContext(GlobalContext);
    const [showModal, setShowModal] = useState(false);
    const title=useRef("")

    const toggleModal = () => {
        setShowModal((prevState) => !prevState);
        // document.getElementById("mySidebar").style.display = "none";
        // document.getElementById("openNav").style.display = "block";
        setTools(true);
        document.querySelectorAll('.tool').forEach(tool => {
            console.log(tool)
            const toolsvis = tool.querySelector('.toolsvis');
            const button = tool.querySelector('button');
            console.log(toolsvis)
            if (toolsvis && toolsvis.offsetParent !== null) {
                button.click();
            }
        });
        logToServer("info", `Toggling modal. Current state: ${showModal}`);

    };


    useEffect(() => {
        logToServer("info", `Modal state changed: ${showModal}`);
    }, [showModal]);



    useEffect(() => {
        let modalControlTopLeft, modalControlTopRight, modalControlBottomLeft, screenshotButton, northArrowControl;

        if (showModal) {

            logToServer("info", "Modal is shown, initializing controls");

            modalControlTopLeft = L.control({ position: 'topleft' });
            modalControlTopLeft.onAdd = function () {
                const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar modal-leaflet');
                container.style.backgroundColor = 'black';
                container.style.width = 'fit-content';
                container.style.padding = '1% 7%';
                container.style.maxHeight = '500px';
                container.style.zIndex ='1000'

                // Create the modal structure
                const modalElement = document.createElement('div');
                modalElement.style.position = 'absolute';
                modalElement.style.top = '50px';
                modalElement.style.left = "0px";
                modalElement.style.zIndex = '1000';
                modalElement.style.maxHeight = '500px';
                modalElement.style.backgroundColor = 'black';
                modalElement.style.color = 'gray';
                modalElement.id = 'leaflet-map-modal';
                modalElement.classList.add('leaflet-modal');


                const modalBody = document.createElement('div');
                modalBody.classList.add('modal-body');
                const firstinput = document.createElement('input');
                firstinput.className = 'form-control';
                firstinput.placeholder = 'Map Title';
                firstinput.style.width = '200px';
                firstinput.style.fontSize = '15px';
                firstinput.style.fontWeight = 'bolder';
                firstinput.style.padding = '2px 5px';
                firstinput.style.backgroundColor = 'transparent';
                firstinput.style.color = 'gray';
                firstinput.style.border = 'none';
                firstinput.style.borderBottom = '2px solid gray';
                firstinput.oninput = function(e) {
                    logToServer("info", `Title input changed: ${e.target.value}`);
                    title.current=e.target.value
                };
                const textarea = document.createElement('textarea');
                textarea.className = 'mt-3 form-control';
                textarea.placeholder = 'Enter Map Description';
                textarea.style.width = '200px';
                textarea.style.backgroundColor = 'transparent';
                textarea.style.color = 'gray';
                textarea.style.border = 'none';
                textarea.style.maxHeight = '120px';
                textarea.style.fontSize = '12px';
                textarea.style.padding = '2px 5px';
                textarea.style.borderBottom = '2px solid gray';

                modalBody.appendChild(firstinput);
                modalBody.appendChild(textarea);
                modalElement.appendChild(modalBody);
                container.appendChild(modalElement);
                container.onclick = function () {
                    modalElement.style.display = showModal ? 'block' : 'none';
                };
                return container;
            };
            modalControlTopLeft.addTo(map);


            // function getColorForIndex(index) {
            //     const colors = ['#f3b7b7', '#ee6565', '#ff0c0c'];
            //     return colors[index % colors.length];
            // }



            modalControlTopRight = L.control({ position: 'topright' });
            modalControlTopRight.onAdd = function () {
                const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar modal-leaflet-top-right');
                container.style.backgroundColor = 'black';
                container.id = "modal-leaflet-top-right"
                const modalElement = L.DomUtil.create('div', 'modal-leaflet legend-element');
                modalElement.style.position = 'fixed';
                modalElement.style.top = '8px';
                modalElement.style.right = '50px';
                modalElement.style.zIndex = '1000';
                modalElement.style.color = 'gray';
                modalElement.style.marginRight = '1%';
                modalElement.style.maxHeight = '400px'; // Fixed height
                modalElement.style.overflowY = 'auto'; // Enable vertical scrolling
                modalElement.style.backgroundColor = 'black';
                modalElement.id = 'legend-container';

                const modalBody = document.createElement('div');
                modalBody.classList.add('modal-body');
                modalBody.classList.add('legend-element');

                // Function to update the legend
                function updateLegend() {
                    logToServer("info", "Updating legend");
                    modalBody.innerHTML = '<h6>Legends</h6>';
                    for (const key in selectedLayers) {
                        if (selectedLayers.hasOwnProperty(key) && key !== "Basemap") {
                            const layer = selectedLayers[key];
                            const name = key;

                            const legendItem = document.createElement('div');
                            legendItem.style.display = 'flex';
                            legendItem.style.alignItems = 'center';
                            legendItem.style.marginBottom = '10px';
                            console.log(layer instanceof L.GeoJSON)

                            let legendIcon;
                            if (layer instanceof L.Rectangle) {

                                legendIcon = `
                                        <svg width="20" height="12">
                                            <g>
                                                <rect x="0" y="0" width="18" height="12" style="fill:none;stroke-width:2;stroke:#558bcc"></rect> 
                                            </g> 
                                        </svg>
                                    `;
                            } else if (layer instanceof L.Polygon) {
                                legendIcon = `
                                        <svg width="20" height="20">
                                            <g>
                                                <polygon points="9,1 19,7 16,17 5,17 1,8" style="fill:none;stroke-width:1.5;stroke:#558bcc"></polygon>
                                            </g>
                                        </svg>
                                    `;
                            } else if (layer instanceof L.Polyline) {
                                legendIcon = `
                                        <svg width="20" height="20">
                                            <g> 
                                                <circle cx="15" cy="3" r="2" fill="#558bcc" />
                                                <circle cx="3" cy="15" r="2" fill="#558bcc" />
                                                <line x1="15" y1="3" x2="3" y2="15" stroke="#558bcc" stroke-width="1.5" />
                                            </g>
                                        </svg>
                                    `;
                            } else if (layer instanceof L.Marker) {
                                legendIcon = `<img src="${process.env.PUBLIC_URL}/${files}gps.png" width="15" height="15" alt="Marker Icon" />`;
                            } else if (layer instanceof L.GeoJSON) {
                                console.log(layer)
                                legendIcon = `
                                <svg width="20" height="20">
                                    <g>
                                        <polygon points="9,1 19,7 16,17 5,17 1,8" style="fill:none;stroke-width:1.5;stroke:${layer.options.style.color}"></polygon>
                                    </g>
                                </svg>
                            `;
                            } else {
                                legendIcon = `<img src="${process.env.PUBLIC_URL}/${files}img_icon.png" width="15" height="15" alt="Marker Icon" />`;
                            }


                            const legendIconElement = document.createElement('div');
                            legendIconElement.innerHTML = legendIcon;
                            const legendText = document.createElement('span');
                            legendText.style.marginLeft = '10px';
                            const cleanedName = name.split('#')[0];  
                            legendText.textContent = cleanedName;
                            console.log("mmmmmmm",legendText);

                            legendItem.appendChild(legendIconElement);
                            legendItem.appendChild(legendText);
                            modalBody.appendChild(legendItem);
                        }
                    }
                    let vectors = Canvas.getLayersColor()
                    vectors.forEach((info) => {
                        const name = info.name;
                        const legendItem = document.createElement('div');
                        legendItem.style.display = 'flex';
                        legendItem.style.alignItems = 'center';
                        legendItem.style.marginBottom = '10px';

                        let legendIcon;
                        if (info.type === "polygon") {
                            legendIcon = `
                                <svg width="20" height="20">
                                    <g>
                                        <polygon points="9,1 19,7 16,17 5,17 1,8" style="fill:none;stroke-width:1.5;stroke:${info.color}"></polygon>
                                    </g>
                                </svg>
                            `;
                        } else if (info.type === "point") {
                            legendIcon = `
                                <svg width="20" height="20">
                                    <g> 
                                        <circle cx="15" cy="3" r="2" fill="${info.color}" />
                                    </g>
                                </svg>
                            `;
                        }

                        const legendIconElement = document.createElement('div');
                        legendIconElement.innerHTML = legendIcon;
                        const legendText = document.createElement('span');
                        legendText.style.marginLeft = '10px';
                        const cleanedName = name
                        legendText.textContent = cleanedName;

                        legendItem.appendChild(legendIconElement);
                        legendItem.appendChild(legendText);
                        modalBody.appendChild(legendItem);
                    });



                    const numOverlays = selectedLayers.length + vectors.length - 1;
                    const topPosition = -570 - (numOverlays * 30); // Adjust this value based on your layout
                    modalElement.style.top = `${topPosition}px`;
                }

                // Initial update of the legend
                updateLegend();

                // Add event listeners to update the legend when overlays are added or removed
                map.on('overlayadd overlayremove layerrename decklayeradd decklayerremove decklayercross deckcolorchange decklayerrename', updateLegend);

                // Dynamically adjust width based on screen size
                const screenWidth = window.innerWidth;
                const modalWidth = screenWidth > 768 ? '200px' : '100%';
                modalElement.style.width = modalWidth;

                modalElement.appendChild(modalBody);
                container.appendChild(modalElement);


                return container;
            };

            modalControlTopRight.addTo(map);


            modalControlBottomLeft = L.control({ position: 'bottomleft' });
            modalControlBottomLeft.onAdd = function () {
                const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar modal-leaflet');

                const modalElement = document.createElement('div');
                modalElement.style.width = 'fit-content';
                modalElement.style.height = 'fit-content';
                modalElement.style.position = 'absolute';
                modalElement.style.bottom = '0px';
                modalElement.style.left = "0px";
                modalElement.style.zIndex = '1000';
                modalElement.style.color = 'black';
                modalElement.style.backgroundColor = 'black';
                modalElement.id = 'bottomright-modal';
                const modalBody = document.createElement('div');
                modalBody.classList.add('modal-body');

                const logoImage = document.createElement('img');
                logoImage.className = 'logo';
                logoImage.alt = 'This is logo';
                logoImage.src = `${process.env.PUBLIC_URL}/${files}vgtlogo.png`;
                logoImage.style.width = '150px';
                logoImage.style.height = '50px';
                logoImage.style.margin = '0px 0px 0px 0px';

                modalBody.appendChild(logoImage);
                modalElement.appendChild(modalBody);
                container.appendChild(modalElement);

                return container;
            };
            modalControlBottomLeft.addTo(map);

            screenshotButton = L.control({ position: 'topright' });
            screenshotButton.onAdd = function () {
                const div = L.DomUtil.create('div', "leaflet-save-image"); // leaflet-bar leaflet-control leaflet-control-custom
                div.innerHTML = '<button style="font-size: 12px; padding: 8px 12px;font-weight:bold; width: fit-content; border: none; color:#59a1c5; background-color:black;border-radius:0px;">Save Image</button>';
                div.onclick = captureScreenshot;
                return div;
            };
            screenshotButton.addTo(map);


            northArrowControl = L.control({ position: 'bottomright' });
            northArrowControl.onAdd = function () {
                const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');

                const modalElement = document.createElement('div');
                modalElement.style.width = 'fit-content';
                modalElement.style.height = 'fit-content';
                modalElement.style.position = 'absolute';
                modalElement.style.bottom = '-20px';
                modalElement.style.right = "0px";
                modalElement.style.zIndex = '1000';
                modalElement.style.backgroundColor = 'transparent';
                modalElement.id = 'bottomright-modal';
                const modalBody = document.createElement('div');
                modalBody.classList.add('modal-body');

                const northArrow = document.createElement('img');
                northArrow.className = 'logo';
                northArrow.alt = 'This is logo';
                northArrow.src = `${process.env.PUBLIC_URL}/${files}north-arrow-2.svg`;
                northArrow.style.width = '40px';
                northArrow.style.height = '40px';

                modalBody.appendChild(northArrow);
                modalElement.appendChild(modalBody);
                container.appendChild(modalElement);

                return container;

            };
            northArrowControl.addTo(map);

        }
            async function captureScreenshot(e) {
                e.preventDefault();
                e.stopPropagation();
                if(title.current===""){
                    alert("Please enter a Title")
                    return
                }
                let element = document.getElementById('map');
                if (element) {
                    try {


                    let exclude = ["leaflet-control-geocoder-toggle", "leaflet-control-geocoder", "leaflet-control-geocoder-form", "leaflet-control-layers-toggle", "leaflet-control-layers", "leaflet-draw-toolbar", "shake", "leaflet-control-coordinates", "leaflet-control-attribution", "leaflet-save-image", "leaflet-control-geolet"]
                    function filter(node) {

                        if (node.classList && node.classList.contains('sidebar')) {
                            return false;
                        }

                        if (node.classList) {
                            for (let className of exclude) {
                                if (node.classList.contains(className)) {
                                    return false;
                                }
                            }
                        }

                        return true;

                    }
                    let options = {
                        quality: 1,
                        filter: filter,
                        useCORS: true
                    };

                    let ele = document.getElementById("modal-leaflet-top-right");
                    let origin = null
                    if (ele) {
                        origin = ele.style.top;
                        ele.style.top = '150px';
                    }

                    for (const key in selectedLayers) {
                        if (selectedLayers.hasOwnProperty(key) && key !== "Basemap") {
                            const layer = selectedLayers[key];
                            const name = key;



                            if (layer instanceof L.Rectangle || layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.Marker) {

                                layer.bindTooltip(`${name}.`)
                                layer.openTooltip();
                            }
                        }
                    }

                    let dataUrl = await domtoimage.toPng(element, options);


                    let link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = `${title.current}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    ele.style.top = origin
                    for (const key in selectedLayers) {
                        if (selectedLayers.hasOwnProperty(key) && key !== "Basemap") {
                            const layer = selectedLayers[key];
                            const name = key;



                            if (layer instanceof L.Rectangle || layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.Marker) {

                                layer.closeTooltip();
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error capturing screenshot:', error);
                }
                // northArrowControl = L.control({ position: 'topright' });
                // northArrowControl.onAdd = function () {
                //     const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

                //     const img = new Image();
                //     img.src = `${process.env.PUBLIC_URL}/north-arrow.svg`;
                //     img.width = 30;
                //     img.height = 30;
                //     img.style.transform = 'rotate(0deg)'; // Optionally rotate the arrow

                //     div.appendChild(img);

                //     // Optionally add click behavior
                //     div.onclick = function () {
                //         // Handle click behavior if needed
                //         console.log('North arrow clicked');
                //     };

                //     return div;
                // }; 

                // // Add North Arrow control to the map
                // northArrowControl.addTo(map);


            }
            // northArrowControl = L.control({ position: 'topright' });
            // northArrowControl.onAdd = function () {
            //     const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

            //     const img = new Image();
            //     img.src = `${process.env.PUBLIC_URL}/north-arrow.svg`;
            //     img.width = 30;
            //     img.height = 30;
            //     img.style.transform = 'rotate(0deg)'; // Optionally rotate the arrow

            //     div.appendChild(img);

            //     // Optionally add click behavior
            //     div.onclick = function () {
            //         // Handle click behavior if needed
            //         console.log('North arrow clicked');
            //     };

            //     return div;
            // };

            // // Add North Arrow control to the map
            // northArrowControl.addTo(map);


        }

        return () => {
            if (modalControlTopLeft) modalControlTopLeft.remove();
            if (modalControlTopRight) modalControlTopRight.remove();
            if (modalControlBottomLeft) modalControlBottomLeft.remove();
            if (screenshotButton) screenshotButton.remove();
            if (northArrowControl) northArrowControl.remove();
            // if (modalControlTopLeft) modalControlTopLeft.remove();
            // if (modalControlTopRight) modalControlTopRight.remove();
        };

    }, [showModal, tools])


    return (
        <div style={{ position: vis ? "absolute" : "relative", display: 'flex', flexDirection: 'row' }} className="toolscont">
            <button
                className="btn text-white"
                title="Map Creation"
                id="mapcreation"
                onClick={toggleModal}
                style={{
                    flex: '6',
                    zIndex: "1000",
                    backgroundColor:'black',
                    fontSize: "15px",
                    padding: "2px 2px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "none",
                }}
            >
                <i className="fa-solid fa-map-location-dot"></i>
            </button>
        </div>

    );
}