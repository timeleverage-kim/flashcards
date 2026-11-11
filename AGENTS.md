# Flashcards — 에이전트 작업 규칙

## 프로젝트 개요
라이트너 학습법을 사용하는 단어 암기 카드 웹 앱. 명세는 SPEC.md가 유일한 기준이다.

## 폴더 구조
- index.html        : 화면 뼈대
- style.css         : 스타일
- src/cards.js      : 순수 로직 (DOM, localStorage 접근 금지). export 함수만.
- src/app.js        : 화면 처리 (DOM 조작, 이벤트, localStorage)
- test/*.test.js    : node:test 테스트

## 명령
- 테스트: npm test
- 실행: npm start (http://localhost:3000)

## 규칙
- SPEC.md에 없는 기능은 추가하지 않는다. 필요하면 먼저 제안하고 묻는다.
- 로직은 src/cards.js에, 화면 코드는 src/app.js에 둔다.
- 외부 라이브러리를 설치하지 않는다.
- 테스트 파일(test/)은 사람의 허락 없이 수정하지 않는다.

## 완료의 정의 (Definition of Done)
1. npm test 가 모두 통과한다.
2. 변경한 기능과 관련된 SPEC.md 완료 기준(AC)을 브라우저에서 확인했다.
3. 마지막 보고에 "어떤 AC를 어떻게 확인했는지"를 적는다.