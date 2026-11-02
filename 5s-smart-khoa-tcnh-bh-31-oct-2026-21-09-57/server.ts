import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_ROOMS, INITIAL_SETTINGS, INITIAL_INSPECTIONS, INITIAL_TASKS, INITIAL_SCHEDULES, INITIAL_NOTIFICATIONS } from './src/data/initialDb.ts';
import { DEMO_USERS, DEFAULT_CHECKLIST } from './src/data/defaultData.ts';
import { calculateInspectionScore, generateCorrectiveTasks } from './src/utils/5s-logic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  rooms: any[];
  inspections: any[];
  tasks: any[];
  schedules: any[];
  notifications: any[];
  settings: any;
  users: any[];
}

function getInitialDb(): DatabaseSchema {
  return {
    rooms: INITIAL_ROOMS,
    inspections: INITIAL_INSPECTIONS,
    tasks: INITIAL_TASKS,
    schedules: INITIAL_SCHEDULES,
    notifications: INITIAL_NOTIFICATIONS,
    settings: INITIAL_SETTINGS,
    users: DEMO_USERS,
  };
}

function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading DB_FILE, fallback to initial state:', err);
  }
  const initial = getInitialDb();
  saveDb(initial);
  return initial;
}

function saveDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB_FILE:', err);
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable large body size for base64 image inspection uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Health and Gemini status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    model: 'gemini-3.8-flash',
    faculty: 'Khoa Tài chính - Ngân hàng và Bảo hiểm (UNETI)',
    timestamp: new Date().toISOString(),
  });
});

// Helper to extract base64 data and mimeType
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }
  return {
    mimeType: 'image/jpeg',
    data: dataUrl,
  };
}

// 1. AI 5S Evaluation Endpoint
app.post('/api/ai-evaluate-5s', async (req, res) => {
  try {
    const { roomId, roomName, roomType, checklist, photos, userNotes } = req.body;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        error: 'Chưa có ảnh để đánh giá. Vui lòng chụp hoặc tải lên ít nhất 1 ảnh khu vực.',
      });
    }

    if (!checklist || !Array.isArray(checklist) || checklist.length === 0) {
      return res.status(400).json({
        error: 'Danh sách tiêu chí kiểm tra (checklist) không hợp lệ.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống.',
        details: 'Vui lòng thiết lập khóa API Gemini trong bảng Settings > Secrets của AI Studio để sử dụng tính năng đánh giá 5S bằng AI.',
        code: 'MISSING_API_KEY',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Format checklist for the prompt
    const checklistPrompt = checklist
      .map(
        (c: any, index: number) =>
          `${index + 1}. [ID: ${c.id}] [Mã: ${c.code || c.id}] [Nhóm: ${c.categoryName || c.category}] ${c.name} - Mô tả: ${c.description || ''} - Hướng dẫn: ${c.guidelines || ''}`
      )
      .join('\n');

    // Prepare photos information & parts
    const parts: any[] = [];

    // Context note for photos
    let photoDescriptions = 'DANH SÁCH ẢNH ĐƯỢC CUNG CẤP TỪ NGƯỜI DÙNG:\n';
    photos.slice(0, 8).forEach((p: any, idx: number) => {
      const photoNum = idx + 1;
      photoDescriptions += `Ảnh số ${photoNum}: ${p.contextNote || p.name || 'Góc chụp chung'}\n`;
      const parsed = parseDataUrl(p.dataUrl);
      parts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      });
    });

    const userPrompt = `Bạn là Chuyên gia Đánh giá 5S độc lập của Trường Đại học Kinh tế – Kỹ thuật Công nghiệp (UNETI), thực hiện đánh giá cho Khoa Tài chính – Ngân hàng và Bảo hiểm.
Khu vực kiểm tra: "${roomName}" (Mã nội bộ: ${roomId}, Loại khu vực: ${roomType}).
Ghi chú bổ sung từ người kiểm tra: "${userNotes || 'Không có'}".

${photoDescriptions}

DANH SÁCH TIÊU CHÍ CHECKLIST CỦA PHÒNG (BẮT BUỘC ĐÁNH GIÁ ĐÚNG VÀ ĐỦ THEO CÁC ID NÀY):
${checklistPrompt}

QUY TẮC ĐÁNH GIÁ NGHIÊM NGẶT (CRITICAL CONSTRAINTS):
0. XÁC THỰC BỐI CẢNH CĂN PHÒNG: Nếu ảnh cung cấp hoàn toàn KHÔNG phải là không gian căn phòng/khu vực học tập/văn phòng/thiết bị giảng dạy (ví dụ: ảnh selfie cá nhân, phong cảnh không liên quan, đồ vật ngoài lề, ảnh đen/trắng trống), BẮT BUỘC nêu rõ trong summary và đánh giá TẤT CẢ tiêu chí là "INSUFFICIENT_EVIDENCE" hoặc "FAILED" với lý do "Ảnh không chứa bối cảnh căn phòng hoặc khu vực kiểm tra". TUYỆT ĐỐI KHÔNG đánh giá "PASSED" khi ảnh không có căn phòng.
1. Chỉ nhận xét những gì quan sát thấy rõ ràng trong ${photos.length} bức ảnh và mô tả bối cảnh.
2. KHÔNG mặc định đồ vật đang để trên bàn là rác/thừa nếu đang trong ca làm việc hoặc giờ thực hành.
3. KHÔNG kết luận thiết bị hỏng hay hồ sơ hết hạn nếu không có bằng chứng hình ảnh rõ ràng.
4. Nếu ảnh mờ, tối, bị che khuất hoặc góc chụp chưa bao quát được tiêu chí, BẮT BUỘC trả về status: "INSUFFICIENT_EVIDENCE" và nêu rõ bằng chứng/góc chụp cần bổ sung trong "evidenceNeeded".
5. TUYỆT ĐỐI KHÔNG tự chuyển tiêu chí thiếu bằng chứng thành "NOT_APPLICABLE" để làm đẹp điểm số.
6. Với các tiêu chí về ý thức, phân công trách nhiệm, sổ sách định kỳ nếu ảnh không thể hiện được, hãy đánh giá "INSUFFICIENT_EVIDENCE" và đề nghị người kiểm tra kiểm tra trực tiếp sổ sách.
7. KHÔNG đưa ra nhận xét chung chung như "Cần 5S tốt hơn". Mỗi vấn đề phải chỉ rõ: Ảnh số mấy, vị trí cụ thể (ví dụ: "Phát hiện dây điện chùng võng trên lối đi dãy 2 trong ảnh số 2...").
8. Đưa ra gợi ý khắc phục thực tế, khả thi (ví dụ: dùng nẹp bán nguyệt, dán nhãn phân loại, xếp ghế sát gầm bàn).
9. Mọi ID tiêu chí trong mảng "proposals" PHẢI trùng khớp 100% với các ID trong checklist: ${checklist.map((c: any) => c.id).join(', ')}.`;

    parts.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction:
          'Bạn là hệ thống AI phân tích hình ảnh chuyên biệt đánh giá 5S trong môi trường giáo dục đại học (Khoa Tài chính Ngân hàng & Bảo hiểm). Luôn trả về dữ liệu JSON có cấu trúc chính xác theo schema quy định, bằng tiếng Việt chuẩn mực, khách quan, chính xác.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Tóm tắt tổng quan hiện trạng 5S qua các ảnh quan sát được, nêu bật các điểm tốt và các vấn đề chính.',
            },
            proposals: {
              type: Type.ARRAY,
              description: 'Danh sách đề xuất đánh giá cho từng tiêu chí trong checklist.',
              items: {
                type: Type.OBJECT,
                properties: {
                  criterionId: {
                    type: Type.STRING,
                    description: 'ID chính xác của tiêu chí trong checklist.',
                  },
                  criterionName: {
                    type: Type.STRING,
                    description: 'Tên tiêu chí.',
                  },
                  status: {
                    type: Type.STRING,
                    description: 'Kết quả đề xuất: PASSED, FAILED, hoặc INSUFFICIENT_EVIDENCE',
                  },
                  observation: {
                    type: Type.STRING,
                    description: 'Mô tả chi tiết những gì quan sát được từ ảnh.',
                  },
                  photoReferences: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: 'Danh sách số thứ tự ảnh làm căn cứ (từ 1 đến 8).',
                  },
                  issues: {
                    type: Type.STRING,
                    description: 'Vấn đề tồn tại cụ thể nếu FAILED, để trống nếu đạt hoặc chưa đủ bằng chứng.',
                  },
                  recommendation: {
                    type: Type.STRING,
                    description: 'Gợi ý hành động khắc phục cụ thể nếu có vấn đề.',
                  },
                  evidenceNeeded: {
                    type: Type.STRING,
                    description: 'Minh chứng hoặc góc chụp cần bổ sung nếu INSUFFICIENT_EVIDENCE.',
                  },
                },
                required: ['criterionId', 'status', 'observation', 'photoReferences'],
              },
            },
          },
          required: ['summary', 'proposals'],
        },
      },
    });

    const responseText = response.text || '{}';
    let parsedResult: any;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON output:', responseText);
      return res.status(500).json({
        error: 'Không thể phân tích dữ liệu trả về từ AI.',
        raw: responseText,
      });
    }

    // Validate that every checklist item exists in proposals. If missing, backfill.
    const proposalMap = new Map<string, any>();
    if (Array.isArray(parsedResult.proposals)) {
      for (const p of parsedResult.proposals) {
        proposalMap.set(p.criterionId, p);
      }
    }

    const validatedProposals = checklist.map((c: any) => {
      const found = proposalMap.get(c.id);
      if (found) {
        // Enforce valid status
        let status = found.status;
        if (status !== 'PASSED' && status !== 'FAILED') {
          status = 'INSUFFICIENT_EVIDENCE';
        }
        return {
          criterionId: c.id,
          criterionName: c.name,
          status,
          observation: found.observation || 'Không đủ dữ liệu hình ảnh trực quan.',
          photoReferences: Array.isArray(found.photoReferences) ? found.photoReferences : [1],
          issues: found.issues || '',
          recommendation: found.recommendation || '',
          evidenceNeeded: found.evidenceNeeded || (status === 'INSUFFICIENT_EVIDENCE' ? 'Cần bổ sung góc chụp toàn cảnh hoặc chi tiết hơn.' : ''),
        };
      } else {
        // Backfill missing criterion
        return {
          criterionId: c.id,
          criterionName: c.name,
          status: 'INSUFFICIENT_EVIDENCE',
          observation: 'Ảnh hiện tại chưa bao quát được khu vực của tiêu chí này.',
          photoReferences: [1],
          issues: '',
          recommendation: '',
          evidenceNeeded: 'Cần bổ sung hình ảnh chi tiết của khu vực này.',
        };
      }
    });

    res.json({
      success: true,
      aiEvaluation: {
        summary: parsedResult.summary || 'Đã phân tích 5S dựa trên hình ảnh được cung cấp.',
        proposals: validatedProposals,
        analyzedAt: new Date().toISOString(),
        model: 'gemini-3.8-flash',
        aiPromptVersion: '2.1-UNETI-TCNHBH',
        checklistVersion: '1.0',
        photosCount: photos.length,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/ai-evaluate-5s:', error);
    const message = error?.message || 'Lỗi khi gọi API đánh giá AI';
    const isQuota = message.includes('429') || message.includes('RESOURCE_EXHAUSTED');
    const isInvalidKey = message.includes('400') || message.includes('API_KEY_INVALID') || message.includes('403');

    res.status(500).json({
      error: isQuota
        ? 'Hạn mức API Gemini hiện tại đã vượt giới hạn (429 RESOURCE_EXHAUSTED). Vui lòng thử lại sau giây lát hoặc sử dụng phương thức Kiểm tra thủ công.'
        : isInvalidKey
        ? 'Khóa API Gemini không hợp lệ hoặc bị từ chối truy cập. Vui lòng kiểm tra lại cấu hình trong Settings > Secrets.'
        : `Lỗi phân tích AI: ${message}`,
      details: message,
    });
  }
});

// 2. AI Before/After Verification Endpoint
app.post('/api/ai-compare-correction', async (req, res) => {
  try {
    const { taskId, criterionName, roomName, issueDescription, beforePhoto, afterPhoto, userNotes } = req.body;

    if (!beforePhoto || !afterPhoto) {
      return res.status(400).json({
        error: 'Cần có đủ cả 2 ảnh: Ảnh trước xử lý và Ảnh sau xử lý để đối chiếu.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY.',
        details: 'Vui lòng thiết lập khóa API Gemini trong bảng Settings > Secrets của AI Studio.',
        code: 'MISSING_API_KEY',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parsedBefore = parseDataUrl(beforePhoto);
    const parsedAfter = parseDataUrl(afterPhoto);

    const parts = [
      {
        inlineData: {
          mimeType: parsedBefore.mimeType,
          data: parsedBefore.data,
        },
      },
      {
        inlineData: {
          mimeType: parsedAfter.mimeType,
          data: parsedAfter.data,
        },
      },
      {
        text: `Bạn là Chuyên gia Đánh giá 5S độc lập, thực hiện đối chiếu nghiệm thu khắc phục tồn tại 5S.
Khu vực: "${roomName}"
Tiêu chí vi phạm: "${criterionName}"
Mô tả vấn đề trước đây: "${issueDescription}"
Ghi chú của người xử lý: "${userNotes || 'Không có'}"

ẢNH 1: Ảnh TRƯỚC KHI XỬ LÝ (hiện trạng vi phạm)
ẢNH 2: Ảnh SAU KHI XỬ LÝ (kết quả khắc phục do người phụ trách chụp)

YÊU CẦU ĐỐI CHIẾU:
1. Hai ảnh có chụp cùng khu vực / cùng góc độ đủ tương đồng để đối chiếu hay không (sameArea)?
2. Vấn đề tồn tại trước đây ("${issueDescription}") có còn nhìn thấy trong ảnh sau không? Đã được khắc phục thực sự chưa (issueResolved)?
3. Đánh giá mức độ tự tin (confidence: 0-100%).
4. Nếu hai ảnh chụp góc khác nhau, khoảng cách quá xa hoặc không thấy rõ chi tiết, đặt evidenceSufficient: false và yêu cầu góc chụp bổ sung.
5. Tuyệt đối không tự suy diễn nếu ảnh sau chụp lệch vị trí cần khắc phục.`,
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction:
          'Bạn là chuyên gia giám sát nghiệm thu 5S. Hãy so sánh khách quan và nghiêm ngặt giữa ảnh trước và ảnh sau xử lý tồn tại 5S.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sameArea: {
              type: Type.BOOLEAN,
              description: 'Hai ảnh có chụp cùng khu vực và đủ tương đồng hay không.',
            },
            issueResolved: {
              type: Type.BOOLEAN,
              description: 'Vấn đề tồn tại ban đầu đã được giải quyết triệt để hay chưa.',
            },
            confidence: {
              type: Type.INTEGER,
              description: 'Mức độ tin cậy từ 0 đến 100%.',
            },
            observation: {
              type: Type.STRING,
              description: 'Chi tiết những thay đổi quan sát được giữa 2 ảnh.',
            },
            recommendation: {
              type: Type.STRING,
              description: 'Khuyến nghị cho kiểm tra viên/quản trị viên khi xem xét nghiệm thu.',
            },
            evidenceSufficient: {
              type: Type.BOOLEAN,
              description: 'Bằng chứng hình ảnh đã đủ rõ ràng để nghiệm thu hay cần chụp lại.',
            },
          },
          required: ['sameArea', 'issueResolved', 'confidence', 'observation', 'recommendation', 'evidenceSufficient'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      verification: {
        ...parsed,
        model: 'gemini-3.8-flash',
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in /api/ai-compare-correction:', error);
    res.status(500).json({
      error: `Lỗi đối chiếu AI: ${error?.message || 'Không thể phân tích ảnh'}`,
    });
  }
});

// --- DATA PERSISTENCE API ENDPOINTS ---

// 1. Get all current data
app.get('/api/data', (req, res) => {
  const db = loadDb();
  res.json({
    success: true,
    data: db,
  });
});

// 2. Add or update room
app.post('/api/data/room', (req, res) => {
  try {
    const room = req.body;
    if (!room || !room.id || !room.name) {
      return res.status(400).json({ error: 'Mã phòng và tên phòng là bắt buộc.' });
    }

    const db = loadDb();
    const existingIndex = db.rooms.findIndex((r) => r.id === room.id);

    if (existingIndex >= 0) {
      db.rooms[existingIndex] = {
        ...db.rooms[existingIndex],
        ...room,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newRoom = {
        id: room.id.trim(),
        name: room.name.trim(),
        type: room.type || 'LAB',
        location: room.location || '',
        manager: room.manager || '',
        specificNotes: room.specificNotes || '',
        checklist: room.checklist || DEFAULT_CHECKLIST,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.rooms.push(newRoom);
    }

    saveDb(db);
    res.json({ success: true, rooms: db.rooms });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lưu phòng' });
  }
});

// 3. Save official inspection & generate tasks
app.post('/api/data/inspection', (req, res) => {
  try {
    const inspectionData = req.body;
    if (!inspectionData || !inspectionData.roomId || !Array.isArray(inspectionData.decisions)) {
      return res.status(400).json({ error: 'Dữ liệu phiếu kiểm tra không hợp lệ.' });
    }

    const db = loadDb();
    const room = db.rooms.find((r) => r.id === inspectionData.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Không tìm thấy phòng kiểm tra.' });
    }

    // Check duplicate submission
    const existing = db.inspections.find((i) => i.id === inspectionData.id);
    if (existing) {
      return res.json({ success: true, inspection: existing, message: 'Phiếu đã được ghi nhận trước đó.' });
    }

    // Calculate official score
    const scoreResult = calculateInspectionScore(inspectionData.decisions);
    const officialScore = scoreResult.score ?? 0;
    const officialResult = scoreResult.result === 'CANNOT_EVALUATE' ? 'FAILED' : scoreResult.result;

    const newInspection = {
      ...inspectionData,
      id: inspectionData.id || `INSP-${Date.now()}`,
      officialScore,
      officialResult,
      totalCriteria: scoreResult.totalCount,
      applicableCriteria: scoreResult.applicableCount,
      passedCriteria: scoreResult.passedCount,
      failedCriteria: scoreResult.failedCount,
      naCriteria: scoreResult.naCount,
      createdAt: new Date().toISOString(),
    };

    // Generate corrective tasks for FAILED criteria
    const newTasks = generateCorrectiveTasks(newInspection, room, db.settings?.defaultTaskDeadlineDays || 3);

    // Save inspection and tasks
    db.inspections.unshift(newInspection);
    db.tasks.unshift(...newTasks);

    // Update room stats
    const roomIdx = db.rooms.findIndex((r) => r.id === room.id);
    if (roomIdx >= 0) {
      const openTasksForRoom = db.tasks.filter((t) => t.roomId === room.id && t.status !== 'VERIFIED_DONE').length;
      db.rooms[roomIdx] = {
        ...db.rooms[roomIdx],
        lastInspectedAt: newInspection.createdAt,
        lastScore: officialScore,
        lastResult: officialResult,
        openTaskCount: openTasksForRoom,
        updatedAt: new Date().toISOString(),
      };
    }

    // Add notification if new tasks created
    if (newTasks.length > 0) {
      db.notifications.unshift({
        id: `NOTIF-${Date.now()}`,
        title: `Phát sinh ${newTasks.length} nhiệm vụ khắc phục mới`,
        message: `Phiếu kiểm tra tại ${room.name} có ${newTasks.length} nội dung chưa đạt cần khắc phục.`,
        type: 'NEW_TASK',
        link: newTasks[0].id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    saveDb(db);

    res.json({
      success: true,
      inspection: newInspection,
      createdTasksCount: newTasks.length,
      rooms: db.rooms,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi lưu phiếu kiểm tra' });
  }
});

// 4. Update task (upload after photo, submit for verification)
app.post('/api/data/task/update', (req, res) => {
  try {
    const { taskId, actionNotes, afterPhotos, status, assignedTo, deadline, auditEntry } = req.body;
    const db = loadDb();
    const taskIdx = db.tasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    const currentTask = db.tasks[taskIdx];
    const auditTrail = Array.isArray(currentTask.auditTrail) ? [...currentTask.auditTrail] : [];
    if (auditEntry) {
      auditTrail.push(auditEntry);
    }

    db.tasks[taskIdx] = {
      ...currentTask,
      actionNotes: actionNotes !== undefined ? actionNotes : currentTask.actionNotes,
      afterPhotos: afterPhotos !== undefined ? afterPhotos : currentTask.afterPhotos,
      status: status || currentTask.status,
      assignedTo: assignedTo !== undefined ? assignedTo : currentTask.assignedTo,
      deadline: deadline !== undefined ? deadline : currentTask.deadline,
      auditTrail,
      updatedAt: new Date().toISOString(),
    };

    saveDb(db);
    res.json({ success: true, task: db.tasks[taskIdx] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi cập nhật nhiệm vụ' });
  }
});

// 5. Verify task (admin/inspector approves or returns)
app.post('/api/data/task/verify', (req, res) => {
  try {
    const { taskId, approved, verifiedBy, rejectionReason } = req.body;
    const db = loadDb();
    const taskIdx = db.tasks.findIndex((t) => t.id === taskId);
    if (taskIdx === -1) {
      return res.status(404).json({ error: 'Không tìm thấy nhiệm vụ.' });
    }

    const task = db.tasks[taskIdx];
    if (approved) {
      task.status = 'VERIFIED_DONE';
      task.verifiedBy = verifiedBy || 'Quản trị viên';
      task.verifiedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
    } else {
      task.status = 'IN_PROGRESS';
      task.actionNotes = (task.actionNotes || '') + `\n[Yêu cầu làm lại: ${rejectionReason || 'Chưa đạt yêu cầu'}]`;
      task.updatedAt = new Date().toISOString();
    }

    // Update room open tasks count
    const roomId = task.roomId;
    const roomIdx = db.rooms.findIndex((r) => r.id === roomId);
    if (roomIdx >= 0) {
      const openCount = db.tasks.filter((t) => t.roomId === roomId && t.status !== 'VERIFIED_DONE').length;
      db.rooms[roomIdx].openTaskCount = openCount;
    }

    saveDb(db);
    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi xác nhận nhiệm vụ' });
  }
});

// 6. Save or update inspection schedule
app.post('/api/data/schedule', (req, res) => {
  try {
    const schedule = req.body;
    const db = loadDb();
    const idx = db.schedules.findIndex((s) => s.id === schedule.id);
    if (idx >= 0) {
      db.schedules[idx] = { ...db.schedules[idx], ...schedule };
    } else {
      db.schedules.unshift({ ...schedule, id: schedule.id || `SCH-${Date.now()}` });
    }
    saveDb(db);
    res.json({ success: true, schedules: db.schedules });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi lưu lịch kiểm tra' });
  }
});

// 7. Mark notification read
app.post('/api/data/notification/read', (req, res) => {
  const { id, markAll } = req.body;
  const db = loadDb();
  if (markAll) {
    db.notifications.forEach((n) => (n.isRead = true));
  } else if (id) {
    const notif = db.notifications.find((n) => n.id === id);
    if (notif) notif.isRead = true;
  }
  saveDb(db);
  res.json({ success: true, notifications: db.notifications });
});

// 8. Update settings
app.post('/api/data/settings', (req, res) => {
  const newSettings = req.body;
  const db = loadDb();
  db.settings = { ...db.settings, ...newSettings };
  saveDb(db);
  res.json({ success: true, settings: db.settings });
});

// 9. Reset to default demo data
app.post('/api/data/reset-demo', (req, res) => {
  const fresh = getInitialDb();
  saveDb(fresh);
  res.json({ success: true, data: fresh });
});

// 10. Update staff & faculty leadership
app.post('/api/data/users', (req, res) => {
  const updatedUsers = req.body;
  if (!Array.isArray(updatedUsers)) {
    return res.status(400).json({ error: 'Dữ liệu danh sách nhân sự không hợp lệ.' });
  }
  const db = loadDb();
  db.users = updatedUsers;
  saveDb(db);
  res.json({ success: true, users: db.users });
});

// Vite middleware or Static files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[5S SMART – KHOA TCNH&BH] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
