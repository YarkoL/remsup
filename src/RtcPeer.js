
export class RtcPeer
{
    sendButton = document.getElementById("sendButton");

    chat = document.getElementById("chat");

    appendToChat = (txt, classId = 'system') => { 
        chat.innerHTML += "<span class = " + classId + "> " + txt + "</span><br>";
    }

    run = (room) => {
        var conf = new window.NetworkConfig;
        console.log(conf);
    }
    
};

export let rtcPeer = new RtcPeer(); // https://k94n.com/es6-modules-single-instance-pattern

