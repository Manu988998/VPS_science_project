// Variables for peer connection and data channel
let peerConnection;
let dataChannel;

// File transfer elements
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const startReceiveBtn = document.getElementById('startReceiveBtn');
const sendStatus = document.getElementById('sendStatus');
const receiveStatus = document.getElementById('receiveStatus');

// When a file is selected, enable the Send File button
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        sendFileBtn.disabled = false;
    }
});

// Create a peer connection and data channel for sending files
sendFileBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return;

    peerConnection = new RTCPeerConnection();
    dataChannel = peerConnection.createDataChannel('fileTransfer');

    // Handle data channel events
    dataChannel.onopen = () => {
        sendStatus.textContent = "Connection open, sending file...";
        sendFile(file);
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            // Share the candidate with the other peer manually
            console.log('Send this candidate to the receiver:', event.candidate);
        }
    };

    // Create an offer and set it as the local description
    peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer);
        console.log('Send this offer to the receiver:', offer);
    });
});

// Handle file sending through chunks
function sendFile(file) {
    const chunkSize = 16384;
    let offset = 0;

    const reader = new FileReader();
    reader.onload = (event) => {
        dataChannel.send(event.target.result);
        offset += event.target.result.byteLength;

        if (offset < file.size) {
            sliceFile(file, offset);
        } else {
            sendStatus.textContent = "File sent successfully!";
            dataChannel.close();
        }
    };

    sliceFile(file, offset);

    function sliceFile(file, offset) {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
    }
}

// Receiving part: create peer connection and wait for offer
startReceiveBtn.addEventListener('click', () => {
    peerConnection = new RTCPeerConnection();

    // When a data channel is received, handle the incoming data
    peerConnection.ondatachannel = event => {
        dataChannel = event.channel;

        const receivedChunks = [];
        dataChannel.onmessage = event => {
            receivedChunks.push(event.data);
        };

        dataChannel.onclose = () => {
            const receivedBlob = new Blob(receivedChunks);
            const url = URL.createObjectURL(receivedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'received-file';
            a.textContent = 'Download received file';
            receiveStatus.appendChild(a);
            receiveStatus.textContent = 'File received successfully!';
        };
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Send this candidate to the sender:', event.candidate);
        }
    };

    // Set the remote description when the offer is received
    const offer = prompt('Paste the offer from the sender:');
    if (offer) {
        peerConnection.setRemoteDescription(JSON.parse(offer)).then(() => {
            peerConnection.createAnswer().then(answer => {
                peerConnection.setLocalDescription(answer);
                console.log('Send this answer to the sender:', answer);
            });
        });
    }
});


