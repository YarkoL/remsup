
import React from 'react'; 
import store from 'store';
import { withRouter } from 'react-router-dom';

class Login extends React.Component {
	constructor(props) {
	    super(props);

		this.state = {
	      username: '',
	    };
  	}

	handleSubmit = (ev) => {
		ev.preventDefault();

		var username = this.state.username;

		if (username === 'studio' ) {
		  console.log("you're logged in!");
		  store.set('loggedIn', true);
		  this.props.history.push("/");
		} else {
		  alert(username + " is wrong username!");
		}
	}

	handleChange = (ev) => {
	    this.setState({username: ev.target.value});
	}

	render() {
		return( 
			<div id="formcontainer">
				<form className = "loginform" action="" onSubmit={this.handleSubmit}>
				    <input className="username" id="username" type="text" 
				    	placeholder="enter 'studio' to log in" name="username"
				    	value={this.state.username} 
				    	onChange={this.handleChange} 
				    	/>
				    <input className="submit" id="submit" type="submit" value="Username" />
			    </form>
			</div>
		);	
	}
}

export default withRouter(Login);