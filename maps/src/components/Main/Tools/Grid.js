import React,{useContext} from "react";
import { GlobalContext } from "../../../App";

function Grid(){
    const {
        showGrid,
        setGrid,
        vis
    } = useContext(GlobalContext)
    return(
        <div style={{ position: vis?"absolute":"relative", }} className="toolscont">
        <button className="btn text-white" title="Add/Remove Grid" onClick={()=>setGrid(!showGrid)} 
        style={{ zIndex: "1000", fontSize: "15px", padding: "2px 2px", backgroundColor:'black', width: "40px", height: "40px", borderRadius: "50%",border:"none" ,  }}><i className="fa-solid fa-table-cells"></i></button>
        </div>
    )
}
export default Grid