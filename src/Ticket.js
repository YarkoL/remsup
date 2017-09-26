import React from 'react'; 

const styles = {
  ticket: {
    display : 'block',
    margin : '1em',
    status : {
    	open : { backgroundColor : 'yellow' },
      closed : {  backgroundColor : 'silver'}
    },
    avatar : {
    	display : 'inline-block', top : '1em'
    },
    fields : {
      display : 'inline-block', marginLeft : 10, marginTop : 10,
      username : {
      	fontSize : '1.25em', fontWeight : 'bold'
      }
    }
  }
}


const Ticket = (props) => {
  var open = true;
	return (
  	<div style = {styles.ticket}>
      <div style = {(props.status === 'open')? styles.ticket.status.open : styles.ticket.status.closed }>
        <img width="75" src={props.avatar} /> 
            <div style = {styles.ticket.fields}>
              <div style = {styles.ticket.fields.username}>
                {props.username}
              </div>
              <div>{props.timestamp}</div>
              <div>{props.desc}</div>
            </div>
      </div>
   </div>   
  );
};

const TicketList = (props) => { //TODO assign a key prop to each item
	return (
  	<div>
    	{props.tickets.map( ticket => <Ticket {... ticket} />)}
    </div>
  );
};

export default TicketList;