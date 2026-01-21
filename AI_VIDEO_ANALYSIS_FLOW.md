# AI视频分析流程详细说明

## 问题：为什么AI说看不清脸部？

### 🔍 完整调用流程追踪

#### 1. 前端流程（用户操作）

**位置**：`fluent-life-frontend/components/ExposureExercise.tsx` (约3529行)

```
用户点击"AI分析"按钮
  ↓
调用 analyzeVideo() 函数
  ↓
检查是否有 videoBlob（录制的视频）
  ↓
如果有 videoBlob：
  - 使用 FileReader 将 Blob 转换为 base64 字符串
  - 调用 analyzeVideoAPI(videoData, moduleId, stepId)
  ↓
如果没有 videoBlob 但有 uploadedVideoId：
  - 优先尝试使用 videoBlob（如果存在）
  - 否则使用 videoId 调用 API
```

**关键代码**：
```typescript
// 将视频Blob转换为base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};

const videoData = await blobToBase64(videoBlob);
const response = await analyzeVideoAPI(videoData, selectedModule?.id, currentStep?.id);
```

#### 2. API调用层

**位置**：`fluent-life-frontend/services/api.ts` (约693行)

```typescript
export const analyzeVideoAPI = async (
  videoData: string,      // base64编码的视频字符串
  moduleId?: string, 
  stepId?: string, 
  videoId?: string
) => {
  const response = await apiClient.post('/exposure/analyze-video', {
    video_data: videoData,  // 这里发送的是base64字符串
    video_id: videoId,
    module_id: moduleId,
    step_id: stepId,
  });
  return response.data;
};
```

**发送的数据**：
```json
{
  "video_data": "data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQ...",  // 很长的base64字符串
  "video_id": null,
  "module_id": "help-others",
  "step_id": "xxx-xxx-xxx"
}
```

#### 3. 后端Handler层

**位置**：`fluent-life-api/internal/handlers/exposure_module_handler.go`

```go
func (h *ExposureModuleHandler) AnalyzeVideo(c *gin.Context) {
    var req struct {
        VideoData string `json:"video_data"` // 接收base64字符串
        VideoID   string `json:"video_id"`
        ModuleID  string `json:"module_id"`
        StepID    string `json:"step_id"`
    }
    
    // 调用AI服务
    analysisText, err := h.aiService.AnalyzeVideo(
        req.VideoData,  // 传递base64字符串
        req.VideoID, 
        req.ModuleID, 
        req.StepID
    )
}
```

#### 4. AI服务层（关键问题所在）

**位置**：`fluent-life-api/internal/services/ai_service.go` (约466行)

```go
func (s *AIService) AnalyzeVideo(videoData string, videoID string, moduleID string, stepID string) (string, error) {
    // 构建提示词
    prompt := "你是一位专业的口吃矫正训练导师。请分析用户上传的练习视频..."
    
    // 构建用户消息
    userMessage := "请分析我的练习视频（分析时间：2026-01-17 20:00:00）"
    if videoData != "" {
        userMessage += "\n视频数据已提供（base64编码），请仔细分析视频内容。"
        // ⚠️ 问题：这里只是将base64字符串作为文本描述，并没有真正发送视频！
    }
    
    messages := models.Messages{
        {Role: "system", Text: prompt},
        {Role: "user", Text: userMessage},  // 只有文本，没有视频数据
    }
    
    return s.callDoubaoAPI(messages)
}
```

#### 5. Doubao API调用层（核心问题）

**位置**：`fluent-life-api/internal/services/ai_service.go` (约227行)

```go
func (s *AIService) callDoubaoAPI(messages models.Messages) (string, error) {
    var arkMessages []*model.ChatCompletionMessage
    for _, msg := range messages {
        arkMessages = append(arkMessages, &model.ChatCompletionMessage{
            Role:    doubaoRole,
            Content: &model.ChatCompletionMessageContent{
                StringValue: &msg.Text,  // ⚠️ 只支持文本！不支持视频！
            },
        })
    }
    
    req := model.CreateChatCompletionRequest{
        Model:    s.cfg.Doubao.ModelID,
        Messages: arkMessages,  // 只有文本消息
    }
    
    resp, err := client.CreateChatCompletion(context.Background(), req)
}
```

### 🚨 问题根源

**Doubao API (豆包API) 是一个纯文本对话API，不支持视频/图像等多媒体内容！**

1. **API限制**：
   - `ChatCompletionMessageContent` 只有 `StringValue` 字段，只能发送文本
   - 没有 `ImageValue`、`VideoValue` 等多媒体字段
   - API设计就是用于文本对话，不支持多模态输入

2. **当前实现的问题**：
   - 视频被转换为 base64 字符串（可能几MB到几十MB）
   - 但只是作为**文本描述**发送："视频数据已提供（base64编码）"
   - AI模型**无法解析base64字符串为视频**，只能看到文本提示
   - 因此AI会回复"无法直接观看视频"、"看不清脸部"等

3. **数据流示意**：
   ```
   视频Blob (二进制数据)
     ↓
   base64字符串 (文本格式，但AI无法理解)
     ↓
   文本消息："请分析视频...视频数据已提供（base64编码）"
     ↓
   Doubao API (只接收文本)
     ↓
   AI回复："很遗憾，我无法直接观看你提供的视频..."
   ```

### ✅ 解决方案

要真正实现视频分析，需要：

1. **使用支持多模态的AI模型**：
   - GPT-4 Vision（支持图像，但视频需要逐帧处理）
   - Claude 3.5 Sonnet（支持图像）
   - Google Gemini Pro Vision（支持图像和视频）
   - 专门的视频分析API服务

2. **修改API调用方式**：
   - 如果使用支持视频的API，需要将视频作为多媒体内容发送
   - 不能只是将base64字符串放在文本消息中
   - 需要按照API文档的格式发送视频数据

3. **当前可行的临时方案**：
   - **方案A**：使用视频转文字服务（语音识别）提取视频中的语音，将语音文本发送给AI分析
   - **方案B**：提示用户描述视频内容，AI基于描述进行分析
   - **方案C**：使用视频分析服务（如阿里云视频智能分析）先提取关键信息，再发送给AI

### 解决方案

要真正实现视频分析，需要：

1. **使用支持多模态的AI模型**：
   - 需要支持视频输入的AI API（如GPT-4 Vision、Claude 3.5 Sonnet等）
   - 或者使用专门的视频分析服务

2. **修改API调用方式**：
   - 如果使用支持视频的API，需要将视频数据作为多媒体内容发送
   - 不能只是将base64字符串放在文本消息中

3. **当前可行的临时方案**：
   - 使用视频转文字服务（如语音识别）提取视频中的语音
   - 将语音文本发送给AI进行分析
   - 或者提示用户描述视频内容，AI基于描述进行分析

### 代码位置

- 前端：`fluent-life-frontend/components/ExposureExercise.tsx` - `analyzeVideo()` 函数（约3529行）
- API调用：`fluent-life-frontend/services/api.ts` - `analyzeVideoAPI()` 函数（约693行）
- 后端Handler：`fluent-life-api/internal/handlers/exposure_module_handler.go` - `AnalyzeVideo()` 方法
- AI服务：`fluent-life-api/internal/services/ai_service.go` - `AnalyzeVideo()` 方法（约466行）
- Doubao API调用：`fluent-life-api/internal/services/ai_service.go` - `callDoubaoAPI()` 方法（约59行）

### 当前数据流

```
用户录制视频
  ↓
videoBlob (Blob对象)
  ↓
转换为base64字符串
  ↓
POST /api/v1/exposure/analyze-video { video_data: "base64字符串..." }
  ↓
后端接收，调用 aiService.AnalyzeVideo()
  ↓
构建文本消息："请分析我的练习视频...视频数据已提供（base64编码）"
  ↓
调用 Doubao API (纯文本对话)
  ↓
AI回复："无法直接观看视频..." ❌
```

### 建议的改进方案

1. **短期方案**：提示用户描述视频内容，AI基于描述分析
2. **中期方案**：集成语音识别服务，提取视频中的语音文本，再分析
3. **长期方案**：集成支持视频分析的多模态AI模型（如GPT-4 Vision、Claude等）
