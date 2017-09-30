import React from 'react';  
import store from 'store';
import { Switch, Route, Link, withRouter } from 'react-router-dom';

import LiveFeed from './LiveFeed';

//import Rtc from './Rtc';


//views -- these will be made into separate components


const ViewLogs = () => (
  <h1>View logs</h1>
)

const UserManagement = () => (
  <h1>User Management</h1>
)

//LAYOUT ELEMENTS

const Header = () => (
  <header>
    <img className="logo" src={require('./img/logo.jpg')}/>
    <input placeholder="search/filter" />
    <img className="icons" src={require('./img/icons-header.jpg')}/>
  </header>
)

const Left = () => (
  <div className="left">
      <img className="center" src = {require('./img/clock.jpg')}/>
      
      <div id="buttons">
        <ul className="menu">
          <li><Link to="/">Live feed</Link></li><br/>
          <li><Link to="/logs">Review logs</Link></li><br/>
          <li><Link to="/users">Manage users</Link></li><br/>
        </ul>
      </div>            
                                                                                                 
      <img className="brand" src = {require('./img/brand.jpg')}/>
      
  </div>
)

const Middle = () => ( //TODO add  <Route path="/rtc" component = {Rtc} /> 
  <div className="middle">
    <Switch>
          <Route exact path='/' component={LiveFeed}/>
          <Route path='/logs' component={ViewLogs}/>
          <Route path='/users' component={UserManagement}/>
         
      </Switch>
  </div>
)

const Right = () => (
   <div className="right"></div>
)

const Layout = () => (
  <div id="container">
    <Header/>
    <main>
      <Left/>
      <Middle/>
      <Right/>
    </main>
  </div>
)

//APPFRAME CLASS

class AppFrame extends React.Component {
   
  componentWillMount() {
    if (store.get('loggedIn') ===  true ) {
      //we're OK let's just return
      return;
    } else {
  	  console.log ("Not logged in.  Redirecting to login form");
  	  this.redirectToLogin();
    }
  }

  handleSubmit = (event) => {
    event.preventDefault();
    store.set('loggedIn', false);
    console.log ("Set loggedin to false");
    this.redirectToLogin();
  } 

  
  redirectToLogin = () => {
     this.props.history.push("/login");
  }

  render () {
  	return (
     <div>
        <Layout/>
        <form  onSubmit={this.handleSubmit}>
           <input type="submit" value="Log out" />
        </form>
      </div>
  	);
  }
}

export default withRouter(AppFrame);