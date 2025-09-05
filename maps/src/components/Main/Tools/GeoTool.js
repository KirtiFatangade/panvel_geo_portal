import React, { useState, useContext, useEffect, useRef } from "react";
import { GlobalContext } from "../../../App";
import { HOST } from "../../host";

function GeoTool() {
  const [show, setShow] = useState(false);
  const [layer, setLayer] = useState("");
  const [type, setType] = useState("");
  const [projects, setProjects] = useState([]);
  const [pro, setPro] = useState("");
  const { vis, userInfo,getCsrfToken } = useContext(GlobalContext);
  const toolvisRef = useRef(null);
  const [once, setOnce] = useState(false);


  const AddLayer = async () => {
    const layerName = prompt("Enter Layer Name:");
    if (!layerName) {
      alert("Layer name is required.");
      return;
    }

    if (!type || !pro) {
      alert("Please select both a type and a project.");
      return;
    }

    // Construct the data to send

    // Send the request to the server
    fetch(`${HOST}/geo-to-pro`, {
      method: "POST",
      credentials:'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': await getCsrfToken(),
      },
      body: JSON.stringify({ data: { name: layerName, id: pro, type: type, layer_name:layer }, }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to add layer");
        }
        alert("Layer Added Successfully")
        setType(null);
        setPro(null);
        setLayer("")
        
      })
      .catch((error) => {
        console.error("Error adding layer:", error);
        alert("Failed to add layer.");
      });
  };

  const fetchProjects = () => {
    fetch(`${HOST}/fetch-projects-all`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        return response.json();
      })
      .then((data) => {
        setOnce(true);
        setProjects(data.projects);
      })
      .catch((error) => {
        console.error("Error fetching projects:", error);
      });
  };

  useEffect(() => {
    if (userInfo && userInfo.is_superuser && !projects.length && !once) {
      fetchProjects();
    }
  }, [userInfo,projects]);

   // hide content on click anyshwre on screen 
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("#geotool") && toolvisRef.current && !toolvisRef.current.contains(event.target)) {
        setShow(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div
      style={{ position: vis ? "absolute" : "relative" }}
      className="toolscont"
    >
      <button
        title="Geo Tool"
        className="btn text-white"
        id="geotool"
        onClick={() => setShow((prevShow) => !prevShow)}
        style={{
          zIndex: "1000",
          fontSize: "15px",
          backgroundColor:'black',
          padding: "2px 2px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
      }}
      >
        <i>Geo</i>
      </button>
      {show && (
        <div
          ref={toolvisRef}
          className="toolsvis"
          id="toolvis"
          style={{ display: "flex", flexDirection: "column", width: "200px" }}
        >
          <span
            onClick={() => setShow(false)}
            className=" toolclose text-danger"
          >
            &times;
          </span>
          <input
            placeholder="Enter Layer Name"
            className="text-white form-control"
            style={{ marginBottom: "5px", backgroundColor:'transparent', border:'2px solid white', fontSize: '13px'}}
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
          />
          <div className="mt-1 mb-2">
            <input
              type="radio"
              value="raster"
              checked={type === "raster"}
              onChange={(e) => setType("raster")}
              id="raster"
            />
            <label htmlFor="raster" style={{fontSize:'13px', color:'white'}}>Raster</label>
            <input
              type="radio"
              value="vector"
              style={{marginLeft:'5%'}}
              checked={type === "vector"}
              onChange={(e) => setType("vector")}
              id="vector"
            />
            <label htmlFor="vector" style={{fontSize:'13px', color:'white'}}>Vector</label>
          </div>
          <select className='form-control text-white swipe-options' style={{ marginBottom: "5px", backgroundColor:'transparent', border:'2px solid white', fontSize: '13px'}} onChange={(e) => setPro(e.target.value)} value={pro}>
            <option value="">Select Project</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {pro && layer.trim() && type && 
              <button  className="btn btn-primary border-0" style={{fontSize:'13px'}} onClick={()=>AddLayer()}>Add Layer</button>
            }
        </div>
      )}
    </div>
  );
}

export default GeoTool;
