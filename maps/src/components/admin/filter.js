import React,{useState,useEffect,useRef} from "react";
import L  from "leaflet";
import { logToServer } from "../logger";
function Filter({map,FilterLayers,setFLayers,UsedLayers,fColor}){
    const selChange=useRef(Object.keys(FilterLayers)[0]);
    const selDivision = useRef("");
    const [showP,setShowP] = useState(false);
    const [prabhag,setPrabhag]= useState([]);
    const selPrabhag=useRef("");
    const [len,setLen]=useState(Object.keys(FilterLayers).length);
    const Divisions =["Division1","Division2","Division3","Division4"];
    let names={"nov_2019":"Nov 2019","may_2020":"May 2020","nov_2020":"Nov 2020","may_2021":"May 2021","nov_2021":"Nov 2021","may_2022":"May 2022","jan_2023":"Jan 2023"}
    
    function filter(){
        logToServer('info', 'Filtering data');
        let geoj=UsedLayers[selChange.current].toGeoJSON();
        FilterLayers[selChange.current].remove();
        let layer = L.geoJSON(geoj, {
            style: function (feature){
              let fstyle={
                color:fColor[selChange.current],
                fillOpacity:0.0 
              }
              if(feature.properties.Status){
                if(feature.properties.Status==="Unauthorised"){
                  fstyle.fillColor="red";
                  fstyle.fillOpacity=0.2;
                }
              }
              return(fstyle);
            },
            zIndex:1000,
            onEachFeature: function (feature, layer) {
              const popupContent = `
              <strong>ID:</strong>${feature.properties.ID}<br>
              <strong>Jurisdiction:</strong>${feature.properties.Jurisdicti}<br>
              <strong>Divison:</strong> ${feature.properties.Division}<br>
              <strong>Village:</strong>${feature.properties.Village}<br>
              <strong>Prabhag:</strong>${feature.properties.Prabhag}<br>
              <strong>Sector:</strong>${feature.properties.Sector}<br>
              <strong>Node:</strong>${feature.properties.Node}<br>
              <strong>Plot:</strong>${feature.properties.Plot}<br>
              <strong>Village Gut:</strong>${feature.properties.Village_Gu}<br>
              <strong>Lattitude:</strong>${feature.properties.Lattitude}<br>
              <strong>Longitude:</strong>${feature.properties.Longitude}<br>
              <strong>Area:</strong>${feature.properties.Area}<br>
              `;
              layer.bindPopup(popupContent);
            },
            filter:function(feature){
                if(selPrabhag.current===""){
                    return ((selDivision.current!=="") && (feature.properties.Division === selDivision.current) )
                }else{
                    return ((selDivision.current!=="") && (feature.properties.Division === selDivision.current) ) &&
                    ((selPrabhag.current!=="") && ( (feature.properties.Prabhag === selPrabhag.current) ))
                }
                
            }
          })
          layer.addTo(map);
          layer.bringToFront();
          const layers={...FilterLayers};
          layers[selChange.current]=layer;
          setFLayers(layers);


    }
    useEffect(()=>{
        if(Object.keys(FilterLayers).length<len){
            selDivision.current="";
            selChange.current=Object.keys(FilterLayers)[0];
            selPrabhag.current=""
            setShowP(false)
            setLen(Object.keys(FilterLayers).length)
            logToServer('info', 'Filter layers count decreased');
        }else{
            setLen(Object.keys(FilterLayers).length)
        }
    },[FilterLayers])
      
    const handleChange = (event) => {
        selChange.current = event.target.value;
        selDivision.current="";
        logToServer('info', `Selected change layer: ${event.target.value}`);
        setShowP(false);
      };
    const handleDChange=(event)=>{
        selDivision.current=event.target.value;
        selPrabhag.current="";  
        getPrabhag();
        setShowP(true);
        filter();
        logToServer('info', `Selected division: ${event.target.value}`);

    };
    const handlePChange = (event)=>{
        selPrabhag.current=event.target.value;
        filter();
        logToServer('info', `Selected prabhag: ${event.target.value}`);

    };
    function getPrabhag(){
        const prabhags = [...new Set(UsedLayers[selChange.current].getLayers()
            .filter(layer => layer.feature.properties.Division === selDivision.current)
            .map(layer => layer.feature.properties.Prabhag))];
        setPrabhag(prabhags);
    }
    return(
        <div style={{display:"flex",flexDirection:"column"}}>
      <select  onChange={handleChange}>
        <option  disabled>Select Builtup Change</option>
        {Object.keys(FilterLayers).map((key) => (
          <option key={key} value={key}>
            {names[key]}
          </option>
        ))}
      </select>
      <select value={selDivision.current} onChange={handleDChange}>
         <option value="">Select a Division</option>
            {Divisions.map((ele) => (
         <option key={ele} value={ele}>
            {ele}
            </option>
        ))}
    </select>
      {showP && (
        <>
        <select value={selPrabhag.current} onChange={handlePChange} >
         <option value="">Select a Prabhag</option>
            {prabhag.map((ele) => (
         <option key={ele} value={ele}>
            {ele}
        </option>
        ))}
    </select>
        </>
      )}
    </div>
    )
}
export default Filter