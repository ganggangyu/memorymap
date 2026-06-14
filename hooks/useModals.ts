import { useReducer } from 'react';

type ModalName =
  | 'yearInReview'
  | 'birthday'
  | 'lanterns'
  | 'incense'
  | 'achievements'
  | 'importUrl'
  | 'dbConfig'
  | 'collage'
  | 'dice'
  | 'book';

type ModalState = Record<ModalName, boolean>;

type ModalAction = { type: 'open' | 'close' | 'toggle'; modal: ModalName };

const reducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case 'open':
      return { ...state, [action.modal]: true };
    case 'close':
      return { ...state, [action.modal]: false };
    case 'toggle':
      return { ...state, [action.modal]: !state[action.modal] };
  }
};

const initialState: ModalState = {
  yearInReview: false,
  birthday: false,
  lanterns: false,
  incense: false,
  achievements: false,
  importUrl: false,
  dbConfig: false,
  collage: false,
  dice: false,
  book: false,
};

export const useModals = () => {
  const [modals, dispatch] = useReducer(reducer, initialState);

  const open = (modal: ModalName) => dispatch({ type: 'open', modal });
  const close = (modal: ModalName) => dispatch({ type: 'close', modal });
  const toggle = (modal: ModalName) => dispatch({ type: 'toggle', modal });

  return { modals, open, close, toggle };
};
