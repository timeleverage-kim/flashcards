import {
  addCard,
  deleteCard,
  getTodayDateString,
  parseStoredCards,
} from './cards.js';

const STORAGE_KEY = 'flashcards_v1';

// 앱의 현재 상태
const state = {
  cards: [],
};

// DOM 요소 참조
const elements = {
  storageAlert: document.getElementById('storageAlert'),
  addCardForm: document.getElementById('addCardForm'),
  frontInput: document.getElementById('frontInput'),
  backInput: document.getElementById('backInput'),
  formMessage: document.getElementById('formMessage'),
  totalCount: document.getElementById('totalCount'),
  listEmptyMessage: document.getElementById('listEmptyMessage'),
  cardList: document.getElementById('cardList'),
};

/**
 * localStorage에서 카드 목록을 불러오고, 손상 시 경고 배너를 띄운다.
 * @returns {Array<object>}
 */
function loadCardsFromStorage() {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  const { cards, corrupted } = parseStoredCards(rawValue);

  if (corrupted) {
    elements.storageAlert.textContent =
      '저장된 카드 데이터가 손상되어 빈 목록으로 복구했습니다.';
    elements.storageAlert.hidden = false;
  } else {
    elements.storageAlert.hidden = true;
  }

  return cards;
}

/**
 * 현재 카드 목록을 localStorage에 저장한다.
 * @param {Array<object>} cards
 */
function saveCardsToStorage(cards) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

/**
 * 카드 추가 폼의 안내 메시지를 표시한다.
 * @param {string} message
 * @param {boolean} [isSuccess]
 */
function setFormMessage(message, isSuccess = false) {
  elements.formMessage.textContent = message;
  elements.formMessage.classList.toggle('is-success', isSuccess);
}

/**
 * 전체 카드 목록 영역을 화면에 그린다.
 */
function renderCardList() {
  elements.totalCount.textContent = `총 ${state.cards.length}장`;
  elements.cardList.innerHTML = '';

  if (state.cards.length === 0) {
    elements.listEmptyMessage.hidden = false;
    return;
  }

  elements.listEmptyMessage.hidden = true;
  const fragment = document.createDocumentFragment();

  for (const card of state.cards) {
    const listItem = document.createElement('li');
    listItem.className = 'card-item';

    const mainDiv = document.createElement('div');
    mainDiv.className = 'card-item-main';

    const wordsDiv = document.createElement('div');
    wordsDiv.className = 'card-item-words';

    const frontSpan = document.createElement('span');
    frontSpan.className = 'card-front';
    frontSpan.textContent = card.front;

    const backSpan = document.createElement('span');
    backSpan.className = 'card-back';
    backSpan.textContent = card.back;

    wordsDiv.append(frontSpan, backSpan);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'card-item-meta';

    const boxSpan = document.createElement('span');
    boxSpan.textContent = `상자 ${card.box}`;

    const dateSpan = document.createElement('span');
    dateSpan.textContent = `다음 복습: ${card.nextReviewDate}`;

    metaDiv.append(boxSpan, dateSpan);
    mainDiv.append(wordsDiv, metaDiv);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn-delete';
    deleteButton.textContent = '삭제';
    deleteButton.dataset.cardId = card.id;

    listItem.append(mainDiv, deleteButton);
    fragment.append(listItem);
  }

  elements.cardList.append(fragment);
}

/**
 * 새 카드 추가 폼 제출 이벤트를 처리한다.
 * @param {SubmitEvent} event
 */
function handleAddCardSubmit(event) {
  event.preventDefault();
  const today = getTodayDateString();
  const result = addCard(state.cards, {
    front: elements.frontInput.value,
    back: elements.backInput.value,
    today,
  });

  if (!result.ok) {
    setFormMessage(result.message, false);
    return;
  }

  state.cards = result.cards;
  saveCardsToStorage(state.cards);
  elements.addCardForm.reset();
  elements.frontInput.focus();
  setFormMessage(`"${result.card.front}" 카드를 추가했습니다.`, true);
  renderCardList();
}

/**
 * 카드 목록의 삭제 버튼 클릭 이벤트를 처리한다.
 * @param {MouseEvent} event
 */
function handleCardListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.cardId) {
    return;
  }

  const confirmed = window.confirm('정말 삭제할까요?');
  if (!confirmed) {
    return;
  }

  state.cards = deleteCard(state.cards, target.dataset.cardId);
  saveCardsToStorage(state.cards);
  renderCardList();
}

/**
 * 앱을 초기화하고 이벤트 리스너를 등록한다.
 */
function initApp() {
  state.cards = loadCardsFromStorage();
  elements.addCardForm.addEventListener('submit', handleAddCardSubmit);
  elements.cardList.addEventListener('click', handleCardListClick);
  renderCardList();
}

initApp();
