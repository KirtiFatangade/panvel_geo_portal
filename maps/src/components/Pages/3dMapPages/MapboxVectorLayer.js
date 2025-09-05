import React, { useContext, useState } from "react";
import { GlobalContext } from "../../../App";

function MapboxVectorLayer() {
  const { vis,mapBox ,setBoxLayers} = useContext(GlobalContext);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleButtonClick = () => {
    setShowInput(!showInput);
  };
  function generateRandomValue(length = 5) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if(mapBox){
        let name=`geojson-${generateRandomValue()}`
        mapBox.addSource(name, {
            "type": "geojson",
            "data": `https://geoserver.vasundharaa.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=useruploads:${inputValue}&srsname=EPSG:4326&outputFormat=application/json`
          })
    
    
          mapBox.addLayer(
            {
              id: `${name}-layer`,
              type: 'line',
              source: name,
              paint: {
                'line-color': '#000',
                'line-width': 3
              }
            },
    
          );
          setBoxLayers(prevLayers => [...prevLayers, {"name":name,"visible":true}]);
        setInputValue("");
        setShowInput(false);
    }
   
  };

  return (
    <div>
      <div style={{ position: vis ? "absolute" : "relative" }} className="toolscont">
        <button
          className="btn btn-dark text-white"
          title="Vector layer"
          style={{ zIndex: "1000",textAlign:'none', fontSize: "15px", padding: "2px 2px", width: "40px", height: "40px", borderRadius: "50%", border: "none" }}
          onClick={handleButtonClick}
        >
        V
        </button>
        {showInput && (
          <div  style={{ marginTop: "10px",backgroundColor:'black', padding:'10px' }}>
            <h5 style={{textAlign:'center',color:'white'}}>Vector Layer Url</h5>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              style={{ marginRight: "10px" }}
            />
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapboxVectorLayer;
