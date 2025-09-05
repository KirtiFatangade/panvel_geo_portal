import React, { useEffect, useState, useContext } from "react";
import { GlobalContext } from "../../App";
import Modal from 'react-modal';
import SelecAtt from "./SelectAtt";
const CsvToHtmlTable = ({
    data,
    csvDelimiter,
    hasHeader,
    tableClassName,
    tableRowClassName,
    tableColumnClassName,
    rowKey,
    colKey,
    renderCell,
    name,
    maxHeight
}) => {
    const { Canvas } = useContext(GlobalContext)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [select, setSelect] = useState(false)
    function parseCsvToRowsAndColumn(csvText, csvColumnDelimiter = '\t') {
        const rows = csvText.split('\n');
        if (!rows || rows.length === 0) {
            return [];
        }
        return rows.map(row => parseRow(row, csvColumnDelimiter));
    }

    function parseRow(row, csvColumnDelimiter) {
        let cells = [];
        let currentCell = '';
        let quotedMode = false;

        for (let i = 0; i < row.length; i++) {
            const prevChar = i === 0 ? '' : row.charAt(i - 1);
            const currentChar = row.charAt(i);

            if (quotedMode) {
                if (currentChar === '"') {
                    quotedMode = false;
                } else {
                    currentCell += currentChar;
                }
            } else {
                if (currentChar === csvColumnDelimiter) {
                    cells.push(convertToNumberIfPossible(currentCell));
                    currentCell = '';
                } else if (currentChar === '"') {
                    quotedMode = true;
                    if (prevChar === '"') {
                        currentCell += '"';
                    }
                } else {
                    currentCell += currentChar;
                }
            }
        }
        // Push the last cell after the loop ends
        cells.push(convertToNumberIfPossible(currentCell));
        return cells;
    }

    // Helper function to convert a string to a number if possible
    function convertToNumberIfPossible(value) {
        if (!isNaN(value) && value.trim() !== '') {
            return parseFloat(value);
        }
        return value;
    }


    const rowsWithColumns = parseCsvToRowsAndColumn(data.trim(), csvDelimiter);

    let headerRow = undefined;
    if (hasHeader) {
        headerRow = rowsWithColumns.splice(0, 1)[0];
    }

    const sortedRows = React.useMemo(() => {
        if (sortConfig.key !== null) {
            return [...rowsWithColumns].sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return rowsWithColumns;
    }, [rowsWithColumns, sortConfig]);

    const handleSort = (columnIndex) => {
        let direction = 'ascending';
        if (sortConfig.key === columnIndex && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key: columnIndex, direction });
    };

    const handleRowClick = (rowIdx) => {
        const selectedRowIdentifier = sortedRows[rowIdx][0]; // Using first column as unique identifier (adjust if needed)

        setSelectedRows(prevSelectedRows => {
            const newSelectedRows = new Set(prevSelectedRows);
            if (newSelectedRows.has(selectedRowIdentifier)) {
                newSelectedRows.delete(selectedRowIdentifier);
            } else {
                newSelectedRows.add(selectedRowIdentifier);
            }
            return newSelectedRows;
        });
    };
    useEffect(() => {
        if (Canvas) {

            Canvas.HighlightFeatures(name, selectedRows)
        }

    }, [selectedRows])

    const renderTableHeader = (row) => {
        if (row && row.map) {
            return (
                <thead className="tabs-header" style={{border: '1px solid #161616'}}>
                    <tr className="tabs-header"style={{border: '1px solid #161616'}} >
                        {row.map((column, i) => (
                            <th
                                key={`header-${i}`}
                                onClick={() => handleSort(i)}
                                style={{  border: '1px solid #161616', cursor: 'pointer' }}
                            >
                                {column}
                                {sortConfig.key === i && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                            </th>
                        ))}
                    </tr>
                </thead>
            );
        }
    };

    const renderTableBody = (rows) => {
        if (rows && rows.map) {
            return (
                <tbody>
                    {rows.map((row, rowIdx) => (
                        <tr
                            className={`${tableRowClassName} ${selectedRows.has(row[0]) ? 'selected-row' : ''}`}
                            key={typeof (rowKey) === 'function' ? rowKey(row, rowIdx) : rowIdx}
                            onClick={() => handleRowClick(rowIdx)}
                            style={{ cursor: 'pointer' }}
                        >
                            {row.map && row.map((column, colIdx) => (
                                <td
                                    className={tableColumnClassName}
                                    style={{
                                        border: '1px solid #161616',
                                    }}
                                    key={typeof (rowKey) === 'function' ? colKey(row, colIdx, rowIdx) : column[colKey]}
                                >
                                    {typeof renderCell === "function" ? renderCell(column, colIdx, rowIdx) : column}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            );
        }
    };

    return (
        <>
            <button
                style={{
                    borderRadius: '5px',
                    cursor: 'pointer',
                    width: "100px",
                    marginLeft: "30px"
                }}
                className="add-btn"
                onClick={() => setSelect(!select)}
            >
                Select
            </button>
            <div
                style={{
                    overflowY: 'auto',
                    height: `${maxHeight}px`,
                    marginTop: '30px',
                   border: '1px solid rgb(219, 219, 219)'
                }}
            >
                <table className={`csv-html-table ${tableClassName}`} style={{ border: '1px solid #161616', borderCollapse: 'collapse', width: '100%' }}>
                    {renderTableHeader(headerRow)}
                    {renderTableBody(sortedRows)}
                </table>
            </div>

            <Modal isOpen={select}
                onRequestClose={() => setSelect(false)}
                style={{
                    overlay: {
                        zIndex: 3000,
                    },
                    content: {
                        top: '50%',
                        left: '50%',
                        right: 'auto',
                        bottom: 'auto',
                        marginRight: '-50%',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0px 0px 14px 1px #383838'
                    }
                }}
            >
                <div className="user-modal-header" style={{ margin: '0px 0px 10px 0px' }}>
                    <i className="fa-solid fa-xmark cancel" style={{ margin: '0px' }} onClick={() => setSelect(false)}>
                    </i>
                </div>

            
                    <SelecAtt setSelect={setSelect} name={name} rows={[headerRow, ...rowsWithColumns]} selectedRows={selectedRows} setSelectedRows={setSelectedRows} />
                
            </Modal>

        </>
    );
};

CsvToHtmlTable.defaultProps = {
    data: '',
    rowKey: (row, rowIdx) => `row-${rowIdx}`,
    colKey: (col, colIdx, rowIdx) => `col-${colIdx}`,
    hasHeader: true,
    csvDelimiter: '\t',
    tableClassName: '',
    tableRowClassName: '',
    tableColumnClassName: '',
};

export default CsvToHtmlTable;
