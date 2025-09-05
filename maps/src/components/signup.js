import React,{useContext, useRef, useState} from "react";
import { useNavigate } from "react-router-dom";
import { HOST } from "./host";
import files from "./static";
import { GlobalContext } from "../App";
function Signup({setUserInfo }){
    const [email,SetEmail] = useState(null);
    const [pass,setPass]= useState(null);
    const [name,setName]=useState(null);
    const [number,setnum]=useState(null);
    const [show,setshow]=useState(false);
    const navigate=useNavigate()
    const {getCsrfToken}=useContext(GlobalContext)
    async function newUser(loginInfo) {
      try {
        setshow(true)
        const response = await fetch(`${HOST}/signup`, {
            credentials:"include",
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': await getCsrfToken(),
            },
            body: JSON.stringify({ data: loginInfo }),
        });
  
        if (response.status===200) {
            alert("Thank you for joining us");
            navigate(`/login`);
        }
        else if(response.status===201){
            alert("User with this email already exists")
        }
        else {
            console.log(response.status)
            alert("Unknown error. Please try again");
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
    setshow(false)
  }
     const handleSubmit = async e => {
      e.preventDefault();
       await newUser({
        name,
        email,
        pass,
        number
      });
      
    }
    
    return (
      <div className="w3-container w3-gray" style={{height:"100vh",display:"flex",justifyContent:"center",alignItems:"center"}}>
        <div className="Login w3-container w3-white w3-card" style={{display:"flex",flexDirection:"column",width:"750px",height:"750px",justifyContent:"center",alignItems:"center"}}>
        <img src={`${files}vgtlogo.png`} style={{width:"500px",height:"150px",margin:"0px"}} alt="Logo"></img>
         <form onSubmit={handleSubmit}>
         <label style={{fontSize:"20px"}}>
            <p>Name</p>
            <input className="w3-input w3-round-large w3-border" style={{width:"300px",height:"50px"}} type="name" onChange={e => setName(e.target.value)} required />
          </label>
          <label style={{fontSize:"20px"}}>
            <p>Email</p>
            <input className="w3-input w3-round-large w3-border" style={{width:"300px",height:"50px"}} type="email" onChange={e => SetEmail(e.target.value)} required />
          </label>
          <label style={{fontSize:"20px"}}>
            <p>Phone No.</p>
            <input className="w3-input w3-round-large w3-border" style={{width:"300px",height:"50px"}} type="tel" onChange={e => setnum(e.target.value)} required />
          </label>
          <label style={{fontSize:"20px"}}>
            <p>Password</p>
            <input type="password" className="w3-input w3-round-large w3-border" style={{height:"50px"}} onChange={e => setPass(e.target.value)}  required/>
          </label>
          {!show ?(
            <div style={{display:"flex",justifyContent:"center"}}>
            <button type="submit" style={{marginTop:"20px"}}  className="w3-button w3-border w3-teal w3-hover-black w3-text-white w3-large" >Submit</button>
          </div>
          ):(
            <div style={{display:"flex",justifyContent:"center"}}>
              <div className="lds-dual-ring-black" style={{justifySelf:"center"}}></div>
            </div>
          )}
        </form>
        <p>Already an user? <a href="/login">Login</a></p>
      </div>
      </div>
      
      
    );
  }
  
  export default Signup;