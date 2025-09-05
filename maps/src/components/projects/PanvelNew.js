import React, { useContext, useEffect, useState } from "react";
import "./panvel.css";
import { useLayerFunc } from "../Main/layerFunc";
import { GlobalContext } from "../../App";

function PanvelNew() {
  const { LayerChange, TileLayerChange, handleOpen } = useLayerFunc();
  const { SetLogout } = useContext(GlobalContext);
  // const LayerWorker = wrap(new Worker('./layerWorker.js'));

  useEffect(() => {
    SetLogout(true);
  }, []);

  return (
    <>
      <details
        className="baseline"
        onToggle={() => handleOpen("Panvel_Boundary")}
      >
        <summary>Panvel 2025</summary>
        <div className="baseline-cont">
          <div className="opt-div">
            <input
              value="Panvel_Boundary"
              id="Panvel_Boundary"
              onChange={(e) =>
                LayerChange(e.target.value, e.target.id, e.target.checked, true)
              }
              className="form-check-input check-map"
              type="checkbox"
            />
            <label>Boundary</label>
          </div>
          <details id="townD">
            <summary className="townS">Baseline</summary>
            <div className="town-cont">
              {/* <div className="opt-div">
              <input value="Panvel_CIDCO" id="CIDCO" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
              <label>CIDCO</label>
            </div> */}

              <div className="opt-div">
                <input
                  value="Total_Builtup_Jan_2023"
                  id="Total_Builtup_Jan_2023"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(
                      e.target.value,
                      e.target.id,
                      e.target.checked,
                      false,
                      true
                    )
                  }
                />
                <label>Total Builtup Jan 2023</label>
              </div>

              <div className="opt-div">
                <input
                  value="Panvel_Road"
                  id="Road"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                />
                <label>Road</label>
              </div>
              <div className="opt-div">
                <input
                  value="Panvel_Railways"
                  id="Railway"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                />
                <label>Railways</label>
              </div>
              {/* <div className="opt-div">
                <input
                  value="Panvel_Total_Builtup"
                  id="Total Builtup"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                />
                <label>Total Builtup</label>
              </div> */}
              <div className="opt-div">
                <input
                  value="Panvel_Tree"
                  id="Tree"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(e.target.value, e.target.id, e.target.checked)
                  }
                />
                <label>Tree</label>
              </div>
              <div className="opt-div">
                <input
                  value="Panvel_Water"
                  id="Waterbody"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(
                      e.target.value,
                      e.target.id,
                      e.target.checked,
                      false,
                      true
                    )
                  }
                />
                <label>Waterbody</label>
              </div>
              <div className="opt-div">
                <input
                  value="Panvel_Mangrove"
                  id="Mangrove"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(
                      e.target.value,
                      e.target.id,
                      e.target.checked,
                      false,
                      true
                    )
                  }
                />
                <label>Mangrove</label>
              </div>
              {/* <div className="opt-div">
              <input value="Panvel_May_2025_Change" id="Mangrove" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked, false, true)} />
              <label>May 2025 Change</label>
            </div>
            <div className="opt-div">
              <input value="Panvel_Total_Builtup_Jan_2023" id="Mangrove" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked, false, true)} />
              <label>January 2023 Total Builtup</label>
            </div>            */}
            </div>

            <details id="townD">
              <summary className="townS">Town Planning</summary>
              <div className="town-cont">
                {/* <div className="opt-div">
                  <input
                    value="Panvel_2025_division"
                    id="Panvel_division"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Division</label>
                </div> */}

                <details id="townD">
                  <summary className="townS">Divisions</summary>
                  <div className="town-cont">
                    <div className="opt-div">
                      <input
                        value="Panvel_2025_Division1"
                        id="Panvel_2025_Division1"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division 1</label>
                    </div>

                    <div className="opt-div">
                      <input
                        value="Panvel_2025_Division2"
                        id="Panvel_2025_Division2"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division 2</label>
                    </div>

                    <div className="opt-div">
                      <input
                        value="Panvel_2025_Division3"
                        id="Panvel_2025_Division3"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division 3</label>
                    </div>

                    <div className="opt-div">
                      <input
                        value="Panvel_2025_Division4"
                        id="Panvel_2025_Division4"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division 4</label>
                    </div>
                  </div>
                </details>

                <div className="opt-div mt-2">
                  <input
                    value="NodalPlot"
                    id="NodalPlot"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Nodal Plot</label>
                </div>

                <div className="opt-div">
                  <input
                    value="Nodal_Sector"
                    id="Nodal_Sector"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Nodal Sector</label>
                </div>

                <div className="opt-div">
                  <input
                    value="Panvel_CIDCO_Jurisdiction"
                    id="Panvel_CIDCO_Jurisdiction"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Panvel CIDCO Jurisdiction</label>
                </div>

                <div className="opt-div">
                  <input
                    value="Panvel_2025_prabhag"
                    id="Panvel_2025_prabhag"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Prabhag</label>
                </div>

                <div className="opt-div">
                  <input
                    value="Village-Boundary"
                    id="Village-Boundary"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Village Boundary</label>
                </div>

                <div className="opt-div">
                  <input
                    value="Panvel_Village_Survey"
                    id="Panvel_Village_Survey"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Village Survey</label>
                </div>

                <div className="opt-div">
                  <input
                    value="Panvel_2025_jusridiction"
                    id="Panvel_2025_jusridiction"
                    className="form-check-input check-map"
                    type="checkbox"
                    onChange={(e) =>
                      LayerChange(
                        e.target.value,
                        e.target.id,
                        e.target.checked,
                        false,
                        true
                      )
                    }
                  />
                  <label>Panvel Jusridiction</label>
                </div>
              </div>
            </details>
          </details>

          <details id="townD">
            <summary className="townS">Builtup Change</summary>
            <div className="town-cont">
              <details id="townD">
                <summary className="townS">Building Permission</summary>
                <div className="town-cont">
 
                  <div className="opt-div mt">
                    <input
                      value="Panvel_2025_Authorised"
                      id="Panvel_2025_Authorised"
                      className="form-check-input check-map"
                      type="checkbox"
                      onChange={(e) =>
                        LayerChange(
                          e.target.value,
                          e.target.id,
                          e.target.checked,
                          false,
                          true
                        )
                      }
                    />
                    <label>Authorised</label>
                  </div>

                  <div className="opt-div">
                    <input
                      value="Unauthorised"
                      id="Unauthorised"
                      className="form-check-input check-map"
                      type="checkbox"
                      onChange={(e) =>
                        LayerChange(
                          e.target.value,
                          e.target.id,
                          e.target.checked,
                          false,
                          true
                        )
                      }
                    />
                    <label>Unauthorised</label>
                  </div>

                  <div className="opt-div">
                    <input
                      value="Pending"
                      id="Pending"
                      className="form-check-input check-map"
                      type="checkbox"
                      onChange={(e) =>
                        LayerChange(
                          e.target.value,
                          e.target.id,
                          e.target.checked,
                          false,
                          true
                        )
                      }
                    />
                    <label>Pending</label>
                  </div>

                  <div className="opt-div">
                    <input
                      value="Shed"
                      id="Shed"
                      className="form-check-input check-map"
                      type="checkbox"
                      onChange={(e) =>
                        LayerChange(
                          e.target.value,
                          e.target.id,
                          e.target.checked,
                          false,
                          true
                        )
                      }
                    />
                    <label>Shed</label>
                  </div>

                  <div className="opt-div">
                    <input
                      value="Other_Authority"
                      id="Other_Authority"
                      className="form-check-input check-map"
                      type="checkbox"
                      onChange={(e) =>
                        LayerChange(
                          e.target.value,
                          e.target.id,
                          e.target.checked,
                          false,
                          true
                        )
                      }
                    />
                    <label>Other Authority</label>
                  </div>

                  <details id="townD">
                    <summary className="townS">
                      Divisionwise Unauthorised
                    </summary>
                    <div className="opt-div">
                      <input
                        value="Unauthorised_Division_1"
                        id="Unauthorised_Division_1"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Unauthorised Division1</label>
                    </div>
                    <div className="opt-div">
                      <input
                        value="Unauthorised_Division_2"
                        id="Unauthorised_Division_2"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Unauthorised Division2</label>
                    </div>
                    <div className="opt-div">
                      <input
                        value="Unauthorised_Division_3"
                        id="Unauthorised_Division_3"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Unauthorised Division3</label>
                    </div>
                    <div className="opt-div">
                      <input
                        value="Unauthorised_Division_4"
                        id="Unauthorised_Division_4"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Unauthorised Division4</label>
                    </div>
                  </details>

                  <details id="townD">
                    <summary className="townS">
                      Divisionwise Sheds
                    </summary>
                    <div className="opt-div">
                      <input
                        value="Shed_Division_1"
                        id="Shed_Division_1"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division1 sheds</label>
                    </div>
                      <div className="opt-div">
                      <input
                        value="Shed_Division_2"
                        id="Shed_Division_2"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division2 sheds</label>
                    </div>
                      <div className="opt-div">
                      <input
                        value="Shed_Division_3"
                        id="Shed_Division_3"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division3 sheds</label>
                    </div>
                      <div className="opt-div">
                      <input
                        value="Shed_Division_4"
                        id="Shed_Division_4"
                        className="form-check-input check-map"
                        type="checkbox"
                        onChange={(e) =>
                          LayerChange(
                            e.target.value,
                            e.target.id,
                            e.target.checked,
                            false,
                            true
                          )
                        }
                      />
                      <label>Division4 sheds</label>
                    </div>
                  </details>

                </div>
              </details>

              {/* <div className="opt-div mt-2">
                <input value="Panvel_Builtup_Change_Combined" id="Panvel_Builtup_Change_Combined" className="form-check-input check-map" type="checkbox" onChange={(e) => LayerChange(e.target.value,e.target.id,e.target.checked)} />
                <label>Panvel Builtup Change Combined</label>
              </div> */}

              {/* <div className="opt-div">
                <input
                  value="Total_Builtup_Jan_2023"
                  id="Total_Builtup_Jan_2023"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(
                      e.target.value,
                      e.target.id,
                      e.target.checked,
                      false,
                      true
                    )
                  }
                />
                <label>Total Builtup Jan 2023</label>
              </div> */}

              <div className="opt-div">
                <input
                  value="May_2025_Builtup_Change"
                  id="May_2025_Builtup_Change"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(
                      e.target.value,
                      e.target.id,
                      e.target.checked,
                      false,
                      true
                    )
                  }
                />
                <label>May 2025 Builtup Change</label>
              </div>

              <div className="opt-div">
                <input
                  value="CIDCO_MIDC_Buildings"
                  id="CIDCO_MIDC_Buildings"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(
                      e.target.value,
                      e.target.id,
                      e.target.checked,
                      false,
                      true
                    )
                  }
                />
                <label>CIDCO MIDC Buildings</label>
              </div>

              <div className="opt-div">
                <input
                  value="Panvel_2025_Buildings_New"
                  id="Panvel_2025_Buildings_New"
                  className="form-check-input check-map"
                  type="checkbox"
                  onChange={(e) =>
                    LayerChange(
                      e.target.value,
                      e.target.id,
                      e.target.checked,
                      false,
                      true
                    )
                  }
                />
                <label>Panvel Buildings</label>
              </div>
            </div>
          </details>

          <details id="townD">
            <summary className="townS">Images</summary>
            <div className="town-cont">
               <div className="opt-div mb-2">
                <input
                  value="Nov_2021"
                  id="Panvel_Boundary"
                  onChange={(e) =>
                    TileLayerChange(
                      e.target.value,
                      e.target.id,
                      "March 2025",
                      e.target.checked
                    )
                  }
                  className="form-check-input check-map"
                  type="checkbox"
                />
                <label>Nov 2021</label>
              </div>
              <div className="opt-div mb-2">
                <input
                  value="March_2025"
                  id="Panvel_Boundary"
                  onChange={(e) =>
                    TileLayerChange(
                      e.target.value,
                      e.target.id,
                      "March 2025",
                      e.target.checked
                    )
                  }
                  className="form-check-input check-map"
                  type="checkbox"
                />
                <label>March 2025</label>
              </div>
            </div>
          </details>
        </div>
      </details>
      {/* upload_980e32_Ring road_River,cannal passing */}
    </>
  );
}

export default PanvelNew;
