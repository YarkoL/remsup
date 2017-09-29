import React from 'react'; 
import store from 'store';
import { withRouter } from 'react-router-dom';

import {rtcPeer, RtcPeer} from './RtcPeer.js';

const styles = {
	chat : {
		padding : '5px',
	 	backgroundColor : '#ded', 
		overflowY: 'scroll', 
		marginTop : '10px',
		height : '150px',
		width: '600px',
		float: 'left'
	}
}

class Rtc extends React.Component {

	constructor(props) {
	    super(props);

	    var room = null;
  	}
	
	componentWillMount() {
		this.room = store.get('room');
	    if ( this.room  !==  null ) {	
	      //we're OK let's start webrtc engine
	      //rtcPeer.run(room);
	      
	    } else {
	  	  alert("Invalid room!");
	  	  this.redirectToRoot();
	    }
  	}

  	componentWillUnmount() {
    	if ( this.room  !==  null ) {	
	     store.set('room', null);
	    }
	    this.room = null;
  	}

  	redirectToRoot = () => {
     	this.props.history.push("/");
  	}

	handleSend = (ev) => {
		ev.preventDefault();
		
		rtcPeer.appendToChat("Hello there byb!");
		
		console.log("RTC : pushed send button");
	}

	handleStop = (ev) => {
		ev.preventDefault();
		console.log("RTC : pushed stop button");
		//TODO tear down 
    	store.set('room', null);
    	
    	this.redirectToRoot();
	}

	render() {
		return (
		    <div id="content">    
		    <button id="stopButton" onClick={this.handleStop} >Stop</button>
			<div id="videoFrames">* room : {this.room} *</div>
			<input type="text" id="chatInput" placeholder="Say something" />
			<button id="sendButton" onClick={this.handleSend} >Send</button>
			<div id="chat" style={styles.chat}></div>
		    </div> 
		);	
	}
}

export default withRouter(Rtc);