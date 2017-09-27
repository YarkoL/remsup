"use strict"
import React from 'react';  
import ReactDOM from 'react-dom';
import store from 'store';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import AppFrame from './AppFrame';
import Login from './Login';
//import Rtc from './Rtc';

const Test = () => {<p>TEST</p>};

const App = () => (
	<Router>
	<Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={AppFrame} />
      <Route path="/rtc" component = {Test} /> 
    </Switch>
	</Router>
)
store.set('loggedIn', true);//TODO DONT FORGET TO CHANGE
const destination = document.getElementById("app");

ReactDOM.render( <App />, destination );