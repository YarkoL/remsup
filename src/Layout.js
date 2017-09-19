"use strict"
import React from 'react';  
import { Switch, Route, Link } from 'react-router-dom';

//MAIN VIEWS

const LiveFeed = () => (
	<h1>Live feed</h1>
)

const ViewLogs = () => (
	<h1>View logs</h1>
)

const UserManagement = () => (
	<h1>User Management</h1>
)

//APPFRAME LAYOUT

const Header = () => (
	<header></header>
)

const Left = () => (
	<div className="left">
	    <img className="center" src = "img/clock.jpg"/>
	  	<div id="buttons">
	  		<div id="buttongroup" className="center">
		  		<button><Link to="/">Live feed</Link></button><br/>
		  		<button><Link to="/logs">Review logs</Link></button><br/>
		  		<button><Link to="/users">Manage users</Link></button><br/>
	  		</div>
	  	</div>
	</div>
)

const Middle = () => (
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



export default Layout;
