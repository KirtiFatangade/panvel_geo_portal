import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Navigate({url}){
    const navigate=useNavigate();
    useEffect(()=>{
        navigate(url)
    },[])
    
    return(
        null
    );
}
export default Navigate