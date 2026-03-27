# piCare Front

> 노인 케어 로봇용 사용자 인터페이스 — 또박한글 학습, 신체·인지 훈련, AI 창작 활동을 하나의 앱으로 제공하는 PWA입니다.

---

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [주요 기능](#2-주요-기능)
3. [기술 스택](#3-기술-스택)
4. [프로젝트 구조](#4-프로젝트-구조)
5. [환경 변수](#5-환경-변수)
6. [시작하기](#6-시작하기)
7. [라우팅 구조](#7-라우팅-구조)
8. [주요 Context / Hook](#8-주요-context--hook)
9. [외부 의존 서비스](#9-외부-의존-서비스)
10. [알려진 이슈 & 개선사항](#10-알려진-이슈--개선사항)

---

## 1. 프로젝트 소개

`piCare Front`는 케어 로봇 기기 위에서 실행되는 메인 사용자 앱입니다. 어르신을 대상으로 한 6종의 AI 페르소나와 대화할 수 있으며, 한글 학습, 신체·인지 훈련, AI 창작 활동 등 다양한 콘텐츠를 터치 기반 UI로 제공합니다.

- **패키지명:** `circulus-hani-mini-portal`
- **앱 이름:** 또박한글 미니 포털
- **실행 포트:** `3000` (개발 서버)
- **형태:** PWA (Progressive Web App) — 오프라인 캐싱, 홈 화면 추가 지원

---

## 2. 주요 기능

### 또박한글 학습 (`/learn`)
한글 자음·모음·단어를 단계별로 학습하는 기능입니다. 듣기, 읽기, 말하기, 쓰기 4가지 학습 방법을 제공하며, 쓰기는 `tesseract.js` 기반 OCR로 필기를 인식합니다. 학습 진도는 Hani API 서버와 연동되어 저장됩니다.

### 신체 훈련 (`/exercise`)
`@mediapipe/hands`, `@mediapipe/pose`, TensorFlow.js를 활용해 카메라로 신체 자세를 실시간 인식합니다.
- **깃발 게임 (`/exercise/flag`):** 팔을 들어 방향에 맞는 깃발 조작
- **머리 운동 (`/exercise/head`):** 고개 방향 인식 훈련
- **물건 잡기 게임 (`/exercise/grab`):** 손 동작으로 화면의 과일 잡기

### 인지 훈련 (`/training`)
색깔, 숫자, 피아노 건반 인식을 활용한 두뇌 자극 미니게임입니다.

### AI 창작 활동 (`/ai`)
GPU 엔진 기반의 생성형 AI 기능입니다.
- **목소리로 그림 그리기 (`/ai/draw`):** 음성 명령으로 이미지 생성 (Txt2Img)
- **매직 미러 (`/ai/mirror`):** 카메라 사진을 AI로 변환 (Face2Img)
- **음성 복제 (`/ai/voice`):** 녹음된 음성을 다른 목소리로 변환 (Voice2Wav)

### 메인 홈 (`/`)
6종 페르소나(할아버지·할머니·남성·여성·소년·소녀)와 STT → LLM → TTS 파이프라인으로 실시간 대화합니다. 실내 온도·습도·공기질 정보와 시스템 볼륨 조절도 제공합니다.

---

## 3. 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | React 19, React Router v7 |
| 번들러 | Vite 7 |
| 언어 | JavaScript (JSX) |
| 스타일 | Tailwind CSS 3, Radix UI, shadcn/ui |
| 상태 관리 | React Context API, TanStack Query v5 |
| AI / 미디어 | MediaPipe (Hands, Pose), TensorFlow.js, Tesseract.js |
| 통신 | Axios, MQTT |
| UI 유틸 | Lucide React, Motion, Sonner, Chart.js |
| PWA | vite-plugin-pwa, Workbox |

---

## 4. 프로젝트 구조

```
src/
├── api/                  # 외부 서비스 호출
│   ├── cpuService.js     # TTS (CPU 엔진)
│   ├── gpuService.js     # STT, LLM, 이미지 생성 (GPU 엔진)
│   ├── npuService.js     # 영상 인식 수집 제어 (NPU 엔진)
│   ├── haniService.js    # 또박한글 학습 API
│   └── picareService.js  # piCare Back 중계 서버 (로그, 볼륨)
├── assets/
│   └── data/             # 페르소나, 버튼 라벨, 운동 엔진 정적 데이터
├── components/           # 공통 UI 컴포넌트
│   ├── ui/               # 버튼, 카드, 토스트 등 기본 요소
│   └── magicui/          # 애니메이션 효과 컴포넌트
├── contexts/             # 전역 상태
│   ├── GlobalContext.jsx      # 페르소나, 세션 ID, GPU 잠금
│   ├── VoiceChatContext.jsx   # STT→LLM→TTS 파이프라인
│   ├── LogContext.jsx         # 사용 로그 수집
│   └── learnContext.jsx       # 또박한글 학습 진도
├── hooks/                # 커스텀 훅
│   ├── useVoiceChat.js        # 음성 대화 로직
│   ├── useMainLogic.js        # 메인 홈 AI 자동 감지 루프
│   ├── useExerciseEngine.js   # 운동 감지 엔진
│   ├── useHaniOCR.js          # 한글 OCR 처리
│   ├── useHeartbeatLog.js     # 상태 주기적 로그
│   └── useTracker.js          # 사용 추적
├── Layouts/              # 라우트별 레이아웃 래퍼
├── pages/                # 라우트 페이지 컴포넌트
│   ├── ai/               # AI 창작 활동 페이지
│   ├── exercise/         # 신체 훈련 페이지
│   ├── hani/             # 또박한글 학습 페이지
│   └── training/         # 인지 훈련 페이지
├── provider/             # TanStack Query Provider
└── utils/                # 공통 유틸리티
    ├── PersonaSystem.js       # 페르소나별 시스템 프롬프트
    ├── LanguageSystem.js      # 다국어 처리
    └── weatherUtils.js        # 날씨 상태 판별
```

---

## 5. 환경 변수

`.env` 파일에 아래 항목을 설정합니다. 기기의 실제 AI 엔진 포트에 맞게 수정해야 합니다.

| 변수명 | 설명 | 기본값 |
|---|---|---|
| `VITE_CPU_BASE_URL` | TTS 엔진 (CPU) 주소 | `http://127.0.0.1:59530` |
| `VITE_GPU_BASE_URL` | STT / LLM / 이미지 생성 엔진 (GPU) 주소 | `http://127.0.0.1:59532` |
| `VITE_NPU_BASE_URL` | 영상 인식 엔진 (NPU) 주소 | `http://127.0.0.1:59531` |
| `VITE_PICARE_BACK_BASE_URL` | piCare Back 중계 서버 주소 | `http://localhost:4000` |
| `VITE_API_URL` | 또박한글 Hani API 주소 | `http://localhost:59421/v1` |
| `VITE_HANI_URL` | 또박한글 앱 URL (모드 파라미터 포함) | `http://localhost:5173?mode=senior` |

---

## 6. 시작하기

**Node.js 버전:** `v20.19.3` (`.nvmrc` 참고)

```bash
# 1. Node 버전 맞추기
nvm use

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행 (포트 3000)
npm run dev

# 4. 프로덕션 빌드
npm run build

# 5. 빌드 결과 미리보기
npm run preview
```

> **주의:** AI 기능(대화, 운동 감지, 이미지 생성)은 기기 내 NPU/CPU/GPU 엔진이 실행 중이어야 정상 동작합니다.

---

## 7. 라우팅 구조

```
/                          # 메인 홈 (AI 페르소나 대화)
├── /learn                 # 또박한글 학습
│   ├── /learn/:character          # 학습 대상 글자 선택
│   ├── /learn/:character/:chapter # 챕터 선택
│   └── /learn/:character/:chapter/:method  # 학습 실행 (듣기/읽기/말하기/쓰기)
├── /exercise              # 신체 훈련
│   ├── /exercise/flag     # 깃발 게임
│   ├── /exercise/head     # 머리 운동
│   └── /exercise/grab     # 물건 잡기 게임
├── /ai                    # AI 창작 활동
│   ├── /ai/draw           # 목소리로 그림 그리기
│   ├── /ai/mirror         # 매직 미러
│   └── /ai/voice          # 음성 복제
└── /training              # 인지 훈련
    ├── /training/color    # 색깔 훈련
    ├── /training/number   # 숫자 훈련
    └── /training/piano    # 피아노 훈련
```

---

## 8. 주요 Context / Hook

### Context

| Context | 역할 |
|---|---|
| `GlobalContext` | 현재 페르소나 ID/음성, 세션 ID(5분 타임아웃), GPU 잠금 상태 관리 |
| `VoiceChatContext` | STT → LLM 스트리밍 → TTS 재생 전체 파이프라인 제공 |
| `LogContext` | 기능 사용 로그를 piCare Back으로 전송 |
| `LearnContext` | 또박한글 학습의 글자·챕터·방법 선택 상태 관리 |

### 주요 Hook

| Hook | 역할 |
|---|---|
| `useVoiceChat` | 마이크 녹음 → STT → LLM 스트리밍 → TTS 큐 재생 |
| `useMainLogic` | 메인 홈에서 NPU 엔진 시작/중지, AI 자동 감지 루프(120초), Heartbeat(90초) 관리 |
| `useExerciseEngine` | MediaPipe 기반 신체 자세 감지 및 게임 판정 |
| `useHaniOCR` | Tesseract.js로 필기 이미지를 한글 텍스트로 변환 |
| `useHeartbeatLog` | 주기적으로 상태를 비교해 로그 전송 |
| `useTracker` | 기능별 사용 시간 및 행동 추적 |

---

## 9. 외부 의존 서비스

앱이 정상 동작하려면 아래 서비스들이 기기에서 실행 중이어야 합니다.

| 서비스 | 기본 포트 | 제공 기능 |
|---|---|---|
| CPU 엔진 | `59530` | TTS 음성 합성 (`/v1/tts`) |
| GPU 엔진 | `59532` | STT (`/v1/stt`), LLM 대화 (`/v1/txt2chat`), 이미지 생성 (`/txt2img`, `face2img`, `voice2wav`) |
| NPU 엔진 | `59531` | 영상 수집 제어 (`/start_collection`, `/stop_collection`), Heartbeat (`/heartbeat`), 영상 피드 (`/video_feed`) |
| piCare Back | `4000` | 로그 중계, 시스템 볼륨 제어 |
| Hani API | `59421` | 또박한글 학습 세션·진도·시도 기록 |

---

## 10. 알려진 이슈 & 개선사항

### 하드코딩된 NPU 영상 피드 URL
`IndexPages.jsx`에서 NPU 영상 피드 URL이 `http://127.0.0.1:59531/video_feed`로 직접 하드코딩되어 있습니다. 환경 변수 `VITE_NPU_BASE_URL`을 참조하도록 수정이 필요합니다.

### GPU 잠금 해제 조건 불명확
`GlobalContext`의 `isGpuLocked` 상태가 일부 예외 상황(AI 페이지에서 비정상 종료 등)에서 해제되지 않아 이후 GPU 기능 전체가 차단될 수 있습니다. 잠금 해제 조건과 타임아웃 처리 로직 보완이 필요합니다.

### TTS 큐 처리 중 메모리 누수 가능성
`useVoiceChat`에서 TTS 오디오를 재생하는 도중 컴포넌트가 언마운트될 경우, 생성된 Blob URL이 해제되지 않을 수 있습니다. 언마운트 시 큐 초기화 및 `URL.revokeObjectURL` 호출 보장이 필요합니다.

### AI 페이지 간 GPU 점유 충돌
`/ai/draw`, `/ai/mirror`, `/ai/voice` 페이지가 각각 GPU 엔진을 직접 호출하지만, 동시 점유에 대한 방어 로직이 없습니다. 메인 홈의 `isGpuLocked` 패턴을 AI 페이지에도 적용해야 합니다.

### PWA 서비스워커 개발 모드 비활성화
`vite.config.js`의 `devOptions.enabled`가 주석 처리되어 있어, 개발 중 서비스워커 동작을 확인할 수 없습니다. 개발/운영 환경별 서비스워커 전략을 명시적으로 정의할 필요가 있습니다.

### 다국어 처리 미완성
`LanguageSystem.js`와 `currentLang` 상태가 존재하지만, UI 전반에 걸친 다국어 적용이 일관되지 않습니다. 언어 전환 시나리오와 지원 언어 범위를 정의해야 합니다.
