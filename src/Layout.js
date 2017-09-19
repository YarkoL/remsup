"use strict"
import React from 'react';  

const Header = () => (
	<header></header>
)

const Left = () => (
	<div className="left">
	    <img className="center" src = "img/clock.jpg"/>
	  	<div id="buttons">
	  		<div id="buttongroup" className="center">
		  		<button>Live feed</button><br/>
		  		<button>Review logs</button><br/>
		  		<button>Manage users</button><br/>
	  		</div>
	  	</div>
	</div>
)

const Middle = () => (
	<div className="middle"></div>
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
