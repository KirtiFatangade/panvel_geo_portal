//map.js
 // setTimeout(() => {
        //   if (!layer._leaflet_id) {
        //     console.error("Leaflet ID is still undefined for:", layer);
        //     return;
        //   }

        //   let geojsonData = layer.toGeoJSON();
        //   let layerId = `${geojsonData.geometry.type}_${layer._leaflet_id}`;

        //   layer.options.name = layerId;

        //   console.log("Layer Name Assigned:", layerId);
        //   console.log("Current Drawn Items:", drawnItems.getLayers());

        //   // Ensure mode is passed correctly
        //   let modeInstance;
        //   switch (geojsonData.geometry.type) {
        //     case "Point":
        //       modeInstance = new DrawPointMode();
        //       break;
        //     case "LineString":
        //       modeInstance = new DrawLineStringMode();
        //       break;
        //     case "Polygon":
        //       modeInstance = new DrawPolygonMode();
        //       break;
        //     case "Rectangle":
        //       modeInstance = new DrawRectangleMode();
        //       break;
        //     default:
        //       console.error(
        //         "Unsupported geometry type:",
        //         geojsonData.geometry.type
        //       );
        //       return;
        //   }

        //   // Add to Deck.gl
        //   if (Canvas._deck) {
        //     Canvas._deck.setProps({
        //       layers: [
        //         ...Canvas._deck.props.layers,
        //         new EditableGeoJsonLayer({
        //           id: layerId,
        //           name: layerId,
        //           data: geojsonData,
        //           mode: modeInstance,
        //           selectedFeatureIndexes: [],
        //           pointType: "circle",
        //           getLineWidth: 0.1,
        //           getPointRadius: 1,
        //           lineWidthMinPixels: 2,
        //           pointRadiusMinPixels: 5,
        //           pickable: true,
        //           filled: false,
        //           onEdit: ({ updatedData }) => {
        //             console.log(`✏ Layer Edited: ${layerId}`, updatedData);
        //           },
        //         }),
        //       ],
        //     });
        //     console.log(`Added to _deck.props.layers with ID: ${layerId}`);
        //   } else {
        //     console.error("Canvas._deck is undefined.");
        //   }
        // }, 100);


// userconsole.js
// const location = useLocation();
//  const [currentTabName, setCurrentTabName] = useState("Dashboard");
{
  /* {(userInfo.user_permissions.includes('view_role') || userInfo.is_superuser || userInfo.is_admin) && (
                <li
                  className={`li ${UTab === "4" ? "active" : ""}`}
                  onClick={() => SetuTab("4")}
                >
                  Manage Roles
                </li>
              )} */
}

//  {/* {!notification.status && <th>Actions</th>} */}
// useEffect(() => {
//     fetchLoginTime();
//     fetchProfilePicture();

//     if (showNotificationModal) {
//       document.addEventListener("mousedown", handleClickOutside);
//     } else {
//       document.removeEventListener("mousedown", handleClickOutside);
//     }
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [location.state?.loggedInUserEmail, showNotificationModal]);

// if(!(window.location.pathname.startsWith("/MapBox"))){
//   Canvas.clear();
// }
// Canvas.clear();

// const handleTabClick = (tabName, tabId) => {
//   setCurrentTabName(tabName);
//   localStorage.setItem("currentTabName", tabName);
//   SetuTab(tabId);
// };

//   const handleClickOutside = (event) => {
// if (
//     notificationModalRef.current &&
//     !notificationModalRef.current.contains(event.target)
//   ) {
//     setShowNotificationModal(false);
//   }
// };

// useEffect(() => {
//   const storedTabName = localStorage.getItem("currentTabName");
//   if (storedTabName) {
//     setCurrentTabName(storedTabName);
//   }
// }, []);

// const result = window.confirm("Are you sure to logout?");
// if (!result) {
//   return;
// }

//  * UserProfile * //
// const setCountryCodes = useState([]);
//   const [orgModalIsOpen, setOrgModalIsOpen] = useState(false);
//   const [organizationName, setOrganizationName] = useState("");
//   const [org_name, setorg_name] = useState("");
//   const [org_web, setorg_web] = useState("");
//   const [org_add, setorg_add] = useState("");
//   const [org_plan, setorg_plan] = useState("");
//   const [planModal, setPlanModal] = useState(false);
//    const [formData, setFormData] = useState({
//         country_code: "",
//     });
//  const [updateSuccess, setUpdateSuccess] = useState(false);
// const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
// };

{
  /* <div className="mt-2 country-code">
                                <select
                                    className="mt-0"
                                    name="country_code"
                                    value={formData.country_code}
                                    onChange={handleChange}
                                    style={{
                                        fontSize: '15px',
                                        width: '10%',
                                        padding: '5px 12px',
                                        borderRadius: '4px',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        
                                    }}
                                    required
                                >
                                    <option value="" disabled>Select Country Code</option>
                                    {countryCodes.map((country, index) => (
                                        <option key={index} value={country.code}>
                                            {country.name} ({country.code})
                                        </option>
                                    ))}
                                </select>
                            
                                <input
                                    type="text"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value)}
                                    placeholder="Kindly start with country code"
                                    className="form-control"
                                    maxLength={13}
                                />
                            </div> */
}

// send request to add organization

// const handleAddOrganization = async (e) => {
//     e.preventDefault();
//     try {
//       const csrfToken = await getCsrfToken();

//       const response = await fetch(
//         `${HOST}/send_organization_request/${userInfo.id}/ `,
//         {
//           method: "POST",
//           credentials: "include",
//           headers: {
//             "Content-Type": "application/json",
//             "X-CSRFToken": csrfToken,
//           },
//           body: JSON.stringify({ email: organizationName }),
//         }
//       );

//       const data = await response.json();
//       console.log(data);

//       if (response.ok) {
//         logToServer("info", "Organization added successfully");
//         toast.success("Organization added successfully");
//         setOrgModalIsOpen(false);
//       } else {
//         toast.error(data.error || "Failed to add organization");
//       }
//     } catch (error) {
//       toast.error("An unexpected error occurred");
//       logToServer("eroor", `${error}`);
//       console.error("Error adding organization:", error);
//     }
//   };


// async function ChangePlan(event) {
//     event.preventDefault();
//     const planData =
//       userInfo.org_name !== "global"
//         ? {
//             org_plan: org_plan,
//           }
//         : {
//             org_name: org_name,
//             org_web: org_web,
//             org_add: org_add,
//             org_plan: org_plan,
//           };
//     await fetch(`${HOST}/change-plan/${userInfo.id}`, {
//       method: "POST",
//       credentials: "include",
//       body: JSON.stringify(planData),
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//         "X-CSRFToken": await getCsrfToken(),
//       },
//     })
//       .then((response) => {
//         if (response.ok) {
//           alert("Plan updated Successfully. Please Refresh to see the changes");
//           toast.success("Plan updated Successfully");
//           logToServer("info", "Plan update successfully");
//           window.location.reload();
//           return;
//         } else {
//           throw new Error("Failed to update Plan");
//         }
//       })
//       .catch((error) => {
//         logToServer("error", `${error}`);
//       });
//   }


{
  /* 
                        {!userInfo.is_admin && userInfo.org_name === "global" && (
                            <button className="updt-btn" onClick={() => setOrgModalIsOpen(true)}>Add Organization</button>
                        )} */

  {
    /* {(userInfo.is_admin || !userInfo.plan) && (
                            <button className="updt-btn" onClick={() => setPlanModal(true)}>Change Plan</button>
                        )}  */
  }
}

{
  // <Modal
  //           isOpen={planModal}
  //           contentLabel="Add Plan Modal"
  //           className="col-lg-3 col-sm-2 custom-modal"
  //         >
  //           <div className="user-modal-header">
  //             <i
  //               className="fa-solid fa-xmark cancel"
  //               onClick={() => setPlanModal(false)}
  //             ></i>
  //           </div>
  //           {!userInfo.plan && (
  //             <div className="col-lg-12 col-md-6 col-sm-10 mt-2">
  //               <input
  //                 type="text"
  //                 value={org_name}
  //                 onChange={(e) => setorg_name(e.target.value)}
  //                 placeholder="Enter Organization Name"
  //                 className="form-control"
  //                 required
  //               />
  //               <input
  //                 type="text"
  //                 value={org_web}
  //                 onChange={(e) => setorg_web(e.target.value)}
  //                 placeholder="Enter Organization Website"
  //                 className="mt-2 form-control"
  //                 required
  //               />
  //               <input
  //                 type="text"
  //                 value={org_add}
  //                 onChange={(e) => setorg_add(e.target.value)}
  //                 placeholder="Enter Organization Address"
  //                 className="mt-2 form-control"
  //                 required
  //               />
  //             </div>
  //           )}
  //           <div className="col-lg-12 col-md-6 col-sm-10 mt-2">
  //             <select
  //               name="org_plan"
  //               value={org_plan}
  //               onChange={(e) => setorg_plan(e.target.value)}
  //               required
  //               style={{
  //                 fontSize: "15px",
  //                 width: "100%",
  //                 padding: "5px 12px",
  //                 borderRadius: "4px",
  //                 outline: "none",
  //                 cursor: "pointer",
  //                 boxSizing: "border-box",
  //                 marginRight: "8px",
  //               }}
  //             >
  //               <option value="" disabled>
  //                 Select Plan
  //               </option>
  //               <option value={1} disabled={userInfo.plan === 1}>
  //                 Basic
  //               </option>
  //               <option value={2} disabled={userInfo.plan === 2}>
  //                 Advanced
  //               </option>
  //               <option value={3} disabled={userInfo.plan === 3}>
  //                 Enterprise
  //               </option>
  //             </select>
  //           </div>
  //           <div className="modal-footer">
  //             <button
  //               type="submit"
  //               onClick={(e) => ChangePlan(e)}
  //               className="mt-2 btn-add"
  //             >
  //               Save
  //             </button>
  //           </div>
  //           <button type="button" className="mt-3 cancel" onClick={() => setPlanModal(false)}>Close</button>
  //         </Modal>
  /* <Modal
                                  isOpen={orgModalIsOpen}
                                  contentLabel="Add Organization Modal"
                                  className="col-lg-3 col-sm-2 custom-modal"
                                >
                                  <div className="user-modal-header">
                                    <i
                                      className="fa-solid fa-xmark cancel"
                                      onClick={() => setProfileModalIsOpen(false)}
                                    ></i>
                                  </div>
                        
                                  <form
                                    className="col-lg-12 col-md-6 col-sm-10"
                                    onSubmit={handleAddOrganization}
                                  >
                                    <div className="form-group">
                                      <input
                                        type="text"
                                        value={organizationName}
                                        onChange={(e) => setOrganizationName(e.target.value)}
                                        placeholder="Enter Organization Email"
                                        className="form-control"
                                        required
                                      />
                                    </div>
                                    <div className="modal-footer">
                                      <button type="submit" className="mt-3 add-btn">
                                        Save
                                      </button>
                                    </div>
                                  </form>
                                </Modal> */
}


// * ManageOrg * //
//  setDeleteSuccess(true); in handleDeleteOrg func
//  setUpdateSuccess(true); in handleUpdateOrg func
//   const navigate = useNavigate();
 // setOrganizations(data); in fetch org func
     // const formDataObject = {};
    // formData.forEach((value, key) => {
    //   formDataObject[key] = value;
    // });
    
    //  'Content-Type': 'application/x-www-form-urlencoded',

    {/* <button className='mt-4 btn-add' style={{ marginLeft: '47%' }} onClick={handleUpdateOrg}>Update</button> */}
                      {/* <button type="submit" className='mt-3 cancel' onClick={() => {
                        setModalIsOpen(false);
                        setIsUpdate(false);
                      }}>Close</button> */}