# Beta-R2 兩階段驗收 — 2026-09-21（Asia/Taipei）

**BLOCKED；未達 READY FOR CLOSED ANDROID BETA。** 本次已連續執行可用的 Phase 1／Phase 2 工作，但未產生簽署候選 APK。未邀請測試者、未公開發佈、未建立簽章金鑰或付費基礎設施。下列主機結果不代表候選原生驗收通過。

## 來源與環境

- 起始本機與重新查詢的遠端 HEAD：`940f4dd0c9e2c1d9a79be558ade8a608281cecd6`；tree：`96c79f98740736e5efe39bae04b2ed375477dcef`。工作樹乾淨，沒有基準之後的新提交；既有工作保留。
- 乾淨驗證 worktree：`../diary-app-beta-r2-check`，直接從上述提交建立，未複製 node_modules、android、.expo 或 Expo 生成型別。Node 24.19.0／Windows／JDK 17，Android SDK 36 工具可用。
- 已閱讀 AGENTS.md、CLAUDE.md、README、development-plan、runbook、tester-guide、Beta-R1／P1C-2A evidence，以及 [Expo 57 版本文件](https://docs.expo.dev/versions/v57.0.0/)。檢查 release config／scripts／APK auditor、native plugins、auth lifecycle、Quick／Review managers、SQLCipher 開啟流程與相關測試。
- 本次只更新驗收與交付文件；App、SDK、共享 contracts／generated client、網路堆疊、儲存 namespace／金鑰設計均未變更。沒有已重現且尚未修正的產品缺陷；也未以未執行的裝置驗收推論沒有缺陷。
- 唯一找到的 APK 為歷史 `android/app/build/outputs/apk/debug/app-debug.apk`，SHA-256 `5b82dd8f45ff1582bc00b054e9a68a7fc8c2c65d8de7bd79ec39db9b14e09364`；不是本次候選，也未重新安裝作為 release 證據。

## Phase 1 — 簽署 standalone 候選

### 開始時輸入檢查與一次性缺項清單

僅檢查指定 release／signing／synthetic-account 變數是否存在、專案設定檔及 Expo 登入狀態是否存在；沒有輸出秘密。沒有 `.env.local` 或 `credentials.json`，所有必要 release 變數與本機 signing 變數均未設定；沒有 EAS_PROJECT_ID、EXPO_TOKEN、已登入 Expo session 或 PATH 上的 EAS CLI。沒有搜尋無關私人檔案。已在工作開始時集中詢問營運者，至本次紀錄完成尚未收到設定或核准。

| 精確設定／資源 | 原因與目前缺項 | 機密性／安全供應方式 | 阻擋工作；仍可進行工作 |
| --- | --- | --- | --- |
| `APP_VARIANT=preview`、`EXPO_PUBLIC_APP_ENV=preview` | 本次指示已授權；已用於驗證命令 | 非機密，process env | 不需額外核准；其餘設定仍缺 |
| `EXPO_PUBLIC_API_BASE_URL`、`BETA_APPROVED_API_ORIGIN` | 需要營運者核准且獨立於工作站的 HTTPS API；需確認 native contracts、持久資料庫、實際資料位置／保留移除安排 | origin 非機密，既有安全設定來源或 process env；部署憑證不貼聊天 | 建置、live compatibility 與登入寫入驗收 BLOCKED；disposable API 可測 |
| `EXPO_PUBLIC_BETA_SUPPORT_URL`、`EXPO_PUBLIC_BETA_DATA_NOTICE`、`BETA_CONFIGURATION_APPROVED=1` | 真實支援目的地、繁中資料位置／保留／移除／刪除申請說明與明確營運核准；不得由 agent 自行聲稱核准 | 全部嵌入 App，必須非機密；營運者提供確認後的值 | release validation／交付 BLOCKED；Help 安全性單元測試可測 |
| 穩定 package／簽章憑證 SHA-256、歷次最高版本碼、`ANDROID_VERSION_CODE` | 確認是否已有派發的 preview identity；新版本必須更高 | 非機密，以既有 release ledger 提供 | 簽章稽核與 N→N+1 升級 BLOCKED；既有身份設定可檢查 |
| 本機 `BETA_KEYSTORE_PATH`、`BETA_KEY_ALIAS`、`BETA_KEYSTORE_PASSWORD`、`BETA_KEY_PASSWORD`；或既有 EAS project/account／Android credentials | 需要已授權的永久簽章；本機路徑可用時不需要 EAS | keystore／密碼／token 是秘密；放既有受保護本機檔案或 secret store，以 process env 載入，僅告知來源位置。憑證指紋可分享。首次新建永久金鑰另需 owner 明確授權 | 簽署 APK BLOCKED；host checks 可跑 |
| 專用 synthetic A/B 帳號與個別測試者開通／復原負責人、流程 | 需要驗證實際 API 登入、owner 隔離及 routine access；不能以本機 register fixture 代替營運流程 | 帳密保密，使用受保護來源；流程／負責管道非機密 | live smoke／交付 BLOCKED；disposable synthetic 帳號可用 |
| 隔離且已授權 HTTPS fault ingress | release bytes 不變時觀察 POST／PATCH request／forward／commit 計數 | URL／使用核准非機密；控制憑證使用 secret store | 原生 HTTPS 故障關卡 BLOCKED；本機 HTTP proxy 測試可跑 |
| 兩台不同廠牌或 OS 的實體 Android | 目前只有模擬器，不能替代實體裝置 | 連接並允許 adb；只紀錄型號／OS／ABI，不需私人識別碼 | 實體 journeys／草稿／升級 BLOCKED；host checks 可跑 |
| 核准 EAS internal 或 owner 檔案交付機制 | 需要真實下載入口、存取限制、下載 checksum 驗證 | 分享網址不得含 credential；在既有授權管道提供存取，不建立公開 release | 交付 BLOCKED；指南可備妥。無 channel 時須先取得簽署 APK 才能交 owner 私下轉交 |

### 建置與產物紀錄

| 關卡／期待 | 狀態與實際觀察 | Artifact／環境 |
| --- | --- | --- |
| `npm run release:validate` 接受完整核准設定 | **BLOCKED**，exit 1：`A hosted HTTPS origin is required.`；安全拒絕生效，但 release 關卡未通過 | clean source，preview selectors |
| `npm run android:preview:local` 產出簽署 APK | **BLOCKED**，exit 1，同上；未進入 prebuild／Gradle；未改用 debug key | clean source，沒有授權 signing |
| HTTPS backend 持久儲存／資料政策／個別帳號／支援可用 | **BLOCKED**，沒有指定服務或營運證據，未接觸未知遠端 API | API origin 尚無 |
| APK auditor、merged release manifest、native modules／one-shot networking／秘密檢查 | **BLOCKED**，沒有候選可以稽核；僅讀過工具與 plugin，不算產物驗證 | SHA-256 不適用 |
| 停止 Metro 後 cold launch、Help installed version、HTTPS login、Quick create/read、Review complete/update、session restore | **BLOCKED**，沒有候選／核准 API／帳號 | 僅發現模擬器，沒有 release runtime 觀察 |

| 必要產物欄位 | 實際值 |
| --- | --- |
| APK／下載 entry／SHA-256 | **無** |
| 候選來源 commit／tree | **無候選**；受測 App source 為上述 `940f4dd`／`96c79f…` |
| Build profile | 預定 preview；未完成建置 |
| applicationId／display name | source 設定 `com.etklam.diaryapp.preview`／Trade Basic Beta；非 APK 觀察 |
| native versionName／versionCode | 無；source versionName 為 1.0.0，versionCode 待 owner 歷史紀錄 |
| 簽章憑證 SHA-256／核准 API origin | 未提供 |

**Phase 1 未完成。** JavaScript export 或既有 debug APK 不作替代。

## Phase 2 — 驗收、阻擋修正與交付

### 本次實際執行的主機與隔離 API 驗證

全部針對上述乾淨 App source；下列 PASS 的 artifact 均為「無 APK／host source」，不可移轉至將來的二進位。

| 檢查 | 狀態 | 預期與實際觀察 |
| --- | --- | --- |
| `npm ci` | **PASS** | 安裝 901 packages；npm 報告既有 16 moderate audit findings、deprecated／install-script notices；未進行 incidental upgrade／autofix |
| `npm run typecheck`，Expo generation 之前 | **PASS** | 無錯誤；未重現舊 clean-checkout CSS 問題 |
| `npm run dependencies:check` | **PASS** | Dependencies are up to date |
| `npm run doctor` | **PASS** | 21/21 |
| `npm run lint` | **PASS** | 無 lint 錯誤 |
| `npm test` | **PASS** | 166 passed；2 opt-in API tests 在一般 run skipped，以下分別明確執行通過，未計為此 run 的 PASS |
| `npm run android:bundle` | **PASS** | 1,445 modules、27 assets、3.9 MB Hermes bundle；development-profile host export，非 APK |
| `npm run test:api` | **PASS** | 專用臨時帳號：錯誤密碼、登入 owner、restore、logout／signed-out |
| `npm run test:api:reads` | **PASS** | 25 synthetic rows、summary/detail、civil date、分頁、空帳號、A/B isolation |
| `npm run test:api:quick` | **PASS** | create／append／conflict、owner isolation、committed response loss、502/503/504、unchanged read 後延遲 commit；每個故障一次 POST |
| `npm run test:api:discovery` | **PASS** | 33 fixtures、三個月、search/symbol/range/status/sort、兩頁 summaries、leap-month activity、五個 review buckets、A/B isolation |
| `npm run test:api:reviews` | **PASS** | complete/update／時間與無關欄位保留、invalid／cross-owner rejection、response replacement/loss／delayed PATCH；restart/check 不 replay |
| `git diff --check` | **PASS** | clean source 與最後文件變更檢查 |
| Hosted CI | **PASS（App source 基準）** | 本次透過 GitHub REST 重新觀察 [35523669847](https://github.com/etklam/diary-app/actions/runs/35523669847)，head_sha 精確為 `940f4dd…`、completed／success；本次後續文件提交 CI **NOT RUN**，未推送以製造新的綠燈 |

Disposable backend：既有 sibling diary-v3 `ce2962f597ef56dc4e4cb8966c1ca1860369e006`，使用原本 `scripts/e2e-server.ts` 與現有 PostgreSQL；未修改 backend。此 run 新建的 DB 為 `diary_v3_e2e_6f7e075a416e4a06bbad10993f6ae7c2`。API `127.0.0.1:3201`，proxy 3101／control 3102；fault-heavy tests 沒有接觸共享 live service。

Proxy 結束安全計數：posts 68／commits 67；patches 10／forwardedPatches 10／patchCommits 8；held／delayed／heldReads 均 0。總數包括 fixture writes 與預期拒絕，不代表每個 request 都必須 commit；個別故障的增量由 smoke assertions 驗證。這是主機 HTTP 層，不是 release HTTPS/native 層。

清理：僅停止本次 API／proxy 程序，確認此 DB 的連線數 0 後移除，查詢存在數 0。未保留帳密 fixture，未清除 App data／key／draft，未更動既有 Docker 服務。乾淨驗證 worktree 保留供追溯。

### 候選相依的未通過關卡

本次 adb 僅探索到 `sdk_gphone64_x86_64`，Android 16，ABI x86_64；既有安裝只有 `com.etklam.diaryapp`，沒有 preview；reverse 清單為空，未移除任何其他人的 forwarding。沒有實體裝置。下表每項的候選 hash／version 均為「無」，未觀察結果，不能引用歷史截圖為新 PASS。

| 必要情境與期待 | 狀態／缺項 |
| --- | --- |
| 模擬器 standalone core smoke（無 Expo Go／Metro／developer config） | **BLOCKED**：APK／核准 backend／帳號 |
| 兩台實體 Android：install → intro → login → first diary → Detail | **BLOCKED**：APK／實體裝置／backend |
| Timeline search/filter → Detail → Back 保留 context；Calendar selected day → Quick/Detail → Back 保留選日 | **BLOCKED**：同上 |
| Review Queue → Detail → editor → explicit complete/update → refreshed Detail/Queue | **BLOCKED**：同上 |
| cold session restore；A logout → B 無 A 內容；Help inspect → explicit copy/share/support | **BLOCKED**：同上及真實支援 |
| 窄螢幕、多行、keyboard-open controls、font scale 1.3、scroll／native Back | **BLOCKED**：候選與實體裝置 |
| 同時 Quick 非空草稿＋兩篇不同 Review 草稿，force-stop 後日期／outcome／多行逐一精確比對 | **BLOCKED**：原生候選；host repository coexistence/reopen 測試 PASS 不代表 SQLCipher runtime |
| late GET 不覆蓋編輯；cancel logout 保留；confirmed discard 限定 owner/environment；expiry 保留；A→B→A；late A callbacks 不影響 B；Quick/Review 不互覆 | **BLOCKED（裝置）**；對應 host controller／manager／repository regression tests PASS |
| 分離的 unresolved-attempt force-stop/restoration、payload durable／無自動 mutation | **BLOCKED（裝置）**；host 與 disposable response-loss/restart assertions PASS |
| SQLCipher 初始化、加密儲存與原金鑰可用的安全 runtime 證據 | **BLOCKED**；未以 ZIP 中的 native SQLite library 作證，未開 debug 或複製 database |
| 同 package/cert/env/API/namespace 的 N→更高版本 N+1 install-over，session、Quick、多份 Review、unknown attempt 不變，後續讀寫正常 | **BLOCKED**：授權 signing／版本歷史／候選 pair／裝置；若用同 source 只改 versionCode，必須標記為連續性測試，不能稱 schema migration |
| 原候選 bytes 的隔離 HTTPS POST/PATCH：before-dispatch failure、commit→lost/replaced response、delayed original＋unchanged read、retryable response、auth rejection、unknown 時 force-stop；逐情境觀察 received/forwarded/commit | **BLOCKED**：候選／授權 HTTPS fault ingress；host HTTP 不替代 |
| 真實下載存取行為、下載 hash 與批准 artifact 一致、個別 API auth 仍必要 | **BLOCKED**：APK／核准 channel／測試存取 |
| 真實使用者回饋 | **NOT RUN**：未邀請；準備交付不要求真人先完成試用 |

### 修正與 owner 交付

沒有重現需修改 App 的阻擋缺陷，未新增 framework、feature、synchronization 或 auth system。補齊既有繁中 tester guide 的安裝說明、六個小任務、型號／OS／版本／預期與實際結果回報欄位，以及目前不可派發狀態。更新 runbook 與 development-plan，避免將 R1 已完成的程式準備誤認為 R2 候選驗收。

目前 **沒有可交付的 signed artifact 或下載 entry**。Owner 必須先提供 Phase 1 表列設定／授權來源，再完成本紀錄所有 BLOCKED gate；不是再啟動另一個產品開發 phase。保留以下交付要求：

1. 僅派發通過 audit／runtime acceptance 的確切 APK，附版本／build／SHA-256、憑證指紋、source、已測裝置；owner 私下轉交也必須拿到實際 signed artifact。
2. 使用既有個別帳號設施，由已確認負責人開通／復原；帳密走既有安全私下管道，不能放指南。APK 連結不授權 API。未公開列出的 URL 不等於 authenticated private access；記錄實際下載限制與 bytes hash。
3. 測試者依 [繁中指南](../../beta/tester-guide.md) 安裝／登入／日誌／搜尋或日曆／完成 Review／草稿重開／回報；真實支援與資料政策仍不可捏造。
4. 嚴重問題先暫停派發與邀請，保留原安裝與草稿；owner 經核准支援管道處理。修正後同 signing identity、較高 versionCode，重跑受影響測試與 core smoke，更新 hash／source，不能把舊 binary 證據移給新 binary。
5. 不以解除安裝、降版、清資料、換 key 或重送 uncertain write 當復原。unknown 保留加密 payload，只讀檢查；discard 不取消可能的 server mutation；confirmed-save refresh failure 只 retry read。

既有限制保留：Review preflight GET 不是 atomic conditional update，相同文字不是 operation receipt，unchanged read 不能排除 late commit；Completed 最近 50 筆。所有 scope 外功能維持延後。**Phase 2 的 host／disposable 驗證已執行，候選／實機／HTTPS fault／upgrade／delivery 驗收未完成。**
