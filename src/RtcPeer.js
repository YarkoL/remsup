
export class RtcPeer
{
    conf = new window.NetworkConfig();
    rtcCall = null;

    Run = (room, processMessage) => {
    
        this.rtcCall = new window.BrowserWebRtcCall(this.conf);

        var videoFrames = null;
	    var videoElement = null;
        const call = this.rtcCall;

	    call.addEventListener(function(obj, event)  {
	        var evt = event;
             videoFrames = document.getElementById("videoFrames");
	        switch(event.Type)  {
	            case CallEventType.ConfigurationComplete : 
	                processMessage("Configuration complete", "System");
	                break;

	            case CallEventType.FrameUpdate :
	                videoElement = evt.Frame.FrameGenerator.VideoElement;
                    if (videoFrames)
	                   videoFrames.appendChild(videoElement);
	                break;

	            case CallEventType.Message :
	                console.log("message from " + evt.ConnectionId.id + " : " + evt.Content);
                    processMessage(evt.Content, evt.ConnectionId.id);
	                break;

	            case CallEventType.CallEnded : 
	                console.log("call ended with id " + evt.ConnectionId.id, "system");
	                if (videoElement)
                        videoElement[evt.ConnectionId.id] = null;
                     if (videoFrames)
                       videoFrames.innerHTML = ""; //TODO watch for memoryleaks?
	                break;    

	            case CallEventType.ConnectionFailed :
	                alert("Connection failed");
	                break;

	            default :
	                console.log("got unhandled event type " + event.Type);
	        }
	    });
	    setInterval(function() {
            call.Update();
        }, 50);
	    call.Configure(new MediaConfig()); //TODO is it necessary?
	   
		call.Call(room);
	}

    Stop = () => {
        if (this.rtcCall == false)  {
            console.log("Could not dispose call");
        } 
        else {
            this.rtcCall.Dispose();
            console.log("Call disposed");
        }
    }    

    Send = (msg) => {
        this.rtcCall.Send(msg);
    } 
};

export let rtcPeer = new RtcPeer(); // https://k94n.com/es6-modules-single-instance-pattern

