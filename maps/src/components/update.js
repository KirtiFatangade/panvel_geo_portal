import React, { useContext, useRef } from "react";
import { HOST } from "./host";
import { GlobalContext } from "../App";
function Update({selectedUser,GetUsers,setUp}){
    const {getCsrfToken}=useContext(GlobalContext)
    let [id,name,email]=selectedUser.split(",");

    async function UpdateMemb(MembInfo) {
        try {
          const response = await fetch(`${HOST}/update-member`, {
    
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCsrfToken(),
              },
              body: JSON.stringify({ data: MembInfo }),
          });
    
          if (response.ok) {
              setUp(0);
              GetUsers();
          } else {
              alert("Some unknown error occured")
          }
      } catch (error) {
          console.error('Error:', error.message);
      }
    }
       const handleSubmit = async e => {
        e.preventDefault();
         await UpdateMemb({
          name,
          email,
          id
        });
        
      }

    return(
        <div style={{margin:"20px",marginTop:"0px"}} >
            <div className="w3-card-4 w3-padding w3-light-grey">
                <p className="w3-large">Update User</p>
            <form onSubmit={handleSubmit}>
      <label className="w3-margin-bottom">
        <p>Name</p>
        <input className="w3-input" placeholder={name}  onChange={e => name=e.target.value} required />
      </label>
      <label className="w3-margin-bottom">
        <p>Email</p>
        <input className="w3-input"  type="email" placeholder={email} onChange={e => email=e.target.value}/>
      </label>
      <div style={{display:"flex",justifyContent:"center",marginTop:"10px"}}>

        <button className="w3-button w3-blue w3-round-large " type="submit">Update</button>
      </div>
    </form>
    </div>
    </div>


    );
}

export default Update