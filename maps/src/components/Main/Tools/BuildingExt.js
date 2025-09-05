import React, { useState, useContext, useEffect } from "react";
import Table from "./TableComp";
import { GlobalContext } from "../../../App";
import Buffer from "./BufferExt";
import { HOST } from "../../host";
import L from "leaflet"
function Extract() {
  const [show, setShow] = useState(false);
  const [type, setType] = useState(null);
  const [type2, setType2] = useState(null);
  const [val1, setValues1] = useState([])
  const [val2, setValues2] = useState([])
  const [showSecondTable, setShowSecondTable] = useState(false);
  const [showThirdTable, setShowThirdTable] = useState(false);
  const { vis, Canvas, layerControls,getCsrfToken } = useContext(GlobalContext);



  useEffect(() => {
    if (val1.length) {
      setShowSecondTable(false)
      setValues2([])
    }
  }, [val1])

  function close() {
    setShow(false);
    setShowSecondTable(false);
    setValues1([])
    setValues2([])

  }

  function handleClick() {
    setShow(true);
    setShowSecondTable(false); // Reset the second table visibility when showing the first table
    setShowThirdTable(false); // Reset the third table visibility when showing the first table
  }

  function handleSecondTableClick() {
    setShowSecondTable(true);
  }
  async function extRes(values) {

    let data = {}
    if (values) {
      data = { table: values[0], column: values[1], unique: values[2] }
    }
    try {
      const response = await fetch(`${HOST}/build-result`, {
        method: 'POST',
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ data }),
      });

      if (response.ok) {
        const result = await response.json();
        Canvas.addLayerGeo(`${values[1]}---${values[2]}`, result.geo)
        layerControls.addOverlay(L.geoJSON(), `${values[1]}---${values[2]}`, false, null, true, `${values[1]}---${values[2]}`, false)
      } else {
        console.error('Error:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }


  }



  return (
    <>
      <div style={{ position: vis ? "absolute" : "relative" }} className="toolscont">
        <div>
          <button
            title="Building Extraction"
            className="btn btn-dark text-white"
            onClick={handleClick}
            style={{
              zIndex: "1000",
              fontSize: "15px",
              padding: "2px 2px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
            }}
          >
              <i className="fas fa-building"></i>
          </button>
        </div>

        {show && (
          <div className="toolsvis" id="toolvis" >
            <span
              onClick={close}
              className="toolclose"
            >
              &times;
            </span>
            <div>
              <Table setType={setType} setValues1={setValues1} />
              {val1.length === 3 && !showSecondTable && (
                <>
                  <div>
                    <button onClick={()=>extRes(val1)} className='btn btn-primary border-0 mt-3 mb-3' style={{ width: '90%', height: '30px', fontSize: '11px', marginLeft: '3%' }} >Display Results</button>
                  </div>

                  <Buffer val={val1} type={type} />
                </>
              )}
              {type === "polygon" && (
                <>
                   <div>
                    <button onClick={handleSecondTableClick} className='btn btn-primary border-0 mt-3 mb-3' style={{ width: '90%', height: '30px', fontSize: '11px', marginLeft: '3%' }} >Further Analyse by</button>
                  </div>
                  {showSecondTable && (
                    <Table setType2={setType2} setValues2={setValues2} val1={val1} />
                  )}
                  {val2.length === 3 && (
                    <>
                      <div>
                    <button onClick={()=>extRes(val2)} className='btn btn-primary border-0 mt-3 mb-3' style={{ width: '90%', height: '30px', fontSize: '11px', marginLeft: '3%' }} >Display Results</button>
                  </div>
                      <Buffer val={val2} type={type2} />

                    </>
                  )}

                </>
              )}


            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Extract;
