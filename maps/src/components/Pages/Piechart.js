import React, { useEffect } from 'react';

export default function Piechart() {
    useEffect(() => {
        // Pie chart data
        const pieXValues = ["Label1", "Label2", "Labe3", "Label4", "Label5"];
        const pieYValues = [5, 49, 44, 24, 15];
        var barColors = [
            "#78c2ad",
          "#4594a3",
          "#115c83",
          "#547980",
          "#002e3c"
        ];



        // Line chart data
        const lineXValues = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
        const lineYValues = [7, 8, 8, 9, 9, 9, 10, 11, 14, 14, 15];

        // Initialize pie chart
        const pieCtx = document.getElementById('myChart');
        new window.Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: pieXValues,
                datasets: [{
                    backgroundColor: barColors,
                    borderColor: '#333333',
                    borderWidth: 2,
                    data: pieYValues
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                    }
                }
            }
        });

        // Initialize line chart
        const lineCtx = document.getElementById('myLineChart');
        new window.Chart(lineCtx, {
            type: 'line',
            data: {
                labels: lineXValues,
                datasets: [{
                    fill: false,
                    lineTension: 0,
                    backgroundColor: "#4594a3",
                    borderColor: "#11111",
                    data: lineYValues
                }]
            },
            options: {
                legend: { display: true },
                scales: {
                    yAxes: [{
                        ticks: { min: 6, max: 16, stepSize: 2 },
                        gridLines: { color: 'rgba(255, 255, 255, 0.3)' }
                    }],
                    xAxes: [{
                        gridLines: 'none' // Set color of vertical grid lines to white
                    }]
                }
            }
        });
    }, []); // Empty dependency array ensures this effect runs only once after the initial render

    return (
        <>
        <div style={{ display: 'flex' }}>
            <canvas id="myChart" style={{ width:'100%',maxWidth:'700px', marginRight:'1%'}}></canvas>
            <canvas id="myLineChart" style={{ width:'100%',maxWidth:'700px'}}></canvas>
        </div>
        </>
    );
}