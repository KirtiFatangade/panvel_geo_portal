import React,{useContext, useRef, useState} from "react";
import { HOST } from "./host";
import { GlobalContext } from "../App";
function Create({org,GetUsers}){

const [name,SetName]=useState(null);
const [email,setEmail]=useState(null)
const [CreateSucc,SetSuc]=useState(1);
const [pass,setPass]=useState(null);
const {getCsrfToken}=useContext(GlobalContext)
async function CreateMemb(MembInfo) {
    try {
      const response = await fetch(`${HOST}/create-member`, {

          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': await getCsrfToken(),
          },
          body: JSON.stringify({ data: MembInfo }),
      });

      if (response.ok) {
          const responseData = await response.json();
          SetSuc(0);
          setPass(responseData.pass)
          GetUsers()
      } else {
          alert("User with email already exists")
      }
  } catch (error) {
      console.error('Error:', error.message);
  }
}
   const handleSubmit = async e => {
    e.preventDefault();
     await CreateMemb({
      name,
      email,
      org
    });
    
  }

function CreateAnother(){
    setEmail(null);
    SetName(null);
    setPass(null);
    SetSuc(1);
}

return(
    <div style={{margin:"20px",marginTop:"0px"}} >
        {CreateSucc ? (
            <div className="w3-card-4 w3-padding w3-light-grey">
                <p className="w3-large">Create User</p>
            <form onSubmit={handleSubmit}>
      <label className="w3-margin-bottom">
        <p>Name</p>
        <input className="w3-input"  onChange={e => SetName(e.target.value)} required />
      </label>
      <label className="w3-margin-bottom">
        <p>Email</p>
        <input className="w3-input"  type="email" onChange={e => setEmail(e.target.value)}  required/>
      </label>
      <div style={{display:"flex",justifyContent:"center",marginTop:"10px"}}>

        <button className="w3-button w3-blue w3-round-large " type="submit">Create</button>
      </div>
    </form>
            </div>
            
        ):(
            <div className="w3-card-4 w3-padding w3-light-grey">
                <p className="w3-large">User Created</p>
                <p>Password: {pass}</p>
                <button className="w3-button w3-green" onClick={CreateAnother}>Create Another User</button>
            </div>
        )}
                
              </div>
);
}

export default Create