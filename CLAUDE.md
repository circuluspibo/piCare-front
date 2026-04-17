# CLAUDE.md — piCare-front

> Claude Code가 이 저장소에서 작업할 때 참고하는 안내 문서입니다.

---

## 1. 프로젝트 개요

**piCare-front** (또박한글 미니 포털)은 노인 돌봄 로봇용 React PWA다. 멀티 페르소나 대화 AI, MediaPipe 신체·손 동작 감지, Tesseract.js 한글 손글씨 OCR, 인지 훈련 미니게임을 통합한다.

| 항목 | 내용 |
|---|---|
| 런타임 / 플랫폼 | Node.js v20.19.3 (`.nvmrc` 참조) |
| 프레임워크 | React 18 + Vite (PWA) |
| 데이터베이스 | 없음 (상태는 Context + TanStack Query로 관리) |
| 로컬 주소 | http://localhost:3000 |
| 기타 | MediaPipe, Tesseract.js 에셋은 `postinstall`로 `public/`에 복사 |

---

## 2. 연결된 레포

| 레포 | 경로 | 설명 |
|---|---|---|
| BE | `../piCare-back` | piCare 백엔드 (로그, 볼륨 제어) |

**백엔드 서비스별 연결 포트:**

| 서비스 파일 | 포트 | 용도 |
|---|---|---|
| `cpuService.js` | 59530 | TTS 합성 |
| `gpuService.js` | 59532 | STT, LLM 채팅, 이미지 생성, 음성 복제 |
| `npuService.js` | 59531 | 영상 피드 제어, 하트비트 |
| `haniService.js` | 59421 | 한글 학습 API |
| `picareService.js` | 4000 | piCare Back 릴레이 (로그, 볼륨) |

모든 Base URL은 `.env`의 `VITE_*` 변수에서 가져온다.

---

## 3. 기술 스택

| 레이어 | 기술 |
|---|---|
| UI 프레임워크 | React 18 |
| 번들러 | Vite |
| 서버 상태 관리 | TanStack Query |
| 클라이언트 상태 | React Context (GlobalContext, LogContext, VoiceChatContext) |
| 동작 감지 | MediaPipe Hands / Pose |
| OCR | Tesseract.js (한글) |
| 스타일 | CSS Modules / 인라인 스타일 |
| 린터 | ESLint |

---

## 4. 명령어

```bash
# 개발 서버
npm run dev          # Vite dev server (port 3000)

# 빌드
npm run build        # 프로덕션 빌드
npm run preview      # 프로덕션 빌드 미리보기

# 기타
npm run lint         # ESLint 검사
npm run postinstall  # MediaPipe + Tesseract 에셋을 public/에 복사 (install 후 자동 실행)
```

테스트 러너 없음. 코드 품질은 ESLint로만 관리.

---

## 5. 아키텍처

### 엔트리포인트 흐름

```
src/main.jsx
  └── QueryProvider (TanStack Query)
        └── GlobalContext (페르소나, 세션, GPU 락)
              └── LogContext (사용 이벤트 로깅)
                    └── VoiceChatContext (STT→LLM→TTS 파이프라인)
                          └── Router + Routes
```

### 라우팅 구조

```
/              → IndexPages (AI 페르소나 홈, NPU 카메라 피드)
/learn/*       → 한글 학습 모듈 (자모 → 챕터 → 학습 방법)
/exercise/*    → 신체 훈련 (깃발/머리/잡기 제스처 게임)
/ai/*          → AI 창작 (음성→이미지, 얼굴→이미지, 음성 복제)
/training/*    → 인지 훈련 (색깔/숫자/피아노)
```

각 라우트 그룹은 `src/Layouts/`의 Layout 래퍼로 공통 UI(사이드바, 내비게이션)를 제공한다.

### 주요 모듈 / 서비스

| 파일·디렉토리 | 역할 |
|---|---|
| `src/contexts/GlobalContext` | 페르소나, 세션 ID, GPU 락, 센서 데이터 전역 상태. hwId는 관리하지 않음 (piCare-back에서 주입) |
| `src/contexts/VoiceChatContext` | 음성 파이프라인 (STT → LLM → TTS → 재생 큐) |
| `src/utils/PersonaSystem.js` | 6종 페르소나별 LLM 프롬프트 및 TTS 음성 ID 정의 |
| `src/hooks/useMainLogic` | 메인 페이지: NPU 자동 감지 루프, 환경 모니터링 |
| `src/hooks/useExerciseEngine` | MediaPipe 손·자세 감지 기반 운동 게임 엔진 |
| `src/hooks/useHaniOCR` | Tesseract.js 한글 OCR (`LearnByWrite` 전용) |
| `src/hooks/useHeartbeatLog` | NPU 데이터 변화 감지 시 heartbeat 로그 전송. hwId 의존성 없이 마운트 즉시 동작 |
| `src/hooks/useTracker` | 사용 분석 이벤트 기록 |
| `src/assets/data/personaData.js` | 페르소나 메타데이터 |
| `src/assets/data/haniCharacters.js` | 한글 학습 모듈용 자모 목록 |
| `src/assets/data/exerciseEngine.js` | 운동 정의 및 제스처 매핑 |
| `src/api/` | 백엔드 서비스별 API 클라이언트 |
| `src/Layouts/` | 라우트 그룹별 Layout 래퍼 |

### 디렉토리 구조

```
piCare-front/
├── src/
│   ├── api/          # 서비스별 API 클라이언트
│   ├── assets/       # 정적 데이터, 이미지
│   ├── contexts/     # React Context (전역 상태)
│   ├── hooks/        # 커스텀 훅
│   ├── Layouts/      # 라우트별 Layout 래퍼
│   ├── pages/        # 라우트 페이지 컴포넌트
│   └── utils/        # 유틸리티 (PersonaSystem 등)
├── public/           # 정적 에셋 (MediaPipe, Tesseract 모델)
├── .env              # 환경변수 (VITE_* 변수)
└── vite.config.js    # @ → src/ 경로 별칭 설정
```

**경로 별칭:** `@` → `src/` (`jsconfig.json` 및 `vite.config.js` 설정)

---

## 6. 인증

- **방식**: 세션 ID (`sId`) 기반 — 인증 서버 없음
- **토큰 전달**: 없음 (내부 로봇 네트워크 전용)
- **현재 상태**: `sId`는 5분 비활성 후 `GlobalContext`에서 자동 재생성

---

## 7. 주요 제약 / 주의사항

- NPU 영상 피드 URL: `IndexPages.jsx`에서 `VITE_NPU_BASE_URL` 환경 변수로 관리됨
- **hwId는 front에서 관리하지 않음**: 모든 로그의 `hwId`는 piCare-back(포트 4000)이 CPU 서비스에서 로드한 값을 자동 주입. `picareService.js`의 payload에 hwId를 포함시키지 말 것
- `isGpuLocked`가 컴포넌트 비정상 언마운트 시 해제되지 않을 수 있음
- TTS Blob URL이 언마운트 시 revoke되지 않아 메모리 누수 가능
- `/ai/*` 페이지에 GPU 락이 없어 홈 페이지 GPU 사용과 충돌 가능
- `LanguageSystem.js` 다국어 지원 미완성

---

## 8. 운영 시 주의사항

- MediaPipe / Tesseract 모델 파일은 `npm install` 후 `postinstall`로 `public/`에 자동 복사됨 — 배포 시 이 단계가 실행되었는지 확인
- 모든 백엔드 서비스 포트(59530, 59531, 59532, 59421, 4000)가 로봇 로컬 네트워크에서 접근 가능해야 함
- `.env`의 `VITE_*` 변수가 올바르게 설정되지 않으면 API 호출 전체가 실패함
- GPU 락(`isGpuLocked`)은 STT/LLM/이미지 요청의 동시 실행을 막는 뮤텍스 — 동시 GPU 작업이 필요한 기능 추가 시 반드시 고려
