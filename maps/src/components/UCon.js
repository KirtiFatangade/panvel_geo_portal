import React,{useState,useEffect, useRef, useContext} from "react";
import Create from "./create";
import Update from "./update";
import { HOST } from "./host";
import { GlobalContext } from "../App";

function Ucon({perm,Org}){
    const [members,setMemb]=useState([]);
    const [cu,setCu]=useState(0);
    const [uu,setUu]=useState(0);
    const [du,setDu]=useState(0);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectedUpdate, setUpdate] = useState(null);
    const [UpSuc,setUp]= useState(1);
    const {getCsrfToken}=useContext(GlobalContext)
    async function GetUsers() {
        try {
          const response = await fetch(`${HOST}/get-members`, {
  
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCsrfToken(),
              },
              body: JSON.stringify({ data: Org }),
          });
    
          if (response.ok) {
              const responseData = await response.json();
                setMemb(responseData.memb_list);
          } else {
              console.error('Error:', response.status);
          }
      } catch (error) {
          console.error('Error:', error.message);
      }
    }

    useEffect(()=>{
        GetUsers();
    },[]);
    
    function showOption(e){
      if(e==="create"){
        setCu(1);
        setUu(0);
        setDu(0);
        setUpdate(null);
        setSelectedRows([]);
      }
      if(e==="delete"){
        setCu(0);
        setUu(0);
        setDu(1);
        setUpdate(null);
        setSelectedRows([]);
      }
    }

    const handleRowSelect = (rowId) => {
      const isSelected = selectedRows.includes(rowId);
      setSelectedRows((prevSelectedRows) =>
        isSelected
          ? prevSelectedRows.filter((id) => id !== rowId) 
          : [...prevSelectedRows, rowId] 
      );
      
    };
  
    function showUpdate(memb){
        setCu(0);
        setUu(1);
        setDu(0);
        setUp(1);
        setUpdate(memb);
        setSelectedRows([]);
    }

    
    async function DeleteMemb(){
      if(selectedRows.length){
        try {
          const response = await fetch(`${HOST}/delete-members`, {
  
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCsrfToken(),
              },
              body: JSON.stringify({ data: selectedRows }),
          });
    
          if (response.ok) {
              GetUsers();
          } else {
              console.error('Error:', response.status);
          }
      } catch (error) {
          console.error('Error:', error.message);
      }
    }
      else{
        alert("Select Atleast One User");
      }
    }


    return(
        <div style={{margin:"20px",padding:"20px"}}>
          <h3 className="w3-text-dark-grey">Organization : {Org}</h3><br/>
            {perm ? (
    <div style={{display:"flex",flexDirection:"row"}}>
        
        <div style={{width:"70%"}}>
        <div style={{marginBottom:"20px"}} >
        {members && (
  <table className="w3-table-all w3-hoverable w3-centered" >
    <thead>
      <tr className="w3-black">
        <th>Name</th>
        <th>Email</th>
        <th></th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {members.map((memb) => (
        <tr key={memb.id}>
          <td>{memb.name}</td>
          <td>{memb.email}</td>
          <td>{perm[2] && (
                <button style={{margin:"10px"}} className="w3-button w3-blue w3-border w3-border-black w3-round-large" value={[memb.id,memb.name,memb.email]} onClick={e=>showUpdate(e.target.value)}>Update</button>
            )}</td>
          <td>{du ? (<input type="checkbox"  onChange={() => handleRowSelect(memb.id)} checked={selectedRows.includes(memb.id)} />):(null)}</td>
          
        </tr>
      ))}
    </tbody>
  </table>
)}
        </div>
        <div>
            {perm[0] && (
                <button className="w3-button w3-green w3-round-large w3-text-white" style={{margin:"10px"}}  value="create" onClick={e=>showOption(e.target.value)}>Create</button>
            )}
            {perm[3] &&(
                <button className="w3-button w3-red w3-round-large w3-text-white" style={{margin:"10px"}} value="delete" onClick={e=>showOption(e.target.value)}>Delete</button>
            )}
        </div>
        </div>
        
       
      <div style={{width:"30%"}}>
            {cu ? (
              <Create org={Org}  GetUsers={GetUsers}/>
            ):(null)}
            {uu ? (
                <div  >
                  {UpSuc ?(
                    <Update selectedUser={selectedUpdate}  GetUsers={GetUsers} setUp={setUp}/>
                  ):(<div style={{display:"flex",justifyContent:"center"}}>
                    <h3>Update successfull</h3>
                </div>)}
                
                
              </div>
            ):(null)}
            {du ?(
                <div style={{margin:"20px",marginTop:"0px",}} >
                <button  className="w3-button w3-red w3-round-large w3-text-white" onClick={DeleteMemb}>Delete Selected Users</button>
                
              </div>
            ):(null)}
      </div>
    </div>
) : (
    <p>Not Hello</p>
)}
        </div>
    )

}
export default Ucon