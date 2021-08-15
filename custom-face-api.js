const video = document.getElementById('videoInput')
// basePath this variable deifned in main.php
const pathToModels = basePath + 'assets/models'

Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri(pathToModels),
    faceapi.nets.faceLandmark68Net.loadFromUri(pathToModels),
    faceapi.nets.ssdMobilenetv1.loadFromUri(pathToModels) 
]).then(start)

function start() {
    Promise.all([
        navigator.mediaDevices.getUserMedia({video: {}}).then((stream)=> {video.srcObject = stream;}, (err)=> console.error(err))
    ]).then(recognizeFace)
}

async function recognizeFace() {
    const labeledDescriptors = await loadLabeledImages()
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.7)
    video.play();
    video.addEventListener('play', async () => {
        const canvas = faceapi.createCanvasFromMedia(video)
        document.getElementById("face_container").append(canvas)

        const displaySize = { width: video.width, height: video.height }
        faceapi.matchDimensions(canvas, displaySize)

        setInterval(async () => {
            const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor()
            const resizedDetections = faceapi.resizeResults(detections, displaySize)

            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

            const faceDescriptor = resizedDetections.descriptor
            const result = faceMatcher.findBestMatch(faceDescriptor)
            const box = resizedDetections.detection.box
            // const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
            const drawBox = new faceapi.draw.DrawBox(box)
            drawBox.draw(canvas)
            markUserAttendance(result.label.toString())
        }, 5000)
    })
}

function loadLabeledImages() {
    // folder_names - this var comming from face_attendance.php
    const labels = folder_names
    return Promise.all(
        labels.map(async (label)=>{
            const descriptions = []
            for(let i=1; i<=2; i++) {
                const img = await faceapi.fetchImage(`${basePath}images/${label}/${i}.jpg`)
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                // console.log(label)
                descriptions.push(detections.descriptor)
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions)
        })
    )
}

function markUserAttendance(id) {
    // Create our XMLHttpRequest object
    var hr = new XMLHttpRequest()
    // Create some variables we need to send to our PHP file
    var url = basePath + 'attendence/attendence/ajax_mark_attendance'
    var postData = "id="+id
    hr.open("POST", url, true)
    hr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // Access the onreadystatechange event for the XMLHttpRequest object
    hr.onreadystatechange = function() {
        if(hr.readyState == 4 && hr.status == 200) {
            var status = hr.responseText
            switch(status) {
                case 'exist':
                    $.notify(
                        {icon: 'fas fa-times-circle pr-1', message: "Attendance already marked for today"},
                        {type: 'danger', mouse_over: 'pause', delay: 500,}
                    );
                    break;
                case 'no-record':
                    $.notify(
                        {icon: 'fas fa-times-circle pr-1', message: "Member does not exist"},
                        {type: 'danger', mouse_over: 'pause', delay: 500,}
                    );
                    break;
                default:
                    $.notify(
                        {icon: 'fas fa-times-circle pr-1', message: "Attendance taken for "+status+" successfully"},
                        {type: 'success', mouse_over: 'pause', delay: 500,}
                    );
            }
        }
    }
    hr.send(postData) // Actually execute the request
}