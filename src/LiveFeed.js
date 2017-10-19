import openSocket from 'socket.io-client';
import React from 'react';  
import Ticket from './Ticket';

let data = []
//const url = 'http://remotesupport-dev.azurewebsites.net';
const url = 'http://localhost:3030';


/*

  Ticket is an UI represenation of a session, for example like

  {
  "__v":1,
  "title":"some thing",
  "description":"desc",
  "severity":0,
  "status":0,
  "report":"",
  "_id":"59e88e278a06de404c905db0",
  "attachments":[
    {
      "_id":"59e88e278a06de404c905db1",
      "guid":"000001",
      "__v":0,
      "createdOn":"2017-10-19T11:36:07.753Z"
    }
  ],
  "tags":[
    "1st","2nd"
  ],
  "users":[
    {
      "__v":0,
      "icon":"",
      "prioritylevel":1,
      "organisation":"FI0001",
      "joineddate":"2017-09-29T08:07:12.593Z",
      "type":"",
      "password":"password",
      "email":"lucas.cosson@softability.fi",
      "lastname":"Cosson",
      "firstname":"Lucas",
      "guid":"000001",
      "_id":"59cdff30ab237215fc6f9aae",
      "sessionHistory":[]
    }
  ],
  "createdOn":"2017-10-19T11:36:07.749Z"
  }
  */


const TicketList = (props) => { 
  return (
    <div>
      {props.tickets.map(ticket  => <Ticket status="open" key={ticket.id} title={ticket.title} description={ticket.description} room={ticket.id}/>)}
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
	    socket.on('connect', () => {
		    console.log('connected');
		  });
		  socket.on('disconnect', () => {
		    console.log('disconnected');
		  });
		  socket.on('error', (err) => {
		    if(err === 'handshake error') {
		      console.log('handshake error', err);
		    } else {
		      console.log('io error', err);
		    }
		});
	    socket.on('roomname', (data) => {
	        console.log('socket message '+ JSON.stringify(data));       
	        this.createTicket(
	        	{
	        		title: data.title,
	        		description : data.description,
	        		id : data._id
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