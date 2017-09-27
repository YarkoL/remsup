import React from 'react'; 
import { withRouter } from 'react-router-dom';

class Rtc extends React.Component {

/*	
	constructor(props) {
	    super(props);

		this.state = {
	     
	    };
  	}


	handleSend = (ev) => {
		ev.preventDefault();
		console.log("RTC : pushed send button");
	}

	handleStop = (ev) => {
		ev.preventDefault();
		console.log("RTC : pushed send button");
	}

	 <button id="stopButton" onSubmit={this.handleStop}>Stop</button>
		      <div id="videoFrames"></div>
		      <input type="text" id="chatInput" placeholder="Say something" />
		      <button id="sendButton" onSubmit={this.handleSend}>Send</button>
		      <div id="chat"></div>
*/
	render() {
	
		return (
		    <div id="content">    
		      <p>* RTC UI *</p>
		      
		    </div> 
		);	
	}
}

export default withRouter(Rtc);