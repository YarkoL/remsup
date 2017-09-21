"use strict"
import React from 'react';  
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import AppFrame from './AppFrame';
import Login from './Login';

const App = () => (
	<Router>
	<Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={AppFrame} />
    </Switch>
	</Router>
)

const destination = document.getElementById("app");

ReactDOM.render( <App />, destination );