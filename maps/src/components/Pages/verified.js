import React from "react";
import V1 from '../authbg.mp4';
import files from "../static";

function Verified() {
    return (
        <>
            <div className="main">
                <div className="left-side">
                    {/* <MapboxExample /> */}
                   <video src={V1} autoPlay loop muted />
                </div>
                <div className="right-side">
                    <div className="logo">
                        <img src={`${process.env.PUBLIC_URL}/${files}vgtlogo.png`} alt="Vasundharaa Logo" />
                    </div>
                    <p style={{ color: "white" }}>Email Verified</p>
                    <p style={{ color: "white" }}>Click <a href="/login">here</a> to login or continue </p>
                </div>
            </div>
        </>
    )
}

export default Verified;