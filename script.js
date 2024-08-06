document.addEventListener('DOMContentLoaded', function () {
    const scripts = document.getElementsByTagName('script');
    const dep = document.getElementById('dependencies');
    let html = '';

    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.split('/').pop() !== 'script.js') {
            html += "<li>" + scripts[i].src + "</li>";
        }
    }
    dep.innerHTML = html;
});

document.getElementById('fileInput').addEventListener('change', function () {
    const fileInput = document.getElementById('fileInput');
    const convertButton = document.getElementById('convertButton');
    convertButton.disabled = !fileInput.files.length;
});

let startDate;
let endDate;

document.getElementById("startDate").addEventListener("change", function () {
    startDate = new Date(this.value);
});

document.getElementById("endDate").addEventListener("change", function () {
    endDate = new Date(this.value);
});

document.getElementById('convertButton').addEventListener('click', function () {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const json = JSON.parse(e.target.result);
                if (!Array.isArray(json)) {
                    throw new Error('Invalid JSON structure: Root element is not an array.');
                }
                increaseProgress(0);
                const gpxFiles = await jsonToGpxFiles(json);
                zipAndDownload(gpxFiles);
            } catch (error) {
                alert('Error: ' + error.message);
            }
        };
        reader.readAsText(file);
    } else {
        alert('Please select a file first.');
    }
});

async function jsonToGpxFiles(jsonArray) {
    const total = Object.keys(jsonArray).length * 2; //50% of the progress
    const apiKey = document.getElementById('apiKey').value;

    const gpxFiles = {};
    const searchData = JSON.parse(JSON.stringify(jsonArray));
    let currentDate;
    let counter = 0;

    for (const point of jsonArray) {
        currentDate = point.startTime.split('T')[0];
        if (startDate && new Date(currentDate) < startDate) {
            continue;
        }
        if (endDate && new Date(currentDate) > endDate) {
            continue;
        }

        counter += 1;

        if (counter % Math.ceil(total / 100) === 0) {
            await updateProgress(counter / total);
        }

        let currentString = gpxFiles[currentDate];
        if (!currentString) {
            currentString = `<?xml version="1.0" encoding="UTF-8"?>\n
            <gpx version="1.1" creator="JsonToGpxConverter">\n
            <metadata>\n
            <name>${currentDate}</name>\n
            </metadata>\n`;
        }

        if (point.visit) {
            const location = point.visit.topCandidate.placeLocation;
            const placeId = point.visit.topCandidate.placeID;
            let name = currentDate;
            let desc = 'visit ' + placeId;

            if (apiKey) {
                const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,address_components&key=${apiKey}`;
                try {
                    const response = await axios.get(url);
                    name = response.data.result.name;
                    desc = response.data.result.address_components[0].long_name;
                } catch (error) {
                    if (error.response) {
                        document.getElementById("googleErrorMsg").innerHTML = error.response.data.toString();
                    }
                }
            }

            const coords = point.visit.topCandidate.placeLocation.replace('geo:', '').split(',');
            const lat = coords[0];
            const lon = coords[1];
            currentString += `  <wpt lat="${lat}" lon="${lon}">\n`;
            currentString += `    <name>${name}</name>\n`;
            currentString += `    <desc>${desc}</desc>\n`;
            currentString += '  </wpt>\n';
        } else if (point.timelinePath) {
            let name = 'unknown';
            let locations = '';

            for (const pointInTimeLine of point.timelinePath) {
                const coords = pointInTimeLine.point.replace('geo:', '').split(',');
                const lat = coords[0];
                const lon = coords[1];
                locations += `<rtept lat="${lat}" lon="${lon}"></rtept>`;
                if (name === 'unknown') {
                    for (const loc of searchData) {
                        if (loc.activity && loc.activity.start === pointInTimeLine.point) {
                            name = loc.activity.topCandidate.type;
                            break;
                        }
                    }
                }
            }
            currentString += `<rte>\n  <name>${name}</name>\n`;
            currentString += locations;
            currentString += `</rte>\n`;
        }
        gpxFiles[currentDate] = currentString;
    }
    return gpxFiles;
}

async function zipAndDownload(gpxFiles) {
    const zip = new JSZip();
    const total = Object.keys(gpxFiles).length * 2;
    let counter = 0;
    for (let date in gpxFiles) {
        counter += 1;
        let tot = 0.5 + (counter / total);
        if (counter % Math.ceil(total / 100) === 0 && tot < 0.9) { // Update progress every 1% completed
            await updateProgress(tot);
        }
        zip.file(`${date}.gpx`, gpxFiles[date]);
    }

    zip.generateAsync({ type: 'blob' }).then(async function (content) {
        await updateProgress(1);
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gpx_files.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await updateProgress(0);
        resetFileInput();
    });
}

function resetFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.value = '';
}

function increaseProgress(percentage) {
    var progressBar = document.getElementById('progressBar');
    var parentWidth = parseInt(window.getComputedStyle(progressBar.parentElement).width);
    var newWidth = parentWidth * percentage;
    progressBar.style.width = newWidth + 'px';
}

function updateProgress(percentage) {
    return new Promise((resolve) => {
        increaseProgress(percentage);
        setTimeout(resolve, 0);
        if (percentage === 1) {
            showFireworks();
            setTimeout(resolve, 0);
        }
    });
}

function showFireworks() {
    createFireworks(100);
}

function createFireworks(count) {
    const fireworkContainer = document.getElementById('firework-container');
    for (let i = 0; i < count; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = `${Math.random() * 100}%`;
        firework.style.backgroundColor = getRandomColor();

        const x = `${Math.random() * 200 - 100}px`;
        const y = `${-(Math.random() * 600 + 200)}px`;
        firework.style.setProperty('--x', x);
        firework.style.setProperty('--y', y);

        fireworkContainer.appendChild(firework);
        animateFirework(firework);
    }
}

function animateFirework(firework) {
    firework.addEventListener('animationend', () => {
        firework.remove();
    });
}

function getRandomColor() {
    const colors = ['#ff0', '#f00', '#0f0', '#00f', '#f0f', '#0ff'];
    return colors[Math.floor(Math.random() * colors.length)];
}