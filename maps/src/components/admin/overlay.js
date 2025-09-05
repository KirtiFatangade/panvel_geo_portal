import React,{useState} from "react";
import Sat from "../Main/satellite";
import Maxar from "../Main/maxar";
import { logToServer } from "../logger";

function Overlay({map,layer_controls,setloader}){
    const [selectedOption, setSelectedOption] = useState("opt1");
    const handleOptionChange = (optionId) => {
      if(optionId==="opt1" || optionId==="opt2"){
        setSelectedOption(optionId);
      }else{
        alert("Premium Feature. Please contact Vasundharaa Geo Technologies for more information")
        logToServer("warn", "User attempted to access premium feature");
      }
      
    
    };
    return(
        <div
        className="actions"
        style={{
          display: "flex",
          flexDirection: "column",
          height:"100%"
          
        }}
      >
        <div>
          <h4 style={{color:"#FAF8D4"}}>Select An Action</h4>
        </div>
        <div className="select"  tabIndex="1">
                <input
                  className="selectopt"
                  name="test"
                  type="radio"
                  id="opt1"
                  checked={selectedOption === "opt1"}
                  onChange={() => handleOptionChange("opt1")}
                />
                <label  htmlFor="opt1" className="option">
                Open Source Satellite Datasets
                </label>
                <input
                  className="selectopt"
                  name="test"
                  type="radio"
                  id="opt2"
                  checked={selectedOption === "opt2"}
                  onChange={() => handleOptionChange("opt2")}
                  
                />
                <label htmlFor="opt2" className="option" >
                High Resolution Disaster Satellite Datasets
                </label>
                <input
                  className="selectopt"
                  name="test"
                  type="radio"
                  id="opt3"
                  checked={selectedOption === "opt3"}
                  onChange={() => handleOptionChange("opt3")}
                  
                />
                <label htmlFor="opt3" className="option">
                  Perform Map Segmentation
                </label>
                <input
                  className="selectopt"
                  name="test"
                  type="radio"
                  id="opt4"
                  checked={selectedOption === "opt4"}
                  onChange={() => handleOptionChange("opt4")}
                  
                />
                <label htmlFor="opt4" className="option">
                  Perform Object Detection
                </label>
                <input
                  className="selectopt"
                  name="test"
                  type="radio"
                  id="opt5"
                  checked={selectedOption === "opt5"}
                  onChange={() => handleOptionChange("opt5")}
                  
                />
                <label htmlFor="opt5" className="option">
                Farm Health Graph Generation
                </label>
              </div>

        
          {selectedOption==="opt1" &&(
            <>
            <Sat map={map} layer_controls={layer_controls} setloader={setloader}/>
            </>
          )}
          {selectedOption === "opt2" && (
                  <>
                    <Maxar map={map} layer_controls={layer_controls} setloader={setloader}/>
                  </>
                )}
          
        
      </div>
    )
}
export default Overlay