import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './App';

const mount = document.createElement('div');
document.body.appendChild(mount);
ReactDOM.render(React.createElement(App), mount);
