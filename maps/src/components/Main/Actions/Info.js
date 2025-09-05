const datasetInfoDictionary = {
    "10m Satellite data (Sentinel 2)": `Sentinel 2 mission acquires optical imagery at the highest spatial resolution of 10 m over land and coastal waters. 
    It has a 290 km swath with a Temporal resolution of 5 days and Spectral resolution of 13 bands.
    (Band 1- Coastal Aerosol, Band 2- Blue, Band 3- Green, Band 4- Red, Band 5 to Band 7 - Visible and near-infrared (VNIR), 
    Band 8- NIR, Band 8A- Narrow NIR, Band 9 to Band 21 (Shortwave infrared - SWIR).
    Here, we can select a day and accordingly receive the satellite data of the area. 
    Also, on clicking ‘+’ sign in front of “Advanced parameters,” we can select data of specific bands (band 1 to band 7 are present) 
    and even calculate indices by selecting the bands in correspondence to the formula.`,

    "30m Satellite data (Landsat 8)": `Landsat 8 gives a spatial resolution of 30 m(land). It has a 185 km swath with a Temporal resolution of 16 days and Spectral Resolution of 9 bands 
    (band 1- Coastal Aerosol, band 2- Blue, band 3- Green, band 4- Red, band 5- NIR, band 6 and band 7- SWIR, band 8- Panchromatic, band 9- Cirrus) 
    for land and 2 for Thermal infrared.
    Here, we can select a day and accordingly receive the satellite data of the area. 
    Also, on clicking ‘+’ sign in front of “Advanced parameters,” we can select data of speci fic bands (band 1 to band 12 are present) 
    and even calculate indices by selecting the bands in correspondence to the formula.`,

    "90m Digital Elevation Satellite data (SRTM)": `The NASA-produced SRTM (Shuttle Radar Topography Mission) digital elevation data is a significant advancement in digital mapping of the globe and offers high-quality elevation data that is more easily accessible. The SRTM has spatial resolution of 90 m.`,

    "Atmospheric Methane Concentration (Sentinel 5p)": `Sentinel-5 Precursor is the first mission of the Copernicus Programme dedicated to monitoring air pollution. 
    It gives global spatial coverage with a spatial resolution of 5.5 km x 3.5 km. The unit for the pixel here is Unit Mol Fraction.`,

    "Synthetic Aperture Radar - Sentinel 1": `This data provides a collection of radar data in all-weather, day or night. It has a spatial resolution of 10 m and a swath of 410 km. It has a temporal resolution of 6 days.`,

    "MODIS RGB": `MODIS (Moderate Resolution Imaging Spectroradiometer) is a satellite-based sensor that measures the Earth's climate and terrain.  It acquires data at three spatial resolutions: 250 m, 500 m, and 1,000 m. The MODIS True Color band composition is bands 1, 4, and 3, which represent red, green, and blue respectively. It has a temporal resolution of 24 to 48 hours (1 to 2 days).`,

    "Germany High-Res Image (20cm)": `Here datasets show us the high resolution image of Germany with the max resolution of 20 cm.`,

    "Landsat 1972_to_1983": `These include satellite data of the first Multispectral satellite sensors launched which include data from Landsat 1 and Landsat 2 and more. It collected earth's surface images.
    Both Landsat 1 and Landsat 2 have a spatial resolution of 80 m and Spectral resolution  of 4 bands {Band 4 Visible green (0.5 to 0.6 µm), Band 5 Visible red (0.6 to 0.7 µm), Band 6 Near-Infrared (0.7 to 0.8 µm) and Band 7 Near-Infrared (0.8 to 1.1 µm)} .
    Here we can select Data of any time period ranging in the years 1972 to 1983.`,

    "Forest Fire Visualization (SWIR)": `Short-wave Infrared (SWIR) band from Sentinel-2 dataset reveals the actual fire location. It turns out that the fine airborne particles seen in most forest fires often completely block light in the visible part of the spectrum, but allow SWIR light to pass through almost unaffected. SWIR image reveals the actual fire location and helps us visualise the area.`,

    "Thermal Satellite Data (Landsat 8)": `Landsat 8 images have 15 m panchromatic and 30 m multi-spectral spatial resolutions. The Landsat 8 satellite has two sensors- 1. Operational Land Imager (OLI) and Thermal Infrared Sensor (TIRS). The ‘TIRS’ measures land surface temperature in two thermal bands (Band 10 and Band 11). This feature tells us about the temperature of the region. Additionally, here we can select a date range and clip an area to get more information about the temperature conditions.`,

    "Rivers of World": `All the rivers of the world with their order which load according to map zoom are shown here. This helps us interpret the origin as well as the mouth of the river. We can also clip a particular area on the map from the Additional option button, and extract data about rivers present inside.`,

    "Human Settlement Footprint": `This feature shows the places with maximum as well as minimum settlements. We can also clip an area on the map and find out about the human settlements over that region. The area of choice could be a district level boundary.`,

    "Global Waterbodies and Change": `The satellites used for this feature are Landsat 5, 7 & 8. Since the satellite dataset was collected from 1984 to 2021, this feature displays the total change in the world's water bodies over that time. The red colour shows us the original path of the water body that has left dry at present and the green colour shows the new or diverted path from the original water body. The black colour indicates the non-changing pathway of the water body.`,

    "Daily Land Surface Temperature": `This feature allows us to know the surface temperature of the particular date selected for any region. Dataset is derived from the MODIS satellite having resolution of 1000m capable of daily change can visualisation. The value here is in degree celsius temperature`,

    "Temperature above (2m)ground": `The feature tells us about the air/temperature conditions over 2m of surface with resolution of 27830 metres. The pixel value is in degree celsius.`,

    "Water Surface Trend": `Here we can visualise the change in level of any waterbody for a particular date range. Additionally it will plot the graph of water surface area against the date range provided. Also it will create two water boundaries which show lowest water surface extent and highest water surface extent within the provided date range of a water body considered.`,

    "Administrative Boundaries": `This feature helps us visualise the administrative boundaries from country level, state level to district level.`,

    "Nighttime Data ( VIIRS )": `This dataset provides insights into the distribution of nighttime illumination in desired areas. It allows for the visualisation of nighttime conditions on a daily basis, with a revisiting time of one day and data availability starting from May 2012. The dataset comprises monthly average radiance composite images generated using nighttime data from the VIIRS Day/Night Band.`,

    "Global Digital Surface Model 30m": `This Copernicus’s DEM is a Digital Surface Model (DSM) which represents the surface of the Earth including buildings, infrastructure and vegetation.`,

    "Atmospheric CO Concentration ( Sentinel-5P)": `Sentinel-5 Precursor is the first mission of the Copernicus Programme dedicated to monitoring air pollution. It gives global spatial coverage with a spatial resolution of 5.5 km x 3.5 km. The unit for the pixel value is mol/m^2.`,

    "World Population Density": `These population density grids contain estimates of the number of persons per square kilometre consistent with national censuses and population registers by NASA for 2020.`,

    "Topographic diversity based on Temperature & Moisture": `Topographic diversity (D) is a surrogate variable that represents the variety of temperature and moisture conditions available to species as local habitats. It expresses the logic that a higher variety of topo-climate niches should support higher diversity (especially plant) and support species persistence given climatic change`,

    "Global Slope Map": `The primary aim of the Shuttle Radar Topography Mission (SRTM) digital elevation dataset was to offer uniform, top-notch elevation data on a nearly global scale. Leveraging SRTM 90m elevation data, this dataset has been created to depict the slope values of terrains worldwide.`,

    "Hydroshed Drainage Direction": `This drainage direction dataset defines the direction of flow from each cell in the conditioned DEM to its steepest down-slope neighbour. HydroSHEDS is based on elevation data obtained in 2000 by NASA's Shuttle Radar Topography Mission (SRTM).`,

    "Indian Watersheds and Rivers": `Depending on the map zoom level, users can expect to see representations of river basins, watersheds, and micro watersheds. Furthermore, the data not only includes watershed polygons but also displays rivers categorised by their order. This comprehensive dataset encompasses all types of watersheds, ranging from micro to macro, and includes rivers from lower to higher orders.`,

    "Daily Precipitation rate in mm/hr": `Global Satellite Mapping of Precipitation (GSMaP) provides a global hourly rain rate with a 0.1 x 0.1 degree resolution. GSMaP is a product of the Global Precipitation Measurement (GPM) mission, which provides global precipitation observations at three hour intervals. Here the data set is daily precipitation rate in mm/hr units.`,

    "Near surface air temperature": `This dataset provides information regarding near surface air temperature on a daily basis. The unit for the temperature is kelvin.`,

    "Near surface wind speed": `This dataset provides information regarding near surface wind speed on a daily basis. The unit for the temperature is m/s.`,

    "Surface Pressure in Pascal": `This dataset shows surface pressure in terms of pascal as its unit. This dataset gives you values on a daily basis.`,

    "Weekly Weather Animation": `This dataset shows animation of different weather layers for a week. `,

    "Country Boundaries": `Administrative boundaries of countries`,

    "State Boundaries": `Administrative boundaries of states.`,

    "District Boundaries": `Administrative boundaries of Dirstricts.`,

    "Building Footprint Extraction": `Building Footprint Extraction identifies and delineates building outlines from data sources like satellite imagery, aerial photographs, or LiDAR, playing a key role in urban planning, GIS, disaster management, and other applications.`,

   "Forest Fire Burnt Area Detection":`This feature for forest fire burnt area detection estimates the burnt area using a provided satellite image with a 10-meter resolution. It performs real-time burnt area detection using a machine learning algorithm, providing patch-wise area estimates as well as the total burnt area for the specified area of interest.`,
   
    "Land Use Land Cover": `This Land Use Land Cover (LULC) feature provides a detailed LULC map for your selected area of interest. The map is temporal, based on a specific date chosen by the user, and has a spatial resolution of 10 meters. It classifies the area into 6 to 8 different land cover classes, such as water bodies, vegetation, built-up areas, and more.  
                            Additionally, the feature includes true-color and false-color satellite images of the selected area for the same date. These satellite images help in visualizing the area with natural (true color) and enhanced (false color) representations for better analysis and understanding.  
                            This feature is particularly useful for monitoring land use changes, environmental studies, urban planning, and natural resource management.`,
    
    "Farm Health Graph generation":`This function detects the amount of vegetation in the area (farm/farms) using the Normalised Difference Vegetation Index (NDVI).  This helps us understand the farmland health through its NDVI. Whether it's good health or bad health. To visualise the difference, this feature generates a graph of the chosen area's NDVI over the chosen duration. It also allows us to download the graph. This can also be done for multiple farmlands for comparison.`,

    "UP42": `UP42 is a platform that provides access to geospatial data and analytics tools. It allows users to integrate and analyze satellite imagery, aerial data, and other geospatial data sources for applications in fields like urban planning, agriculture, environmental monitoring, and disaster management. UP42 offers a marketplace where users can discover, purchase, and process various data products and services.`,
    
    "SkyWatch": `
SkyWatch is a platform that provides access to satellite imagery and geospatial data. It offers tools for businesses and developers to integrate satellite data into applications, helping with tasks such as environmental monitoring, agriculture, and urban planning. SkyWatch simplifies the process of acquiring, processing, and analyzing satellite imagery.`,
};

export default datasetInfoDictionary; 