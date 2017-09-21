import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import { mount } from 'enzyme';
import { MemoryRouter as Router } from 'react-router-dom'

import Login from '../src/Login';

describe('Login', () => {
	it('renders without crashing', () => {
	    	mount(<Router><Login/></Router>);
	});
});

