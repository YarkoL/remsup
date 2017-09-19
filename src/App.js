"use strict"
import React from 'react';  
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import Layout from './Layout';

const App = () => (
	<Router>
		<Layout/>
	</Router>
)

const destination = document.getElementById("app");

ReactDOM.render( <App />, destination );