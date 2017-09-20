"use strict"
import React from 'react';  
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import Layout from './Layout';
import Login from './Login';

const App = () => (
	<Router>
	<Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Layout} />
    </Switch>
	</Router>
)

const destination = document.getElementById("app");

ReactDOM.render( <App />, destination );