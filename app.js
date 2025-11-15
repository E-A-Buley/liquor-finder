if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}

const map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const script = document.createElement('script');
script.src = "https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js";
document.head.appendChild(script);

let userCoords = null;
let locations = [];
let currentIndex = 0;
let routeControl = null;

navigator.geolocation.getCurrentPosition(async (pos) => {
  userCoords = [pos.coords.latitude, pos.coords.longitude];
  L.marker(userCoords).addTo(map).bindPopup('You are here').openPopup();
  map.setView(userCoords, 14);

  const query = `
    [out:json][timeout:25];
    (
      node(around:5000,${userCoords[0]},${userCoords[1]})["amenity"~"pub|bar|restaurant"];
      node(around:5000,${userCoords[0]},${userCoords[1]})["shop"~"supermarket|convenience|alcohol"];
    );
    out center;`;
  
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.elements || data.elements.length === 0) {
    alert('No nearby alcohol-selling locations found.');
    return;
  }

  locations = data.elements
    .map(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) return null;
      const d = distance(userCoords[0], userCoords[1], lat, lon);
      return { lat, lon, name: el.tags.name || 'Unknown', distance: d };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

  showLocation(currentIndex);
});

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2 - lat1) * Math.PI/180;
  const Δλ = (lon2 - lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function showLocation(index) {
  if (!locations[index]) {
    alert("No more locations nearby.");
    return;
  }

  const loc = locations[index];

  if (routeControl) {
    map.removeControl(routeControl);
  }

  routeControl = L.Routing.control({
    waypoints: [
      L.latLng(userCoords[0], userCoords[1]),
      L.latLng(loc.lat, loc.lon)
    ],
    lineOptions: {
      styles: [{ color: 'blue', opacity: 0.7, weight: 5 }]
    },
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    show: false
  }).addTo(map);

  const destMarker = L.marker([loc.lat, loc.lon])
    .bindPopup(`<b>${loc.name}</b><br>Distance: ${(loc.distance/1000).toFixed(2)} km`)
    .openPopup()
    .addTo(map);

  let directionsBox = document.getElementById('directionsBox');
  if (!directionsBox) {
    directionsBox = document.createElement('div');
    directionsBox.id = 'directionsBox';
    directionsBox.style.position = 'absolute';
    directionsBox.style.top = '120px';
    directionsBox.style.right = '20px';
    directionsBox.style.width = '300px';
    directionsBox.style.maxHeight = '400px';
    directionsBox.style.overflowY = 'auto';
    directionsBox.style.backgroundColor = 'white';
    directionsBox.style.padding = '10px';
    directionsBox.style.borderRadius = '8px';
    directionsBox.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    directionsBox.style.zIndex = 1000;
    document.body.appendChild(directionsBox);
  }

  directionsBox.innerHTML = `<h3 style="margin-top:0; color:#4CAF50;">${loc.name}</h3>`;

  routeControl.on('routesfound', function(e) {
    const routes = e.routes;
    if (!routes || routes.length === 0) return;
    const summary = routes[0].instructions;
    const stepsHtml = routes[0].instructions.map(step => `<div>${step.text}</div>`).join('');
    directionsBox.innerHTML += stepsHtml;
  });

  routeControl.on('routeselected', function(e) {
    map.fitBounds(routeControl.getPlan().getWaypoints().map(wp => wp.latLng), { padding: [50,50] });
  });

  if (!document.getElementById('skipButton')) {
    const btn = document.createElement('button');
    btn.id = 'skipButton';
    btn.textContent = 'Next Closest Location';
    btn.style.position = 'absolute';
    btn.style.top = '80px';
    btn.style.right = '20px';
    btn.style.padding = '10px 15px';
    btn.style.backgroundColor = '#4CAF50';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = 1000;
    btn.onclick = () => {
      currentIndex++;
      showLocation(currentIndex);
    };
    document.body.appendChild(btn);
  }
}
