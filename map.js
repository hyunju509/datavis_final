// Helper function to parse CSV line with quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    
    return result;
}

// Function to load and parse CSV
async function loadDataCenters() {
    try {
        const response = await fetch('dataset/geocoded_data_centers.csv');
        if (!response.ok) {
            throw new Error(`Failed to load CSV: ${response.statusText}`);
        }
        const csvText = await response.text();
        
        // Parse CSV
        const lines = csvText.split('\n');
        const datacenters = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = parseCSVLine(lines[i]);
            
            if (values.length >= 13) {
                const lat = parseFloat(values[11]);
                const lng = parseFloat(values[12]);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    datacenters.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        },
                        properties: {
                            name: values[0] || 'Unknown',
                            address: values[1] || 'N/A',
                            zipcode: values[2] || 'N/A',
                            city: values[3] || 'N/A',
                            state: values[4] || 'N/A',
                            country: values[5] || 'USA',
                            category: values[9] || 'N/A',
                            type: values[10] || 'N/A'
                        }
                    });
                }
            }
        }
        
        console.log(`Parsed ${datacenters.length} data centers from CSV`);
        
        return {
            type: 'FeatureCollection',
            features: datacenters
        };
    } catch (error) {
        console.error('Error loading data centers:', error);
        throw error;
    }
}

// Function to show error
function showError(message) {
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    if (loading) loading.style.display = 'none';
    if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `<strong>Error:</strong><br>${message}`;
    }
}

// Function to hide loading
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Initialize MapLibre map
let map;

try {
    map = new maplibregl.Map({
        container: 'map',
        style: 'style.json', 
        center: [-98.5795, 39.8283],
        zoom: 4
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle style loading errors
    map.on('error', (e) => {
        console.error('Map error:', e);
        showError(`Map style error: ${e.error?.message || 'Unknown error'}<br><br><small>Check that style.json is valid and accessible.</small>`);
    });

    // Add data when map loads
    map.on('load', async () => {
        try {
            console.log('Map style loaded successfully');
            
            const geojsonData = await loadDataCenters();
            console.log(`Loaded ${geojsonData.features.length} data centers`);

            // Add the data source
            map.addSource('datacenters', {
                type: 'geojson',
                data: geojsonData,
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });

            // Add cluster circles
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'datacenters',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-opacity': 0.6,
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#05999e',
                        10,
                        '#cba4cc',
                        30,
                        '#ec2c3d'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,
                        10,
                        30,
                        30,
                        40
                    ]
                }
            });

            // Add cluster count labels
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'datacenters',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': ['get', 'point_count_abbreviated'],
                    'text-size': 12
                },
                paint: {
                    'text-color': '#000000'
                }
            });

            // Add individual points
            map.addLayer({
                id: 'unclustered-point',
                type: 'circle',
                source: 'datacenters',
                filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': '#25baed',
                    'circle-radius': 6,
                    'circle-stroke-width': 2
                }
            });

            // Cluster click handler
            map.on('click', 'clusters', (e) => {
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['clusters']
                });
                const clusterId = features[0].properties.cluster_id;
                map.getSource('datacenters').getClusterExpansionZoom(
                    clusterId,
                    (err, zoom) => {
                        if (err) return;
                        map.easeTo({
                            center: features[0].geometry.coordinates,
                            zoom: zoom
                        });
                    }
                );
            });

            // Point click handler - show popup
            map.on('click', 'unclustered-point', (e) => {
                const coordinates = e.features[0].geometry.coordinates.slice();
                const props = e.features[0].properties;

                const popupHTML = `
                    <div class="popup-title">${props.name}</div>
                    <div class="popup-row">
                        <span class="popup-label">Address:</span>
                        <span class="popup-value">${props.address}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">City:</span>
                        <span class="popup-value">${props.city}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">State:</span>
                        <span class="popup-value">${props.state}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">ZIP:</span>
                        <span class="popup-value">${props.zipcode}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-label">Type:</span>
                        <span class="popup-value">${props.type}</span>
                    </div>
                `;

                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                new maplibregl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(popupHTML)
                    .addTo(map);
            });

            // Cursor changes
            map.on('mouseenter', 'clusters', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'clusters', () => {
                map.getCanvas().style.cursor = '';
            });
            map.on('mouseenter', 'unclustered-point', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'unclustered-point', () => {
                map.getCanvas().style.cursor = '';
            });

            hideLoading();
            console.log('Map setup complete!');

        } catch (error) {
            console.error('Error setting up data:', error);
            showError(`Data loading error: ${error.message}<br><br><small>Make sure geocoded_data_centers.csv is accessible.</small>`);
        }
    });

} catch (error) {
    console.error('Error initializing map:', error);
    showError(`Map initialization error: ${error.message}`);
}