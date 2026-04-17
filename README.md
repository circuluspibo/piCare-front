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
7. [빌드 및 배포](#7-빌드-및-배포)
8. [기기 접속 (SSH)](#8-기기-접속-ssh)
9. [라우팅 구조](#9-라우팅-구조)
10. [주요 Context / Hook](#10-주요-context--hook)
11. [외부 의존 서비스](#11-외부-의존-서비스)
12. [오프라인 테스트](#12-오프라인-테스트)
13. [알려진 이슈 & 개선사항](#13-알려진-이슈--개선사항)

---

## 1. 프로젝트 소개

`piCare Front`는 케어 로봇 기기 위에서 실행되는 메인 사용자 앱입니다. 어르신을 대상으로 한 6종의 AI 페르소나와 대화할 수 있으며, 한글 학습, 신체·인지 훈련, AI 창작 활동 등 다양한 콘텐츠를 터치 기반 UI로 제공합니다.

- **패키지명:** `circulus-hani-mini-portal`
- **앱 이름:** 또박한글 미니 포털
- **실행 포트:** `3000` (개발 서버)
- **형태:** PWA (Progressive Web App) — 오프라인 캐싱, 홈 화면 추가 지원
- **설계 원칙:** 인터넷 없는 환경(오프라인)에서의 사용을 전제로 설계. 모든 AI 추론은 기기 내 로컬 엔진에서 처리됨

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

| 분류        | 기술                                                 |
| ----------- | ---------------------------------------------------- |
| 프레임워크  | React 19, React Router v7                            |
| 번들러      | Vite 7                                               |
| 언어        | JavaScript (JSX)                                     |
| 스타일      | Tailwind CSS 3, Radix UI, shadcn/ui                  |
| 상태 관리   | React Context API, TanStack Query v5                 |
| AI / 미디어 | MediaPipe (Hands, Pose), TensorFlow.js, Tesseract.js |
| 통신        | Axios, MQTT                                          |
| UI 유틸     | Lucide React, Motion, Sonner, Chart.js               |
| PWA         | vite-plugin-pwa, Workbox                             |

---

## 4. 프로젝트 구조

```
src/
├── api/                  # 외부 서비스 호출
│   ├── cpuService.js     # TTS, 기기 UUID 조회 (CPU 엔진)
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
│   ├── GlobalContext.jsx      # 페르소나, 세션 ID, GPU 잠금 (hwId는 piCare-back에서 관리)
│   ├── VoiceChatContext.jsx   # STT→LLM→TTS 파이프라인
│   ├── LogContext.jsx         # 사용 로그 수집
│   └── learnContext.jsx       # 또박한글 학습 진도
├── hooks/                # 커스텀 훅
│   ├── useVoiceChat.js        # 음성 대화 로직
│   ├── useMainLogic.js        # 메인 홈 AI 자동 감지 루프
│   ├── useExerciseEngine.js   # 운동 감지 엔진
│   ├── useHaniOCR.js          # 한글 OCR 처리
│   ├── useHeartbeatLog.js     # 상태 주기적 로그 (90초)
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

scripts/
├── copy-mediapipe.js     # MediaPipe 에셋 → public/mediapipe/ 복사
└── copy-tesseract.js     # Tesseract 에셋 → public/tesseract/, kor.traineddata 다운로드

public/
├── mediapipe/            # MediaPipe WASM 모델 (postinstall로 복사)
├── tesseract/            # Tesseract.js 코어 (postinstall로 복사)
└── tessdata/             # 한글 OCR 언어 데이터 (postinstall로 다운로드)
```

---

## 5. 환경 변수

`.env` 파일에 아래 항목을 설정합니다. 기기의 실제 AI 엔진 포트에 맞게 수정해야 합니다.

| 변수명                      | 설명                                    | 기본값                              |
| --------------------------- | --------------------------------------- | ----------------------------------- |
| `VITE_CPU_BASE_URL`         | TTS 엔진 (CPU) 주소                     | `http://127.0.0.1:59530`            |
| `VITE_GPU_BASE_URL`         | STT / LLM / 이미지 생성 엔진 (GPU) 주소 | `http://127.0.0.1:59532`            |
| `VITE_NPU_BASE_URL`         | 영상 인식 엔진 (NPU) 주소               | `http://127.0.0.1:59531`            |
| `VITE_PICARE_BACK_BASE_URL` | piCare Back 중계 서버 주소              | `http://localhost:4000`             |
| `VITE_API_URL`              | 또박한글 Hani API 주소                  | `http://localhost:59421/v1`         |
| `VITE_HANI_URL`             | 또박한글 앱 URL (모드 파라미터 포함)    | `http://localhost:5173?mode=senior` |

---

## 6. 시작하기

**Node.js 버전:** `v20.19.3` (`.nvmrc` 참고)

```bash
# 1. Node 버전 맞추기
nvm use

# 2. 의존성 설치 (MediaPipe·Tesseract 에셋 자동 복사 포함)
npm install

# 3. 개발 서버 실행 (포트 3000)
npm run dev

# 4. 프로덕션 빌드
npm run build

# 5. 빌드 결과 미리보기
npm run preview

# 6. 코드 품질 검사
npm run lint
```

> **주의:** AI 기능(대화, 운동 감지, 이미지 생성)은 기기 내 NPU/CPU/GPU 엔진이 실행 중이어야 정상 동작합니다.

### MediaPipe / Tesseract 에셋 복사

오프라인 환경에서도 동작할 수 있도록 MediaPipe WASM 모델과 Tesseract.js 코어를 외부 CDN 대신 `public/` 디렉토리에 로컬로 복사합니다. `npm install` 시 `postinstall` 훅으로 자동 실행되지만, 필요 시 개별 실행도 가능합니다.

```bash
# MediaPipe 에셋 복사 (node_modules → public/mediapipe/)
npm run copy:mediapipe

# Tesseract 에셋 복사 + 한글 언어 데이터 다운로드 (public/tessdata/kor.traineddata, ~8MB)
npm run copy:tesseract
```

> **주의:** `copy:tesseract`는 최초 실행 시 GitHub에서 `kor.traineddata`를 다운로드합니다. 이미 `public/tessdata/kor.traineddata`가 존재하면 건너뜁니다. 파일이 없는 상태에서 인터넷 연결 없이 실행하면 다운로드가 실패합니다.

---

## 7. 빌드 및 배포

### 개발 PC → 기기 전송

```bash
# 빌드 후 기기로 전송 (IP 인자 또는 프롬프트 입력)
./deploy.sh 192.168.1.XXX
```

`deploy.sh`는 다음 순서로 동작합니다:
1. 기존 `dist/` 삭제
2. `npm run build` 실행
3. `front-YYMMDDHHmmss.tar`로 압축
4. `scp`로 기기의 `/home/picare/git/piCare-front/`에 전송

### 기기에서 압축 해제

기기에 SSH 접속 후 실행합니다.

```bash
# 자동 선택 (front-*.tar 중 최신 파일)
./extract.sh

# 파일 직접 지정
./extract.sh /home/picare/git/piCare-front/front-260415143000.tar
```

`extract.sh`는 다음 순서로 동작합니다:
1. 기존 `dist/` 삭제
2. tar 압축 해제 → `/home/picare/git/piCare-front/dist/`
3. tar 파일 자동 삭제

---

## 8. 기기 접속 (SSH)

piCare 기기는 사내 circulus Wi-Fi(192.168.1.x 대역)에 자동으로 연결됩니다.

### IP 확인

기기 부팅 시 화면 하단에 현재 기기의 네트워크 정보(IP 주소)가 표시됩니다.

```
예) 192.168.1.XXX
```

### SSH 접속

```bash
ssh picare@192.168.1.XXX
# password: 88888888
```

> **주의:** 사내 circulus Wi-Fi(1번대 네트워크)에 연결된 상태에서만 접속 가능합니다.

---

## 9. 라우팅 구조

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

## 10. 주요 Context / Hook

### Context

| Context            | 역할                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| `GlobalContext`    | 현재 페르소나 ID/음성, 세션 ID(5분 타임아웃), GPU 잠금 상태 |
| `VoiceChatContext` | STT → LLM 스트리밍 → TTS 재생 전체 파이프라인 제공                           |
| `LogContext`       | 기능 사용 로그를 piCare Back으로 전송                                        |
| `LearnContext`     | 또박한글 학습의 글자·챕터·방법 선택 상태 관리                               |

> `hwId`는 front에서 관리하지 않습니다. 모든 로그의 `hwId`는 piCare-back(포트 4000)이 CPU 서비스에서 로드한 값을 자동으로 주입합니다.

### 주요 Hook

| Hook                | 역할                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| `useVoiceChat`      | 마이크 녹음 → STT → LLM 스트리밍 → TTS 큐 재생                                 |
| `useMainLogic`      | 메인 홈에서 NPU 엔진 시작/중지, AI 자동 감지 루프(120초), Heartbeat(90초) 관리 |
| `useExerciseEngine` | MediaPipe 기반 신체 자세 감지 및 게임 판정                                     |
| `useHaniOCR`        | Tesseract.js로 필기 이미지를 한글 텍스트로 변환                                |
| `useHeartbeatLog`   | 90초마다 NPU 데이터를 비교해 변화 시에만 로그 전송                             |
| `useTracker`        | 기능별 사용 시간, 터치 횟수, 이탈 횟수, 점수 추적 및 저장                     |

---

## 11. 외부 의존 서비스

앱이 정상 동작하려면 아래 서비스들이 기기에서 실행 중이어야 합니다.

| 서비스      | 기본 포트 | 제공 기능                                                                                                     |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| CPU 엔진    | `59530`   | TTS 음성 합성 (`/v1/tts`), 기기 UUID 조회 (`GET /`)                                                           |
| GPU 엔진    | `59532`   | STT (`/v1/stt`), LLM 대화 (`/v1/txt2chat`), 이미지 생성 (`/txt2img`, `face2img`, `voice2wav`)                 |
| NPU 엔진    | `59531`   | 영상 수집 제어 (`/start_collection`, `/stop_collection`), Heartbeat (`/heartbeat`), 영상 피드 (`/video_feed`) |
| piCare Back | `4000`    | 로그 중계, 시스템 볼륨 제어                                                                                   |
| Hani API    | `59421`   | 또박한글 학습 세션·진도·시도 기록                                                                             |

---

## 12. 오프라인 테스트

로컬 서비스만 허용하고 외부 인터넷을 차단한 상태에서 앱이 정상 동작하는지 확인합니다.

```bash
# 기존 규칙 초기화
sudo iptables -F OUTPUT

# 규칙 적용 (루프백 허용 → 외부 차단)
sudo iptables -A OUTPUT -o lo -j ACCEPT
sudo iptables -A OUTPUT ! -d 192.168.1.0/24 -j DROP

# 서비스 상태 확인
curl -s --max-time 3 http://127.0.0.1:4000   && echo "piCare Back OK"  || echo "piCare Back 없음"
curl -s --max-time 3 http://127.0.0.1:59530  && echo "CPU 엔진 OK"     || echo "CPU 엔진 없음"
curl -s --max-time 3 http://127.0.0.1:59531  && echo "NPU 엔진 OK"     || echo "NPU 엔진 없음"
curl -s --max-time 3 http://127.0.0.1:59532  && echo "GPU 엔진 OK"     || echo "GPU 엔진 없음"
curl -s --max-time 3 https://google.com      && echo "온라인"          || echo "오프라인 확인"

# 테스트 후 규칙 해제
sudo iptables -D OUTPUT -o lo -j ACCEPT
sudo iptables -D OUTPUT ! -d 192.168.1.0/24 -j DROP

# 해제 확인
sudo iptables -L OUTPUT -n -v
```

---

## 13. 알려진 이슈 & 개선사항

### GPU 잠금 해제 조건 불명확

`GlobalContext`의 `isGpuLocked` 상태가 일부 예외 상황(AI 페이지에서 비정상 종료 등)에서 해제되지 않아 이후 GPU 기능 전체가 차단될 수 있습니다. 잠금 해제 조건과 타임아웃 처리 로직 보완이 필요합니다.

### TTS 큐 처리 중 메모리 누수 가능성

`useVoiceChat`에서 TTS 오디오를 재생하는 도중 컴포넌트가 언마운트될 경우, 생성된 Blob URL이 해제되지 않을 수 있습니다. 언마운트 시 큐 초기화 및 `URL.revokeObjectURL` 호출 보장이 필요합니다.

### 인터넷 미연결 시 로그 유실 (미구현)

현재 로그 전송 실패 시 재시도나 로컬 저장 없이 그냥 버려집니다.

**현재 흐름**
```
front → piCare-back (로컬, 항상 도달)
piCare-back → 외부 DB (인터넷 필요) → 실패 시 500 반환 → console.log 출력 후 끝
```

`GlobalContext.jsx`에 `localStorage.removeItem('pending_logs')` 주석 흔적이 있어 기획은 존재했으나 미구현 상태입니다.

**개선 방향**
- piCare-back에서 전송 실패한 로그를 SQLite 또는 파일로 임시 저장
- 인터넷 복구 시 자동으로 재전송하는 큐 처리 추가

---

## 14. 로그 수집 구조

모든 로그는 piCare-back(포트 4000)을 통해 외부 DB API로 중계됩니다. `hwId`는 piCare-back이 CPU 서비스에서 로드한 값을 자동으로 주입하며, front에서 별도로 관리하지 않습니다.

---

### 1. Heartbeat 로그

| 항목 | 내용 |
|---|---|
| **API** | `POST /v1/interaction_log` |
| **트리거** | `useMainLogic`이 90초마다 NPU에서 데이터를 폴링하여 `compareAndLog()` 호출 |
| **전송 조건** | 이전 데이터 대비 아래 중 하나라도 변경된 경우에만 전송 |
| **변경 감지 항목** | `cnt_live` (감지된 사람 수), `cnt_object` (감지된 사물 수), `human.emotion` (감정 상태) |

**전송 payload**
```json
{
  "type": "heartbeat",
  "content": {
    "cnt_live": 1,
    "cnt_object": 2,
    "human": { "emotion": "happy", ... },
    "env": { "temp": 24.5, "humidity": 55, "air": "G" }
  }
}
```

> 데이터 변화가 없으면 아무것도 전송하지 않음. 변화가 잦으면 90초보다 짧은 간격으로 여러 번 전송될 수 있음.

---

### 2. Activity 로그 (훈련 완료)

| 항목 | 내용 |
|---|---|
| **API** | `POST /v1/interaction_log` |
| **트리거** | `useTracker`의 `save()` 호출 시 — 각 훈련/학습 페이지에서 활동 완료 시점에 호출 |
| **type 값** | 현재 페이지 경로의 마지막 세그먼트 (예: `learn-word`, `exercise-flag`, `training-color`) |

**전송 payload**
```json
{
  "type": "learn-word",
  "content": {
    "currentPage": "learn-word",
    "startTime": 1713200000000,
    "endTime": 1713200300000,
    "idleCount": 1,
    "exitCount": 0,
    "touchCount": 12,
    "scores": { "total": 10, "success": 8, "time": 300 },
    "speechLog": ["가", "나"],
    "performance": "상",
    "engagement": "중",
    "satisfaction": "상",
    "isCompleted": true
  }
}
```

**평가 기준**
| 지표 | 상 | 중 | 하 |
|---|---|---|---|
| `performance` (수행도) | 정답률 ≥ 80% | 50~80% | < 50% |
| `engagement` (참여도) | 이탈 0회, 무반응 0회, 완료 | 이탈 1회 또는 무반응 ≥ 1회 | 이탈 ≥ 2회 또는 무반응 ≥ 5회 |
| `satisfaction` (만족도) | 완료 + speechLog ≥ 2개 | 완료 + speechLog < 2개 | 미완료 |

> **main 페이지 예외**: `type: "main"` 일 때는 `speechLog`의 마지막 항목만 `{ content: lastLog }` 형태로 전송

---

### 3. 하드웨어 상태 로그 (Cron — piCare-back)

| 항목 | 내용 |
|---|---|
| **API** | `POST /v1/status_log` |
| **트리거** | piCare-back Cron — 매 정시(`0 * * * *`) 자동 실행 |
| **수집 주체** | piCare-back (`bash` 명령어로 직접 수집, front 무관) |

**수집 항목**: 시스템 (CPU, 메모리, 디스크, 온도, 타임존), 디바이스 (USB 수/시간, 트래픽), 네트워크 (IP, Wi-Fi SSID/신호/채널, ISP, ping)

---

### 4. 전원 활동 로그 (Cron — piCare-back)

| 항목 | 내용 |
|---|---|
| **API** | `POST /v1/activity_log` |
| **트리거** | piCare-back Cron — 매 정시(`0 * * * *`) 자동 실행 |
| **수집 주체** | piCare-back (`bash` 명령어로 직접 수집, front 무관) |

**수집 항목**: 부팅 시각, 가동 시간, 이전 종료 시각, 이전 종료 후 경과 시간

---

### 5. Feature 로그

| 항목 | 내용 |
|---|---|
| **API** | `POST /v1/feature_log` |
| **현재 상태** | `postFeature()` 함수가 `src/api/picareService.js`에 정의되어 있으나 **현재 호출하는 곳 없음 (미사용)** |

---

### 로그 흐름 요약

```
[front - IndexPages]
  NPU 폴링 (90초) → 변화 감지 → POST /v1/interaction_log (heartbeat)

[front - 각 훈련 페이지]
  save() 호출 → POST /v1/interaction_log (activity, type = 페이지명)

[piCare-back - Cron]
  매 정시 → POST /v1/status_log   (하드웨어 상태)
  매 정시 → POST /v1/activity_log (전원 활동)

↓ 모두 piCare-back이 hwId 주입 후 외부 DB API로 중계
```

### AI 페이지 간 GPU 점유 충돌

`/ai/draw`, `/ai/mirror`, `/ai/voice` 페이지가 각각 GPU 엔진을 직접 호출하지만, 동시 점유에 대한 방어 로직이 없습니다. 메인 홈의 `isGpuLocked` 패턴을 AI 페이지에도 적용해야 합니다.

### 다국어 처리 미완성

`LanguageSystem.js`와 `currentLang` 상태가 존재하지만, UI 전반에 걸친 다국어 적용이 일관되지 않습니다. 언어 전환 시나리오와 지원 언어 범위를 정의해야 합니다.

### `feature_log` 미사용

`picareService.js`의 `postFeature()`가 정의되어 있으나 실제로 호출하는 곳이 없습니다. 훈련 기능별 세분화 로그가 필요한 경우 각 페이지에 연결이 필요합니다.
