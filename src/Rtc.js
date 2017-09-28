import React from 'react'; 
import store from 'store';
import { withRouter } from 'react-router-dom';

class Rtc extends React.Component {

	constructor(props) {
	    super(props);

	    var session = null;

  	}

	
	componentWillMount() {
		this.session = store.get('session');
	    if ( this.session  !==  null ) {	
	      //we're OK let's just return
	      return;
	    } else {
	  	  alert("Invalid session!");
	  	  this.redirectToRoot();
	    }
  	}

  	redirectToRoot = () => {
     	this.props.history.push("/");
  	}

	handleSend = (ev) => {
		ev.preventDefault();
		console.log("RTC : pushed send button");
	}

	handleStop = (ev) => {
		ev.preventDefault();
		console.log("RTC : pushed stop button");
		//TODO tear down session
    	store.set('session', null);
    	this.redirectToRoot();
	}

	render() {
		return (
		    <div id="content">    
		    <button id="stopButton" onClick={this.handleStop} >Stop</button>
			<div id="videoFrames">* SESSION : {this.session} *</div>
			<input type="text" id="chatInput" placeholder="Say something" />
			<button id="sendButton" onClick={this.handleSend} >Send</button>
			<div id="chat"></div>
		    </div> 
		);	
	}
}

export default withRouter(Rtc);