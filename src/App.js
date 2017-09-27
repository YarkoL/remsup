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
store.set('loggedIn', true);//TODO DONT FORGET TO CHANGE
const destination = document.getElementById("app");

ReactDOM.render( <App />, destination );