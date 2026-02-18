import { createStore, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import { devToolsEnhancer } from '@redux-devtools/extension';
import { gameReducer } from './reducer';
import { createInitialState } from './initialState';

const enhancer = compose(applyMiddleware(thunk), devToolsEnhancer({ name: 'Slow Cooker' }));

export const store = createStore(gameReducer, createInitialState(), enhancer);
