import React, { useEffect, useRef, useState, useContext } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";
import { HOST, HOST_MEDIA_URL, } from "../host";
import { GlobalContext } from "../../App";
import './tifftimeline.css';

const TiffTimeline = () => {
  const mapRef = useRef(null);
  const sliderRef = useRef(null);
  const [imageLayers, setImageLayers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const autoplayIntervalRef = useRef(null);
  const [showSlider, setShowSlider] = useState(false);
  const { getCsrfToken } = useContext(GlobalContext);
  const [imagePaths, setImagePaths] = useState([]);
  const [imageBounds, setImageBounds] = useState([]);
  const [timestamps, setTimeStamps] = useState([]);


  useEffect(() => {

    const map = L.map("map").setView([27.891535, 78.078743], 4.0);
    const hyb = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      zIndex: 1000
    }).addTo(map);

    mapRef.current = map;

    const layers = [];
    let loadedImages = 0;

    const preloadImages = () => {
      imagePaths.forEach((path, index) => {
        fetch(path)
          .then((response) => response.blob())
          .then((blob) => {
            const imageUrl = URL.createObjectURL(blob);
            const bounds = [
              [imageBounds[index].bottom_cord, imageBounds[index].left_cord],
              [imageBounds[index].top_cord, imageBounds[index].right_cord]
            ];

            const imageLayer = L.imageOverlay(imageUrl, bounds);
            imageLayer.setOpacity(0);
            imageLayer.addTo(mapRef.current);
            layers[index] = imageLayer;

            loadedImages++;
            if (loadedImages === imagePaths.length) {
              setImageLayers(layers);
              layers[0].setOpacity(1);
              mapRef.current.fitBounds(layers[0].getBounds());
            }
          })
          .catch((error) => console.error("Error loading image:", error));
      });
    };
    preloadImages();
    console.log("Updated imagePaths:", imagePaths);
    console.log("Updated bounds:", imageBounds);
    console.log("Updated timestamps:", timestamps);

    return () => {
      map.remove();
    };
  }, [imagePaths, imageBounds]);

  useEffect(() => {
    if (imageLayers.length === 0) return;

    if (sliderRef.current && !sliderRef.current.noUiSlider) {
      noUiSlider.create(sliderRef.current, {
        start: 0,
        range: { min: 0, max: imagePaths.length - 1 },
        step: 1,
        format: {
          to: (value) => Math.round(value),
          from: (value) => Math.round(value),
        },
      });

      sliderRef.current.noUiSlider.on("update", (values) => {
        const index = parseInt(values[0]);
        updateImage(index);
      });
    }
  }, [imageLayers]);

  const updateImage = (index) => {
    imageLayers.forEach((layer, i) => {
      layer.setOpacity(i === index ? 1 : 0);
    });

    setCurrentIndex(index);
    document.getElementById("timestamp").textContent = `Timestamp: ${timestamps[index]}`;
    mapRef.current.fitBounds(imageLayers[index].getBounds());
  };


  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const filenameRegex = /^\d{4}-\d{2}-\d{2}\.tiff?$/;

    const validFiles = files.filter((file) => filenameRegex.test(file.name));
    console.log('validFiles', validFiles)

    const timestamps = validFiles.map((file) => {
      const match = file.name.match(/^(\d{4}-\d{2}-\d{2})\.tiff?$/);
      return match ? match[1] : null;
    }).filter(Boolean);

    console.log("Extracted timestamps:", timestamps);
    setTimeStamps(timestamps);


    if (validFiles.length !== files.length) {
      alert("Only files with the format YYYY-MM-DD.tif or YYYY-MM-DD.tiff are allowed.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("input_image", file);
    });

    for (let pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1]);
    }

    try {
      const response = await fetch(`${HOST}/upload-tif-image`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": await getCsrfToken(),
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        alert("File upload successful!");
        console.log('data', data)
        const newPaths = data.file_paths || [];
        const mediaUrl = "media/";
        const updatedPaths = newPaths.map((path) => mediaUrl + path.split("media/")[1]);

        const finalUrls = updatedPaths.map((path) => `${HOST_MEDIA_URL}/${path}`);

        console.log("Received final_file paths:", finalUrls);
        console.log('recived bounds', data.bounds)

        setImagePaths((prevPaths) => [...prevPaths, ...finalUrls]);
        setImageBounds(data.bounds)
        setShowSlider(true);

      } else {
        alert("File upload failed!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file");
    }
  };

  const startAutoplay = () => {
    autoplayIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % imageLayers.length;
        sliderRef.current.noUiSlider.set(nextIndex);
        return nextIndex;
      });
    }, 1000);
  };

  const stopAutoplay = () => {
    clearInterval(autoplayIntervalRef.current);
  };

  const toggleAutoplay = () => {
    if (autoplay) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
    setAutoplay(!autoplay);
  };

  return (
    <>
      <div id="map"></div>
      <input
        className="form-control"
        type="file"
        accept=".tif,.tiff"
        onChange={handleFileUpload}
        style={{ margin: "20px auto", display: "block", color: 'white', width: '50%' }}
        multiple
      />
      {showSlider ? (
        <>
          <div className="slider-container">
            <div id="slider" ref={sliderRef} ></div>
            <button
              id="playButton"
              onClick={toggleAutoplay}
            >
              {autoplay ? "Pause" : "Play"}
            </button>
          </div>
          <p id="timestamp"> Timestamp: {timestamps[currentIndex]}</p>
        </>
      ) : null}

    </>
  );
};

export default TiffTimeline;
