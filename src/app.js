"use strict"
import React from 'react';  
import ReactDOM from 'react-dom';

var appFrame = (
	<div>
	<div id="container">
		<header></header>
		<main>
		  <div className="left"></div>
		  <div className="middle"></div>
		  <div className="right"></div>
		</main>
	</div>
	</div>
	);

const destination = document.getElementById("app");

ReactDOM.render( appFrame, destination );