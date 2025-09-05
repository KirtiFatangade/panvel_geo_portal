import React, { useContext, useEffect, useState } from "react";
import { HOST } from "../../host";
import "./FModal.css";
import { GlobalContext } from "../../../App"; 
function FModal({
  feature_id,
  fetchFeatures,
  fetchSubFeatures,
  editMode,
  selFeature,
  selSubFeature,
}) {
  const [name, setName] = useState("");
  const [compType, setCompType] = useState(0); // Default to Dynamic
  const [comp, setComp] = useState("");
  const [url, setUrl] = useState("");
  const [urlParams, setUrlParams] = useState([]);
  const [type, setType] = useState(0);
  const [credit, setCredit] = useState("");
  const [address, setAddress] = useState("");
  const [sub_bool, setBool] = useState(false);
  const { getCsrfToken } = useContext(GlobalContext);
  const [visuals, setVisuals] = useState({
    start: false,
    end: false,
    range: false,
    highlight: false,
    adv_params: false,
    adv_options: false,
    cloud: false,
    req_box: false,
    req_layer: false,
    req_region: false,
    "start-min": "",
    "start-max": "",
    "end-min": "",
    "end-max": "",
  });
  const [params, setParams] = useState("");
  const [sub, setSub] = useState([]);
  const [info, setInfo] = useState("");
  const [selectedPlans, setSelectedPlans] = useState([0, 1, 2, 3]);
  useEffect(() => {
    if (editMode) {
      if (selFeature) {
        console.log(selFeature);
        setName(selFeature.name);
        setCompType(selFeature.comp_type);
        setComp(selFeature.comp);
        setType(selFeature.type);
        setUrl(selFeature.url);
        setUrlParams(selFeature.url_params);
        setVisuals(selFeature.visuals);
        setAddress(selFeature.add);
        setCredit(selFeature.credit);
        setInfo(selFeature.info);
        setSelectedPlans(
          Array.from(
            { length: 4 - selFeature.plan },
            (_, index) => selFeature.plan + index
          )
        );
        setBool(selFeature.sub);
      }
      if (selSubFeature) {
        console.log(selSubFeature);
        setName(selSubFeature.name);
        setCompType(selSubFeature.comp_type);
        setComp(selSubFeature.comp);
        setType(selSubFeature.type);
        setUrl(selSubFeature.url);
        setUrlParams(selSubFeature.url_params);
        setVisuals(selSubFeature.visuals);
        setAddress(selSubFeature.add);
        setInfo(selSubFeature.info);
        setCredit(selSubFeature.credit);
        setSelectedPlans(
          Array.from(
            { length: 4 - selSubFeature.plan },
            (_, index) => selSubFeature.plan + index
          )
        );
      }
    } else {
      setName("");
      setCompType(0);
      setComp("");
      setUrl("");
      setUrlParams([]);
      setType(0);
      setCredit("");
      setVisuals({
        start: false,
        end: false,
        range: false,
        highlight: false,
        adv_params: false,
        adv_options: false,
        cloud: false,
        req_box: false,
        req_layer: false,
        req_region: false,
        "start-min": "",
        "start-max": "",
        "end-min": "",
        "end-max": "",
      });
      setAddress("");
      setSelectedPlans([0, 1, 2, 3]);
      setBool(false);
    }
  }, [editMode, selFeature, selSubFeature]);

  const handleNameChange = (event) => {
    setName(event.target.value);
  };
  const handleCompTypeChange = (event) => {
    setCompType(parseInt(event.target.value));
  };
  const handleCompChange = (event) => {
    setComp(event.target.value);
  };
  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };
  const handleUrlParamsChange = (event) => {
    setUrlParams(event.target.value);
  };
  const handleTypeChange = (event) => {
    setType(parseInt(event.target.value));
  };

  const handleAddressChange = (event) => {
    setAddress(event.target.value);
  };
  const handleBoolChange = (event) => {
    setBool(!sub_bool);
  };
  const handleVisualsChange = (event) => {
    const { name, checked } = event.target;

    setVisuals((prevVisuals) => ({
      ...prevVisuals,
      [name]: checked,
    }));
  };
  const handleDateChange = (event) => {
    const { name, checked } = event.target;

    setVisuals((prevVisuals) => ({
      ...prevVisuals,
      [name]: event.target.value,
    }));
  };
  const handleParamsChange = (event) => {
    setParams(event.target.value);
  };
  const handleCreditChange = (event) => {
    setCredit(event.target.value);
  };
  const handleInfoChange = (event) => {
    setInfo(event.target.value);
  };
  const handlePlanChange = (event) => {
    const planValue = parseInt(event.target.value);
    setSelectedPlans((prevPlans) => {
      if (event.target.checked) {
        // Add the selected plan
        return [...prevPlans, planValue];
      } else {
        // Remove the unselected plan (but keep Free plan)
        return prevPlans.filter((plan) => plan !== planValue);
      }
    });
  };
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Input  className="mt-2 form-control" validation (add more as needed)
    if (!name || name === "") {
      alert("Please enter the Name");
      return;
    }

    if (compType) {
      if (!comp || comp === "") {
        alert("Please enter Component");
        return;
      }
    }
    // if (!type){
    //     if(!address || address===""){
    //         alert("Please enter the address")
    //         return
    //     }
    // }
    if (!credit || credit === "") {
      if (!sub_bool) {
        alert("Please enter Credit");
        return;
      }
    }

    try {
      const response = await fetch(
        `${HOST}/add-feature/${feature_id ? feature_id : "0"}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": await getCsrfToken(),
          },
          body: JSON.stringify({
            data: {
              name,
              sub_bool,
              compType,
              comp,
              url,
              urlParams,
              type,
              address,
              visuals,
              params,
              info,
              credit,
              selectedPlans:
                selectedPlans.length > 0 ? Math.min(...selectedPlans) : null,
              editMode: editMode,
            },
          }),
        }
      );

      if (!response.ok) {
        alert("Error Creating Feature");
        return;
      }
      alert("Feature Created Successfully");

      // Reset form after successful submission
      setName("");
      setCompType(0);
      setComp("");
      setUrl("");
      setUrlParams([]);
      setType(0);
      setAddress("");
      setVisuals({}); // Reset visuals
      setParams("");
      setSub([]);
      setInfo("");
      setCredit("");
      if (!editMode) {
        if (feature_id) {
          fetchSubFeatures(feature_id);
        } else {
          fetchFeatures(false);
        }
      } else {
        fetchFeatures(false);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <div className="custom-modal-edit-feature">
      <h5>{editMode ? "Edit" : "Add"} Feature</h5>
      {/* <form className="form-container"> */}
      <div className="form-group">
        <label>Name:</label>
        <input
          className="form-control"
          type="text"
          value={name}
          onChange={handleNameChange}
        />
      </div>
      <label>
        <input
          type="checkbox"
          name="start"
          checked={sub_bool}
          onChange={handleBoolChange}
        />{" "}
        Sub
      </label>
      <br /> <br />
      <h5>Select Plan</h5>
      <label>
        <input
          type="checkbox"
          value={0}
          checked={selectedPlans.includes(0)}
          onChange={handlePlanChange}
        />{" "}
        Free
      </label>
      <label>
        <input
          type="checkbox"
          value={1}
          checked={selectedPlans.includes(1)}
          onChange={handlePlanChange}
        />{" "}
        Basic
      </label>
      <label>
        <input
          type="checkbox"
          value={2}
          checked={selectedPlans.includes(2)}
          onChange={handlePlanChange}
        />{" "}
        Advanced
      </label>
      <label>
        <input
          type="checkbox"
          value={3}
          checked={selectedPlans.includes(3)}
          onChange={handlePlanChange}
        />{" "}
        Enterprise
      </label>
      <br />
      {!sub_bool && (
        <>
          <div className="form-group">
            <label>Comp Type:</label>
            <select
              className="mt-2"
              value={compType}
              onChange={handleCompTypeChange}
            >
              <option value={0}>Dynamic</option>
              <option value={1}>Static</option>
            </select>
          </div>

          {compType ? (
            <>
              <div className="form-group">
                <label>Comp:</label>
                <input
                  className="mt-2 form-control"
                  type="text"
                  value={comp}
                  onChange={handleCompChange}
                />
              </div>
              <br />
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Type:</label>
                <select
                  className="mt-2"
                  value={type}
                  onChange={handleTypeChange}
                >
                  <option value={0}>Vis</option>
                  <option value={1}>Analysis</option>
                </select>
              </div>

              {type ? (
                <>
                  <div className="form-group">
                    <label>URL:</label>
                    <input
                      className="mt-2 form-control"
                      type="url"
                      value={url}
                      onChange={handleUrlChange}
                    />
                  </div>
                  <br />
                  <div className="form-group">
                    <label>URL Params:</label>
                    <input
                      className="mt-2 form-control"
                      type="text"
                      value=""
                      onChange={handleUrlParamsChange}
                    />
                  </div>
                  <br />
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Address:</label>
                    <input
                      className="mt-2 form-control"
                      type="text"
                      value={address}
                      onChange={handleAddressChange}
                    />
                  </div>
                  <br />
                </>
              )}
            </>
          )}

          {!compType && (
            <>
              <h5>Visuals</h5>
              <label>
                <input
                  type="checkbox"
                  name="start"
                  checked={visuals.start}
                  onChange={handleVisualsChange}
                />{" "}
                Start
              </label>
              {visuals.start && (
                <>
                  {" "}
                  <label>
                    <input
                      type="checkbox"
                      name="end"
                      checked={visuals.end}
                      onChange={handleVisualsChange}
                    />{" "}
                    End
                  </label>
                </>
              )}
              {visuals.start && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      name="range"
                      checked={visuals.range}
                      onChange={handleVisualsChange}
                    />{" "}
                    Range
                  </label>
                </>
              )}
              {visuals.start && (
                <>
                  {" "}
                  <label>
                    <input
                      type="checkbox"
                      name="highlight"
                      checked={visuals.highlight}
                      onChange={handleVisualsChange}
                    />{" "}
                    Highlight
                  </label>
                </>
              )}
              <label>
                <input
                  type="checkbox"
                  name="adv_params"
                  checked={visuals.adv_params}
                  onChange={handleVisualsChange}
                />{" "}
                Advanced Params
              </label>

              <label>
                <input
                  type="checkbox"
                  name="adv_options"
                  checked={visuals.adv_options}
                  onChange={handleVisualsChange}
                />{" "}
                Advanced Options
              </label>
              {visuals.start && visuals.highlight && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      name="cloud"
                      checked={visuals.cloud}
                      onChange={handleVisualsChange}
                    />{" "}
                    Cloud
                  </label>
                </>
              )}

              <label>
                <input
                  type="checkbox"
                  name="req_box"
                  checked={visuals.req_box}
                  onChange={handleVisualsChange}
                />{" "}
                Required Box
              </label>
              <label>
                <input
                  type="checkbox"
                  name="req_layer"
                  checked={visuals.req_layer}
                  onChange={handleVisualsChange}
                />{" "}
                Required Layer
              </label>
              <label>
                <input
                  type="checkbox"
                  name="req_region"
                  checked={visuals.req_region}
                  onChange={handleVisualsChange}
                />{" "}
                Required Region
              </label>
              <br />
              {visuals.start && (
                <>
                  <div className="form-group">
                    <label>Start-min:</label>
                    <input
                      className="mt-2 form-control"
                      type="date"
                      name="start-min"
                      value={visuals["start-min"]}
                      onChange={handleDateChange}
                    />
                    <label>Start-max:</label>
                    <input
                      className="mt-2 form-control"
                      type="date"
                      name="start-max"
                      value={visuals["start-max"]}
                      onChange={handleDateChange}
                    />
                  </div>
                </>
              )}
              {visuals.end && (
                <>
                  <div className="form-group">
                    <label>End-min:</label>
                    <input
                      className="mt-2 form-control"
                      type="date"
                      name="end-min"
                      value={visuals["end-min"]}
                      onChange={handleDateChange}
                    />
                    <label>End-max:</label>
                    <input
                      className="mt-2 form-control"
                      type="date"
                      name="end-max"
                      value={visuals["end-max"]}
                      onChange={handleDateChange}
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Params:</label>
                <input
                  className="mt-2 form-control"
                  type="text"
                  value={params}
                  onChange={handleParamsChange}
                />
              </div>
            </>
          )}
        </>
      )}
      <div className="form-group">
        <label>Info :</label>
        <input
          className="mt-2 form-control"
          type="text"
          value={info}
          onChange={handleInfoChange}
        ></input>
      </div>
      <div className="form-group">
        <label>Credits:</label>
        <input
          className="mt-2 form-control"
          type="text"
          value={credit}
          onChange={handleCreditChange}
        />
        <br />
      </div>
      {/* </form> */}
      <button className="mt-3 w-100" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
}
export default FModal;
