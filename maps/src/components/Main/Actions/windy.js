import React, { useState, useEffect, useContext } from 'react';
import files from '../../static';
import { HOST } from "../../host";
import { SideBarContext } from "../sidebar";
export default function ClimateChange({setWeather  }) {
    const { setloader } = useContext(SideBarContext);
    const [showWeather, setShowWeather] = useState(true);
    const weatherDataShow = () => {
        setShowWeather(false);
        setWeather(false)
    }
    const Visualize = () => {
        setShowWeather(!showWeather);
    }
    
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
                    <iframe title='weather-dataset' width='100%' height='100%' src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=3&overlay=wind&product=ecmwf&level=surface&lat=46.68&lon=-16.172&detailLat=5.354&detailLon=82.705&detail=true" frameborder="0" >
                    </iframe>
                </div>
            )}
        </>
    )
}