import React, { useState, useContext, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GlobalContext } from "../../App";
import "../Pages/ManageOrg.css";
import L from "leaflet";
import { HOST } from "../host";
import { logToServer } from "../logger";
import { ToastContainer, toast } from 'react-toastify';

function CProject({ setCreate }) {
  const [name, setName] = useState("");
  const { userInfo, Canvas, layerControls, getCsrfToken } =
    useContext(GlobalContext);
  const [show, setshow] = useState(false);
  const { vis } = useContext(GlobalContext);
  const [file, setFile] = useState(null);
  const [mess, setMess] = useState(null);
  const [color, setColor] = useState(null);
  const [fill, setFill] = useState(false);
  const [id, setId] = useState(null);
  const [add, SetAdd] = useState(false);
  const [loader, setLoader] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [child, setChild] = useState([]);
  const [owner, setOwner] = useState(!userInfo.is_admin ? "user" : null);
  const [empty, setEmpty] = useState(false);
  const [showloader, setloader] = useState(false);
  const toolvisRef = useRef(null);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

    useEffect(() => {
        async function deletePath(path) {
            await fetch(`${HOST}/delete-objects`, {
                method: "POST",
                credentials:'include',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ data: { path: path }, },),
            });
        }
        logToServer('info', 'Delete project Successfully');

        let path = sessionStorage.getItem('path');
        if (path) {
            path = JSON.parse(path);
            if (Array.isArray(path)) {
                sessionStorage.removeItem('path');
                deletePath(path)                                                                                                        
            }
        }
    }, [])

    function generateListItems(data) {
        return data.map((item, index) => (
            <li key={index}>
                {item.type === "parent" ? (
                    <>
                        {item.name}
                        <ul>
                            {generateListItems(item.children)}
                        </ul>
                    </>
                ) : (
                    <li style={{ marginLeft: "0px" }} key={index}>{item.name}</li>
                )}
            </li>
        ));
    }

    function countChild() {
        let count = 0;
        child.forEach((item) => {
            if (item.type === "parent") {
                count += countChild(item.children);
            } else {
                count += 1;
            }
        });
        return count;
    }

  async function createProject(e) {
    e.preventDefault();
    if (owner) {
      if (!empty) {
        if (!child.length || !name || name === "") {
          toast.warning("Please add Layers or Name the Project");
          return;
        }
      }
      let path = sessionStorage.getItem("path");
      if (path) {
        path = JSON.parse(path);
        sessionStorage.removeItem("path");
      } else {
        if (!empty) {
          return;
        }
      }
      setloader(true);
      try {
        const res = await fetch(`${HOST}/create-project`, {
          method: "POST",
          body: JSON.stringify({
            data: {
              child,
              owner: owner,
              name: name,
              id: userInfo.id,
              path: path,
            },
          }),
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": await getCsrfToken(),
          },
        });

        if (res.status === 400) {
          toast.error("Project not created");
          setloader(false);
        } else if (res.status === 200) {
          toast.success("Project Created Successfully");
          // window.location.reload();
          setloader(false);
          logToServer("info", "projected Created Successfully");
        }
      } catch (e) {
        setloader(false);
        toast.error("Unexpected error occured. Please try again");
        logToServer("error", "Project creation failed");
      }
    } else {
      toast.warning("Please select an Owner");
    }
  }
  const handleFileChange = (event) => {
    try {
      setFile(event.target.files);
    } catch (e) {
      toast.warning("Please select File(s)");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (userInfo.org_name === "global") {
      let count = countChild();
      if (count && count === 10) {
        toast.warning("Limit of 10 Layers");
        return;
      }
    }
    setMess(null);
    setBounds(null);
    setloader(true);
    const CHUNK_SIZE = 50 * 1024 * 1024;
    if (file) {
      try {
        let files = Array.from(file);
        console.log(files);
        for (const f of files) {
          const totalChunks = Math.ceil(f.size / CHUNK_SIZE);
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            // setPer(Math.round((chunkIndex / totalChunks) * 100));
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(f.size, start + CHUNK_SIZE);
            const chunk = f.slice(start, end);
            const formData = new FormData();
            formData.append("chunk", chunk);
            formData.append("chunkIndex", chunkIndex);
            formData.append("totalChunks", totalChunks);
            formData.append("fileName", f.name);
            const response = await fetch(`${HOST}/uploads/project`, {
              method: "POST",
              credentials: "include",
              body: formData,
            });
            if (response.ok) {
              let data = await response.json();
              console.log(data);
              if (chunkIndex === totalChunks - 1) {
                let meta = data["metadata"];
                setChild((prev) => [...prev, ...meta["children"]]);
                data = data["data"];
                let path = sessionStorage.getItem("path");
                if (path) {
                  path = JSON.parse(path);
                  if (Array.isArray(path)) {
                    path.push(...data["path"]);
                    sessionStorage.setItem("path", JSON.stringify(path));
                    continue;
                  }
                } else {
                  sessionStorage.setItem(
                    "path",
                    JSON.stringify([...data["path"]])
                  );
                  continue;
                }
                continue;
              }
              continue;
            } else {
              setMess("An error occurred while uploading chunks.");
              setloader(false);
              return;
            }
          }
        }
      } catch (error) {
        logToServer("error", `Error uploading files: ${error}`);
        setMess("An error occurred while uploading the files.");
        setloader(false);
        return;
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setloader(false);
    } else {
      alert("Please select File(s)");
      setloader(false);
    }
  };

  return (
    <>
      <div className="user-modal-header">
        <i
          className="fa-solid fa-xmark cancel"
          onClick={(e) => setCreate(false)}
        ></i>
      </div>

      {showloader && (
        <>
          <div
            style={{
              position: "relative",
              left: "80%",
              color: "rgb(43, 83, 128)",
            }}
          >
            Loading....
          </div>
        </>
      )}
      <form
        className="col-lg-12 col-md-6 col-sm-10 mt-2"
        style={{
          maxHeight: "450px",          
          overflow: "hidden",
          overflowY: "scroll",
          padding: "1% 5% 1% 1%",
          
        }}
      >
        <input
          type="text"
          className="mt-2 form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project Name"
          required
        />
        <div style={{ marginTop: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold" }}>
            Project Owner :
          </span>
          {userInfo.is_admin ||
          userInfo.is_superuser ||
          userInfo.user_permissions.includes("add_org_project") ? (
            <div>
              <input
                onChange={(e) => setOwner(e.target.value)}
                style={{ marginLeft: "1px" }}
                type="radio"
                id="organization"
                name="userType"
                value="org"
              />
              <label style={{ marginLeft: "5px" }} htmlFor="organization">
                {" "}
                Organization
              </label>
            </div>
          ) : null}
          <input
            type="radio"
            id="user"
            style={{ marginLeft: "1px" }}
            onChange={(e) => setOwner(e.target.value)}
            name="userType"
            value="user"
            defaultChecked={
              !(
                userInfo.is_admin ||
                userInfo.is_superuser ||
                userInfo.user_permissions.includes("add_org_project")
              )
            }
          />
          <label style={{ marginLeft: "5px" }} htmlFor="user">
            {" "}
            User
          </label>
        </div>
        <hr style={{ width: "99%", border: "1px solid rgb(43, 83, 128)" }} />
        <div>
          <input
            onChange={(e) => setEmpty(!empty)}
            type="checkbox"
            id="empty"
            name="userType"
            value="org"
          />
          <label style={{ marginLeft: "5px" }} htmlFor="empty">
            {" "}
            Empty Project
          </label>
        </div>
        {/* <hr style={{width:'85%'}}/> */}
        {!empty && (
          <>
            <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{  marginTop:'15px', fontSize: "13px", fontWeight: "bold" }}>
                {" "}
                Add Layers/Data{" "}
              </span>
              <input
                className="mt-2 form-control"
                style={{
                  width: "100%",
                  fontSize: "11px",
                  color: "black",
                }}
                type="file"
                accept=".zip,.tif,.tiff,.geotiff,.kml,.kmz,.geojson"
                onChange={handleFileChange}
                multiple
                ref={fileInputRef}
              ></input>
              <button
                className="mt-4 btn-add"
                style={{ width: "100%" }}
                onClick={(e) => handleUpload(e)}
              >
                Upload Layers
              </button>
            </div>
            <div style={{ marginTop: "0px" }}>
            <span style={{ fontSize: "13px", fontWeight: "bold" }}>Uploaded Layer Names:</span>
              <ul>
                {child.length ? <li  style={{ fontSize: "13px", marginLeft:'0%' }}>{generateListItems(child)}</li> : null}
              </ul>
            </div>
          </>
        )}

        <div>
          {child.length ? (
            <button
              type="submit"
              className="mt-2 btn-add"
              id="login-btn"
              value="Log in"
              style={{ width: "100%" }}
              // onClick={createProject}
              onClick={(e) => createProject(e)}
            >
              Create Project
            </button>
          ) : (
            empty && (
              <button
                type="submit"
                className="mt-2 btn-add"
                id="login-btn"
                value="Log in"
                style={{ width: "100%" }}
                // onClick={createProject}
                onClick={(e) => createProject(e)}
              >
                Create Project
              </button>
            )
          )}
        </div>
      </form>
       <ToastContainer position="bottom-right"  draggable={false} />
    </>
  );
}

export default CProject;
