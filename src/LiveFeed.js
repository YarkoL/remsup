import openSocket from 'socket.io-client';
import React from 'react';  
import Ticket from './Ticket';

let data = []
const url = 'http://localhost:3030';

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

	createTicket = (newTicket) => {
	    const newTickets = this.state.tickets.slice();
	    newTickets.push(newTicket);
	    this.setState({ tickets: newTickets });
	}
	
	initSocket = () => {
	    const socket = openSocket(url);
	    socket.on('roomname', (data) => {
	        console.log('socket message '+ JSON.stringify(data));       
	        this.createTicket(
	        	{
	        		guid : data.guid,
	        		roomname : data.roomname
	        	}
	        ); 
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