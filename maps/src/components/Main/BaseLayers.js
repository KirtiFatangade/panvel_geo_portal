import L from "leaflet"
import files from "../static"
// export const baseLayers = {
//     '<img src="${files}hybrid.jpeg" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: 12px;">&nbsp;&nbsp;Hybrid</b></n>': null,
//     '<img src="${files}sat.jpeg" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;Google Satellite</b></n>':L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
//         maxZoom: 20,
//         subdomains:['mt0','mt1','mt2','mt3'],
//         zIndex:1000
//     }),
//     '<img src="${files}street.png" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Google Street</b></n>':L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
//         maxZoom: 20,
//         subdomains:['mt0','mt1','mt2','mt3'],
//         zIndex:1000
//     }),
//     '<img src="${files}terrain.jpeg" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Google Terrain</b></n>':L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',{
//         maxZoom: 20,
//         subdomains:['mt0','mt1','mt2','mt3'],
//         zIndex:1000
//     }),
//     '<img src="${files}osm.png" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OpenStreetMap</b></n>': L.tileLayer(
//         "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
//         {
//             attribution:
//                 '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//                 zIndex:1000
//         },
//     ),
//     '<img src="${files}osmtopo.png" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OpenStreetTopoMap</b></n>': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
//         maxZoom: 20,
//         attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
//         zIndex:1000
//     }),
//     '<img src="${files}osmhot.png" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OpenStreetHOTMap</b></n>': L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//         maxZoom: 20,
//         attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
//         zIndex:1000
//     }),

//     '<img src="${files}pioneer.png" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TopoSheet</b></n>': L.tileLayer('https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey={apikey}', {
//         attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//         apikey: 'db5ae1f5778a448ca662554581f283c5',
//         maxZoom: 20,
//         zIndex:1000
//     }),

//     '<img src="${files}jdark.png" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dark</b></n>':L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
//         attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//         minZoom: 0,
//         maxZoom: 22,
//         accessToken: 'r9WFxneak45Y0hUj9TMfgTqznMH57ymHXfPvNnyNhjil8miYDvYHngiCpGBgesiw'
//     }),
//     '<img src="mat.png" style="width: 20%;margin-bottom: 10px; border-radius: 20%" /><b style="font-size: medium;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Roads</b></n>': L.tileLayer('https://tile.jawg.io/jawg-matrix/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
//         attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//         minZoom: 0,
//         maxZoom: 20,
//         accessToken: 'r9WFxneak45Y0hUj9TMfgTqznMH57ymHXfPvNnyNhjil8miYDvYHngiCpGBgesiw',
//         zIndex:1000
//     })
// }
let baseLayers = {}

baseLayers[
    `<img src="${process.env.PUBLIC_URL}/${files}hybrid.jpeg" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" />
    <b style="color:white;font-size: 12px;">&nbsp;Hybrid
    </b>
    /n>`] = null;
baseLayers[
    `<img src="${process.env.PUBLIC_URL}/${files}sat.jpeg" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" />
    <b style="color:white;font-size: 12px;">
    &nbsp;Google Satellite</b>
    </n>`
] = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    zIndex: 1000
})
baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}street.png" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;Google Street</b></n>`] = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    zIndex: 1000
})

baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}terrain.jpeg" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;Google Terrain</b></n>`] = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    zIndex: 1000
})
baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}osm.png" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;OpenStreetMap</b></n>`] = L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        zIndex: 1000
    },
)

baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}osmtopo.png" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;OpenStreetTopoMap</b></n>`]=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            zIndex:1000
        })


baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}osmhot.png" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;OpenStreetHOTMap</b></n>`]=L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
            zIndex:1000
        })

baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}pioneer.png" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;TopoSheet`]=L.tileLayer('https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey={apikey}', {
            attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            apikey: 'db5ae1f5778a448ca662554581f283c5',
            maxZoom: 20,
            zIndex:1000
        })

baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}jdark.png" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;Dark</b></n>`]=L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
            attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            minZoom: 0,
            maxZoom: 22,
            accessToken: 'r9WFxneak45Y0hUj9TMfgTqznMH57ymHXfPvNnyNhjil8miYDvYHngiCpGBgesiw'
        })

baseLayers[`<img src="${process.env.PUBLIC_URL}/${files}mat.png" style="width: 20%;margin-left: 2px; margin-bottom: 10px; border-radius: 20%" /><b style="color:white;font-size: 12px;">&nbsp;Roads</b></n>`]=L.tileLayer('https://tile.jawg.io/jawg-matrix/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
            attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            minZoom: 0,
            maxZoom: 20,
            accessToken: 'r9WFxneak45Y0hUj9TMfgTqznMH57ymHXfPvNnyNhjil8miYDvYHngiCpGBgesiw',
            zIndex:1000
        })


export default baseLayers;