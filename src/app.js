import {
  addCard,
  deleteCard,
  getCardsByIds,
  getDueCards,
  getTodayDateString,
  gradeCard,
  parseStoredCards,
  searchCards,
  shuffleCards,
} from './cards.js';

const STORAGE_KEY = 'flashcards_v1';

// 앱의 현재 상태
const state = {
  cards: [],
  studyQueue: [], // 오늘 학습할 카드 ID 목록 (무작위 순서)
  unknownCardIds: [], // 이번 학습에서 '몰라요'를 선택한 카드 ID 목록
  isFlipped: false, // 현재 학습 카드의 뒤집힘 여부
  searchQuery: '', // 카드 목록 검색어
};

// DOM 요소 참조
const elements = {
  storageAlert: document.getElementById('storageAlert'),
  addCardForm: document.getElementById('addCardForm'),
  frontInput: document.getElementById('frontInput'),
  backInput: document.getElementById('backInput'),
  formMessage: document.getElementById('formMessage'),
  dueCount: document.getElementById('dueCount'),
  studyNoCardsMessage: document.getElementById('studyNoCardsMessage'),
  studyDoneWrap: document.getElementById('studyDoneWrap'),
  studyDoneMessage: document.getElementById('studyDoneMessage'),
  retryUnknownBtn: document.getElementById('retryUnknownBtn'),
  restartStudyBtn: document.getElementById('restartStudyBtn'),
  studyArea: document.getElementById('studyArea'),
  studyCardWrap: document.getElementById('studyCardWrap'),
  studyCardBox: document.getElementById('studyCardBox'),
  studyFlipHint: document.getElementById('studyFlipHint'),
  studyCard: document.getElementById('studyCard'),
  studyCardFront: document.getElementById('studyCardFront'),
  studyCardBackWrap: document.getElementById('studyCardBackWrap'),
  studyCardBack: document.getElementById('studyCardBack'),
  unknownBtn: document.getElementById('unknownBtn'),
  knownBtn: document.getElementById('knownBtn'),
  totalCount: document.getElementById('totalCount'),
  searchInput: document.getElementById('searchInput'),
  listEmptyMessage: document.getElementById('listEmptyMessage'),
  searchEmptyMessage: document.getElementById('searchEmptyMessage'),
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
 * 현재 학습 대기열의 첫 번째 카드 객체를 찾아 반환한다.
 * @returns {object | undefined}
 */
function getCurrentStudyCard() {
  if (state.studyQueue.length === 0) {
    return undefined;
  }
  const currentId = state.studyQueue[0];
  return state.cards.find((card) => card.id === currentId);
}

/**
 * 오늘의 학습 영역(F3, F4)을 화면에 그린다.
 */
function renderStudyPanel() {
  elements.dueCount.textContent = `남은 카드 ${state.studyQueue.length}장`;

  // 전체 카드가 0장일 때
  if (state.cards.length === 0) {
    elements.studyNoCardsMessage.hidden = false;
    elements.studyArea.hidden = true;
    return;
  }

  elements.studyNoCardsMessage.hidden = true;
  elements.studyArea.hidden = false;
  const currentCard = getCurrentStudyCard();

  // 오늘 복습할 카드가 0장일 때 (학습 완료 상태)
  // 완료 메시지와 '몰라요 카드 다시 학습' / '전체 학습 재시작' 버튼을 보여주고, '알아요' / '몰라요' 버튼은 비활성화한다.
  if (!currentCard) {
    const unknownCards = getCardsByIds(state.cards, state.unknownCardIds);
    elements.studyDoneWrap.hidden = false;
    elements.studyDoneMessage.hidden = false;
    elements.retryUnknownBtn.hidden = false;
    elements.retryUnknownBtn.textContent = `몰라요 카드 다시 학습 (${unknownCards.length}장)`;
    elements.retryUnknownBtn.disabled = unknownCards.length === 0;
    elements.restartStudyBtn.hidden = false;
    elements.studyCardWrap.hidden = true;
    elements.unknownBtn.disabled = true;
    elements.knownBtn.disabled = true;
    return;
  }

  // 복습할 카드가 있을 때
  elements.studyDoneWrap.hidden = true;
  elements.studyDoneMessage.hidden = true;
  elements.retryUnknownBtn.hidden = true;
  elements.restartStudyBtn.hidden = true;
  elements.studyCardWrap.hidden = false;

  elements.studyCardBox.textContent = `상자 ${currentCard.box}`;
  elements.studyCardFront.textContent = currentCard.front;
  elements.studyCardBack.textContent = currentCard.back;

  if (state.isFlipped) {
    elements.studyCard.classList.add('is-flipped');
    elements.studyCardBackWrap.hidden = false;
    elements.studyFlipHint.textContent = '기억 여부에 따라 아래 버튼을 선택하세요';
    elements.unknownBtn.disabled = false;
    elements.knownBtn.disabled = false;
  } else {
    elements.studyCard.classList.remove('is-flipped');
    elements.studyCardBackWrap.hidden = true;
    elements.studyFlipHint.textContent = '카드를 클릭해 뜻을 확인하세요';
    elements.unknownBtn.disabled = true;
    elements.knownBtn.disabled = true;
  }
}

/**
 * 전체 카드 목록 영역(F2, F7)을 화면에 그린다.
 */
function renderCardList() {
  elements.totalCount.textContent = `총 ${state.cards.length}장`;
  elements.cardList.innerHTML = '';

  if (state.cards.length === 0) {
    elements.listEmptyMessage.hidden = false;
    elements.searchEmptyMessage.hidden = true;
    return;
  }

  elements.listEmptyMessage.hidden = true;
  const filteredCards = searchCards(state.cards, state.searchQuery);

  if (filteredCards.length === 0) {
    elements.searchEmptyMessage.hidden = false;
    return;
  }

  elements.searchEmptyMessage.hidden = true;
  const fragment = document.createDocumentFragment();

  for (const card of filteredCards) {
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
    dateSpan.textContent = `다음 복습: ${card.nextReview ?? card.nextReviewDate}`;

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

  // getDueCards를 사용해 새로 추가된 카드가 오늘 복습 대상인지 확인 후 대기열에 포함한다.
  const dueAdded = getDueCards([result.card], today);
  if (dueAdded.length > 0) {
    state.studyQueue.push(result.card.id);
  }

  elements.addCardForm.reset();
  elements.frontInput.focus();
  setFormMessage(`"${result.card.front}" 카드를 추가했습니다.`, true);
  renderStudyPanel();
  renderCardList();
}

/**
 * 학습 카드 클릭(뒤집기) 이벤트를 처리한다.
 */
function handleStudyCardClick() {
  if (!getCurrentStudyCard()) {
    return;
  }
  state.isFlipped = true;
  renderStudyPanel();
}

/**
 * 학습 카드 평가(알아요/몰라요) 버튼 클릭을 처리한다.
 * @param {boolean} isKnown
 */
function handleReview(isKnown) {
  const currentCard = getCurrentStudyCard();
  if (!currentCard || !state.isFlipped) {
    return;
  }

  const today = getTodayDateString();
  state.cards = state.cards.map((card) =>
    card.id === currentCard.id ? gradeCard(card, isKnown, today) : card
  );
  saveCardsToStorage(state.cards);

  // '몰라요'를 선택한 카드는 기록해 두고, '알아요'를 선택하면 목록에서 제외한다.
  if (!isKnown) {
    if (!state.unknownCardIds.includes(currentCard.id)) {
      state.unknownCardIds.push(currentCard.id);
    }
  } else {
    state.unknownCardIds = state.unknownCardIds.filter((id) => id !== currentCard.id);
  }

  // 현재 카드를 학습 대기열에서 제거하고 다음 카드로 넘어간다.
  state.studyQueue.shift();
  state.isFlipped = false;

  renderStudyPanel();
  renderCardList();
}

/**
 * '몰라요 카드 다시 학습' 버튼 클릭 이벤트를 처리한다.
 * 이번 학습에서 '몰라요'를 선택한 카드들만 무작위로 섞어 다시 학습 대기열에 채운다.
 */
function handleRetryUnknown() {
  const unknownCards = getCardsByIds(state.cards, state.unknownCardIds);
  if (unknownCards.length === 0) {
    return;
  }

  const restartedCards = shuffleCards(unknownCards);
  state.studyQueue = restartedCards.map((card) => card.id);
  state.unknownCardIds = [];
  state.isFlipped = false;
  renderStudyPanel();
}

/**
 * '전체 학습 재시작' 버튼 클릭 이벤트를 처리한다.
 * 전체 카드를 무작위로 섞어(현재 상자 번호는 유지) 다시 학습 대기열에 채운다.
 */
function handleRestartStudy() {
  if (state.cards.length === 0) {
    return;
  }

  const restartedCards = shuffleCards(state.cards);
  state.studyQueue = restartedCards.map((card) => card.id);
  state.unknownCardIds = [];
  state.isFlipped = false;
  renderStudyPanel();
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

  const deletedId = target.dataset.cardId;
  const wasCurrentStudyCard = state.studyQueue[0] === deletedId;

  state.cards = deleteCard(state.cards, deletedId);
  state.studyQueue = state.studyQueue.filter((id) => id !== deletedId);
  state.unknownCardIds = state.unknownCardIds.filter((id) => id !== deletedId);
  if (wasCurrentStudyCard) {
    state.isFlipped = false;
  }

  saveCardsToStorage(state.cards);
  renderStudyPanel();
  renderCardList();
}

/**
 * 검색창 입력 이벤트를 처리한다.
 */
function handleSearchInput() {
  state.searchQuery = elements.searchInput.value;
  renderCardList();
}

/**
 * 앱을 초기화하고 이벤트 리스너를 등록한다.
 */
function initApp() {
  state.cards = loadCardsFromStorage();
  const today = getTodayDateString();
  const dueCards = getDueCards(state.cards, today);
  state.studyQueue = dueCards.map((card) => card.id);
  state.unknownCardIds = [];
  state.isFlipped = false;

  elements.addCardForm.addEventListener('submit', handleAddCardSubmit);
  elements.studyCard.addEventListener('click', handleStudyCardClick);
  elements.retryUnknownBtn.addEventListener('click', handleRetryUnknown);
  elements.restartStudyBtn.addEventListener('click', handleRestartStudy);
  elements.unknownBtn.addEventListener('click', () => handleReview(false));
  elements.knownBtn.addEventListener('click', () => handleReview(true));
  elements.searchInput.addEventListener('input', handleSearchInput);
  elements.cardList.addEventListener('click', handleCardListClick);

  renderStudyPanel();
  renderCardList();
}

initApp();
