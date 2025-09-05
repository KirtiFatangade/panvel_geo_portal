import React, { useEffect, useRef, useState, useContext } from 'react'
import Papa from 'papaparse';
import L from "leaflet";
import { GlobalContext } from '../../App';
import { layersControl } from '../LayerContol';
import { bbox } from '@turf/turf';
import { logToServer } from '../logger';
import { HOST, HOST_MEDIA_URL } from '../host';

export default function CsvComp({ index, url, setIsLoading }) {
    const { map, customMarker, layerControls, Canvas } = useContext(GlobalContext);
    const [data, setData] = useState([]);
    const [show, setShow] = useState(false);
    const [markersPlotted, setMarkersPlotted] = useState(false);
    const [plot, setPlot] = useState(false);
    const [geo,setGeo]=useState(false)
    const [loader, setLoader] = useState(false);
    const [csvPaths,setCsv]=useState([])
    const [geoPaths,setGeoPaths]=useState([])



    function AddLayers(){
        const layerName = prompt("Enter Layer Name:");
        if (!layerName) {
          alert("Layer name is required.");
          return;
        }
        Canvas.addLayerUrl(layerName,geoPaths[0])
        layerControls.addOverlay(L.geoJSON(), layerName, false, null, true, layerName, false)
    }

    function ProcessUrls(url){  
        if (Array.isArray(url)) {
            console.log('processing array!');
        } else {
            try {
                url = JSON.parse(url.replace(/'/g, '"'));
            } catch (error) {
                console.error('Unable to parse as JSON:', error);
                logToServer('error', 'Error parsing CSV file paths as JSON');

                return;
            }
        }
        let csv=[]
        let geo=[]
        url.forEach(path=>{
            if(path.endsWith(".csv")){
                csv.push(path)
            }else if (path.endsWith(".geojson")){
                // geo.push(`http://localhost:8000/${path}`)
                geo.push(`${HOST_MEDIA_URL}/${path}`)
                setGeo(true)
            }
        })
        setCsv(csv);
        setGeoPaths(geo)
    }

    async function getCsvRecords() {
        setIsLoading(true)       
        try {
            csvPaths.forEach(async csvUrl => {
                    // const csvResponse = await fetch(`http://localhost:8000${csvUrl}`);
                    const csvResponse = await fetch(`${HOST_MEDIA_URL}${csvUrl}`);
                    const csvText = await csvResponse.text();
                    Papa.parse(csvText, {
                        header: true,
                        complete: result => {
                            console.log('result',result.data)
                            setData(result.data);
                            if (result.data.length > 0 && result.data[0]['latitude'] && result.data[0]['longitude']) {
                                setPlot(true);
                            }
                        },
                    }); 
            });
        }
        catch (Error) {
            console.log(Error);
            logToServer('error', 'Error fetching CSV data');
            setIsLoading(false)
            return false;
        }
        setIsLoading(false)
    }

    function plotMarkers() {
        setIsLoading(true)
        console.log('clicked');

        if (map && data.length > 0) {
            if (!data[0]['latitude']) {
                alert("latitude and longitude not found");
                return;
            }

            const geojsonMarkers = {
                type: "FeatureCollection",
                features: []
            };

            data.forEach(row => {
                const lat = parseFloat(row['latitude']);
                const lng = parseFloat(row['longitude']);

                if (lat && lng) {
                    const markerFeature = {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [lng, lat]
                        },
                        properties: {
                            id: row['id'],
                            jurisdiction: row['jurisdiction'],
                            division: row['division'],
                            village: row['village'],
                            prabhag: row['prabhag'],
                            month: row['month'],
                            year: row['year'],
                            latitude: lat,
                            longitude: lng,
                            area_feet: row['area_feet']

                        }
                    };
                    geojsonMarkers.features.push(markerFeature);

                }
                else {

                    console.error('Invalid coordinates:', lat, lng);
                    logToServer('warn', 'Invalid coordinates found in CSV data');

                }

            });


            console.log('GeoJSON FeatureCollection:', geojsonMarkers);
            function generateRandomString(length) {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                const charactersLength = characters.length;
                for (let i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
            }

            const randomString = generateRandomString(4);
            let bb = bbox(geojsonMarkers)
            Canvas.addCsvMarker(randomString, geojsonMarkers)
            layerControls.addOverlay(L.geoJSON(), 'Smart AI output', true, [[bb[1], bb[0]], [bb[3], bb[2]]], true, randomString, false)
            setMarkersPlotted(true);
            setIsLoading(false)
        }
    }

    useEffect(()=>{
        if(url){
            ProcessUrls(url);
        }
    },[url])


    function clicked() {
        setShow(!show)
        if (!data.length && csvPaths && csvPaths.length) {
            getCsvRecords()
        }
    }


    return (

        <>
            <button className='btn-add' style={{ fontSize: '14px', width: 'fit-content' }} onClick={() => clicked()}>Show Records</button>

            {plot && (
                <button className='btn-add' id='plot-markers' style={{ fontSize: '14px', width: 'fit-content' }} onClick={() => plotMarkers()}>Plot Markers</button>
            )}
            {geo && (
                <button className='btn-add' id='plot-markers' style={{ fontSize: '14px', width: 'fit-content' }} onClick={() => AddLayers()}>Show Layers</button>
            )}


            {loader ? (
                <>
                    <div style={{ flex: '1', position: 'relative', marginLeft: '-10%', opacity: '1', zIndex: '1000' }}>
                        <div className="lds-dual-ring">
                            <i className="fa-solid fa-globe"></i>
                        </div>
                    </div>
                </>
            ) : null}

            {markersPlotted ? (
                <p className='text-success' style={{ fontSize: '12px' }}>
                    Markers plotted successfully! Please close Chatbot.
                </p>
            ) : null}

            {data && data.length > 0 && show ? (
                <>
                    <div className="custom-chatbot-table-container">
                        <table className="custom-chatbot-table">
                            <thead>
                                <tr>
                                    {Object.keys(data[0]).map((key, index) => (
                                        <th key={index}>{key.charAt(0).toUpperCase() + key.slice(1)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {Object.values(row).map((val, colIndex) => (
                                            <td key={colIndex}>{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </>
            ) : (null)}
          

        </>

    )
}
