# AGENTS.md — OneGrid 개발 에이전트 운영 규칙

> 대상: OneGrid를 개발하는 AI 코딩 에이전트, 개발자, 리뷰어, QA, 문서 담당자  
> 목적: 컨텍스트가 길어져도 엔터프라이즈급 프론트엔드 그리드 라이브러리라는 목표가 흔들리지 않도록 고정한다.  
> 최종 목표: 금융·공공 SI에서 사용할 수 있는 상용 그리드 수준의 OneGrid 1.0 릴리즈

---

## 0. 절대 원칙

1. **POC 금지**
   - OneGrid는 데모용 또는 POC용 그리드가 아니다.
   - 모든 기능은 상용 배포, 유지보수, 테스트, 문서화, 보안, 성능, 접근성을 전제로 설계한다.

2. **처음부터 확장 가능한 구조**
   - 헤더 병합, 그룹 헤더, 셀 병합, 고정 컬럼, 고정 행, 가상 스크롤, 서버 모드, 편집, 요약, 필터, 트리, 그룹핑, 피벗, 페이지네이션을 나중에 억지로 붙이지 않는다.
   - 레이아웃 엔진, 데이터 모델, 컬럼 모델, 병합 모델, 이벤트 모델, 플러그인 모델을 1차 설계 단계에서 함께 정의한다.

3. **10M ~ 100M rows 기준의 의미를 명확히 한다**
   - 10M ~ 100M rows는 전체 데이터를 브라우저 메모리에 적재하거나 전체 DOM을 생성한다는 의미가 아니다.
   - 목표는 `ServerRowModel`, `InfiniteRowModel`, `ViewportRowModel`, `SegmentedVirtualScroll`을 통해 대용량 데이터를 실사용자가 탐색·필터·정렬·조회할 수 있게 하는 것이다.
   - Client Mode는 브라우저 메모리 한계를 넘는 데이터를 강제로 처리하지 않는다.

4. **기능 하나는 코드만으로 완료되지 않는다**
   - 각 기능은 다음을 모두 포함해야 완료다.
     - TypeScript public type
     - core 구현
     - DOM renderer 또는 wrapper 연동
     - JavaScript 사용 예
     - React 예
     - Vue 예
     - Playwright E2E 테스트
     - 접근성/키보드 테스트
     - 성능 테스트 또는 성능 영향 검토
     - Docusaurus 문서
     - API 문서

5. **보안 기본값은 안전해야 한다**
   - `eval`, `new Function`, 문자열 기반 inline event handler 사용 금지.
   - 기본 cell/header renderer는 HTML을 escape한다.
   - HTML 렌더링은 명시적 opt-in이며 sanitizer 또는 DOM builder를 사용한다.
   - CSP nonce, Trusted Types 대응, style injection 제어를 설계에 포함한다.

6. **사용자 경험 기준으로 테스트한다**
   - UI 테스트는 내부 state만 검증하지 않는다.
   - Playwright로 실제 사용자가 보는 브라우저 화면, 키보드 이동, 마우스 조작, 편집, 메뉴, 스크롤, 시각 회귀를 검증한다.

7. **API는 단순해야 한다**
   - HTML/JS, React, Vue에서 동일한 정신 모델을 유지한다.
   - core API와 wrapper API는 이름, 이벤트, method 의미가 다르면 안 된다.

8. **라이선스 및 경쟁 제품 코드 복제 금지**
   - AG Grid, TUI Grid, RealGrid, IBSheet8 등은 기능 범위와 UX 벤치마크로만 참고한다.
   - 소스 코드, 비공개 API, 라이선스 제한 구현을 복제하지 않는다.

---

## 1. 매 작업 시작 전 필수 절차

새 작업을 시작하는 에이전트는 반드시 아래 순서대로 확인한다.

```text
1. AGENTS.md 읽기
2. ARCHITECT.md 읽기
3. CHECKLIST.md에서 현재 단계와 다음 미완료 항목 확인
4. 작업 범위가 OneGrid 1.0 목표와 충돌하는지 검토
5. 변경 대상 패키지와 테스트 범위 결정
6. 구현
7. 테스트
8. 문서·예제 반영
9. CHECKLIST.md 증빙 업데이트
```

작업자는 임의로 요구사항을 축소할 수 없다. 범위 축소가 필요하면 `CHECKLIST.md`의 `Risk / Decision Log`에 이유, 영향, 대안을 기록해야 한다.

---

## 2. 역할 정의

### 2.1 Architect Agent

책임:

- 패키지 구조, core contract, renderer contract, data source contract 유지
- public API 변경 승인
- feature dependency와 release gate 관리
- 대용량 성능 목표와 보안 목표 유지

금지:

- 임시 구현을 public API로 노출
- wrapper별 API 분기 방치
- header/cell merge를 단순 DOM colspan/rowspan 문제로 축소

### 2.2 Core Engine Agent

책임:

- row model, column model, state model, event bus, command bus, plugin system 구현
- sorting/filtering/grouping/aggregation/editing/selection/merge 계산의 순수 로직 구현
- DOM 의존성 없는 core 유지

필수:

- core package는 브라우저 DOM API에 직접 의존하지 않는다.
- 모든 core 기능은 unit test로 검증한다.

### 2.3 DOM Renderer Agent

책임:

- virtual scroll, column virtualization, frozen pane, header/body/footer/overlay 렌더링
- keyboard navigation, focus management, ARIA grid semantics
- editor overlay, menu overlay, portal/layer system

필수:

- DOM node 수는 전체 데이터 수가 아니라 viewport 크기와 buffer 크기에 비례해야 한다.
- pinned 영역, merge 영역, variable row height, summary/footer와 함께 동작해야 한다.

### 2.4 Framework Wrapper Agent

책임:

- React wrapper
- Vue wrapper
- lifecycle, ref/method bridge, event bridge, slot/template bridge

필수:

- wrapper는 core 기능을 재구현하지 않는다.
- React/Vue wrapper는 public option 의미를 vanilla JS와 동일하게 유지한다.

### 2.5 QA / Test Agent

책임:

- Playwright E2E
- visual regression
- accessibility test
- performance benchmark
- memory leak test
- browser matrix test

필수:

- 기능별 example page를 실제 사용자가 조작하는 방식으로 테스트한다.
- 내부 state assertion만으로 E2E를 완료 처리하지 않는다.

### 2.6 Docs Agent

책임:

- Docusaurus 문서
- API reference
- getting started
- migration guide
- sample catalog
- feature recipes

필수:

- 모든 public API는 문서화한다.
- 모든 기능은 JS/React/Vue 예제를 제공한다.

---

## 3. 코딩 규칙

### 3.1 TypeScript

- `strict: true` 필수
- `noImplicitAny: true` 필수
- public API에서 `any` 금지
- 내부 구현에서도 `unknown` 후 type narrowing 선호
- public type은 `@onegrid/core`에서 안정적으로 export한다.

### 3.2 파일 크기 제한

대형 파일은 후반부 유지보수 실패의 직접 원인이므로 제한한다.

| 파일 유형 | 최대 권장 LOC | 초과 시 조치 |
|---|---:|---|
| core source file | 350 | module split |
| renderer source file | 400 | layout/paint/event 분리 |
| wrapper source file | 300 | hooks/composables 분리 |
| unit test file | 500 | scenario별 분리 |
| Playwright spec file | 450 | feature별 spec 분리 |
| index/export file | 150 | barrel 정리 |
| docs page | 1,200 | guide/reference/recipe 분리 |

LOC 제한을 초과해야 하는 경우 `Risk / Decision Log`에 이유를 남긴다.

### 3.3 모듈 의존성

허용 방향:

```text
examples/apps/docs
    -> react/vue/dom
        -> dom
            -> core
                -> shared utils
```

금지 방향:

```text
core -> dom
core -> react
core -> vue
dom -> react/vue
shared utils -> grid feature package
```

### 3.4 Public API 안정성

- `GridOptions`, `ColumnDef`, `GridApi`, `DataSource`, `RowModel`, `Plugin`은 semver 기준으로 관리한다.
- breaking change는 1.0 전에도 `API_CHANGELOG.md`에 기록한다.
- wrapper에서만 존재하는 API를 만들지 않는다. 불가피하면 이유를 문서화한다.

---

## 4. 품질 게이트

모든 PR 또는 작업 단위는 아래를 통과해야 한다.

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm test:a11y
pnpm test:perf:smoke
pnpm build
pnpm docs:build
```

성능 핵심 변경은 추가로 아래를 수행한다.

```bash
pnpm bench:virtual-scroll
pnpm bench:server-row-model
pnpm bench:memory
pnpm test:e2e:visual
```

---

## 5. 기능 완료 기준

각 기능은 아래 Definition of Done을 충족해야 한다.

```text
[ ] 설계가 ARCHITECT.md와 충돌하지 않는다.
[ ] public type이 정의되었다.
[ ] core unit test가 있다.
[ ] DOM/renderer 테스트가 있다.
[ ] JS example이 있다.
[ ] React example이 있다.
[ ] Vue example이 있다.
[ ] Playwright E2E가 있다.
[ ] visual snapshot 또는 screenshot assertion이 있다.
[ ] keyboard interaction 테스트가 있다.
[ ] a11y 검토가 있다.
[ ] docs guide가 있다.
[ ] API reference가 있다.
[ ] 성능 영향이 측정되거나 명시적으로 무관함을 기록했다.
[ ] CHECKLIST.md에 증빙 링크 또는 파일 경로를 기록했다.
```

---

## 6. 보안 규칙

### 6.1 CSP

OneGrid는 다음 CSP 환경에서 동작 가능해야 한다.

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{nonce}';
  style-src 'self' 'nonce-{nonce}';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
```

필수 구현:

- style injection 시 nonce 전달 지원
- inline script 미사용
- inline event handler 미사용
- unsafe-eval 미사용
- 사용자 HTML sanitizer
- URL formatter의 protocol allowlist

### 6.2 Renderer 보안

기본 renderer는 다음 규칙을 따른다.

```ts
cellRenderer: ({ value }) => string
```

- string 반환값은 기본적으로 text로 취급한다.
- HTML로 해석하려면 명시적으로 아래처럼 사용한다.

```ts
cellRenderer: {
  kind: 'html',
  sanitize: true,
  render: ({ value }) => `<b>${escapeHtml(value)}</b>`
}
```

권장 방식은 DOM builder다.

```ts
cellRenderer: {
  kind: 'element',
  render: ({ value, h }) => h('span', { class: 'price' }, String(value))
}
```

---

## 7. 테스트 규칙

### 7.1 Playwright E2E 원칙

테스트는 사용자가 보는 기능으로 검증한다.

예:

```ts
await page.goto('/examples/filter/set-filter');
await page.getByRole('columnheader', { name: 'Status' }).click();
await page.getByRole('menuitem', { name: 'Filter' }).click();
await page.getByRole('checkbox', { name: 'Completed' }).check();
await expect(page.getByRole('grid')).toContainText('Completed');
await expect(page).toHaveScreenshot('set-filter-applied.png');
```

### 7.2 금지되는 E2E

```ts
// 금지: 내부 상태만 확인하고 사용자가 보는 결과를 검증하지 않음
expect(await page.evaluate(() => grid.__state.filter)).toEqual(...);
```

내부 상태 검증은 보조적으로만 사용한다.

### 7.3 필수 사용자 시나리오

- 마우스로 컬럼 리사이즈
- 마우스로 컬럼 이동
- 키보드 셀 이동
- 키보드 편집 시작/취소/저장
- 스크롤로 대용량 데이터 탐색
- 헤더 메뉴 열기/필터 적용/정렬 변경
- 컨텍스트 메뉴 실행
- 행 선택/범위 선택/복사/붙여넣기
- 페이지네이션 이동
- 서버 모드 데이터 요청
- 병합 셀 클릭/선택/복사
- frozen column + merge + virtual scroll 조합
- theme 전환
- CSP nonce 환경 실행

---

## 8. 예제 작성 규칙

예제는 단순 showcase가 아니라 기능 검증의 기준이다.

각 예제는 최소한 다음 파일을 가진다.

```text
examples/{feature}/
  vanilla.html
  vanilla.ts
  react.tsx
  vue.vue
  data.ts
  README.md
  e2e.spec.ts
```

모든 예제는 example catalog에 등록한다.

```text
apps/examples/src/catalog.ts
```

예제 ID는 CHECKLIST.md의 feature ID와 일치해야 한다.

---

## 9. 성능 원칙

### 9.1 가상화 불변식

- 전체 row 수가 증가해도 DOM row node 수는 viewport + overscan 범위를 넘지 않는다.
- 전체 column 수가 증가해도 center 영역 DOM cell 수는 visible columns + overscan 범위를 넘지 않는다.
- pinned 영역은 별도 virtualization 정책을 가진다.
- summary/footer/header는 body virtualization과 분리한다.

### 9.2 100M rows 대응

100M rows에서 필수:

- 서버 기반 total row count
- logical row index
- segmented scroll mapping
- seek/jump API
- viewport request cancellation
- request dedupe
- cache eviction
- optimistic skeleton row
- scroll velocity 기반 prefetch

금지:

- 100M row 배열 생성
- 100M row key map 전역 생성
- totalRows * rowHeight로 단일 scroll height를 무제한 생성
- 모든 group aggregate를 client에서 계산

---

## 10. 변경 기록 규칙

각 작업 후 아래 형식으로 CHECKLIST.md에 기록한다.

```md
- [x] F-EDIT-001 Text editor lifecycle 구현
  - Evidence:
    - packages/core/src/editing/editorLifecycle.ts
    - packages/dom/src/editing/EditorOverlay.ts
    - apps/examples/src/features/editing/text-editor
    - tests/e2e/editing/text-editor.spec.ts
    - docs/features/editing/text-editor.mdx
  - Verified:
    - pnpm test:unit -- editing
    - pnpm test:e2e -- editing/text-editor
  - Notes:
    - IME composition 테스트는 F-EDIT-IME-001에서 별도 진행
```

---

## 11. 릴리즈 전 금지 상태

OneGrid 1.0은 아래 상태로 릴리즈할 수 없다.

- core API가 wrapper별로 다르게 동작함
- 서버 모드가 단순 fetch wrapper 수준임
- header merge와 cell merge가 frozen/virtual scroll과 함께 깨짐
- examples가 일부 기능만 포함함
- Playwright E2E가 내부 상태 위주임
- CSP 테스트가 없음
- 문서가 API 중심이고 실제 사용 시나리오가 부족함
- 성능 테스트가 100K 이하 데이터만 다룸
- 파일 크기 제한을 지속적으로 위반함
- 위험 항목이 기록되지 않음

---

## 12. 현재 작업자가 항상 기억할 한 문장

**OneGrid는 “잘 보이는 테이블”이 아니라 금융·공공 SI 현장에서 수년간 유지보수할 수 있는 엔터프라이즈 데이터 그리드 플랫폼이다.**
