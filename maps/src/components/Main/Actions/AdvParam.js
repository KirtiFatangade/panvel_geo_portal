import React, { useEffect, useState, useContext } from "react";
import { HOST } from "../../host";
import { colorsList } from "./satStatic";

function AdvParam({
  add,
  Advtype,
  SetType,
  grad,
  setGrad,
  selBands,
  setSelBand,
  isAdvancedParameters,
  setAdvancedParameters,
}) {
  const [bands, setBands] = useState([]);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isBandList, setBandList] = useState(false);
  const [pallete, setPal] = useState(false);
  const [index, setIndex] = useState(0);

  async function GetBands() {
    try {
      await fetch(`${HOST}/get-bands-add/?add=${add}`)
        .then((response) => response.json())
        .then((data) => {
          console.log("get-bands-add", data);
          setBands(data.bands_description);
          console.log("get-bands-add data", data.bands_description);
        });
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (add) {
      GetBands();
    }
  }, [add]);

  const renderOptions = () => {
    console.log("bands", bands);

    const filteredOptions = [];
    for (const [key, value] of Object.entries(bands)) {
      filteredOptions.push(
        <option key={key} value={key}>
          {value}
        </option>
      );
      if (key === "B12") break;
    }

    return filteredOptions;

    // const indexOfB12 = bands.indexOf('SWIR 2');
    // const filteredBands = bands.slice(0, indexOfB12 + 1);
    // console.log("filteredBands",filteredBands);

    // return filteredBands.map((key) => (
    //   <option key={key} value={key}>
    //     {key}
    //   </option>
    // ))
  };

  const toggleOptions = () => {
    setIsOptionsVisible(!isOptionsVisible);
  };

  const updateColor = (gradient) => {
    setGrad(gradient);
    toggleOptions();
  };

  const handleBandChange = (index, value) => {
    const newBands = [...selBands];
    newBands[index] = value;
    setSelBand(newBands);
  };
  return (
    <>
      {/* <div

          onClick={() => setAdvancedParameters(!isAdvancedParameters)}
        >
          Advanced Parameters
        </div> */}

      {isAdvancedParameters && (
        <>
          <div className="addiotnalopts-container" style={{ gap: "15px" }}>
            <div className="opts-container" style={{ marginLeft: "10px" }}>
              <input
                value="bands"
                id="bands"
                onChange={(e) => {
                  SetType(e.target.checked ? "bands" : null);
                  if (bands && bands.length && e.target.checked) {
                    setSelBand([bands[0], bands[0], bands[0]]);
                  } else {
                    setSelBand([]);
                  }
                }}
                type="checkbox"
                checked={Advtype === "bands"}
              />
              <label style={{ color: "white" }} htmlFor="bands">
                Bands
              </label>
            </div>
            <div className="opts-container">
              <input
                value="indices"
                id="indices"
                type="checkbox"
                onChange={(e) => {
                  SetType(e.target.checked ? "indices" : null);
                  if (bands && bands.length) {
                    setSelBand([bands[0], bands[0]]);
                  } else {
                    setSelBand([]);
                  }
                }}
                checked={Advtype === "indices"}
              />
              <label style={{ color: "white" }} htmlFor="indices">
                Indices
              </label>
            </div>
          </div>

          {Advtype === "bands" && (
            <div
              className="addiotnalopts-container"
              style={{ marginLeft: "10px" }}
            >
              {/* <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}> */}
              <label style={{ color: "white" }}>R: </label>
              <select
                style={{
                  width: "70px",
                  height: "25px",
                  padding: "0px 0px",
                  margin: "0px 0px 2px 0px",
                  fontSize: "12px",
                  zIndex: "2000",
                  borderRadius: "5px",
                }}
                value={selBands[0] || ""}
                onChange={(e) => handleBandChange(0, e.target.value)}
              >
                {renderOptions()}
              </select>
              {/* </div> */}
              {/* <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}> */}
              <label style={{ color: "white" }}>G: </label>
              <select
                // className='form-select'
                style={{
                  width: "70px",
                  height: "25px",
                  padding: "0px 0px",
                  margin: "0px 0px 2px 0px",
                  fontSize: "12px",
                  zIndex: "2000",
                  borderRadius: "5px",
                }}
                value={selBands[1] || ""}
                onChange={(e) => handleBandChange(1, e.target.value)}
              >
                {renderOptions()}
              </select>
              {/* </div> */}
              {/* <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}> */}
              <label style={{ color: "white" }}>B:</label>
              <select
                // className='form-select'
                style={{
                  width: "70px",
                  height: "25px",
                  padding: "0px 0px",
                  margin: "0px 0px 2px 0px",
                  fontSize: "12px",
                  zIndex: "2000",
                  borderRadius: "5px",
                }}
                value={selBands[2] || ""}
                onChange={(e) => handleBandChange(2, e.target.value)}
              >
                {renderOptions()}
              </select>
              {/* </div> */}
            </div>
          )}

          {Advtype === "indices" && (
            <>
              <div
                className="addiotnalopts-container"
                style={{ marginLeft: "5px" }}
              >
                <label style={{ color: "white" }}>A</label>
                <select
                  id="ind1"
                  //

                  style={{
                    width: "60px",
                    height: "25px",
                    padding: "0px 10px",
                    margin: "0px 0px 2px 5px",
                    fontSize: "13px",
                    zIndex: "2000",
                  }}
                  value={selBands[0] || ""}
                  onChange={(e) => handleBandChange(0, e.target.value)}
                >
                  {renderOptions()}
                </select>

                <label style={{ color: "white" }}>B</label>
                <select
                  id="ind2"
                  className="form-select"
                  style={{
                    width: "60px",
                    height: "25px",
                    padding: "0px 10px",
                    margin: "0px 0px 2px 5px",
                    fontSize: "13px",
                    zIndex: "2000",
                  }}
                  value={selBands[1] || ""}
                  onChange={(e) => handleBandChange(1, e.target.value)}
                >
                  {renderOptions()}
                </select>

                {/* Palette section */}
                <div style={{ marginLeft: "5px" }}>
                  <div
                    className="custom-select"
                    style={{
                      position: "relative",
                      width: "130px",
                      color: "white",
                      zIndex: "2000",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        gap: "5px",
                      }}
                    >
                      <span>Palette</span>
                      <div
                        className="select-styled"
                        onClick={toggleOptions}
                        style={{
                          backgroundImage: grad,
                          width: "130px",
                          height: "20px",
                          cursor: "pointer",
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Color options */}
                  <div
                    className="select-options"
                    style={{
                      display: isOptionsVisible ? "block" : "none",
                      position: "relative",
                      width: "100px",
                      zIndex: 1,
                      boxShadow: "1px 5px 10px 8px #000000",
                      marginLeft: "40px",
                    }}
                  >
                    {colorsList.map((gradient, index) => (
                      <div
                        key={index}
                        className="color-option"
                        style={{
                          background: gradient,
                          height: "20px",
                          cursor: "pointer",
                        }}
                        onClick={() => updateColor(gradient)}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Formula */}
              {/* <div className="sidepanel-container">
                <span style={{ color: "#ffffff", margin: 0, fontSize: "12px", fontWeight: "bolder" }}>
                  Formula Applied:(A-B)/(A+B)
                </span>
              </div> */}
            </>
          )}

          {/* {isBandList && (
            <div className="hidden-container">
              {bands.map((key) => (
                <div className="dropdown-div" onClick={() => { handleBandChange(index, key); setBandList(!isBandList) }} key={key} >
                  {key}
                  <hr style={{ margin: "5px 0" }} />
                </div>
              ))}
            </div>
          )} */}
        </>
      )}
      {/* {pallete && (
        <div className="hidden-container">

          {colorsList.map((gradient, index) => (
            <div
              key={index}
              className="color-option"
              style={{ background: gradient, margin: '0%', height: '20px', cursor: 'pointer', padding: '0px' }}
              onClick={() => { updateColor(gradient); setPal(!pallete) }}
            ></div>
          ))}
        </div>
      )} */}
    </>

    // <>
    //  <details className="baseline">
    //     <summary  style={{ fontSize: "12px" }}>
    //       Advanced Parameters :{" "}
    //     </summary>
    //     <div className="baseline-cont" style={{ margin: "2px 0px 5px 5px" }}>
    //       <div className="opt-div">
    //         <input
    //           value="bands"
    //           id="bands"
    //           className="form-check-input check-map"
    // onChange={(e) => {SetType(e.target.checked ? "bands" : null);if(bands && bands.length && e.target.checked){setSelBand([bands[0],bands[0],bands[0]])}else{setSelBand([])}}}
    // type="checkbox"
    // checked={Advtype === "bands"}
    //         />
    //         <label>Bands</label>
    //       </div>
    //       <div className="opt-div">
    //         <input
    //           value="indices"
    //           id="indices"
    //           className="form-check-input check-map"
    // type="checkbox"
    // onChange={(e) => {SetType(e.target.checked ? "indices" : null);if(bands && bands.length){setSelBand([bands[0],bands[0]])}else{setSelBand([])}}}
    // checked={Advtype === "indices"}
    //         />
    //         <label>Indices</label>
    //       </div>
    //     </div>
    //     {Advtype === "bands" && (
    // <div style={{ display: "flex", flexDirection: "column" }}>
    //   <div
    //     style={{
    //       display: "flex",
    //       flexDirection: "row",
    //       justifyContent: "center",
    //     }}
    //   >
    //     <label style={{ color: "white" }}>R : </label>
    //     <select className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
    //     value={selBands[0] || ""}
    //     onChange={(e) => handleBandChange(0, e.target.value)}
    //     >
    //       {renderOptions()}
    //     </select>
    //   </div>
    //   <div
    //     style={{
    //       display: "flex",
    //       flexDirection: "row",
    //       justifyContent: "center",
    //     }}
    //   >
    //     <label style={{ color: "white" }}>G : </label>
    //     <select
    //       className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
    //       value={selBands[1] || ""}
    //       onChange={(e) => handleBandChange(1, e.target.value)}
    //     >
    //       {renderOptions()}
    //     </select>
    //   </div>
    //   <div
    //     style={{
    //       display: "flex",
    //       flexDirection: "row",
    //       justifyContent: "center",
    //     }}
    //   >
    //     <label style={{ color: "white" }}>B : </label>
    //     <select
    //       className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 2px 5px", fontSize: '12px' }}
    //       value={selBands[2] || ""}
    //       onChange={(e) => handleBandChange(2, e.target.value)}
    //     >
    //       {renderOptions()}
    //     </select>
    //   </div>
    // </div>
    //     )}
    //     {Advtype === "indices" && (
    //       <div style={{ display: "flex", flexDirection: "column", alignContent: "center" }}>
    //         <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'center', marginLeft: '10px' }}>
    //           <label style={{ color: "white", marginRight: '8px' }}>A :  </label>
    //           <select id="ind1" className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 5px 30px", fontSize: '12px' }}
    //             value={selBands[0] || ""}
    //             onChange={(e) => handleBandChange(0, e.target.value)}
    //           >
    //             {renderOptions()}
    //           </select>
    //         </div>
    //         <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'center', marginLeft: '10px' }}>
    //           <label style={{ color: "white", marginRight: '8px' }}>B :  </label>
    //           <select id="ind2" className='form-select' style={{ width: "150px", height: "25px", padding: "0px 10px", margin: "0px 0px 5px 30px", fontSize: '12px' }}
    //             value={selBands[1] || ""}
    //             onChange={(e) => handleBandChange(1, e.target.value)}
    //           >
    //             {renderOptions()}
    //           </select>

    //         </div>

    //         <div className="custom-select" style={{ position: 'relative', width: '200px', color: 'white' }}>
    //           <div style={{ display: 'flex', flexDirection: 'row', marginLeft: '6px' }}>
    //             Palette: <div className="select-styled" onClick={toggleOptions} style={{ backgroundImage: grad, width: '200px', height: '20px', marginLeft: "12px" }}></div>
    //           </div>
    //           <div className="select-options" style={{ display: isOptionsVisible ? 'block' : 'none', position: 'absolute', top: '100%', left: 55, width: '150px', zIndex: 1, border: 'none', boxShadow: '1px 5px 10px 8px #000000' }}>
    // {colorsList.map((gradient, index) => (
    //   <div
    //     key={index}
    //     className="color-option"
    //     style={{ background: gradient, margin: '0%', height: '20px', cursor: 'pointer', padding: '0px' }}
    //     onClick={() => updateColor(gradient)}
    //   ></div>
    // ))}
    //           </div>
    //         </div>

    //         {/* <div style={{ height: '10px', width: '100px', marginTop: '5px', alignSelf: 'center', background: grad }}></div> */}

    //         <div style={{ marginTop: "5px" }}>
    //           <p style={{ color: "#397aa5", margin: 0, fontSize: "12px", fontWeight: "bolder" }}>
    //             Formula Applied : (A-B)/(A+B)
    //           </p>
    //         </div>
    //       </div>
    //     )}
    //     </details>
    // </>
  );
}

export default AdvParam;
