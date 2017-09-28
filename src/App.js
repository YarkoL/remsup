"use strict"
import React from 'react';  
import ReactDOM from 'react-dom';
import store from 'store';
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

//init store values
store.set('loggedIn', true);	//FOR DEV ONLY please don't ***FORGET*** to change this OK??
store.set('session', null);

const destination = document.getElementById("app");

ReactDOM.render( <App />, destination );