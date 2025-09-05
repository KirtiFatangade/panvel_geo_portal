import React,{useState} from "react";
import { HOST } from "../host";
import { useNavigate } from "react-router-dom";
function NVerified(){
    const [email,setEmail]=useState("")
    const [error,setError]=useState(false)
    const navigate=useNavigate()
    function resend(){
            if( email && email!==""){
                setError(false)
                try{
                    fetch(`${HOST}/resend-email/${email}`)
                    alert("Verification link sent the given email")
                    navigate("/login")
                }catch(e){
                    alert(e)
                }
                
            }else{
                setError(true)
            }
    }
    return (
        <>
            <p style={{ color: "white" }}>Email not Verified</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="text" /><label>Email</label>
            <button
                type="submit"
                className="login"
                id="login-btn"
                value="Log in"
                onClick={resend}
            >
                Resend Verification Link
            </button>
            {error && (
                <p style={{ color: "white" }}>Please enter an email</p>
            )}
        </>
    );
}

export default NVerified