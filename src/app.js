"use strict"
import React from 'react';  
import ReactDOM from 'react-dom';

var appFrame = (
	<div>
	<div id="container">
		<header></header>
		<main>
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
		  <div className="middle"></div>
		  <div className="right"></div>
		</main>
	</div>
	</div>
);

const destination = document.getElementById("app");

ReactDOM.render( appFrame, destination );