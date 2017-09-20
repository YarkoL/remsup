
import React from 'react';  

class Login extends React.Component {
	constructor(props) {
	    super(props);

		this.state = {
	      username: '',
	      error: false,
	    };

	    this.handleChange = this.handleChange.bind(this);
	    this.onSubmit = this.onSubmit.bind(this);
  }

  onSubmit(e) {
    e.preventDefault();

    const { username } = this.state;
    console.log(username);
    this.setState({ error: false });

    if (!(username === 'studio')) {
      return this.setState({ error: true });
    }

    console.log("you're logged in. yay!");
    store.set('loggedIn', true);
  }

  handleChange(e, { name, value }) {
    this.setState({ [name]: value });
  }


	render() {
 		const { error } = this.state;
 		if ({error}) { 
 			alert('wrong username!');
 		}
		return(
			 
			<div id="formcontainer">
				<form className = "center" action="" error={error} onSubmit={this.onSubmit}>
			    <input className="username"id="username" type="text" placeholder="enter username" name="username"  onChange={this.handleChange}/>
			    <input className="submit" id="submit" type="submit" value="login"  />
				</form>
			</div>
		);	
	}
}


export default Login;