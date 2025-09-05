import React, { useState } from "react";
import { HOST } from "../host";
import { useLayerFunc } from "../Main/layerFunc";

function S3tiff() {
    const { TileLayerChange, LayerChange } = useLayerFunc();
    const [url, setUrl] = useState("");

    function handleInputChange(event) {
        setUrl(event.target.value);
    }

    function handleUpload() {
        const ischeck = true;
        const id = false;
        const dynamic = true;

        fetch(`${HOST}/s3`, {
            method: 'POST',
            body: JSON.stringify({data:{url:url}}),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(data.bounds);
            if (data.type === "raster") {
                TileLayerChange(data.name, id, ischeck, dynamic, data.bounds);
            } else {
                LayerChange(data.name, id, ischeck, false, false, true, data.bounds);
            }
        })
        .catch(error => {
            // Handle errors here
            console.error('Error fetching data:', error);
        });
    }

    return (
        <div className="baseline-cont">
            <div className="opt-div">
                <input type="text" placeholder="Enter URL" value={url} onChange={handleInputChange} />
            </div>
            <div className="opt-div">
                <button onClick={handleUpload}>Upload</button>
            </div>
        </div>
    );
}

export default S3tiff;
