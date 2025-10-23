const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB 연결
let db = null;
let client = null;

// 로그 디렉토리 설정
const LOGS_DIR = path.join(__dirname, 'logs');

// 로그 디렉토리 생성
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    console.log('📁 로그 디렉토리 생성:', LOGS_DIR);
}

async function connectDB() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://it_admin:manager@prod01.npgjj.mongodb.net/triggerapp';
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('triggerapp');
        console.log('✅ MongoDB 연결 성공');
        
        // 트리거 시작
        startTriggers();
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error);
    }
}

// 간단한 트리거 시스템
function startTriggers() {
    console.log('🚀 트리거 시작...');
    
    // 사용자 컬렉션 감시
    const usersCollection = db.collection('users');
    const changeStream = usersCollection.watch();
    
    changeStream.on('change', async (change) => {
        try {
            console.log(`📝 변경 감지: ${change.operationType}`);
            
            if (change.operationType === 'insert') {
                // 새 사용자 생성 시 로그 자동 생성
                await createLog('user_created', {
                    userId: change.fullDocument._id,
                    name: change.fullDocument.name,
                    email: change.fullDocument.email
                });
            }
            
            if (change.operationType === 'update') {
                // 사용자 수정 시 로그 자동 생성
                await createLog('user_updated', {
                    userId: change.documentKey._id,
                    changes: change.updateDescription.updatedFields
                });
            }
            
        } catch (error) {
            console.error('❌ 트리거 오류:', error);
        }
    });
    
    console.log('✅ 트리거 설정 완료');
}

// 날짜별 로그 파일에 저장하는 함수
function writeLogToFile(action, data) {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        const logFileName = `trigger-${dateStr}.log`;
        const logFilePath = path.join(LOGS_DIR, logFileName);
        
        const logEntry = {
            timestamp: now.toISOString(),
            action: action,
            data: data,
            message: `${action} 이벤트 발생`
        };
        
        // 파일에 로그 추가 (append)
        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(logFilePath, logLine, 'utf8');
        
        console.log(`📄 파일 로그 저장: ${logFileName}`);
    } catch (error) {
        console.error('❌ 파일 로그 저장 실패:', error);
    }
}

// 로그 생성 함수 (MongoDB + 파일)
async function createLog(action, data) {
    try {
        // MongoDB에 저장
        const logsCollection = db.collection('logs');
        await logsCollection.insertOne({
            action: action,
            data: data,
            timestamp: new Date(),
            message: `${action} 이벤트 발생`
        });
        
        // 파일에도 저장
        writeLogToFile(action, data);
        
        console.log(`📝 로그 생성 완료: ${action} (MongoDB + 파일)`);
    } catch (error) {
        console.error('❌ 로그 생성 실패:', error);
    }
}

// API 라우트

// 사용자 생성
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, age } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: '이름과 이메일은 필수입니다.' });
        }
        
        const usersCollection = db.collection('users');
        const result = await usersCollection.insertOne({
            name,
            email,
            age: age || 0,
            createdAt: new Date()
        });
        
        res.json({
            message: '사용자가 생성되었습니다.',
            userId: result.insertedId
        });
    } catch (error) {
        console.error('사용자 생성 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 사용자 목록 조회
app.get('/api/users', async (req, res) => {
    try {
        const usersCollection = db.collection('users');
        const users = await usersCollection.find({}).toArray();
        
        // ObjectId를 문자열로 변환
        const formattedUsers = users.map(user => ({
            ...user,
            _id: user._id.toString()
        }));
        
        res.json(formattedUsers);
    } catch (error) {
        console.error('사용자 목록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 로그 목록 조회 (MongoDB)
app.get('/api/logs', async (req, res) => {
    try {
        const logsCollection = db.collection('logs');
        const logs = await logsCollection.find({}).sort({ timestamp: -1 }).limit(50).toArray();
        
        res.json(logs);
    } catch (error) {
        console.error('로그 조회 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 로그 파일 목록 조회
app.get('/api/log-files', (req, res) => {
    try {
        const files = fs.readdirSync(LOGS_DIR)
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const filePath = path.join(LOGS_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.modified - a.modified); // 최신순 정렬
        
        res.json(files);
    } catch (error) {
        console.error('로그 파일 목록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 특정 로그 파일 내용 조회
app.get('/api/log-files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(LOGS_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        const logs = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return { raw: line };
            }
        });
        
        res.json(logs);
    } catch (error) {
        console.error('로그 파일 내용 조회 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 헬스 체크
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🌐 서버가 포트 ${PORT}에서 실행 중입니다.`);
    connectDB();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 서버 종료 중...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

