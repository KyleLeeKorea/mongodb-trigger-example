# MongoDB 트리거 예제

이 예제는 MongoDB Change Streams를 사용하여 간단한 트리거 시스템을 구현합니다.

## 📋 프로젝트 개요

- **목적**: MongoDB Change Streams를 활용한 실시간 트리거 시스템 구현
- **기능**: 사용자 생성/수정 시 자동 로그 생성 (MongoDB + 파일)
- **기술**: Node.js, Express.js, MongoDB, Change Streams

## 🎯 기능

- **사용자 생성** → 자동으로 로그 생성 (MongoDB + 파일)
- **사용자 수정** → 자동으로 로그 생성 (MongoDB + 파일)
- **날짜별 로그 파일** → `logs/trigger-YYYY-MM-DD.log` 형식으로 저장
- **실시간 모니터링** → 웹 인터페이스에서 확인

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 의존성 설치
npm install
```

### 2. 환경 변수 설정

`.env` 파일 생성:
```bash
cp env.example .env
```

`.env` 파일에서 MongoDB 연결 정보를 수정하세요:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
PORT=3030
```

### 3. 서버 실행

```bash
# 서버 실행
node index.js

# 또는 개발 모드
npm run dev
```

### 4. 웹 인터페이스 접속

```
http://localhost:3030
```

## 📝 사용 방법

1. **사용자 생성**: 이름, 이메일, 나이 입력 후 "사용자 생성" 클릭
2. **자동 로그**: 사용자 생성 시 자동으로 로그가 생성됨 (MongoDB + 파일)
3. **로그 확인**: "MongoDB 로그 새로고침" 또는 "로그 파일 목록" 버튼으로 확인

## 🔧 API 엔드포인트

- `POST /api/users` - 사용자 생성
- `GET /api/users` - 사용자 목록 조회
- `GET /api/logs` - MongoDB 로그 목록 조회
- `GET /api/log-files` - 로그 파일 목록 조회
- `GET /api/log-files/:filename` - 특정 로그 파일 내용 조회
- `GET /health` - 서버 상태 확인

## 📊 데이터베이스 구조

### users 컬렉션
```json
{
  "_id": "ObjectId",
  "name": "홍길동",
  "email": "hong@example.com",
  "age": 30,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### logs 컬렉션
```json
{
  "_id": "ObjectId",
  "action": "user_created",
  "data": {
    "userId": "ObjectId",
    "name": "홍길동",
    "email": "hong@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "message": "user_created 이벤트 발생"
}
```

## 🎯 트리거 동작

1. **사용자 생성 시**:
   - `users` 컬렉션에 새 문서 삽입
   - Change Stream이 변경 감지
   - `logs` 컬렉션과 날짜별 파일에 자동으로 로그 생성

2. **사용자 수정 시**:
   - `users` 컬렉션 문서 업데이트
   - Change Stream이 변경 감지
   - `logs` 컬렉션과 날짜별 파일에 수정 로그 생성

## 🛠️ 테스트

```bash
# 서버 상태 확인
curl http://localhost:3030/health

# 사용자 생성 테스트
curl -X POST http://localhost:3030/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트","email":"test@example.com","age":25}'

# MongoDB 로그 확인
curl http://localhost:3030/api/logs

# 로그 파일 목록 확인
curl http://localhost:3030/api/log-files
```

## 📁 파일 구조

```
TriggerApp/
├── index.js             # 메인 서버
├── public/
│   └── index.html      # 웹 인터페이스
├── logs/               # 날짜별 로그 파일들
│   ├── trigger-2024-01-01.log
│   └── trigger-2024-01-02.log
├── package.json        # 의존성
├── .env               # 환경 변수
└── README.md          # 이 파일
```

