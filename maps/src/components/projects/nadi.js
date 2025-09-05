import React, { useEffect, useState, useContext } from "react";
import { HOST } from "../host";
import L from "leaflet"
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";

function Modal({ id, closeModal }) {
    const [imageData, setImageData] = useState([]);
    useEffect(() => {
        setImageData([]);
        async function getData(id) {
            if (id !== null) {
                try {
                    const response = await fetch(`${HOST}/jeevitnadi/get-image-data/${id}`);
                    const data = await response.json();
                    setImageData(data.ImageData)
                } catch (e) {
                    alert("Unexpected Error occurred. Please try again.");
                }
            }
        }


        getData(id);
    }, [id]);

    return (
        <div >
            <div id="modal" className="w3-modal">
                <div className="w3-modal-content">
                    <div className="w3-container">
                        <span onClick={closeModal} className="w3-button w3-display-topright">&times;</span>
                        <div style={{ marginTop: "20px", padding: "20px" }}>

                            {id !== null && (
                                <>
                                    <table style={{ width: "100%", textAlign: "center" }}>
                                        <thead>
                                            <tr>
                                                <th>No.</th>
                                                <th>Name</th>
                                                <th>Date</th>
                                                <th>Image</th>

                                            </tr>
                                        </thead>
                                        <tbody>
                                            {imageData.map((data, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{data.name}</td>
                                                    <td>{data.date}</td>
                                                    <td>
                                                        <img
                                                            style={{ height: "50px", width: "50px" }}
                                                            src={`${HOST}/jeevitnadi/image/${id}/${data.name}`}
                                                            alt={`${data.name}`}
                                                            onClick={() => window.open(`${HOST}/jeevitnadi/image/${id}/${data.name}`, '_blank')}

                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                </>
                            )}

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

function Nadi() {
    const {
        LayerChange,
        handleOpen,
    } = useLayerFunc();
    const {
        map,
        SetLogout
    } = useContext(GlobalContext)

    useEffect(() => {
        SetLogout(true);
    }, [])
    
    const [markers] = useState([[18.563103, 73.792142], [18.574139, 73.743664], [18.556021, 73.799320]])
    const [selectedMarkerId, setSelectedMarkerId] = useState(null);
    const openModal = (id) => {
        document.getElementById('modal').style.display = 'block'
        setSelectedMarkerId(id);
    };

    const closeModal = () => {
        document.getElementById('modal').style.display = 'none'
        setSelectedMarkerId(null);
    };

    function addMarkers(id) {
        var newIcon = L.icon({
            iconUrl: 'https://img.icons8.com/?size=256&id=108647&format=png',
            iconSize: [30, 30],

        });
        let bounds = L.latLngBounds();
        let marker = L.marker(markers[id], { icon: newIcon })
        marker.on('click', () => {
            openModal(id);
        });

        bounds.extend(L.latLng(markers[id][0], markers[id][1]));
        marker.addTo(map)
        map.flyToBounds(bounds, { maxZoom: 18 });

    }
    // useEffect(()=>{
    //     document.getElementById("id1").checked=true
    //     document.getElementById("id2").checked=true
    //     document.getElementById("id3").checked=true
    //     // addMarkers(0)
    //     // addMarkers(1)
    //     // addMarkers(2)
    // },[])

    return (
        <>

            <Modal id={selectedMarkerId} closeModal={closeModal} />

            <details className="baseline" onToggle={() => handleOpen("Nadi_Boundary")} >
                <summary >Jeevit Nadi</summary>
                <div className="baseline-cont">
                    <div className="opt-div">
                        <input value="id1" id="id1" onChange={(e) => addMarkers(0)} className="form-check-input check-map" type="checkbox" />
                        <label>2021 Flora at RMC</label>
                    </div>
                    <div className="opt-div">
                        <input value="id2" id="id2" className="form-check-input check-map" onChange={(e) => addMarkers(1)} type="checkbox" />
                        <label> 2018 Wakad Hinjewadi Fish</label>
                    </div>
                    <div className="opt-div">
                        <input value="id3" id="id3" className="form-check-input check-map" onChange={(e) => addMarkers(2)} type="checkbox" />
                        <label>2020  Ramnadi near hotel Mahableshwar</label>
                    </div>
                    <div className="opt-div">
                        <input value="Nadi_Boundary" id="Nadi_Boundary" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked, true)} type="checkbox" />
                        <label>Demographic Boundary</label>
                    </div>
                    <div className="opt-div">
                        <input value="Pune_Building" id="Building" className="form-check-input check-map" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} type="checkbox" />
                        <label>Buildings</label>
                    </div>
                    <details id="townD">
                        <summary className="townS">Roads</summary>
                        <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
                            <div className="opt-div">
                                <input value="Pune_road_track" id="Track" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Track</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_tertiary" id="Tertiary" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Tertiary</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_steps" id="Steps" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Steps</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_service" id="Service" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Service</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_secondary" id="Secondary" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Seconday</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_residential" id="Residential" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Residential</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_primary" id="Primary" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Primary</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_path" id="Path" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Path</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_living_street" id="Living Street" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Living Street</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_road_footway" id="Footway" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Footway</label>
                            </div>
                        </div>
                    </details>
                    <details id="townD">
                        <summary className="townS">Point</summary>
                        <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
                            <div className="opt-div">
                                <input value="Pune_point_toilet" id="Toilet" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Toilet</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_school" id="School" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>School</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_restaurant" id="Restaurant" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Restaurant</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_post_office" id=" Post Office" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Post Office</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_post_box" id="Post Box" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Post Box</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_police" id="Police" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Police</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_hotel" id="Hotel" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Hotel</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_hostel" id="Hostel" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Hostel</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_community_centres" id="Ceommunity Centre" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Community Centre</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_comms_tower" id="Comms Tower" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Comms Tower</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_point_college" id="College" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>College</label>
                            </div>
                        </div>
                    </details>
                    <details id="townD">
                        <summary className="townS">Landuse</summary>
                        <div className="town-cont" style={{ display: "flex", flexDirection: "column", justifyItems: "right" }}>
                            <div className="opt-div">
                                <input value="Pune_landuse_scrub" id="Scrub" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Scrub</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_retail" id="Retail" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Retail</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_residential" id="Residential" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Residential</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_ground" id="Ground" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Recreation Ground</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_park" id="Park" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Park</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_nature" id="Nature" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Nature Reserve</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_military" id="Military" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Military</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_industrial" id="Industrial" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Industrial</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_landuse_health" id="Health" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Health</label>
                            </div>
                            <div className="opt-div">
                                <input value="	Pune_landuse_commercial" id="Commercial" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Commercial</label>
                            </div>
                            <div className="opt-div">
                                <input value="Pune_cemetery" id="Cemetry" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value, e.target.id, e.target.checked)} />
                                <label>Cemetry</label>
                            </div>
                        </div>
                    </details>
                </div>
            </details>
            {/* <h3 style={{color:"white",cursor:"pointer"}} onClick={addMarkers}>Jeevit Nadi</h3> */}

        </>
    )
}


export default Nadi