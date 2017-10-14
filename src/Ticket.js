import React from 'react'; 
import store from 'store';
import { withRouter } from 'react-router-dom';

const styles = {
  ticket: {
    display : 'block',
    margin : '1em',
    status : {
    	open : { backgroundColor : 'goldenrod' },
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
    },
    button : {
      statusopen : {
        right : '8px', top : '3px', float: 'right', 
        display : 'block', width: '68px', height: '30px', color : 'white',
        outline: 'none', border: 'none', backgroundColor : 'darkolivegreen'
      },
      statusclosed : {
        right : '8px', top : '3px', float: 'right', 
        display : 'block', width: '68px', height: '30px', color : 'white',
        outline: 'none', border: 'none', backgroundColor : 'gray'
      },
    } 
  }
}

class Ticket extends React.Component {
 
  handleClick = (ev) => {
    ev.preventDefault();
    
    store.set('room', this.props.room);
    this.props.history.push("/rtc");
  }

  render (){
    return (
      <div style = {styles.ticket}>
     
        <button style = {(this.props.status === 'open')? styles.ticket.button.statusopen : styles.ticket.button.statusclosed }
         onClick = {this.handleClick}>Chat</button>
     
        <div style = {(this.props.status === 'open')? styles.ticket.status.open : styles.ticket.status.closed }>
          <img width="75" src={this.props.avatar} /> 
              <div style = {styles.ticket.fields}>
                <div style = {styles.ticket.fields.username}> 
                  {this.props.guid}
                </div>
              </div>
        </div>
     </div>   
    );    
  }
} 

export default withRouter(Ticket);