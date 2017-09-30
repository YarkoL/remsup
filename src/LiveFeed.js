import openSocket from 'socket.io-client';
import React from 'react';  
import Ticket from './Ticket';

let data = [
   {
      guid : 9898,
      roomname : "room1"
   },
   {
      guid : 9897,
      roomname : "room2"
   }
]

const TicketList = (props) => { 
  return (
    <div>
      {props.tickets.map(ticket  => <Ticket key={ticket.guid} guid={ticket.guid} room={ticket.roomname}/>)}
    </div>
  );
};


class LiveFeed extends React.Component {

	constructor() {
	    super();
	    this.state = { tickets : data };
  	}

	componentWillMount() {
		this.initSocket();
	}
	
	initSocket = () => {
	    const socket = openSocket('http://localhost:3030');
	    socket.on('roomname', (data) => {
	        console.log('socket message '+JSON.stringify(data));
	    });
  	}

	render() {
	  	return (
	     <div>
	       <TicketList tickets={this.state.tickets} />
	     </div>
	  	);
  	}
}

export default LiveFeed;