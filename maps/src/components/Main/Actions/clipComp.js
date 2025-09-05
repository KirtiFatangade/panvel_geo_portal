import React, { useState, useContext, useEffect } from "react";
import { GlobalContext } from "../../../App";
import { HOST } from "../../host";

function Options({
  clip,
  AddBound,
  clipBox,
  clipLayer,
  selCont,
  selState,
  setClip,
  setClipLayer,
  setBound,
  setClipBox,
  setCLayer,
  setCont,
  setState,
  setDis,
  adv_options,
  req_box,
  req_layer,
  req_region,
  isAdditionalOptionsOpen,
  setAdditionalOptionsOpen,
  adv_params,
}) {
  const [vectors, setVectors] = useState([]);
  const [country, setCounts] = useState([]);
  const [state, setStates] = useState([]);
  const [district, setDistricts] = useState([]);
  const { map, Canvas } = useContext(GlobalContext);

  const handleClipBoxChange = (e) => {
    const isChecked = e.target.checked;
    setClipBox(isChecked);
    if (isChecked) {
      setClip(false);
      setClipLayer(false);
    }
  };

  const handleClipChange = (e) => {
    const isChecked = e.target.checked;
    setClip(isChecked);
    if (isChecked) {
      setClipBox(false);
      setClipLayer(false);
    }
  };

  const handleClipLayerChange = (e) => {
    const isChecked = e.target.checked;
    setClipLayer(isChecked);
    if (isChecked) {
      setVectors(Canvas.getLayers());
      setClipBox(false);
      setClip(false);
    }
  };

  function HandleCont(name) {
    if (name !== selCont) {
      setCont(name);
      setState("");
      setDis("");
      setStates([]);
      setDistricts([]);
      if (name !== "") {
        fetchList("state", name);
      }
    }
  }

  function HandleState(name) {
    if (name !== selState) {
      setState(name);
      setDis("");
      setDistricts([]);
      if (name !== "") {
        fetchList("dis", name);
      }
    }
  }

  async function fetchList(name, pay) {
    let url;
    if (name) {
      let payload = pay;
      url = new URL(`${HOST}/clip-list/${name}/${payload}`);
    } else {
      url = new URL(`${HOST}/clip-list`);
    }

    try {
      await fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if (name === "state") {
            setStates(data.state);
          } else if (name === "dis") {
            setDistricts(data.district);
          } else {
            setCounts(data.country);
          }
        });
    } catch (error) {
      console.error("Error sending POST request:", error.message);
      alert("Unexpected Error occurred Please try again");
    }
  }
  const shouldRenderSummary =
    adv_options ||
    (req_box && req_layer) ||
    (req_box && req_region) ||
    (req_layer && req_region);

  useEffect(() => {
    let timeoutId;

    const handleMoveEnd = () => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        if (clip || (!shouldRenderSummary && req_region)) {
          var latlng = map.getCenter();
          fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`
          )
            .then((response) => response.json())
            .then((data) => {
              setCont(data.address.country);
              fetchList("state", data.address.country);
            })
            .catch((error) => console.error("Error:", error));
        }
      }, 200);
    };

    if (map) {
      map.on("move", handleMoveEnd);
    }

    if (clip || (!shouldRenderSummary && req_region)) {
      handleMoveEnd();
    }
    return () => {
      clearTimeout(timeoutId);
      if (map) {
        map.off("move", handleMoveEnd);
      }
    };
  }, [map, clip, shouldRenderSummary, req_region]);

  useEffect(() => {
    if (clip || (!shouldRenderSummary && req_region)) {
      setStates([]);
      setDistricts([]);
      setCont("");
      fetchList();
    }
  }, [clip, shouldRenderSummary, req_region]);
  return (
    <div>
      {shouldRenderSummary ? (
        <>
          {isAdditionalOptionsOpen && (
            <>
              <div
                className="mt-1 addiotnalopts-container"
                style={{ marginLeft: adv_params ? "10px" : "5px" , gap:'5px'}}
              >
                {(adv_options || req_box) && (
                  <div>
                    <input
                      onChange={handleClipBoxChange}
                      checked={clipBox}
                      id="box"
                      type="checkbox"
                    />
                    <label style={{ color: "white" }} htmlFor="box">
                      Clip by Box
                    </label>
                  </div>
                )}

                {(adv_options || req_region) && (
                  <div className="opts-container">
                    <input
                      onChange={handleClipChange}
                      checked={clip}
                      id="region"
                      type="checkbox"
                    />
                    <label style={{ color: "white" }} htmlFor="region">
                      Clip by Region
                    </label>
                  </div>
                )}

                {(adv_options || req_layer) && (
                                    <div className="opts-container">
                                        <input
                                            onChange={handleClipLayerChange}
                                            checked={clipLayer}
                                            id="layer"
                                            type="checkbox"
                                        />
                                        <label style={{ color: "white" }} htmlFor="layer">Clip by Layer</label>
                                    </div>
                                )}
              </div>

              {clipLayer && (
                <div className="sidepanel-conatiner">
                  {vectors && (
                    <select
                      className="form-select custom-select"
                      onChange={(e) => setCLayer(e.target.value)}
                      style={{
                        width: "120px",
                        height: "25px",
                        padding: "0px 10px",
                        margin: "2px 5px 2px 15px",
                        fontSize: "12px",
                      }}
                    >
                      <option style={{ fontSize: "12px" }} value="">
                        Select Layer
                      </option>
                      {vectors.map((nme) => (
                        <option
                          style={{ textAlign: "left", fontSize: "12px" }}
                          key={nme}
                          value={nme}
                        >
                          {nme}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {clip && (
                <div
                  className="sidenav"
                  style={{ marginTop: "10px", marginLeft: "10px" }}
                >
                  {country && country.length > 0 && (
                    <select
                      className="form-select custom-select"
                      onChange={(e) => HandleCont(e.target.value)}
                      value={selCont}
                      style={{
                        width: "120px",
                        height: "25px",
                        padding: "0px 10px",
                        margin: "2px 0px",
                        fontSize: "12px",
                      }}
                    >
                      <option style={{ fontSize: "12px" }} value="">
                        Select Country
                      </option>
                      {country.sort().map((nme) => (
                        <option
                          style={{ textAlign: "left", fontSize: "12px" }}
                          key={nme}
                          value={nme}
                        >
                          {nme}
                        </option>
                      ))}
                    </select>
                  )}

                  {state && state.length > 0 && (
                    <select
                      className="form-select custom-select"
                      onChange={(e) => HandleState(e.target.value)}
                      style={{
                        width: "120px",
                        height: "25px",
                        padding: "0px 10px",
                        margin: "2px 0px",
                        fontSize: "12px",
                      }}
                    >
                      <option style={{ fontSize: "12px" }} value="">
                        Select State
                      </option>
                      {state.sort().map((nme) => (
                        <option
                          style={{ textAlign: "left", fontSize: "12px" }}
                          key={nme}
                          value={nme}
                        >
                          {nme}
                        </option>
                      ))}
                    </select>
                  )}

                  {district && district.length > 0 && (
                    <select
                      className="form-select custom-select"
                      onChange={(e) => setDis(e.target.value)}
                      style={{
                        width: "120px",
                        height: "25px",
                        padding: "0px 10px",
                        margin: "2px 0px",
                        fontSize: "12px",
                      }}
                    >
                      <option style={{ fontSize: "12px" }} value="">
                        Select District
                      </option>
                      {district.sort().map((nme) => (
                        <option
                          style={{ textAlign: "left", fontSize: "12px" }}
                          key={nme}
                          value={nme}
                        >
                          {nme}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ marginTop: clip ? "10px" : "0px" }}>
            {req_region && (
              <>
                {country && country.length ? (
                  <select
                    className="form-select custom-select"
                    onChange={(e) => HandleCont(e.target.value)}
                    value={selCont}
                    style={{
                      width: "150px",
                      height: "25px",
                      padding: "0px 10px",
                      margin: "0px 0px 2px 5px",
                      fontSize: "12px",
                    }}
                  >
                    <option style={{ fontSize: "12px" }} value={""}>
                      Select Country
                    </option>

                    {country
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
                ) : null}
                {state && state.length ? (
                  <select
                    className="form-select custom-select"
                    onChange={(e) => HandleState(e.target.value)}
                    style={{
                      width: "150px",
                      height: "25px",
                      padding: "0px 10px",
                      margin: "0px 0px 2px 5px",
                      fontSize: "12px",
                    }}
                  >
                    <option style={{ fontSize: "12px" }} value={""}>
                      Select State
                    </option>

                    {state
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
                ) : null}
                {district && district.length ? (
                  <select
                    className="form-select custom-select"
                    onChange={(e) => setDis(e.target.value)}
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

                    {district
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
                ) : null}
              </>
            )}
          </div>

          <div style={{ marginTop: req_layer ? "10px" : "0px" }}>
            {req_layer && (
              <>
                {vectors ? (
                  <select
                    className="form-select custom-select"
                    onChange={(e) => setCLayer(e.target.value)}
                    style={{
                      width: "150px",
                      height: "25px",
                      padding: "0px 10px",
                      margin: "0px 0px 2px 5px",
                      fontSize: "12px",
                    }}
                  >
                    <option style={{ fontSize: "12px" }} value={""}>
                      Select Layer
                    </option>

                    {vectors.map((nme) => (
                      <option
                        style={{ textAlign: "left", fontSize: "12px" }}
                        key={nme}
                        value={nme}
                      >
                        {nme}
                      </option>
                    ))}
                  </select>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Options;
