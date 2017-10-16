import React from 'react'; 
import store from 'store';
import { withRouter } from 'react-router-dom';

import {rtcPeer, RtcPeer} from './RtcPeer.js';

const styles = {
	content : {
		backgroundColor : 'LightSkyBlue',
		padding : '5px'
	},
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
/*

*/
/*
const Message = (txt) => (
	<span>{txt} <br/></span>
);
*/

class Message extends React.Component {
  render (){
    return (
      <span>[{this.props.index}] {this.props.txt} <br/></span>
    );    
  }
} 

const Chat = (props) => {
 return (
 	<div id="chat" style={styles.chat}>
		   	{props.messages.map(message  => <Message index={message.index} txt={message.txt} key={message.index} />)}
  	</div>
 	);	
};

class Rtc extends React.Component {

	/*
	Message
	{
		guid :
		index:
		txt:       
	}
	*/

	constructor(props) {
	    super(props);

	    this.state = {
	      messages : [],
	      index : 0,
	      sentMessage: '',
	      receivedMessage: ''
	    };

	    var room = null;
  	}
	
	componentWillMount() {
		this.room = store.get('room');
	    if ( this.room  !==  null ) {	
	      //we're OK let's start webrtc engine
	      rtcPeer.run(this.room);
	      
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

  	addMessage = (msg) => {
	    const newMessages = this.state.messages.slice();
	    newMessages.push(msg);
	    this.setState({ messages: newMessages });
	}

	handleSend = (ev) => {
		ev.preventDefault();
		let msgTxt = this.state.sentMessage;
		this.addMessage(
			{
				index : this.state.index,
				txt : msgTxt
			}
		);
		this.setState((prev) => ({ index : prev.index + 1 }));
		this.chatInput.value = "";
	}

	handleChange = (ev) => {
	    this.setState({sentMessage: ev.target.value});
	}

	handleStop = (ev) => {
		ev.preventDefault();
		
		//TODO tear down 
    	store.set('room', null);
    	
    	this.redirectToRoot();
	}

	render() {
		return (
		    <div id="content" /*style={styles.content}*/>    
			    <button id="stopButton" onClick={this.handleStop} >Stop</button>
				<div id="videoFrames">* room : {this.room} *</div>
				<input type="text" id="chatInput" ref={el => this.chatInput = el} placeholder="Say something" onChange={this.handleChange} />
				<button id="sendButton" 
					onClick={this.handleSend} 
					value={this.state.sentMessage}>Send</button>
				<Chat messages={this.state.messages} />
		    </div> 
		);	
	}
}

export default withRouter(Rtc);