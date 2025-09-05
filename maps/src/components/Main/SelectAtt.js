import React, { useContext, useState } from "react";
import { GlobalContext } from "../../App";

const SelecAtt = ({ setSelect, name, rows, selectedRows, setSelectedRows }) => {
    const [Query, setQuery] = useState("");
    const [FilLayer, setFilLayer] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]); // Added state for filtered rows
    const { Canvas } = useContext(GlobalContext);
    console.log(name);

    const addQuery = (newQuery) => {
        const updatedQuery = Query + " " + newQuery;
        setQuery(updatedQuery); // Update query state
    };

    const removeLayer = (id) => {
        setFilLayer(FilLayer.filter(layer => layer[0] !== id));
    };

    // Function to filter rows based on the query
    const filterRows = (rows, query) => {
        if (!query) return new Set(rows.map(row => row[0])); // If no query, return a Set of all first values of each row

        const [columnName, operator, value] = parseQuery(query);

        return new Set(
            rows
                .filter(row => {
                    const columnIndex = rows[0].indexOf(columnName); // Assuming the first row is the header
                    if (columnIndex === -1) return false; // If the column does not exist in the header

                    const cellValue = row[columnIndex];
                    return applyCondition(cellValue, operator, value);
                })
                .map(row => row[0]) // Only return the first column value of the filtered rows
        );
    };

    // Function to parse the query into its components: column name, operator, and value
    const parseQuery = (query) => {
        const parts = query.split(" ").filter(Boolean);
        if (parts.length < 3) return []; // Invalid query

        return [parts[0], parts[1], parts[2]]; // [columnName, operator, value]
    };

    // Function to apply condition based on operator
    const applyCondition = (cellValue, operator, value) => {
        if (operator === ">") return cellValue > value;
        if (operator === "<") return cellValue < value;
        if (operator === "=") return cellValue == value;
        if (operator === "!=") return cellValue != value;
        if (operator === "AND") return cellValue && value; // simple case for AND
        if (operator === "OR") return cellValue || value;  // simple case for OR
        return false;
    };

    // Handle the "Apply Filter" button click
    const handleApplyFilter = () => {
        const filtered = filterRows(rows, Query);
        setSelectedRows(filtered)// Update filtered rows
        setSelect(false)
    };

    return (
        <div style={{ zIndex: 3000, border: 'none'}}>
            <div className="modal-content" style={{ border: 'none' }}>
                <div style={{ display: "flex", flexDirection: "row" }}>
                    <div style={{ margin: "10px" }}>
                        <p style={{ textAlign: "left" }}>Layer Attributes</p>
                        <select className='form-select' style={{ fontSize: '15px' }} onChange={(e) => addQuery(e.target.value)}>
                            <option key="" value="">Select Attribute</option>
                            {Canvas && Canvas.getProps(Canvas.GetLayerName(name), false).map((key) => (
                                <option key={key} value={key}>{key}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ margin: "10px", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: '0px 10px 15px', fontSize: '15px' }}>
                            <input id="bbox" type="checkbox" /> Box Filter
                        </div>
                        <div>
                            <input
                                placeholder="Query"
                                value={Query}
                                id="query"
                                onChange={(e) => setQuery(e.target.value)}
                                className="form-control"
                                style={{ overflowX: "scroll", fontSize: '15px', border:'1px solid #ced4da' }}
                            />
                        </div>
                        {/* <div style={{ display: "grid", gridTemplateColumns: "auto auto", gridGap: "10px", padding: "10px" }}> */}
                        {/* <div style={{ display: "flex", flexDirection: "row", gap: "10px", padding: "10px" }}> 
                            <button onClick={() => addQuery(">")}>{">"}</button>
                            <button onClick={() => addQuery("<")}>{"<"}</button>
                            <button onClick={() => addQuery("=")}>{"="}</button>
                            <button onClick={() => addQuery("!=")}>{"!="}</button>
                            <button onClick={() => addQuery("AND")}>{"AND"}</button>
                            <button onClick={() => addQuery("OR")}>{"OR"}</button>
                        </div>
                        <div style={{ alignSelf: "center" }}>
                            <button onClick={handleApplyFilter}>Apply Filter</button>
                        </div> */}
                    </div>

                </div>
                {/* <div style={{ display: "grid", gridTemplateColumns: "auto auto", gridGap: "10px", padding: "10px" }}> */}
                <div style={{ display: "flex", flexDirection: "row", gap: "10px", padding: "10px", justifyContent:'center' }}>
                    <button onClick={() => addQuery(">")}>{">"}</button>
                    <button onClick={() => addQuery("<")}>{"<"}</button>
                    <button onClick={() => addQuery("=")}>{"="}</button>
                    <button onClick={() => addQuery("!=")}>{"!="}</button>
                    <button onClick={() => addQuery("AND")}>{"AND"}</button>
                    <button onClick={() => addQuery("OR")}>{"OR"}</button>
                </div>
                <div style={{ alignSelf: "center" }}>
                    <button onClick={handleApplyFilter}>Apply Filter</button>
                </div>
                {/* Render filtered rows or apply further UI changes */}

            </div>
        </div>
    );
};

export default SelecAtt;
