
export class RtcPeer
{

    run = (room) => {
        var conf = new window.NetworkConfig;
        var rtcCall = new window.BrowserWebRtcCall(conf);
        const videoFrames = document.getElementById("videoFrames");

	    //UI element that contains the video
	    

	    var videoElement = null;

	    rtcCall.addEventListener(function(obj, event) 
	    {
	        var evt = event;
	        switch(event.Type) 
	        {
	            case CallEventType.ConfigurationComplete : 
	                console.log("Configuration complete");
	                break;

	            case CallEventType.FrameUpdate :
	                videoElement = evt.Frame.FrameGenerator.VideoElement;
	                videoFrames.appendChild(videoElement);
	                break;

	            case CallEventType.Message :
	                
	                console.log("message from " + evt.ConnectionId.id + " : " + evt.Content);
	                break;

	            case CallEventType.CallEnded : 
	                cpnsole.log("call ended with id " + evt.ConnectionId.id, "system");
	                videoElements[evt.ConnectionId.id] = null;
	                break;    

	            case CallEventType.ConnectionFailed :
	                alert("Connection failed");
	                break;

	            default :
	                console.log("got unhandled event type " + event.Type);
	        }
	    });
	    setInterval(function() {
	        rtcCall.Update()
	    }, 50);
	    rtcCall.Configure(new MediaConfig());
	    //rtcCall.Listen(addr);
		rtcCall.Call(room);
	}
    
};

export let rtcPeer = new RtcPeer(); // https://k94n.com/es6-modules-single-instance-pattern

