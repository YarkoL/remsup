import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import { mount } from 'enzyme';
import { MemoryRouter as Router } from 'react-router-dom'

import AppFrame from '../src/AppFrame';

describe('AppFrame', () => {
	it('renders without crashing', () => {
	    	mount(<Router><AppFrame/></Router>);
	});
});

