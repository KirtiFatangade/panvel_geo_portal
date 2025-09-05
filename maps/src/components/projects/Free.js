import { createContext, useContext, useEffect, useState } from "react";
import L from "leaflet";
import { SideBarContext } from "../Main/sidebar";
import { GlobalContext } from "../../App";
import { HOST } from "../host";
import files from "../static";
import "../BoundaryCanvas";
import "leaflet-ajax";

function CustomTooltip() {
  const [showTooltip, setShowTooltip] = useState(false); // State to track tooltip visibility

  return (
    <div
      className="custom-tooltip-container"
      onMouseEnter={() => setShowTooltip(true)} // Show tooltip on mouse enter
      onMouseLeave={() => setShowTooltip(false)} // Hide tooltip on mouse leave
    >
      <img
        src={`${files}information.png`}
        title={`
            Ward No. - Ward Number
            Name - Name of the Ward
            Green Area in Square Kilometer - Green cover in given ward in square kilometer
            Green Cover Density - Percentage of green cover in given ward
            Ward Area - Ward area in square kilometer
            Building Count - Total Count of building in given ward
            Built-up Area - Building area in given ward in square kilometer
            Building Count - Total building count in given ward
            Building Density Ward Wise - Total building density in square kilometer
          `}
        className="fa-solid fa-circle-info"
      ></img>
    </div>
  );
}

function Free() {
  // const LayerWorker = wrap(new Worker('./layerWorker.js'));
  const [showImage, setShowImage] = useState(false);
  const [selImage, setSelImage] = useState(null);
  const urlDict = {
    opt1: "b_density_legend.png",
    opt2: "Built_up_Area.png",
    opt3: "building_count.png",
    opt4: "Built_up_Area_percentage.png",
    opt5: "green_cover.png",
    opt6: "Green_cover_percentage.png",
  };
  useEffect(() => {
    SetLogout(true);
  }, []);
  const { map, Canvas, UsedLayers, SetLayers, CountReq, setReq, SetLogout } =
    useContext(GlobalContext);
  const { setPloader } = useContext(SideBarContext);
  const [op1, setOp1] = useState(1);
  const [op2, setOp2] = useState(1);
  const [op3, setOp3] = useState(1);
  const [op4, setOp4] = useState(1);
  const [op5, setOp5] = useState(1);
  const [op6, setOp6] = useState(1);

  function changeOP(op, id, name) {
    if (id === 1) {
      setOp1(op);
    }
    if (id === 2) {
      setOp2(op);
    }
    if (id === 3) {
      setOp3(op);
    }
    if (id === 4) {
      setOp4(op);
    }
    if (id === 5) {
      setOp5(op);
    }
    if (id === 6) {
      setOp6(op);
    }
    try {
      UsedLayers[name].setOpacity(op);
    } catch (e) {}
  }
  useEffect(() => {
    if (Canvas) {
      Canvas.on("fetching", () => {
        setReq(CountReq + 1);
      });
      Canvas.on("fetched", () => {
        setReq(CountReq - 1);
      });
    }
    if (CountReq) {
      setPloader(true);
    } else {
      setPloader(false);
    }
  }, [Canvas, CountReq]);

  async function GetLayer(name, id, bound, fill) {
    try {
      setPloader(true);
      await fetch(`${HOST}/project-get-layer`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: name }),
      })
        .then((response) => response.json())
        .then((data) => CreateLayer(data, name, id, bound, fill));
      if (bound) {
        setPloader(false);
      }
    } catch (error) {
      alert("Unexpected Error occured Please try again");
      setPloader(false);
    }
  }
  function LayerChange(name, id, ischeck, bound = false, fill = false) {
    if (ischeck) {
      if (name in UsedLayers) {
        if (bound) {
          UsedLayers[name].addTo(map);
        } else {
          Canvas.addLayer(name, id);
        }
      } else {
        GetLayer(name, id, bound, fill);
      }
    } else {
      if (name in UsedLayers) {
        if (bound) {
          UsedLayers[name].remove();
        } else {
          Canvas.removeLayer(name, id);
        }
      }
    }
  }

  async function CreateLayer(data, name, id, bound, fill) {
    let layer;
    if (bound) {
      layer = L.geoJson.ajax(
        `https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=VGT:${name}&srsname=EPSG:4326&outputFormat=application/json`,
        {
          style: {
            color: data.color,
            fillOpacity: 0.0,
          },
          onEachFeature: function (feature, layer) {
            if (name === "MH_TQ") {
              layer.bindPopup(
                `<b>District : ${feature.properties.NAME_2}</b><br><b>Taluka : ${feature.properties.NAME_3}</b>`
              );
            }
            if (name === "MH_DIS") {
              layer.bindPopup(`<b>District : ${feature.properties.d_name}</b>`);
            }
          },
        }
      );
    } else {
      Canvas.addLayer(name, id, data.color, fill);
      SetLayers((prevDictionary) => ({
        ...prevDictionary,
        [name]: name,
      }));
    }

    if (bound) {
      layer.addTo(map);
      layer.on("data:loaded", () => {
        map.flyToBounds(layer.getBounds());
      });
      layer.bringToFront();
      SetLayers((prevDictionary) => ({
        ...prevDictionary,
        [name]: layer,
      }));
    }
  }

  function CreateTileLayer(name, id) {
    let Boundary = UsedLayers[id].toGeoJSON();
    let Bounds = UsedLayers[id].getBounds();
    let layer;

    layer = L.TileLayer.boundaryCanvas(
      `https://geoserver.vasundharaa.in/geoserver/VGT/gwc/service/wmts?layer=VGT:${name}&style=&tilematrixset=EPSG%3A900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix=EPSG%3A900913%3A{z}&TileCol={x}&TileRow={y}`,
      {
        boundary: Boundary,
        zIndex: 1000,
        bounds: Bounds,
        maxZoom: 20,
      }
    );
    layer.addTo(map);
    layer.bringToFront();
    SetLayers((prevDictionary) => ({
      ...prevDictionary,
      [name]: layer,
    }));
    map.fire("overlayadd", { layer: layer, name: name, overlay: true });
  }

  function TileLayerChange(name, id, ischeck) {
    if (ischeck) {
      if (name in UsedLayers) {
        UsedLayers[name].addTo(map);
        map.fire("overlayadd", {
          layer: UsedLayers[name],
          name: name,
          overlay: true,
        });
      } else {
        CreateTileLayer(name, id);
      }
      setShowImage(true);
      if (name === "pune_build_density") {
        setSelImage("opt1");
      }
      if (name === "pune_built_area") {
        setSelImage("opt2");
      }

      if (name === "pune_built_count") {
        setSelImage("opt3");
      }

      if (name === "pune_built_per") {
        setSelImage("opt4");
      }

      if (name === "pune_green_cover") {
        setSelImage("opt5");
      }
      if (name === "pune_green_per") {
        setSelImage("opt6");
      }
    } else {
      setShowImage(false);
      if (name in UsedLayers) {
        UsedLayers[name].remove();
        map.fire("overlayremove", {
          layer: UsedLayers[name],
          name: name,
          overlay: true,
        });
      }
    }
  }

  function handleOpen(id) {
    document.getElementById(id).checked = true;

    LayerChange(id, id, true, true);
    LayerChange("Pune_Ward_Boundary_New", "Pune_Ward_Boundary_New", true);
    if (Object.keys(UsedLayers).includes(id)) {
      map.flyToBounds(UsedLayers[id].getBounds());
    }
  }

  return (
    <>
      <details
        className="baseline"
        onToggle={() => handleOpen("Pune_Ward_Boundary_New_2")}
      >
        <summary>Pune</summary>
        <div className="baseline-cont">
          <div className="opt-div">
            <input
              value="Pune_Ward_Boundary_New_2"
              id="Pune_Ward_Boundary_New_2"
              className="w3-check check-map"
              onChange={(e) =>
                LayerChange(e.target.value, e.target.id, e.target.checked, true)
              }
              type="checkbox"
            />
            <label> Pune Ward Boundary</label>
          </div>
          <div className="opt-div">
            <input
              value="pune_bfoot"
              id="Building Footprint"
              className="w3-check check-map"
              onChange={(e) =>
                LayerChange(e.target.value, e.target.id, e.target.checked)
              }
              type="checkbox"
            />
            <label>Building Footprint</label>
          </div>
          <div className="opt-div">
            <input
              value="pune_new_road_2"
              id="Road Network"
              className="w3-check check-map"
              onChange={(e) =>
                LayerChange(e.target.value, e.target.id, e.target.checked)
              }
              type="checkbox"
            />
            <label>Road Network</label>
          </div>
          <div
            className="opt-div"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div>
              <input
                value="pune_build_density"
                id="Pune_Ward_Boundary_New_2"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(
                    e.target.value,
                    e.target.id,
                    "Building Density",
                    e.target.checked
                  )
                }
                type="checkbox"
              />
              <label>Building Density</label>
            </div>
            <div>
              <input
                value={op1}
                type="range"
                min={0}
                max={1}
                step={0.1}
                onChange={(e) =>
                  changeOP(e.target.value, 1, "pune_build_density")
                }
              />
              <label style={{ marginLeft: "5px", color: "white" }}>{op1}</label>
            </div>
          </div>

          <div
            className="opt-div"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div>
              <input
                value="pune_built_area"
                id="Pune_Ward_Boundary_New_2"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(
                    e.target.value,
                    e.target.id,
                    "Building Cover",
                    e.target.checked
                  )
                }
                type="checkbox"
              />
              <label>Building Cover</label>
            </div>
            <div>
              <input
                value={op2}
                type="range"
                min={0}
                max={1}
                step={0.1}
                onChange={(e) => changeOP(e.target.value, 2, "pune_built_area")}
              />
              <label style={{ marginLeft: "5px", color: "white" }}>{op2}</label>
            </div>
          </div>

          <div
            className="opt-div"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div>
              <input
                value="pune_built_count"
                id="Pune_Ward_Boundary_New_2"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(
                    e.target.value,
                    e.target.id,
                    "Building Count",
                    e.target.checked
                  )
                }
                type="checkbox"
              />
              <label>Building Count</label>
            </div>
            <div>
              <input
                value={op3}
                type="range"
                min={0}
                max={1}
                step={0.1}
                onChange={(e) =>
                  changeOP(e.target.value, 3, "pune_built_count")
                }
              />
              <label style={{ marginLeft: "5px", color: "white" }}>{op3}</label>
            </div>
          </div>

          <div
            className="opt-div"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div>
              <input
                value="pune_built_per"
                id="Pune_Ward_Boundary_New_2"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(
                    e.target.value,
                    e.target.id,
                    "Built-up Area",
                    e.target.checked
                  )
                }
                type="checkbox"
              />
              <label>Built-up Area (%)</label>
            </div>
            <div>
              <input
                value={op4}
                type="range"
                min={0}
                max={1}
                step={0.1}
                onChange={(e) => changeOP(e.target.value, 4, "pune_built_per")}
              />
              <label style={{ marginLeft: "5px", color: "white" }}>{op4}</label>
            </div>
          </div>
          <div
            className="opt-div"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div>
              <input
                value="pune_green_cover"
                id="Pune_Ward_Boundary_New_2"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(
                    e.target.value,
                    e.target.id,
                    "Green Cover",
                    e.target.checked
                  )
                }
                type="checkbox"
              />
              <label>Green Cover</label>
            </div>
            <div>
              <input
                value={op5}
                type="range"
                min={0}
                max={1}
                step={0.1}
                onChange={(e) =>
                  changeOP(e.target.value, 5, "pune_green_cover")
                }
              />
              <label style={{ marginLeft: "5px", color: "white" }}>{op5}</label>
            </div>
          </div>

          <div
            className="opt-div"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div>
              <input
                value="pune_green_per"
                id="Pune_Ward_Boundary_New_2"
                className="w3-check check-map"
                onChange={(e) =>
                  TileLayerChange(
                    e.target.value,
                    e.target.id,
                    "Green Cover Area",
                    e.target.checked
                  )
                }
                type="checkbox"
              />
              <label>Green Cover Area</label>
            </div>
            <div>
              <input
                value={op6}
                type="range"
                min={0}
                max={1}
                step={0.1}
                onChange={(e) => changeOP(e.target.value, 6, "pune_green_per")}
              />
              <label style={{ marginLeft: "5px", color: "white" }}>{op6}</label>
            </div>
          </div>
        </div>
        <div
          className="custom-image-container"
          style={{
            position: "absolute",
            bottom: "10%", // Adjust as needed
            left: "20px", // Adjust as needed
            zIndex: 1000, // Ensure image is on top
          }}
        >
          <CustomTooltip />
        </div>

        {showImage && (
          <div
            className="custom-image-container"
            style={{
              position: "absolute",
              bottom: "100px", // Adjust as needed
              right: "20px", // Adjust as needed
              zIndex: 1000, // Ensure image is on top
            }}
          >
            <img
              src={`${files}${urlDict[selImage]}`}
              alt="Custom Image"
              style={{ width: "100px", height: "100px" }} // Adjust image size as needed
            />
          </div>
        )}
      </details>
    </>
  );
}

export default Free;
