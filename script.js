// STUN server configuration (Google public STUN server)
const configuration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

let peerConnection;
let dataChannel;
let fileInput = document.getElementById('fileInput');
let sendFileBtn = document.getElementById('sendFileBtn');
let startReceiveBtn = document.getElementById('startReceiveBtn');
let sendStatus = document.getElementById('sendStatus');
let receiveStatus = document.getElementById('receiveStatus');

// Handle file selection
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        sendFileBtn.disabled = false;
    }
});

// Function to create a peer connection and send files
sendFileBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return;

    peerConnection = new RTCPeerConnection(configuration);
    dataChannel = peerConnection.createDataChannel('fileTransfer');

    // Send file when data channel opens
    dataChannel.onopen = () => {
        sendStatus.textContent = 'Connection open, sending file...';
        sendFile(file);
    };

    // Handle ice candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Send this candidate to the receiver:', event.candidate);
        }
    };

    // Create and send offer
    peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer);
        console.log('Send this offer to the receiver:', offer);
    });
});

// Function to send file in chunks
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
            sendStatus.textContent = 'File sent successfully!';
            dataChannel.close();
        }
    };

    sliceFile(file, offset);

    function sliceFile(file, offset) {
        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
    }
}

// Receiving part: Create peer connection and wait for the offer
startReceiveBtn.addEventListener('click', () => {
    peerConnection = new RTCPeerConnection(configuration);

    // Handle incoming data channel
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

    // Handle ice candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Send this candidate to the sender:', event.candidate);
        }
    };

    // Set remote description when offer is received
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
            
