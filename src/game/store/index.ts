import { createStore } from 'redux';
import { devToolsEnhancer } from '@redux-devtools/extension';
import { gameReducer } from './reducer';
import { createInitialState } from './initialState';

export const store = createStore(
  gameReducer,
  createInitialState(),
  devToolsEnhancer({ name: 'Slow Cooker' })
);
