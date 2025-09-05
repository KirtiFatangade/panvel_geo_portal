import React from "react";
import { useNavigate } from "react-router-dom";
function User({userInfo}){


  //Check if !userInfo and fetch information according to the session if !session throw error and go back to login
  const navigate=useNavigate()
 
  
  function handleClick(){
    navigate("/ucon");
  }
  
    return (
      <div style={{display:"flex",flexDirection:"column"}}>
      {userInfo ? (
        <div className="user-info-container w3-card-4">
        <h2 className="w3-center">User Information</h2>
        <div className="user-info-content">
          <p>
            <strong>User Name:</strong> {userInfo.name}
          </p>
          <p>
            <strong>Organization Name:</strong> {userInfo.org}
          </p>
        </div>
        <button className="w3-button w3-blue" onClick={handleClick}>
          User Console
        </button>
      </div>
      ) : (
        <p>Loading user information...</p>
      )}
    </div>
    );
  }
  

export default User