import React, { useState } from "react";
import CreateSurveyForm from "./CreateSurveyForm";
import ViewSurveyForm from "./ViewSurveyForm";

const DataInput = ({ id }) => {
  // const [isCreateMode, setIsCreateMode] = useState(false); 

  // const toggleMode = () => {
  //   setIsCreateMode((prevMode) => !prevMode); 
  // };

  return (
    <>
     
        
          {/* <button
            onClick={toggleMode}
            style={{
              ...buttonStyle,
              backgroundColor: isCreateMode ? '#2c3e50' : '#2c3e50',
            }}
          >
            Create Survey

          </button> */}

      {<ViewSurveyForm id={id} />}

      {/* {isCreateMode && (
        <CreateSurveyForm id={id} setIsCreateMode={setIsCreateMode}/>
      )} */}
    </>
  );
};

// const buttonStyle = {
//   fontSize: '16px',
//   backgroundColor: '#007bff',
//   color: '#fff',
//   border: 'none',
//   borderRadius: '5px',
//   cursor: 'pointer',
// };

export default DataInput;