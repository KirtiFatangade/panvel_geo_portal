import React, { useState, useEffect, useContext } from 'react';
import files from '../../static';
import { HOST } from "../../host";
import { SideBarContext } from "../sidebar";
export default function Heatmap({Mum,Nag,setMum,setNag  }) {
    const { setloader } = useContext(SideBarContext);
    const [showWeather, setShowWeather] = useState(true);
    const weatherDataShow = () => {
        if(Mum){
            setMum(false)
            
        }else{
            setNag(false)
        }
        setShowWeather(false)
    }
    const Visualize = () => {
        setShowWeather(!showWeather);
    }
    useEffect(()=>{
        console.log("here")
    },[])
    return (
        <>
           
            {showWeather && (
                <div className='weather-data'>
                    <div style={{ width: "10%", height: "6%", position: 'absolute', top: '0', left: '0', backgroundColor: 'white', opacity: '0.7' }}>
                        <img
                            className="logo"
                            alt='this is logo'
                            src={`${process.env.PUBLIC_URL}/${files}vgtlogo.png`}
                            style={{ width: "100%", height: "100%" }}
                        />
                    </div>
                    <button className="close bg-danger text-white" aria-label="Close" onClick={weatherDataShow} style={{ border: 'none', padding: '0%', borderRadius: '100%', width: '20px', height: '20px', marginRight: '-0.5%', marginTop: '-0.25%', textAlign: 'center', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                    <iframe 
        src={`https://www.meteoblue.com/en/products/cityclimate/widget/${Mum?"mumbai":"nagpur"}?wind_map=1&heading=1&webcams=0&share=0&info=1&`} 
        frameBorder="0" 
        scrolling="NO" 
        allowTransparency="true" 
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
        style={{ width: '100%', height: '100%' }}
        title="Weather Widget"
      ></iframe>
      
                </div>
            )}
        </>
    )
}